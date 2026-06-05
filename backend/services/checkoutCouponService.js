const pool = require("../config/db").promise();

function todayAtMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Supports YYYY-MM-DD (admin date input) and legacy MM/DD/YYYY rows. */
function parseOfferDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return new Date(`${raw.slice(0, 10)}T12:00:00`);
  }

  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) {
    const [, mm, dd, yyyy] = us;
    return new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T12:00:00`);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getOfferDateStatus(offer) {
  const today = todayAtMidnight();
  const start = parseOfferDate(offer.start_date);
  const end = parseOfferDate(offer.end_date);

  if (start && today < start) {
    return { ok: false, message: "Coupon is not active yet." };
  }
  if (end && today > end) {
    return { ok: false, message: "Coupon date expired" };
  }
  return { ok: true };
}

function parseIdCsv(csv) {
  return String(csv || "")
    .split(",")
    .map((v) => Number(String(v).trim()))
    .filter((n) => n > 0);
}

async function getAffiliateCoupon(code, userId) {
  const [rows] = await pool.query(
    `SELECT * FROM affiliate_coupons
     WHERE affiliate_coupon_code = ? AND active = 1
       AND (affiliate_oguserId IS NULL OR affiliate_oguserId != ?)
     LIMIT 1`,
    [code, userId]
  );
  return rows[0] || null;
}

async function validateDiscountCoupon(userId, packageId, offerCode) {
  const code = String(offerCode || "").trim();
  if (!code) {
    return { status: false, message: "Enter valid coupon code" };
  }

  const [pkgRows] = await pool.query(
    "SELECT id, price FROM master_package WHERE id = ? AND active = 1 LIMIT 1",
    [packageId]
  );
  if (!pkgRows.length) {
    return { status: false, message: "Package not found." };
  }
  const basePrice = Number(pkgRows[0].price) || 0;

  const [offerRows] = await pool.query(
    `SELECT * FROM master_offer
     WHERE active = 1 AND c_limit_pending > 0 AND UPPER(TRIM(c_code)) = UPPER(TRIM(?))
     LIMIT 1`,
    [code]
  );
  const offer = offerRows[0];

  let discountAmount = 0;
  let message = "";
  let couponType = null;
  let couponMeta = null;

  if (offer) {
    const dateStatus = getOfferDateStatus(offer);
    if (!dateStatus.ok) {
      return { status: false, message: dateStatus.message };
    }

    const packageIds = parseIdCsv(offer.package);
    const userIds = parseIdCsv(offer.user);
    if (!userIds.includes(Number(userId))) {
      return { status: false, message: "Offer Not Valid For You" };
    }
    if (!packageIds.includes(Number(packageId))) {
      return { status: false, message: "Offer Not Valid for This Package" };
    }
    if (Number(offer.c_discount) === 1) {
      discountAmount = (basePrice * Number(offer.c_value)) / 100;
    } else {
      discountAmount = Number(offer.c_value);
    }
    discountAmount = Math.min(discountAmount, basePrice);
    message = "Offer Applied Successfully";
    couponType = "offer";
    couponMeta = {
      offer_id: offer.id,
      offer_code: offer.c_code,
      offer_method: Number(offer.c_discount),
      offer_value: Number(offer.c_value),
      affiliate_or_offer: 0
    };
  }

  if (!discountAmount) {
    const affiliate = await getAffiliateCoupon(code, userId);
    if (affiliate) {
      discountAmount = (basePrice * 5) / 100;
      message = "Affiliate Coupon Applied Successfully";
      couponType = "affiliate";
      couponMeta = {
        offer_id: affiliate.affiliate_coupon_id,
        offer_code: affiliate.affiliate_coupon_code,
        offer_method: 1,
        offer_value: 5,
        affiliate_or_offer: 1
      };
    }
  }

  if (!discountAmount) {
    return { status: false, message: "Enter valid coupon code" };
  }

  const grandTotal = Math.max(0, basePrice - discountAmount);
  return {
    status: true,
    message,
    discountAmount: Math.round(discountAmount * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    basePrice,
    couponType,
    couponMeta
  };
}

module.exports = { validateDiscountCoupon, parseOfferDate, getOfferDateStatus };
