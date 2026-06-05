const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.USER_JWT_SECRET || process.env.JWT_SECRET || "dev_user_secret_change_me";

function signCheckoutToken(userId, packageId) {
  return jwt.sign(
    { typ: "checkout", uid: Number(userId), pid: Number(packageId) },
    JWT_SECRET,
    { expiresIn: "3h" }
  );
}

function verifyCheckoutToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.typ !== "checkout" || !decoded.uid || !decoded.pid) {
    const err = new Error("Invalid checkout session.");
    err.status = 400;
    throw err;
  }
  return { userId: Number(decoded.uid), packageId: Number(decoded.pid) };
}

module.exports = { signCheckoutToken, verifyCheckoutToken };
