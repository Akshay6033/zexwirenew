const jwt = require("jsonwebtoken");
const publicAuthModel = require("../models/publicAuthModel");

const JWT_SECRET = process.env.USER_JWT_SECRET || process.env.JWT_SECRET || "dev_user_secret_change_me";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{7,14}$/;
const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

function signUserToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, type: "user" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

exports.getCountryCodes = async (req, res) => {
  try {
    const data = await publicAuthModel.getCountryCodes();
    return res.json({ status: true, data });
  } catch (err) {
    console.error("getCountryCodes", err);
    return res.status(500).json({ status: false, message: "Could not load country list." });
  }
};

exports.signUp = async (req, res) => {
  const first_name = String(req.body.first_name || "").trim();
  const last_name = String(req.body.last_name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const cpassword = String(req.body.cpassword || "");
  const location = String(req.body.location || "").trim();
  const mobile = String(req.body.mobile || "").trim();
  const countrycodeid = req.body.countrycodeid;

  if (!first_name || !last_name || !email || !password || !location || !mobile || !countrycodeid) {
    return res.status(400).json({ status: false, code: 0, message: "All required fields must be filled." });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ status: false, code: 0, message: "Please enter valid email." });
  }
  if (!PHONE_REGEX.test(mobile)) {
    return res.status(400).json({ status: false, code: 0, message: "Please enter valid phone number." });
  }
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      status: false,
      code: 0,
      message:
        "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character"
    });
  }
  if (password !== cpassword) {
    return res.status(400).json({ status: false, code: 0, message: "Password doesn't match" });
  }

  try {
    const existingEmail = await publicAuthModel.findUserByEmail(email);
    if (existingEmail) {
      return res.json({ status: false, code: 3, message: "Email id already exists!" });
    }

    const existingMobile = await publicAuthModel.findUserByMobile(mobile);
    if (existingMobile) {
      return res.json({ status: false, code: 4, message: "Mobile number already exists!" });
    }

    await publicAuthModel.createUser({
      first_name,
      last_name,
      email,
      password,
      location,
      mobile,
      countrycodeid
    });

    return res.json({ status: true, code: 1, message: "Registration successfully completed !" });
  } catch (err) {
    console.error("signUp", err);
    return res.status(500).json({ status: false, code: 0, message: "Something went wrong please try again!" });
  }
};

exports.signIn = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ status: false, code: 0, message: "Please enter valid email and password !" });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ status: false, code: 0, message: "Please enter valid email" });
  }

  try {
    const user = await publicAuthModel.findUserByEmail(email);
    if (!user) {
      return res.json({ status: false, code: 0, message: "Please enter valid email and password !" });
    }

    if (Number(user.active) === 2) {
      return res.json({
        status: false,
        code: 2,
        message: "Your account is deleted ! please contact authorized person "
      });
    }
    if (Number(user.active) === 3) {
      return res.json({
        status: false,
        code: 3,
        message: "Your account is suspended ! please contact authorized person"
      });
    }
    if (Number(user.active) !== 1) {
      return res.json({ status: false, code: 0, message: "Please enter valid email and password !" });
    }

    const hashed = publicAuthModel.md5(password);
    if (String(user.password) !== hashed && String(user.password) !== password) {
      return res.json({ status: false, code: 0, message: "Please enter valid email and password !" });
    }

    if (Number(user.email_verification) !== 1) {
      const sendCount = await publicAuthModel.incrementOtpSendCount(user.id);
      if (sendCount > 5) {
        return res.json({ status: false, code: 100, message: "OTP can't send over limit" });
      }
      const otp = generateOtp();
      await publicAuthModel.saveEmailVerificationOtp(user.id, otp);
      console.log(`Email verification OTP for ${user.email}: ${otp}`);
      return res.json({
        status: false,
        code: 99,
        userId: user.id,
        message: "Please verify your email with OTP."
      });
    }

    const token = signUserToken(user);
    return res.json({
      status: true,
      code: 1,
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        plan_id: Number(user.plan_id) || 0,
        pr: Number(user.pr) || 0,
        profile_image: user.profile_image || ""
      },
      message: "Login successfully!"
    });
  } catch (err) {
    console.error("signIn", err);
    return res.status(500).json({ status: false, code: 0, message: "Something went wrong please try agian!" });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  const userId = Number(req.body.userid || req.body.userId);
  const otp = String(req.body.email_verification_otp || req.body.otp || "").trim();

  if (!userId || !otp) {
    return res.status(400).json({ status: false, code: -1, message: "OTP is required." });
  }

  try {
    const user = await publicAuthModel.findUserById(userId);
    if (!user) {
      return res.json({ status: false, code: 0, message: "Something went wrong please try agian!" });
    }
    if (Number(user.active) === 2) {
      return res.json({
        status: false,
        code: 2,
        message: "Your account is deleted ! please contact authorized person "
      });
    }
    if (Number(user.active) === 3) {
      return res.json({
        status: false,
        code: 3,
        message: "Your account is suspended ! please contact authorized person"
      });
    }

    const savedOtp = await publicAuthModel.getEmailVerificationOtp(userId);
    if (!savedOtp || String(savedOtp) !== otp) {
      return res.json({ status: false, code: -2, message: "Enter Worng OTP Please try agian !" });
    }

    await publicAuthModel.markEmailVerified(userId);
    const token = signUserToken(user);
    return res.json({
      status: true,
      code: 1,
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        plan_id: Number(user.plan_id) || 0,
        pr: Number(user.pr) || 0,
        profile_image: user.profile_image || ""
      },
      message: "Email verified successfully"
    });
  } catch (err) {
    console.error("verifyEmailOtp", err);
    return res.status(500).json({ status: false, code: -1, message: "Something went wrong please try agian!" });
  }
};

exports.resendEmailOtp = async (req, res) => {
  const userId = Number(req.body.userid || req.body.userId);
  if (!userId) {
    return res.status(400).json({ status: false, code: 0, message: "User id is required." });
  }

  try {
    const user = await publicAuthModel.findUserById(userId);
    if (!user) {
      return res.json({ status: false, code: 0, message: "Something went wrong please try agian!" });
    }

    const sendCount = await publicAuthModel.incrementOtpSendCount(userId);
    if (sendCount > 5) {
      return res.json({ status: false, code: 100, message: "OTP can't send over limit" });
    }

    const otp = generateOtp();
    await publicAuthModel.saveEmailVerificationOtp(userId, otp);
    console.log(`Resent email verification OTP for user ${userId}: ${otp}`);

    return res.json({
      status: true,
      code: 99,
      message: "OTP has been send please verify your account !"
    });
  } catch (err) {
    console.error("resendEmailOtp", err);
    return res.status(500).json({ status: false, code: 0, message: "Something went wrong please try agian!" });
  }
};

exports.forgotPassword = async (req, res) => {
  const email = String(req.body.email || req.body.fpass || "").trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ status: false, message: "Please enter a valid registered email." });
  }

  try {
    const user = await publicAuthModel.findActiveUserByEmail(email);
    if (!user) {
      return res.json({ status: false, message: "Email ID not registered. Sign Up now!" });
    }

    const resetUrl = `${req.headers.origin || "http://localhost:5173"}/forg_password/${user.id}`;
    console.log(`Password reset link for ${email}: ${resetUrl}`);

    return res.json({
      status: true,
      message: "Password reset link sent to your email. Please check email inbox."
    });
  } catch (err) {
    console.error("forgotPassword", err);
    return res.status(500).json({ status: false, message: "Could not process forgot password request." });
  }
};

exports.resetPassword = async (req, res) => {
  const userId = Number(req.params.id || req.body.id);
  const password = String(req.body.password || "");

  if (!userId || !password) {
    return res.status(400).json({ status: false, message: "Password is required." });
  }
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      status: false,
      message:
        "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character"
    });
  }

  try {
    const user = await publicAuthModel.findUserById(userId);
    if (!user || Number(user.active) !== 1) {
      return res.json({ status: false, message: "Invalid reset link." });
    }

    await publicAuthModel.updatePassword(userId, password);
    return res.json({ status: true, message: "Password Updated Successfully" });
  } catch (err) {
    console.error("resetPassword", err);
    return res.status(500).json({ status: false, message: "Oops! Something went wrong. Please try again" });
  }
};
