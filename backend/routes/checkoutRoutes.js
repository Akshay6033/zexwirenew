const express = require("express");
const router = express.Router();
const userAuth = require("../middleware/userAuth");
const checkoutController = require("../controllers/checkoutController");

router.use(userAuth);

router.post("/start", checkoutController.startCheckout);
router.get("/:token", checkoutController.getCheckout);
router.post("/:token/coupon", checkoutController.applyCoupon);
router.post("/:token/redeem", checkoutController.redeemCode);
router.post("/:token/payment-methods", checkoutController.getPaymentMethods);
router.get("/:token/payment-methods", checkoutController.getPaymentMethods);
router.post("/:token/razorpay/order", checkoutController.createRazorpayOrder);
router.post("/:token/razorpay/verify", checkoutController.verifyRazorpayPayment);
router.post("/:token/paypal/create", checkoutController.createPaypalOrder);
router.get("/:token/paypal/capture", checkoutController.capturePaypalPayment);
router.post("/:token/paypal/capture", checkoutController.capturePaypalPayment);
router.post("/:token/stripe/intent", checkoutController.createStripePaymentIntent);
router.post("/:token/stripe/confirm", checkoutController.confirmStripePayment);
router.post("/:token/coinbase/create", checkoutController.createCoinbaseCharge);
router.post("/:token/coinbase/complete", checkoutController.completeCoinbasePayment);
router.get("/:token/coinbase/complete", checkoutController.completeCoinbasePayment);
router.post("/:token/coinbase/cancel", checkoutController.cancelCoinbasePayment);

module.exports = router;
