const db = require("../config/db");

const SORT_COLUMNS = {
  inv_id: "mi.inv_id",
  invoice_id: "mi.invoice_id",
  user_name: "user_name",
  timestamp: "mi.timestamp"
};

function searchWhere() {
  return `
    AND (
      CAST(mi.invoice_id AS CHAR) LIKE ?
      OR IFNULL(mi.invoice, '') LIKE ?
      OR CONCAT(IFNULL(u.first_name, ''), ' ', IFNULL(u.last_name, '')) LIKE ?
      OR DATE_FORMAT(mi.timestamp, '%Y-%m-%d') LIKE ?
    )
  `;
}

function searchParams(term) {
  const q = `%${term}%`;
  return [q, q, q, q];
}

exports.countAllInvoices = (callback) => {
  db.query("SELECT COUNT(*) AS total FROM master_invoice mi WHERE mi.active = 1", [], callback);
};

exports.countFilteredInvoices = (search, callback) => {
  const term = String(search || "").trim();
  if (!term) {
    return db.query("SELECT COUNT(*) AS total FROM master_invoice mi WHERE mi.active = 1", [], callback);
  }
  const sql = `
    SELECT COUNT(*) AS total
    FROM master_invoice mi
    LEFT JOIN master_user u ON u.id = mi.userid
    WHERE mi.active = 1
    ${searchWhere()}
  `;
  db.query(sql, searchParams(term), callback);
};

exports.getInvoices = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "mi.inv_id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const term = String(search || "").trim();
  const whereSql = term ? searchWhere() : "";
  const params = term ? [...searchParams(term), Number(limit), Number(offset)] : [Number(limit), Number(offset)];

  const sql = `
    SELECT
      mi.inv_id,
      mi.invoice_id,
      mi.invoice,
      mi.timestamp,
      mi.userid,
      CONCAT(IFNULL(u.first_name, ''), ' ', IFNULL(u.last_name, '')) AS user_name
    FROM master_invoice mi
    LEFT JOIN master_user u ON u.id = mi.userid
    WHERE mi.active = 1
    ${whereSql}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.updateInvoiceFile = (invId, filename, callback) => {
  db.query(
    "UPDATE master_invoice SET invoice = ? WHERE inv_id = ? AND active = 1",
    [filename, invId],
    callback
  );
};
