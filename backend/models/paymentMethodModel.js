const db = require("../config/db");

const SORT_COLUMNS = {
  id: "pm.id",
  PaymentMethod: "pm.PaymentMethod",
  active: "pm.active"
};

exports.countAllPaymentMethods = (callback) => {
  db.query("SELECT COUNT(*) AS total FROM master_payment_method", [], callback);
};

exports.countFilteredPaymentMethods = (search, callback) => {
  const where = search ? "WHERE pm.PaymentMethod LIKE ?" : "";
  const params = search ? [`%${search}%`] : [];
  const sql = `SELECT COUNT(*) AS total FROM master_payment_method pm ${where}`;
  db.query(sql, params, callback);
};

exports.getPaymentMethods = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "pm.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const where = search ? "WHERE pm.PaymentMethod LIKE ?" : "";
  const params = search ? [`%${search}%`, Number(limit), Number(offset)] : [Number(limit), Number(offset)];
  const sql = `
    SELECT
      pm.id,
      pm.PaymentMethod,
      pm.active,
      pm.selected_user,
      pm.auth_user_ids
    FROM master_payment_method pm
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.updatePaymentMethodStatus = (id, active, callback) => {
  db.query("UPDATE master_payment_method SET active = ? WHERE id = ?", [active, id], callback);
};

exports.getPaymentMethodById = (id, callback) => {
  db.query("SELECT id, PaymentMethod, selected_user, auth_user_ids, active FROM master_payment_method WHERE id = ? LIMIT 1", [id], callback);
};

exports.getActiveUsers = (callback) => {
  db.query("SELECT id, first_name, last_name FROM master_user WHERE active = 1 ORDER BY first_name ASC, last_name ASC", [], callback);
};

function activeUserSearchClause(search) {
  if (!search) return { where: "WHERE active = 1", params: [] };
  const q = `%${search}%`;
  return {
    where: `WHERE active = 1 AND (
      first_name LIKE ?
      OR last_name LIKE ?
      OR email LIKE ?
      OR CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, '')) LIKE ?
    )`,
    params: [q, q, q, q]
  };
}

exports.countActiveUsers = (search, callback) => {
  const { where, params } = activeUserSearchClause(search);
  const sql = `SELECT COUNT(*) AS total FROM master_user ${where}`;
  db.query(sql, params, callback);
};

exports.getActiveUsersPaged = ({ search, limit, offset }, callback) => {
  const { where, params } = activeUserSearchClause(search);
  const queryParams = search
    ? [...params, Number(limit), Number(offset)]
    : [Number(limit), Number(offset)];
  const sql = `
    SELECT id, first_name, last_name, email
    FROM master_user
    ${where}
    ORDER BY first_name ASC, last_name ASC
    LIMIT ? OFFSET ?
  `;
  db.query(sql, queryParams, callback);
};

exports.getActiveUserIds = (search, callback) => {
  const { where, params } = activeUserSearchClause(search);
  const sql = `SELECT id FROM master_user ${where} ORDER BY first_name ASC, last_name ASC`;
  db.query(sql, params, callback);
};

exports.updateCoinbaseUsers = (id, authUserIds, callback) => {
  db.query("UPDATE master_payment_method SET auth_user_ids = ? WHERE id = ?", [authUserIds, id], callback);
};
