const jwt = require("jsonwebtoken");
const authModel = require("../models/authModel");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ status: false, message: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const adminId = Number(payload.id);
    if (!adminId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }
    authModel.findById(adminId, (err, rows) => {
      if (err || !rows?.length) {
        return res.status(401).json({ status: false, message: "Unauthorized" });
      }
      const row = rows[0];
      req.admin = {
        id: row.id,
        username: row.username,
        email: row.email
      };
      next();
    });
  } catch {
    return res.status(401).json({ status: false, message: "Unauthorized" });
  }
}

module.exports = { requireAdmin };
