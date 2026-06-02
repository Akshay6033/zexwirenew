const db = require("../config/db");

const SORT_COLUMNS = {
  id: "n.id",
  email: "n.email",
  timestamp: "n.timestamp"
};

exports.countAllNewsletters = (callback) => {
  db.query("SELECT COUNT(*) AS total FROM master_newsletter WHERE active = 1", [], callback);
};

exports.countFilteredNewsletters = (search, callback) => {
  const where = search ? "AND n.email LIKE ?" : "";
  const params = search ? [`%${search}%`] : [];
  const sql = `
    SELECT COUNT(*) AS total
    FROM master_newsletter n
    WHERE n.active = 1
    ${where}
  `;
  db.query(sql, params, callback);
};

exports.getNewsletters = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "n.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const where = search ? "AND n.email LIKE ?" : "";
  const params = search ? [`%${search}%`, Number(limit), Number(offset)] : [Number(limit), Number(offset)];
  const sql = `
    SELECT n.id, n.email, n.timestamp
    FROM master_newsletter n
    WHERE n.active = 1
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.getNewsletterById = (id, callback) => {
  db.query("SELECT id, email, timestamp, active FROM master_newsletter WHERE id = ? LIMIT 1", [id], callback);
};

exports.deleteNewsletterPermanently = (id, callback) => {
  db.query("UPDATE master_newsletter SET active = 2 WHERE id = ?", [id], callback);
};

exports.deleteNewslettersBulk = (ids, callback) => {
  db.query("UPDATE master_newsletter SET active = 2 WHERE id IN (?) AND active = 1", [ids], callback);
};

exports.getNewslettersForExport = ({ search, sortBy, sortOrder }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "n.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const where = search ? "AND n.email LIKE ?" : "";
  const params = search ? [`%${search}%`] : [];
  const sql = `
    SELECT n.id, n.email, n.timestamp
    FROM master_newsletter n
    WHERE n.active = 1
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
  `;
  db.query(sql, params, callback);
};

exports.findByEmail = (email, callback) => {
  const normalized = String(email || "").trim().toLowerCase();
  db.query(
    "SELECT id FROM master_newsletter WHERE LOWER(TRIM(email)) = ? LIMIT 1",
    [normalized],
    callback
  );
};

exports.subscribeEmail = (email, callback) => {
  const normalized = String(email || "").trim().toLowerCase();
  db.query(
    "INSERT INTO master_newsletter (email, timestamp, active) VALUES (?, NOW(), 1)",
    [normalized],
    callback
  );
};
