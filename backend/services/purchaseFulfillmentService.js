/**
 * Grants package PR credits after payment or redemption.
 * Ensures usepr_limit / pending_pr never go negative.
 */

function todaySqlDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysSqlDate(baseYmd, days) {
  const d = new Date(`${baseYmd}T12:00:00`);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function safeNonNegative(n) {
  return Math.max(0, Number(n) || 0);
}

async function recordAffiliateCouponUse(conn, couponMeta, userId, packageId, paymentId, paymentMethod, usdAmount) {
  if (!couponMeta || Number(couponMeta.affiliate_or_offer) !== 1 || !couponMeta.offer_id) return;

  const [affRows] = await conn.query(
    "SELECT affiliate_oguserId FROM affiliate_coupons WHERE affiliate_coupon_id = ? LIMIT 1",
    [couponMeta.offer_id]
  );
  const affiliateUserId = Number(affRows[0]?.affiliate_oguserId) || 0;
  const earned = (Number(usdAmount) || 0) * 5 / 100;
  const today = todaySqlDate();

  await conn.query(
    `INSERT INTO affiliate_coupons_relationship
     (affiliate_coupons_relationship_ogid, affiliate_coupons_relationship_coupon,
      affiliate_coupons_relationship_no_of_used, affiliate_coupons_relationship_payment_id,
      affiliate_coupons_relationship_end_pr, affiliate_coupons_rel_ationship_userid,
      affiliate_coupons_relationship_package_id, affiliate_coupons_relationship_earned,
      affiliate_coupons_relationship_date, affiliate_coupons_relationship_userId,
      affiliate_coupons_relationship_payment_method)
     VALUES (?, ?, 1, ?, 0, ?, ?, ?, ?, ?, ?)`,
    [
      couponMeta.offer_id,
      couponMeta.offer_code || "",
      paymentId,
      userId,
      packageId,
      earned,
      today,
      affiliateUserId,
      paymentMethod
    ]
  );
}

async function decrementCouponUsage(conn, couponMeta) {
  if (!couponMeta || couponMeta.couponType !== "offer" || !couponMeta.offer_id) return;
  const [rows] = await conn.query("SELECT c_limit_use, c_limit_pending FROM master_offer WHERE id = ? LIMIT 1", [
    couponMeta.offer_id
  ]);
  if (!rows.length) return;
  const use = Number(rows[0].c_limit_use) || 0;
  const pending = Number(rows[0].c_limit_pending) || 0;
  await conn.query("UPDATE master_offer SET c_limit_use = ?, c_limit_pending = ? WHERE id = ?", [
    use + 1,
    Math.max(0, pending - 1),
    couponMeta.offer_id
  ]);
}

async function fulfillPackagePurchase(
  conn,
  {
    userId,
    packageId,
    prCredits,
    usdAmount,
    paymentId,
    orderId = null,
    signatureHash = null,
    paymentStatus = "captured",
    paymentMethod,
    reason,
    whoLabel,
    couponMeta = null,
    coinbaseMeta = null
  }
) {
  const pr = safeNonNegative(prCredits);
  const today = todaySqlDate();

  const [pkgRows] = await conn.query(
    "SELECT id, price, package_validity, n_press_rel, pname FROM master_package WHERE id = ? LIMIT 1",
    [packageId]
  );
  if (!pkgRows.length) throw new Error("Invalid package.");
  const pkg = pkgRows[0];
  const paidUsd = String(couponMeta?.grandTotal ?? usdAmount ?? 0);
  const listPriceUsd = String(Number(pkg.price) || Number(usdAmount) || 0);
  const price = paidUsd;
  const packageValidityMaster = safeNonNegative(pkg.package_validity);
  const creditsToAdd = pr > 0 ? pr : safeNonNegative(pkg.n_press_rel);

  const [upsRows] = await conn.query(
    "SELECT * FROM master_user_pr_status WHERE u_id = ? AND plan_id = ? LIMIT 1 FOR UPDATE",
    [userId, packageId]
  );

  let prStatusId;
  if (upsRows.length) {
    const up = upsRows[0];
    prStatusId = up.id;
    const incresspr = safeNonNegative(up.pr);
    const pkgValUser = safeNonNegative(up.package_validity);
    const recEnd = up.package_end_date ? String(up.package_end_date).slice(0, 10) : null;
    const notExpired = recEnd && new Date(recEnd) >= new Date(today);
    const nextPr = notExpired ? creditsToAdd + incresspr : creditsToAdd;
    const updValidity = pkgValUser + packageValidityMaster;
    const updEnd = addDaysSqlDate(today, packageValidityMaster);

    await conn.query(
      `UPDATE master_user_pr_status SET
        plan_id = ?, pr = ?, og_pr = ?, usd_amount = ?, payment_method = ?, reason = ?,
        status = 1, active = 1, package_validity = ?, package_end_date = ?
      WHERE id = ?`,
      [packageId, nextPr, creditsToAdd, price, paymentMethod, reason, updValidity, updEnd, prStatusId]
    );
  } else {
    const pkgEnd = addDaysSqlDate(today, packageValidityMaster);
    const [ins] = await conn.query(
      `INSERT INTO master_user_pr_status
      (u_id, plan_id, pr, og_pr, usd_amount, payment_method, reason, status, active,
       package_validity, package_start_date, package_end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)`,
      [userId, packageId, creditsToAdd, creditsToAdd, price, paymentMethod, reason, packageValidityMaster, today, pkgEnd]
    );
    prStatusId = ins.insertId;
  }

  await conn.query(
    `INSERT INTO increase_pr_history (user_pr_id, u_id, plan_id, increase_pr, date, who_increase, price, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [prStatusId, userId, packageId, creditsToAdd, today, whoLabel, price, reason]
  );

  await conn.query(
    `INSERT INTO user_payment_history (user_id, plan_id, og_pr, price, admin_id, reason)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [userId, packageId, creditsToAdd, price, reason]
  );

  const [prRecRows] = await conn.query(
    "SELECT * FROM master_pr_record WHERE user_id = ? AND package_id = ? LIMIT 1 FOR UPDATE",
    [userId, packageId]
  );

  if (prRecRows.length) {
    const rec = prRecRows[0];
    const prLimit = safeNonNegative(rec.pr_limit);
    const prUserLimit = safeNonNegative(rec.usepr_limit);
    const pendingPr = rec.pending_pr == null ? 0 : safeNonNegative(rec.pending_pr);
    const usedPr = rec.use_pr == null ? 0 : safeNonNegative(rec.use_pr);
    const pkgValidityRec = safeNonNegative(rec.package_validity);
    const recEnd = rec.package_end_date ? String(rec.package_end_date).slice(0, 10) : null;
    const recNotExpired = recEnd && new Date(recEnd) >= new Date(today);

    let nextPrLimit;
    let nextUsePrLimit;
    let nextPending;
    let nextUsePr = usedPr;

    if (recNotExpired) {
      nextPrLimit = creditsToAdd + prLimit;
      nextUsePrLimit = creditsToAdd + prUserLimit;
      nextPending = pendingPr > 0 ? creditsToAdd + pendingPr : pendingPr;
    } else {
      nextPrLimit = creditsToAdd;
      nextUsePrLimit = creditsToAdd;
      nextUsePr = 0;
      nextPending = 0;
    }

    nextUsePrLimit = safeNonNegative(nextUsePrLimit);
    nextPending = safeNonNegative(nextPending);
    const recValidity = pkgValidityRec + packageValidityMaster;
    const recEndDate = addDaysSqlDate(today, packageValidityMaster);

    await conn.query(
      `UPDATE master_pr_record SET
        price_usd = ?, pr_limit = ?, usepr_limit = ?, use_pr = ?, pending_pr = ?,
        payment_method = ?, payment_id = ?, status = 1, active = 1,
        package_validity = ?, package_end_date = ?
      WHERE id = ?`,
      [
        price,
        nextPrLimit,
        nextUsePrLimit,
        nextUsePr,
        nextPending,
        paymentMethod,
        paymentId,
        recValidity,
        recEndDate,
        rec.id
      ]
    );
  } else {
    const recEnd = addDaysSqlDate(today, packageValidityMaster);
    await conn.query(
      `INSERT INTO master_pr_record
      (user_id, package_id, price_usd, pr_limit, usepr_limit, use_pr, pending_pr,
       payment_method, payment_id, created_by, status, active, package_validity, package_start_date, package_end_date)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, 0, 1, 1, ?, ?, ?)`,
      [userId, packageId, price, creditsToAdd, creditsToAdd, paymentMethod, paymentId, packageValidityMaster, today, recEnd]
    );
  }

  const payStart = today;
  const payEnd = addDaysSqlDate(today, packageValidityMaster);
  let payId = null;
  try {
    const [payResult] = await conn.query(
      `INSERT INTO payments
      (payment_id, order_id, amount, usd_amount, status, payment_method, userid, package_id,
       offer_price_usd, orignal_price_inr, offer_code, offer_id, offer_value, offer_method,
       affiliate_or_offer, package_validity, package_start_date, package_end_date, date_current,
       signature_hash, reason, coinbase_network, coinbase_chargeid, coinbase_orderid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        orderId || paymentId,
        null,
        listPriceUsd,
        paymentStatus || "completed",
        paymentMethod,
        userId,
        packageId,
        paidUsd,
        null,
        couponMeta?.offer_code || null,
        couponMeta?.offer_id || null,
        couponMeta?.offer_value ?? null,
        couponMeta?.offer_method ?? null,
        couponMeta?.affiliate_or_offer ?? 0,
        packageValidityMaster,
        payStart,
        payEnd,
        today,
        signatureHash || null,
        reason || null,
        coinbaseMeta?.network || null,
        coinbaseMeta?.chargeId || null,
        coinbaseMeta?.orderId != null ? String(coinbaseMeta.orderId) : null
      ]
    );
    payId = payResult.insertId;
  } catch (payErr) {
    console.warn("payments insert:", payErr.message);
  }

  await conn.query("UPDATE master_user SET plan_id = ?, pr = ?, reason = ? WHERE id = ?", [
    packageId,
    creditsToAdd,
    reason,
    userId
  ]);

  if (couponMeta?.couponType === "offer") {
    await decrementCouponUsage(conn, couponMeta);
  }

  await recordAffiliateCouponUse(
    conn,
    couponMeta,
    userId,
    packageId,
    paymentId,
    paymentMethod,
    couponMeta?.grandTotal ?? usdAmount
  );

  return { packageName: pkg.pname, creditsAdded: creditsToAdd, payId };
}

module.exports = { fulfillPackagePurchase };
