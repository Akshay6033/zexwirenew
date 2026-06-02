const db = require("../config/db");

const SORT_COLUMNS = {
  pay_id: "p.pay_id",
  payment_method: "p.payment_method",
  payment_id: "p.payment_id",
  user_name: "user_name",
  package_name: "package_name",
  usd_amount: "p.usd_amount",
  date_current: "p.date_current",
  timestamp: "p.timestamp"
};

const ONLINE_METHODS = ["razorpay", "paypal", "stripe", "coinbase"];

function searchWhere() {
  return `
    WHERE (
      p.payment_method LIKE ?
      OR p.payment_id LIKE ?
      OR p.offer_code LIKE ?
      OR p.date_current LIKE ?
      OR CONCAT(IFNULL(u.first_name,''), ' ', IFNULL(u.last_name,'')) LIKE ?
      OR mp.pname LIKE ?
      OR a.username LIKE ?
    )
  `;
}

function searchParams(term) {
  const q = `%${term}%`;
  return [q, q, q, q, q, q, q];
}

exports.countAllPayments = (callback) => {
  db.query("SELECT COUNT(*) AS total FROM payments", [], callback);
};

exports.countFilteredPayments = (search, callback) => {
  const term = String(search || "").trim();
  if (!term) {
    return db.query("SELECT COUNT(*) AS total FROM payments", [], callback);
  }
  const sql = `
    SELECT COUNT(*) AS total
    FROM payments p
    LEFT JOIN master_user u ON u.id = p.userid
    LEFT JOIN master_package mp ON mp.id = p.package_id
    LEFT JOIN admin_newswire a ON (
      LOWER(IFNULL(p.payment_method, '')) NOT IN ('razorpay', 'paypal', 'stripe', 'coinbase')
      AND p.payment_id REGEXP '^[0-9]+$'
      AND a.id = CAST(p.payment_id AS UNSIGNED)
    )
    ${searchWhere()}
  `;
  db.query(sql, searchParams(term), callback);
};

exports.getPayments = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "p.pay_id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const term = String(search || "").trim();
  const whereSql = term ? searchWhere() : "";
  const params = term ? [...searchParams(term), Number(limit), Number(offset)] : [Number(limit), Number(offset)];

  const sql = `
    SELECT
      p.pay_id,
      p.payment_method,
      p.payment_id,
      p.userid,
      p.package_id,
      p.usd_amount,
      p.date_current,
      p.timestamp,
      p.offer_method,
      p.offer_code,
      p.offer_value,
      p.offer_id,
      p.offer_price_usd,
      p.orignal_price_inr,
      p.amount,
      p.coinbase_network,
      p.coinbase_chargeid,
      CONCAT(IFNULL(u.first_name, ''), ' ', IFNULL(u.last_name, '')) AS user_name,
      mp.pname AS package_name,
      a.username AS offline_admin_username,
      inv.inv_id AS invoice_id
    FROM payments p
    LEFT JOIN master_user u ON u.id = p.userid
    LEFT JOIN master_package mp ON mp.id = p.package_id
    LEFT JOIN admin_newswire a ON (
      LOWER(IFNULL(p.payment_method, '')) NOT IN ('razorpay', 'paypal', 'stripe', 'coinbase')
      AND p.payment_id REGEXP '^[0-9]+$'
      AND a.id = CAST(p.payment_id AS UNSIGNED)
    )
    LEFT JOIN master_invoice inv ON inv.invoice_id = p.pay_id
    ${whereSql}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.getPaymentById = (payId, callback) => {
  const sql = `
    SELECT
      p.*,
      CONCAT(IFNULL(u.first_name, ''), ' ', IFNULL(u.last_name, '')) AS user_name,
      mp.pname AS package_name,
      mo.c_name AS offer_coupon_name,
      a.username AS offline_admin_username
    FROM payments p
    LEFT JOIN master_user u ON u.id = p.userid
    LEFT JOIN master_package mp ON mp.id = p.package_id
    LEFT JOIN master_offer mo ON mo.id = p.offer_id
    LEFT JOIN admin_newswire a ON (
      LOWER(IFNULL(p.payment_method, '')) NOT IN ('razorpay', 'paypal', 'stripe', 'coinbase')
      AND p.payment_id REGEXP '^[0-9]+$'
      AND a.id = CAST(p.payment_id AS UNSIGNED)
    )
    WHERE p.pay_id = ?
    LIMIT 1
  `;
  db.query(sql, [payId], callback);
};

exports.getPaymentReason = ({ userId, packageId, timestamp }, callback) => {
  const sql = `
    SELECT reason AS reason_pr
    FROM user_payment_history
    WHERE user_id = ? AND plan_id = ? AND timestamp = ?
    LIMIT 1
  `;
  db.query(sql, [userId, packageId, timestamp], callback);
};

exports.getPaymentsForExport = (callback) => {
  const sql = `
    SELECT
      p.pay_id,
      p.payment_id,
      p.order_id,
      p.amount,
      p.usd_amount,
      p.offer_price_usd,
      p.orignal_price_inr,
      p.offer_code,
      p.offer_value,
      p.offer_method,
      p.status,
      p.bank_name,
      p.payment_method,
      p.userid,
      p.package_id,
      p.offer_id,
      p.coinbase_network,
      p.coinbase_chargeid,
      p.timestamp,
      CONCAT(IFNULL(u.first_name, ''), ' ', IFNULL(u.last_name, '')) AS user_full_name,
      mp.pname AS package_name,
      mo.c_name AS offer_name
    FROM payments p
    LEFT JOIN master_user u ON u.id = p.userid
    LEFT JOIN master_package mp ON mp.id = p.package_id
    LEFT JOIN master_offer mo ON mo.id = p.offer_id
    ORDER BY p.pay_id DESC
  `;
  db.query(sql, [], callback);
};

exports.getInvoiceByInvId = (invId, callback) => {
  const sql = `
    SELECT inv_id, invoice_id, userid, invoice, active, timestamp
    FROM master_invoice
    WHERE inv_id = ?
    LIMIT 1
  `;
  db.query(sql, [invId], callback);
};

exports.isOnlinePaymentMethod = (method) => {
  return ONLINE_METHODS.includes(String(method || "").toLowerCase());
};
