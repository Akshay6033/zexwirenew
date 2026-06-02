const userModel = require("../models/authModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const PASSWORD_REGEX =
  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

exports.login = (req, res) => {
  const { username, password } = req.body;
  const userIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";

  userModel.findByUsername(username, async (err, result) => {
    if (err) {
      return res.status(401).json({
        message: "Either Username/Password is incorrect"
      });
    }

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid username" });
    }

    const user = result[0];

    let isMatch = false;
    try {
      // New system: bcrypt-hashed passwords
      isMatch = await bcrypt.compare(password, user.password);
    } catch (compareErr) {
      isMatch = false;
    }

    // Legacy CI data: plain-text password stored in DB
    if (!isMatch && password === user.password) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Either Username/Password is incorrect" });
    }

    const token = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    userModel.updateLastLogin(user.id, () => {});
    userModel.insertLoginLog(
      {
        ipAddress: userIP,
        username: user.username,
        userId: user.id
      },
      () => {}
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type
      }
    });
  });
};

exports.sendForgotPasswordOtp = (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ status: false, message: "Username is required." });
  }

  userModel.findByUsernameForOtp(username, (err, result) => {
    if (err) {
      return res.status(500).json({
        status: false,
        message: "Database connection failed. Please verify backend DB settings.",
        error: err.code || "DB_ERROR"
      });
    }
    if (!result.length) {
      return res.json({ status: false, message: "The username does not match." });
    }

    const user = result[0];
    const otp = Math.floor(100000 + Math.random() * 900000);

    userModel.saveOtp(user.id, otp, (otpErr) => {
      if (otpErr) {
        return res.status(500).json({ status: false, message: "Could not generate OTP." });
      }

      // TODO: integrate mail provider here (SendGrid/Nodemailer).
      console.log(`Forgot password OTP for ${user.username}: ${otp}`);

      return res.json({
        status: true,
        id: user.id,
        message: "An OTP has been sent to your valid email address. Please check your email."
      });
    });
  });
};

exports.updateForgotPassword = (req, res) => {
  const { id, otp, password } = req.body;

  if (!id || !otp || !password) {
    return res.status(400).json({ status: false, message: "Required fields are missing." });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      status: false,
      message:
        "Please set password 8 to 15 characters with uppercase, lowercase, number and special character."
    });
  }

  userModel.findById(id, async (err, result) => {
    if (err) {
      return res.status(500).json({
        status: false,
        message: "Database connection failed. Please verify backend DB settings.",
        error: err.code || "DB_ERROR"
      });
    }
    if (!result.length) {
      return res.json({ status: false, message: "Something went wrong." });
    }

    const user = result[0];
    if (String(user.otp) !== String(otp)) {
      return res.json({ status: false, message: "OTP does not match." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    userModel.updatePassword(user.id, hashedPassword, (updateErr) => {
      if (updateErr) {
        return res
          .status(500)
          .json({ status: false, message: "Password could not be updated." });
      }

      return res.json({
        status: true,
        message: "Your password has been successfully updated."
      });
    });
  });
};