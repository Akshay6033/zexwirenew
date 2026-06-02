const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");
const publicAuthController = require("../controllers/publicAuthController");

router.get("/newsroom", publicController.getNewsroomFeed);
router.get("/newsroom/:slug", publicController.getNewsroomArticle);
router.get("/pricing", publicController.getPricing);
router.post("/newsletter", publicController.subscribeNewsletter);

router.get("/auth/country-codes", publicAuthController.getCountryCodes);
router.post("/auth/sign-up", publicAuthController.signUp);
router.post("/auth/sign-in", publicAuthController.signIn);
router.post("/auth/verify-email-otp", publicAuthController.verifyEmailOtp);
router.post("/auth/resend-email-otp", publicAuthController.resendEmailOtp);
router.post("/auth/forgot-password", publicAuthController.forgotPassword);
router.post("/auth/reset-password/:id", publicAuthController.resetPassword);

module.exports = router;
