const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.USER_JWT_SECRET || process.env.JWT_SECRET || "dev_user_secret_change_me";

function userAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ status: false, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "user" || !decoded.id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }
    req.userId = Number(decoded.id);
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ status: false, message: "Unauthorized" });
  }
}

module.exports = userAuth;
