const db = require("../config/db");

exports.findByUsername = (username, callback) => {
  const sql = "SELECT * FROM admin_newswire WHERE username = ? AND active = 1 LIMIT 1";
  db.query(sql, [username], callback);
};

exports.findById = (id, callback) => {
  const sql = "SELECT * FROM admin_newswire WHERE id = ? AND active = 1 LIMIT 1";
  db.query(sql, [id], callback);
};

exports.findByUsernameForOtp = (username, callback) => {
  const sql =
    "SELECT id, username, email FROM admin_newswire WHERE username = ? AND active = 1 LIMIT 1";
  db.query(sql, [username], callback);
};

exports.updateLastLogin = (id, callback) => {
  const sql = "UPDATE admin_newswire SET lastlogin = NOW() WHERE id = ?";
  db.query(sql, [id], callback);
};

exports.saveOtp = (id, otp, callback) => {
  const sql = "UPDATE admin_newswire SET otp = ? WHERE id = ?";
  db.query(sql, [otp, id], callback);
};

exports.updatePassword = (id, hashedPassword, callback) => {
  const sql = "UPDATE admin_newswire SET password = ?, otp = NULL WHERE id = ?";
  db.query(sql, [hashedPassword, id], callback);
};

exports.updateProfile = (id, username, hashedPassword, callback) => {
  const sql = "UPDATE admin_newswire SET username = ?, password = ?, otp = NULL WHERE id = ?";
  db.query(sql, [username, hashedPassword, id], callback);
};

exports.insertLoginLog = (payload, callback) => {
  const sql =
    "INSERT INTO admin_login_log (ip_address, username, dateTime, userId) VALUES (?, ?, NOW(), ?)";
  db.query(sql, [payload.ipAddress, payload.username, payload.userId], callback);
};

exports.countAllLoginLogs = (callback) => {
  const sql = "SELECT COUNT(*) AS total FROM admin_login_log";
  db.query(sql, [], callback);
};

exports.countLoginLogs = (search, callback) => {
  const searchSql = search ? "WHERE username LIKE ? OR ip_address LIKE ?" : "";
  const params = search ? [`%${search}%`, `%${search}%`] : [];
  const sql = `SELECT COUNT(*) AS total FROM admin_login_log ${searchSql}`;
  db.query(sql, params, callback);
};

exports.getLoginLogs = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  // Legacy schema: primary key column is named `admin_login_log`, not `id`.
  const allowedSortColumns = {
    username: "username",
    ip_address: "ip_address",
    dateTime: "dateTime",
    id: "admin_login_log"
  };
  const safeSortBy = allowedSortColumns[sortBy] || "dateTime";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const searchSql = search ? "WHERE username LIKE ? OR ip_address LIKE ?" : "";
  const params = search ? [`%${search}%`, `%${search}%`, Number(limit), Number(offset)] : [Number(limit), Number(offset)];
  const sql = `
    SELECT admin_login_log AS id, username, ip_address, dateTime
    FROM admin_login_log
    ${searchSql}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};