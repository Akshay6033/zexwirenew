const db = require("../config/db");

const SORT_COLUMNS = {
  id: "c.id",
  category_name: "c.category_name",
  active: "c.active",
  timestamp: "c.timestamp"
};

exports.countAllCategories = (callback) => {
  db.query("SELECT COUNT(*) AS total FROM master_category", [], callback);
};

exports.countFilteredCategories = (search, callback) => {
  const where = search ? "WHERE c.category_name LIKE ?" : "";
  const params = search ? [`%${search}%`] : [];
  const sql = `SELECT COUNT(*) AS total FROM master_category c ${where}`;
  db.query(sql, params, callback);
};

exports.getCategories = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "c.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const where = search ? "WHERE c.category_name LIKE ?" : "";
  const params = search ? [`%${search}%`, Number(limit), Number(offset)] : [Number(limit), Number(offset)];
  const sql = `
    SELECT c.id, c.category_name, c.url, c.active, c.timestamp
    FROM master_category c
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.getCategoryByName = (categoryName, excludeId, callback) => {
  const hasExclude = Number.isInteger(Number(excludeId)) && Number(excludeId) > 0;
  const sql = hasExclude
    ? "SELECT id FROM master_category WHERE category_name = ? AND id <> ? LIMIT 1"
    : "SELECT id FROM master_category WHERE category_name = ? LIMIT 1";
  const params = hasExclude ? [categoryName, Number(excludeId)] : [categoryName];
  db.query(sql, params, callback);
};

exports.insertCategory = ({ category_name: categoryName, url }, callback) => {
  db.query(
    "INSERT INTO master_category (category_name, url, active) VALUES (?, ?, 1)",
    [categoryName, url],
    callback
  );
};

exports.updateCategory = (id, { category_name: categoryName, url }, callback) => {
  db.query("UPDATE master_category SET category_name = ?, url = ? WHERE id = ?", [categoryName, url, id], callback);
};

exports.updateCategoryStatus = (id, active, callback) => {
  db.query("UPDATE master_category SET active = ? WHERE id = ?", [active, id], callback);
};
