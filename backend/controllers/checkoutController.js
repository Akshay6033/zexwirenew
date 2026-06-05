const crypto = require("crypto");
const pool = require("../config/db").promise();
const { signCheckoutToken, verifyCheckoutToken } = require("../utils/checkoutToken");
const checkoutCouponService = require("../services/checkoutCouponService");
const userRedeemService = require("../services/userRedeemService");
const purchaseFulfillment = require("../services/purchaseFulfillmentService");
const coinbaseCommerce = require("../services/coinbaseCommerceService");

async function fetchRazorpayPayment(paymentId, keys) {
  const auth = Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.description || "Could not verify payment with Razorpay.";
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Matches legacy Razorpay_pay.php: live keys for all users except RAZORPAY_TEST_USER_IDS. */
function getRazorpayKeys(userId) {
  const testUsers = (process.env.RAZORPAY_TEST_USER_IDS || "651,501,3331,2688")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => n > 0);
  const forceTest = process.env.RAZORPAY_MODE === "test";
  const useTest = forceTest || testUsers.includes(Number(userId));

  if (useTest) {
    return {
      keyId: process.env.RAZORPAY_TEST_KEY_ID || "",
      keySecret: process.env.RAZORPAY_TEST_KEY_SECRET || ""
    };
  }
  return {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || ""
  };
}

/** Matches legacy Paypal.php + application/config/paypal.php (live default; sandbox for test user ids). */
function getPaypalConfig(userId) {
  const testUsers = (process.env.PAYPAL_TEST_USER_IDS || process.env.RAZORPAY_TEST_USER_IDS || "651,501,3331,2688")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => n > 0);
  const forceSandbox = process.env.PAYPAL_MODE === "sandbox";
  const useSandbox = forceSandbox || testUsers.includes(Number(userId));

  if (useSandbox) {
    return {
      clientId: process.env.PAYPAL_SANDBOX_CLIENT_ID || "",
      secret: process.env.PAYPAL_SANDBOX_CLIENT_SECRET || "",
      mode: "sandbox",
      base: "https://api-m.sandbox.paypal.com"
    };
  }
  return {
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    secret: process.env.PAYPAL_CLIENT_SECRET || "",
    mode: "live",
    base: "https://api-m.paypal.com"
  };
}

async function getPaypalAccessToken(config) {
  if (!config.clientId || !config.secret) {
    throw new Error("PayPal is not configured.");
  }
  const tokenRes = await fetch(`${config.base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    const msg = tokenData?.error_description || tokenData?.error || "PayPal auth failed.";
    throw new Error(msg);
  }
  return tokenData.access_token;
}

/** Matches legacy application/config/stripe.php (live default; test for STRIPE_TEST_USER_IDS). */
function getStripeKeys(userId) {
  const testUsers = (process.env.STRIPE_TEST_USER_IDS || process.env.RAZORPAY_TEST_USER_IDS || "651,501,3331,2688")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => n > 0);
  const forceTest = process.env.STRIPE_MODE === "test";
  const useTest = forceTest || testUsers.includes(Number(userId));

  if (useTest) {
    return {
      publishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY || "",
      secretKey: process.env.STRIPE_TEST_SECRET_KEY || ""
    };
  }
  return {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    secretKey: process.env.STRIPE_SECRET_KEY || ""
  };
}

async function stripeApi(secretKey, path, formParams = null) {
  const opts = {
    method: formParams ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  };
  if (formParams) opts.body = new URLSearchParams(formParams).toString();
  const res = await fetch(`https://api.stripe.com/v1${path}`, opts);
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || "Stripe request failed.";
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function loadCheckoutContext(userId, packageId, couponState = null) {
  const [pkgRows] = await pool.query(
    `SELECT id, pname, pdes, price, package_validity, n_press_rel, active
     FROM master_package WHERE id = ? AND active = 1 LIMIT 1`,
    [packageId]
  );
  if (!pkgRows.length) return null;

  const [userRows] = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.mobile, u.location, cc.iso_code
     FROM master_user u
     LEFT JOIN country_code cc ON cc.country_code_id = u.countrycodeid
     WHERE u.id = ? AND u.active != 2 LIMIT 1`,
    [userId]
  );
  if (!userRows.length) return null;

  const pkg = pkgRows[0];
  const basePrice = Number(pkg.price) || 0;
  const discount = couponState?.discountAmount || 0;
  const grandTotal = Math.max(0, basePrice - discount);

  return {
    package: {
      id: pkg.id,
      pname: pkg.pname,
      price: basePrice,
      package_validity: pkg.package_validity,
      n_press_rel: pkg.n_press_rel
    },
    user: userRows[0],
    pricing: {
      basePrice,
      discountAmount: discount,
      grandTotal,
      couponCode: couponState?.couponCode || "",
      couponMeta: couponState?.couponMeta || null
    }
  };
}

exports.startCheckout = async (req, res) => {
  try {
    const packageId = Number(req.body.package_id);
    const userId = req.userId;
    if (!packageId) return res.status(400).json({ status: false, message: "Package is required." });

    const [pkg] = await pool.query("SELECT id FROM master_package WHERE id = ? AND active = 1 LIMIT 1", [
      packageId
    ]);
    if (!pkg.length) return res.status(404).json({ status: false, message: "Package not found." });

    const token = signCheckoutToken(userId, packageId);
    return res.json({
      status: true,
      data: { token, checkoutUrl: `/checkout/${token}` }
    });
  } catch (err) {
    console.error("startCheckout:", err);
    return res.status(500).json({ status: false, message: "Could not start checkout." });
  }
};

exports.getCheckout = async (req, res) => {
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    const couponCode = String(req.query.coupon || "").trim();
    let couponState = null;
    if (couponCode) {
      const applied = await checkoutCouponService.validateDiscountCoupon(userId, packageId, couponCode);
      if (applied.status) {
        couponState = {
          discountAmount: applied.discountAmount,
          couponCode,
          couponMeta: { ...applied.couponMeta, couponType: applied.couponType, grandTotal: applied.grandTotal }
        };
      }
    }

    const ctx = await loadCheckoutContext(userId, packageId, couponState);
    if (!ctx) return res.status(404).json({ status: false, message: "Checkout data not found." });

    return res.json({ status: true, data: ctx });
  } catch (err) {
    console.error("getCheckout:", err);
    return res.status(400).json({ status: false, message: err.message || "Invalid checkout session." });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    const result = await checkoutCouponService.validateDiscountCoupon(
      userId,
      packageId,
      req.body.offer_code
    );
    if (!result.status) {
      return res.status(400).json({ status: false, message: result.message });
    }

    const couponState = {
      discountAmount: result.discountAmount,
      couponCode: String(req.body.offer_code || "").trim(),
      couponMeta: { ...result.couponMeta, couponType: result.couponType, grandTotal: result.grandTotal }
    };
    const ctx = await loadCheckoutContext(userId, packageId, couponState);
    return res.json({ status: true, message: result.message, data: ctx });
  } catch (err) {
    console.error("applyCoupon:", err);
    return res.status(400).json({ status: false, message: err.message || "Could not apply coupon." });
  }
};

exports.redeemCode = async (req, res) => {
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    const pendingCoupon = String(req.body.offer_code || "").trim();
    if (pendingCoupon) {
      const applied = await checkoutCouponService.validateDiscountCoupon(userId, packageId, pendingCoupon);
      if (applied.status) {
        return res.status(400).json({
          status: false,
          message: "A discount coupon is already applied. Remove it before using a redemption code."
        });
      }
    }

    const result = await userRedeemService.redeemCodeForUser(userId, req.body.code_name, {
      requirePackageId: packageId
    });
    if (!result.status) {
      return res.status(400).json({ status: false, message: result.message });
    }
    return res.json({ status: true, message: result.message, data: { packageNames: result.packageNames } });
  } catch (err) {
    console.error("redeemCode:", err);
    return res.status(400).json({ status: false, message: err.message || "Could not redeem code." });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const { userId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    const couponCode = String(req.body?.offer_code || req.query?.offer_code || "").trim();
    let couponState = null;
    if (couponCode) {
      const { packageId } = verifyCheckoutToken(req.params.token);
      const applied = await checkoutCouponService.validateDiscountCoupon(userId, packageId, couponCode);
      if (applied.status) {
        couponState = {
          discountAmount: applied.discountAmount,
          couponCode,
          couponMeta: { ...applied.couponMeta, couponType: applied.couponType, grandTotal: applied.grandTotal }
        };
      }
    }

    const { packageId } = verifyCheckoutToken(req.params.token);
    const ctx = await loadCheckoutContext(userId, packageId, couponState);
    if (!ctx) return res.status(404).json({ status: false, message: "Checkout not found." });

    const [methods] = await pool.query("SELECT * FROM master_payment_method ORDER BY id ASC");
    const available = [];

    for (const m of methods) {
      if (Number(m.active) !== 1) continue;
      const id = Number(m.id);
      if (id === 4) {
        const allowed = String(m.auth_user_ids || "")
          .split(",")
          .map((v) => Number(v.trim()))
          .filter((n) => n > 0);
        if (!allowed.includes(userId)) continue;
      }
      let slug = "other";
      if (id === 1) slug = "razorpay";
      else if (id === 2) slug = "paypal";
      else if (id === 3) slug = "stripe";
      else if (id === 4) slug = "coinbase";
      available.push({
        id,
        name: m.PaymentMethod,
        slug
      });
    }

    return res.json({
      status: true,
      data: {
        checkout: ctx,
        paymentMethods: available,
        offer_code: couponState?.couponCode || ""
      }
    });
  } catch (err) {
    console.error("getPaymentMethods:", err);
    return res.status(400).json({ status: false, message: err.message || "Could not load payment methods." });
  }
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    let couponState = null;
    const couponCode = String(req.body.offer_code || "").trim();
    if (couponCode) {
      const applied = await checkoutCouponService.validateDiscountCoupon(userId, packageId, couponCode);
      if (!applied.status) {
        return res.status(400).json({ status: false, message: applied.message });
      }
      couponState = {
        discountAmount: applied.discountAmount,
        couponCode,
        couponMeta: { ...applied.couponMeta, couponType: applied.couponType, grandTotal: applied.grandTotal }
      };
    }

    const ctx = await loadCheckoutContext(userId, packageId, couponState);
    if (!ctx) return res.status(404).json({ status: false, message: "Package not found." });

    const amountUsd = ctx.pricing.grandTotal;
    if (amountUsd <= 0) {
      return res.status(400).json({ status: false, message: "Nothing to pay. Use redemption code or adjust coupon." });
    }

    const keys = getRazorpayKeys(userId);
    if (!keys.keyId || !keys.keySecret) {
      return res.status(503).json({ status: false, message: "Razorpay is not configured." });
    }

    const amountCents = Math.round(amountUsd * 100);
    const receipt = `chk_${userId}_${packageId}_${Date.now()}`;
    const auth = Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64");

    const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: "USD",
        receipt,
        payment_capture: 1,
        notes: { userId: String(userId), packageId: String(packageId) }
      })
    });

    const rpData = await rpRes.json();
    if (!rpRes.ok) {
      const rpMsg = rpData?.error?.description || rpData?.error?.reason || "Could not create Razorpay order.";
      console.error("Razorpay order error:", rpData);
      const hint =
        rpMsg.toLowerCase().includes("authentication") || rpRes.status === 401
          ? " Check Key ID and Secret in backend .env (Razorpay Dashboard → API Keys)."
          : "";
      return res.status(502).json({ status: false, message: `${rpMsg}${hint}` });
    }

    return res.json({
      status: true,
      data: {
        keyId: keys.keyId,
        orderId: rpData.id,
        amount: amountCents,
        currency: "USD",
        user: ctx.user,
        package: ctx.package,
        offer_code: couponState?.couponCode || ""
      }
    });
  } catch (err) {
    console.error("createRazorpayOrder:", err);
    return res.status(500).json({ status: false, message: err.message || "Razorpay error." });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, offer_code } = req.body;
    const keys = getRazorpayKeys(userId);
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", keys.keySecret)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ status: false, message: "Payment verification failed." });
    }

    if (!keys.keyId || !keys.keySecret) {
      return res.status(503).json({ status: false, message: "Razorpay is not configured." });
    }

    let payment;
    try {
      payment = await fetchRazorpayPayment(razorpay_payment_id, keys);
    } catch (fetchErr) {
      console.error("fetchRazorpayPayment:", fetchErr.message);
      return res.status(502).json({ status: false, message: fetchErr.message });
    }

    if (!["authorized", "captured"].includes(payment.status)) {
      return res.status(400).json({ status: false, message: "Payment was not completed." });
    }

    let couponState = null;
    if (offer_code) {
      const applied = await checkoutCouponService.validateDiscountCoupon(userId, packageId, offer_code);
      if (applied.status) {
        couponState = {
          discountAmount: applied.discountAmount,
          couponMeta: { ...applied.couponMeta, couponType: applied.couponType, grandTotal: applied.grandTotal }
        };
      }
    }

    const ctx = await loadCheckoutContext(userId, packageId, couponState);
    const [pkg] = await pool.query(
      "SELECT n_press_rel FROM master_package WHERE id = ? LIMIT 1",
      [packageId]
    );

    await conn.beginTransaction();
    const [user] = await conn.query(
      "SELECT first_name, last_name FROM master_user WHERE id = ? LIMIT 1",
      [userId]
    );
    const whoLabel = `${user[0]?.first_name || ""} ${user[0]?.last_name || ""}`.trim() || "User";

    await purchaseFulfillment.fulfillPackagePurchase(conn, {
      userId,
      packageId,
      prCredits: Number(pkg[0]?.n_press_rel) || 0,
      usdAmount: ctx?.pricing?.grandTotal ?? 0,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      signatureHash: razorpay_signature,
      paymentStatus: payment.status,
      paymentMethod: "Razorpay",
      reason: `Buy online payment id:-${razorpay_payment_id}`,
      whoLabel,
      couponMeta: couponState?.couponMeta
        ? { ...couponState.couponMeta, grandTotal: ctx?.pricing?.grandTotal }
        : null
    });

    await conn.commit();
    return res.json({
      status: true,
      message: "Payment successful",
      data: { paymentId: razorpay_payment_id, redirectUrl: `/checkout/success/${razorpay_payment_id}` }
    });
  } catch (err) {
    await conn.rollback();
    console.error("verifyRazorpayPayment:", err);
    return res.status(500).json({ status: false, message: err.message || "Could not complete payment." });
  } finally {
    conn.release();
  }
};

exports.createPaypalOrder = async (req, res) => {
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    let couponState = null;
    const couponCode = String(req.body.offer_code || "").trim();
    if (couponCode) {
      const applied = await checkoutCouponService.validateDiscountCoupon(userId, packageId, couponCode);
      if (!applied.status) {
        return res.status(400).json({ status: false, message: applied.message });
      }
      couponState = {
        discountAmount: applied.discountAmount,
        couponCode,
        couponMeta: { ...applied.couponMeta, couponType: applied.couponType, grandTotal: applied.grandTotal }
      };
    }

    const ctx = await loadCheckoutContext(userId, packageId, couponState);
    if (!ctx || ctx.pricing.grandTotal <= 0) {
      return res.status(400).json({ status: false, message: "Invalid payment amount." });
    }

    const paypal = getPaypalConfig(userId);
    let accessToken;
    try {
      accessToken = await getPaypalAccessToken(paypal);
    } catch (authErr) {
      console.error("PayPal auth:", authErr.message);
      return res.status(503).json({ status: false, message: authErr.message });
    }

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const returnUrl = `${frontendBase}/checkout/${req.params.token}/paypal/return`;
    const cancelUrl = `${frontendBase}/checkout/failed`;

    const orderRes = await fetch(`${paypal.base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: String(ctx.pricing.grandTotal.toFixed(2))
            },
            description: ctx.package.pname
          }
        ],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: "ZEXPRWIRE",
          user_action: "PAY_NOW"
        }
      })
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      const ppMsg = orderData?.message || orderData?.details?.[0]?.description || "Could not create PayPal order.";
      console.error("PayPal order:", orderData);
      return res.status(502).json({ status: false, message: ppMsg });
    }

    const approveLink = (orderData.links || []).find((l) => l.rel === "approve")?.href;
    return res.json({
      status: true,
      data: {
        approvalUrl: approveLink,
        orderId: orderData.id,
        offer_code: couponState?.couponCode || ""
      }
    });
  } catch (err) {
    console.error("createPaypalOrder:", err);
    return res.status(500).json({ status: false, message: err.message || "PayPal error." });
  }
};

exports.capturePaypalPayment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    const paypalOrderId = String(
      req.query.token || req.body.token || req.body.paypal_order_id || ""
    ).trim();
    if (!paypalOrderId) {
      return res.status(400).json({ status: false, message: "PayPal order id required." });
    }

    const paypal = getPaypalConfig(userId);
    let accessToken;
    try {
      accessToken = await getPaypalAccessToken(paypal);
    } catch (authErr) {
      console.error("PayPal auth:", authErr.message);
      return res.status(503).json({ status: false, message: authErr.message });
    }

    const capRes = await fetch(`${paypal.base}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });
    const capData = await capRes.json();
    if (!capRes.ok || capData.status !== "COMPLETED") {
      const ppMsg = capData?.message || capData?.details?.[0]?.description || "PayPal payment was not completed.";
      console.error("PayPal capture:", capData);
      return res.status(400).json({ status: false, message: ppMsg });
    }

    const capture = capData.purchase_units?.[0]?.payments?.captures?.[0];
    const paymentId = capture?.id || paypalOrderId;
    const paidAmount = Number(capture?.amount?.value || 0);

    let couponState = null;
    const couponCode = String(req.query.offer_code || req.body.offer_code || "").trim();
    if (couponCode) {
      const applied = await checkoutCouponService.validateDiscountCoupon(userId, packageId, couponCode);
      if (applied.status) {
        couponState = {
          couponMeta: { ...applied.couponMeta, couponType: applied.couponType, grandTotal: applied.grandTotal }
        };
      }
    }

    const [pkg] = await pool.query("SELECT n_press_rel FROM master_package WHERE id = ? LIMIT 1", [packageId]);
    const [user] = await conn.query("SELECT first_name, last_name FROM master_user WHERE id = ? LIMIT 1", [userId]);
    const whoLabel = `${user[0]?.first_name || ""} ${user[0]?.last_name || ""}`.trim() || "User";

    await conn.beginTransaction();
    await purchaseFulfillment.fulfillPackagePurchase(conn, {
      userId,
      packageId,
      prCredits: Number(pkg[0]?.n_press_rel) || 0,
      usdAmount: paidAmount,
      paymentId,
      orderId: paypalOrderId,
      paymentStatus: capData.payer?.status || capData.status || "completed",
      paymentMethod: "PayPal",
      reason: `Buy online payment id:-${paymentId}`,
      whoLabel,
      couponMeta: couponState?.couponMeta
        ? { ...couponState.couponMeta, grandTotal: paidAmount }
        : null
    });
    await conn.commit();

    return res.json({
      status: true,
      data: { paymentId, redirectUrl: `/checkout/success/${paymentId}` }
    });
  } catch (err) {
    await conn.rollback();
    console.error("capturePaypalPayment:", err);
    return res.status(500).json({ status: false, message: err.message || "PayPal capture failed." });
  } finally {
    conn.release();
  }
};

exports.createStripePaymentIntent = async (req, res) => {
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    let couponState = null;
    const couponCode = String(req.body.offer_code || "").trim();
    if (couponCode) {
      const applied = await checkoutCouponService.validateDiscountCoupon(userId, packageId, couponCode);
      if (!applied.status) {
        return res.status(400).json({ status: false, message: applied.message });
      }
      couponState = {
        discountAmount: applied.discountAmount,
        couponCode,
        couponMeta: { ...applied.couponMeta, couponType: applied.couponType, grandTotal: applied.grandTotal }
      };
    }

    const ctx = await loadCheckoutContext(userId, packageId, couponState);
    if (!ctx || ctx.pricing.grandTotal <= 0) {
      return res.status(400).json({ status: false, message: "Invalid payment amount." });
    }

    const keys = getStripeKeys(userId);
    if (!keys.publishableKey || !keys.secretKey) {
      return res.status(503).json({ status: false, message: "Stripe is not configured." });
    }

    const amountCents = Math.round(ctx.pricing.grandTotal * 100);
    const intent = await stripeApi(keys.secretKey, "/payment_intents", {
      amount: String(amountCents),
      currency: "usd",
      description: ctx.package.pname,
      "payment_method_types[]": "card",
      "metadata[userId]": String(userId),
      "metadata[packageId]": String(packageId),
      "metadata[checkoutToken]": req.params.token,
      "metadata[offer_code]": couponState?.couponCode || ""
    });

    return res.json({
      status: true,
      data: {
        clientSecret: intent.client_secret,
        publishableKey: keys.publishableKey,
        paymentIntentId: intent.id,
        amount: amountCents,
        currency: "usd",
        offer_code: couponState?.couponCode || ""
      }
    });
  } catch (err) {
    console.error("createStripePaymentIntent:", err);
    return res.status(err.status === 503 ? 503 : 502).json({
      status: false,
      message: err.message || "Could not create Stripe payment."
    });
  }
};

exports.confirmStripePayment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    const paymentIntentId = String(req.body.payment_intent_id || "").trim();
    if (!paymentIntentId) {
      return res.status(400).json({ status: false, message: "Payment intent id required." });
    }

    const keys = getStripeKeys(userId);
    if (!keys.secretKey) {
      return res.status(503).json({ status: false, message: "Stripe is not configured." });
    }

    const intent = await stripeApi(keys.secretKey, `/payment_intents/${encodeURIComponent(paymentIntentId)}`);
    if (intent.status !== "succeeded") {
      return res.status(400).json({ status: false, message: "Stripe payment was not completed." });
    }

    if (String(intent.metadata?.userId) !== String(userId) || String(intent.metadata?.packageId) !== String(packageId)) {
      return res.status(400).json({ status: false, message: "Payment session mismatch." });
    }

    const paidAmount = (Number(intent.amount_received) || Number(intent.amount) || 0) / 100;
    const offerCode = String(req.body.offer_code || intent.metadata?.offer_code || "").trim();

    let couponState = null;
    if (offerCode) {
      const applied = await checkoutCouponService.validateDiscountCoupon(userId, packageId, offerCode);
      if (applied.status) {
        couponState = {
          discountAmount: applied.discountAmount,
          couponMeta: { ...applied.couponMeta, couponType: applied.couponType, grandTotal: applied.grandTotal }
        };
      }
    }

    const ctx = await loadCheckoutContext(userId, packageId, couponState);
    const expected = ctx?.pricing?.grandTotal;
    if (expected != null && Math.abs(Number(expected) - paidAmount) > 0.02) {
      return res.status(400).json({ status: false, message: "Paid amount does not match checkout total." });
    }

    const paymentId =
      (typeof intent.latest_charge === "string" && intent.latest_charge) || intent.id;

    const [pkg] = await pool.query("SELECT n_press_rel FROM master_package WHERE id = ? LIMIT 1", [packageId]);
    const [user] = await conn.query("SELECT first_name, last_name FROM master_user WHERE id = ? LIMIT 1", [userId]);
    const whoLabel = `${user[0]?.first_name || ""} ${user[0]?.last_name || ""}`.trim() || "User";

    await conn.beginTransaction();
    await purchaseFulfillment.fulfillPackagePurchase(conn, {
      userId,
      packageId,
      prCredits: Number(pkg[0]?.n_press_rel) || 0,
      usdAmount: paidAmount,
      paymentId,
      orderId: paymentId,
      paymentStatus: intent.status,
      paymentMethod: "Stripe",
      reason: `Buy online payment id:-${paymentId}`,
      whoLabel,
      couponMeta: couponState?.couponMeta
        ? { ...couponState.couponMeta, grandTotal: paidAmount }
        : null
    });
    await conn.commit();

    return res.json({
      status: true,
      message: "Payment successful",
      data: { paymentId, redirectUrl: `/checkout/success/${paymentId}` }
    });
  } catch (err) {
    await conn.rollback();
    console.error("confirmStripePayment:", err);
    return res.status(500).json({ status: false, message: err.message || "Stripe confirmation failed." });
  } finally {
    conn.release();
  }
};

async function resolveCouponMetaFromOrder(conn, userId, packageId, offerId, affiliateOrOffer) {
  if (!offerId) return null;

  if (Number(affiliateOrOffer) === 1) {
    const [rows] = await conn.query(
      "SELECT affiliate_coupon_id, affiliate_coupon_code FROM affiliate_coupons WHERE affiliate_coupon_id = ? LIMIT 1",
      [offerId]
    );
    if (!rows.length) return null;
    return {
      offer_id: rows[0].affiliate_coupon_id,
      offer_code: rows[0].affiliate_coupon_code,
      offer_method: 1,
      offer_value: 5,
      affiliate_or_offer: 1,
      couponType: "affiliate"
    };
  }

  const [rows] = await conn.query(
    "SELECT id, c_code, c_discount, c_value FROM master_offer WHERE id = ? LIMIT 1",
    [offerId]
  );
  if (!rows.length) return null;
  const o = rows[0];
  return {
    offer_id: o.id,
    offer_code: o.c_code,
    offer_method: Number(o.c_discount),
    offer_value: Number(o.c_value),
    affiliate_or_offer: 0,
    couponType: "offer"
  };
}

exports.createCoinbaseCharge = async (req, res) => {
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    if (!coinbaseCommerce.getApiKey()) {
      return res.status(503).json({ status: false, message: "Coinbase Commerce is not configured." });
    }

    let couponState = null;
    const couponCode = String(req.body.offer_code || "").trim();
    if (couponCode) {
      const applied = await checkoutCouponService.validateDiscountCoupon(userId, packageId, couponCode);
      if (!applied.status) {
        return res.status(400).json({ status: false, message: applied.message });
      }
      couponState = {
        discountAmount: applied.discountAmount,
        couponCode,
        couponMeta: { ...applied.couponMeta, couponType: applied.couponType, grandTotal: applied.grandTotal }
      };
    }

    const ctx = await loadCheckoutContext(userId, packageId, couponState);
    if (!ctx || ctx.pricing.grandTotal <= 0) {
      return res.status(400).json({ status: false, message: "Invalid payment amount." });
    }

    const offerId = couponState?.couponMeta?.offer_id || null;
    const affiliateOrOffer =
      couponState?.couponMeta?.affiliate_or_offer ??
      (couponState?.couponMeta?.couponType === "affiliate"
        ? 1
        : couponState
          ? 0
          : null);

    const [orderIns] = await pool.query(
      `INSERT INTO coinbase_order (coinpack_id, coinuser_id, coinoffer_id, coinaffiliate_or_offer, coinstatus)
       VALUES (?, ?, ?, ?, 0)`,
      [packageId, userId, offerId, affiliateOrOffer]
    );
    const coinbaseOid = orderIns.insertId;

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = `${frontendBase}/checkout/${req.params.token}/coinbase/return?oid=${coinbaseOid}`;
    const cancelUrl = `${frontendBase}/checkout/${req.params.token}/coinbase/return?oid=${coinbaseOid}&cancel=1`;

    const chargeRes = await coinbaseCommerce.createCharge({
      name: ctx.package.pname,
      description: `${ctx.package.pname} $${ctx.pricing.grandTotal}`,
      amountUsd: ctx.pricing.grandTotal,
      redirectUrl,
      cancelUrl
    });

    const code = chargeRes?.data?.code;
    const hostedUrl = chargeRes?.data?.hosted_url || (code ? `https://commerce.coinbase.com/charges/${code}` : null);
    if (!code || !hostedUrl) {
      return res.status(502).json({ status: false, message: "Could not create Coinbase charge." });
    }

    await pool.query("UPDATE coinbase_order SET coincode = ? WHERE coinbase_oid = ?", [code, coinbaseOid]);

    return res.json({
      status: true,
      data: {
        hostedUrl,
        chargeCode: code,
        coinbaseOrderId: coinbaseOid,
        offer_code: couponState?.couponCode || ""
      }
    });
  } catch (err) {
    console.error("createCoinbaseCharge:", err);
    return res.status(err.status === 503 ? 503 : 502).json({
      status: false,
      message: err.message || "Could not start Coinbase payment."
    });
  }
};

exports.cancelCoinbasePayment = async (req, res) => {
  try {
    const { userId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    const oid = Number(req.body.coinbase_order_id || req.query.oid);
    if (!oid) {
      return res.status(400).json({ status: false, message: "Order id required." });
    }

    await pool.query(
      "UPDATE coinbase_order SET coinstatus = 2 WHERE coinbase_oid = ? AND coinuser_id = ? AND coinstatus = 0",
      [oid, userId]
    );

    return res.json({ status: true, message: "Payment cancelled." });
  } catch (err) {
    console.error("cancelCoinbasePayment:", err);
    return res.status(500).json({ status: false, message: err.message || "Could not cancel." });
  }
};

exports.completeCoinbasePayment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { userId, packageId } = verifyCheckoutToken(req.params.token);
    if (userId !== req.userId) {
      return res.status(403).json({ status: false, message: "Invalid checkout session." });
    }

    const oid = Number(req.body.coinbase_order_id || req.query.oid);
    if (!oid) {
      return res.status(400).json({ status: false, message: "Order id required." });
    }

    if (String(req.body.cancel || req.query.cancel) === "1") {
      await pool.query(
        "UPDATE coinbase_order SET coinstatus = 2 WHERE coinbase_oid = ? AND coinuser_id = ? AND coinstatus = 0",
        [oid, userId]
      );
      return res.status(400).json({ status: false, message: "Payment was cancelled.", cancelled: true });
    }

    await conn.beginTransaction();
    const [orderRows] = await conn.query(
      `SELECT * FROM coinbase_order
       WHERE coinbase_oid = ? AND coinuser_id = ? AND coinpack_id = ? AND coinstatus = 0
       FOR UPDATE`,
      [oid, userId, packageId]
    );
    if (!orderRows.length) {
      await conn.rollback();
      return res.status(400).json({ status: false, message: "Order not found or already processed." });
    }
    const order = orderRows[0];
    if (!order.coincode) {
      await conn.rollback();
      return res.status(400).json({ status: false, message: "Coinbase charge not found." });
    }

    const chargeRes = await coinbaseCommerce.getCharge(order.coincode);
    const payments = chargeRes?.data?.payments || [];
    if (!payments.length) {
      await conn.rollback();
      return res.status(202).json({
        status: false,
        pending: true,
        message: "Payment not confirmed yet. Please wait a moment and try again."
      });
    }

    const payment = payments[0];
    const paymentId = payment.payment_id;
    const transactionId = payment.transaction_id;
    const paymentStatus = payment.status || "completed";
    const coinbaseNetwork = payment.network || null;

    let couponMeta = await resolveCouponMetaFromOrder(
      conn,
      userId,
      packageId,
      order.coinoffer_id,
      order.coinaffiliate_or_offer
    );

    let paidAmount = null;
    if (couponMeta) {
      const applied = await checkoutCouponService.validateDiscountCoupon(
        userId,
        packageId,
        couponMeta.offer_code
      );
      if (applied.status) {
        paidAmount = applied.grandTotal;
        couponMeta = { ...couponMeta, grandTotal: applied.grandTotal };
      }
    }
    if (paidAmount == null) {
      const ctx = await loadCheckoutContext(userId, packageId, null);
      paidAmount = ctx?.pricing?.grandTotal ?? 0;
    }

    const [pkg] = await conn.query("SELECT n_press_rel FROM master_package WHERE id = ? LIMIT 1", [packageId]);
    const [user] = await conn.query("SELECT first_name, last_name FROM master_user WHERE id = ? LIMIT 1", [userId]);
    const whoLabel = `${user[0]?.first_name || ""} ${user[0]?.last_name || ""}`.trim() || "User";

    await conn.query("UPDATE coinbase_order SET coinstatus = 1 WHERE coinbase_oid = ?", [oid]);

    await purchaseFulfillment.fulfillPackagePurchase(conn, {
      userId,
      packageId,
      prCredits: Number(pkg[0]?.n_press_rel) || 0,
      usdAmount: paidAmount,
      paymentId,
      orderId: transactionId || paymentId,
      paymentStatus,
      paymentMethod: "Coinbase",
      reason: `Buy online payment id:-${paymentId}`,
      whoLabel,
      couponMeta,
      coinbaseMeta: {
        network: coinbaseNetwork,
        chargeId: order.coincode,
        orderId: oid
      }
    });

    await conn.commit();
    return res.json({
      status: true,
      message: "Payment successful",
      data: { paymentId, redirectUrl: `/checkout/success/${paymentId}` }
    });
  } catch (err) {
    await conn.rollback();
    console.error("completeCoinbasePayment:", err);
    return res.status(500).json({ status: false, message: err.message || "Coinbase completion failed." });
  } finally {
    conn.release();
  }
};
