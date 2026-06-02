const db = require("../config/db");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const PAYMENT_ACTIVE = "p.active = 1";
const DATE_RANGE = "p.date_current >= ? AND p.date_current <= ?";

function paymentMethodWhere(filter) {
  if (!filter || filter === "All") return { sql: "", params: [] };
  if (filter === "OfflinePayment") {
    return { sql: " AND p.payment_method = ?", params: ["Offline Payment"] };
  }
  return { sql: " AND p.payment_method = ?", params: [filter] };
}

exports.getUsdSalesTotals = (start, end) =>
  query(
    `SELECT COALESCE(SUM(p.usd_amount), 0) AS usd_amount, COUNT(p.pay_id) AS count
     FROM payments p
     WHERE ${PAYMENT_ACTIVE} AND ${DATE_RANGE}`,
    [start, end]
  ).then((rows) => rows[0] || { usd_amount: 0, count: 0 });

const PACKAGE_SORT = {
  pname: "pname",
  quantity: "quantity",
  total_amount: "total_amount",
  avg_price: "avg_price",
  package_id: "package_id"
};

const CUSTOMER_SORT = {
  customer_name: "customer_name",
  payment_count: "payment_count",
  total_amount: "total_amount",
  userid: "userid"
};

const PAYMENT_SORT = {
  customer_name: "customer_name",
  payment_id: "payment_id",
  payment_method: "payment_method",
  total_amount: "total_amount",
  date_current: "date_current",
  userid: "userid"
};

const BUYER_SORT = {
  user_name: "user_name",
  buy_count: "buy_count",
  date_current: "date_current"
};

function packageSearchWhere(term) {
  if (!term) return { sql: "", params: [] };
  return {
    sql: ` AND (mp.pname LIKE ? OR CAST(mp.id AS CHAR) LIKE ?)`,
    params: [`%${term}%`, `%${term}%`]
  };
}

function customerSearchWhere(term) {
  if (!term) return { sql: "", params: [] };
  return {
    sql: ` AND (CONCAT(IFNULL(u.first_name,''), ' ', IFNULL(u.last_name,'')) LIKE ? OR CAST(u.id AS CHAR) LIKE ?)`,
    params: [`%${term}%`, `%${term}%`]
  };
}

function paymentSearchWhere(term) {
  if (!term) return { sql: "", params: [] };
  return {
    sql: ` AND (
      CONCAT(IFNULL(u.first_name,''), ' ', IFNULL(u.last_name,'')) LIKE ?
      OR IFNULL(p.payment_id, '') LIKE ?
      OR IFNULL(p.payment_method, '') LIKE ?
      OR CAST(p.usd_amount AS CHAR) LIKE ?
      OR DATE_FORMAT(p.date_current, '%Y-%m-%d') LIKE ?
    )`,
    params: [`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`]
  };
}

function buyerSearchWhere(term) {
  if (!term) return { sql: "", params: [] };
  return {
    sql: ` AND (CONCAT(IFNULL(u.first_name,''), ' ', IFNULL(u.last_name,'')) LIKE ?)`,
    params: [`%${term}%`]
  };
}

exports.countPackagesSold = async (start, end, search) => {
  const s = packageSearchWhere(String(search || "").trim());
  const rows = await query(
    `SELECT COUNT(*) AS total FROM (
       SELECT p.package_id
       FROM payments p
       LEFT JOIN master_package mp ON mp.id = p.package_id
       WHERE ${PAYMENT_ACTIVE} AND ${DATE_RANGE}${s.sql}
       GROUP BY p.package_id
     ) t`,
    [start, end, ...s.params]
  );
  return Number(rows[0]?.total || 0);
};

exports.getPackagesSoldPaged = async ({ start, end, search, sortBy, sortOrder, limit, offset }) => {
  const term = String(search || "").trim();
  const s = packageSearchWhere(term);
  const safeSort = PACKAGE_SORT[sortBy] || "total_amount";
  const order = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const rows = await query(
    `SELECT
       mp.id AS package_id,
       MAX(mp.pname) AS pname,
       MAX(mp.price) AS list_price,
       COUNT(p.pay_id) AS quantity,
       COALESCE(SUM(p.usd_amount), 0) AS total_amount,
       CASE WHEN COUNT(p.pay_id) > 0 THEN COALESCE(SUM(p.usd_amount), 0) / COUNT(p.pay_id) ELSE 0 END AS avg_price
     FROM payments p
     LEFT JOIN master_package mp ON mp.id = p.package_id
     WHERE ${PAYMENT_ACTIVE} AND ${DATE_RANGE}${s.sql}
     GROUP BY p.package_id
     ORDER BY ${safeSort} ${order}
     LIMIT ? OFFSET ?`,
    [start, end, ...s.params, limit, offset]
  );
  return rows;
};

exports.countCustomersSold = async (start, end, search) => {
  const s = customerSearchWhere(String(search || "").trim());
  const rows = await query(
    `SELECT COUNT(*) AS total FROM (
       SELECT u.id
       FROM payments p
       LEFT JOIN master_user u ON u.id = p.userid
       WHERE ${PAYMENT_ACTIVE} AND ${DATE_RANGE} AND p.userid IS NOT NULL${s.sql}
       GROUP BY u.id
     ) t`,
    [start, end, ...s.params]
  );
  return Number(rows[0]?.total || 0);
};

exports.getCustomersSoldPaged = async ({ start, end, search, sortBy, sortOrder, limit, offset }) => {
  const s = customerSearchWhere(String(search || "").trim());
  const safeSort = CUSTOMER_SORT[sortBy] || "total_amount";
  const order = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  return query(
    `SELECT
       p.userid,
       MAX(u.first_name) AS first_name,
       MAX(u.last_name) AS last_name,
       CONCAT(IFNULL(MAX(u.first_name), ''), ' ', IFNULL(MAX(u.last_name), '')) AS customer_name,
       COUNT(p.pay_id) AS payment_count,
       COALESCE(SUM(p.usd_amount), 0) AS total_amount
     FROM payments p
     LEFT JOIN master_user u ON u.id = p.userid
     WHERE ${PAYMENT_ACTIVE} AND ${DATE_RANGE} AND p.userid IS NOT NULL${s.sql}
     GROUP BY p.userid
     ORDER BY ${safeSort} ${order}
     LIMIT ? OFFSET ?`,
    [start, end, ...s.params, limit, offset]
  );
};

exports.countPaymentsSold = async (start, end, filter, search) => {
  const pm = paymentMethodWhere(filter);
  const s = paymentSearchWhere(String(search || "").trim());
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM payments p
     LEFT JOIN master_user u ON u.id = p.userid
     WHERE ${PAYMENT_ACTIVE} AND ${DATE_RANGE}${pm.sql}${s.sql}`,
    [start, end, ...pm.params, ...s.params]
  );
  return Number(rows[0]?.total || 0);
};

exports.getPaymentsSoldPaged = async ({ start, end, filter, search, sortBy, sortOrder, limit, offset }) => {
  const pm = paymentMethodWhere(filter);
  const s = paymentSearchWhere(String(search || "").trim());
  const safeSort = PAYMENT_SORT[sortBy] || "date_current";
  const order = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  return query(
    `SELECT
       p.pay_id,
       p.userid,
       p.payment_id,
       p.payment_method,
       p.usd_amount AS total_amount,
       p.date_current,
       u.first_name,
       u.last_name,
       CONCAT(IFNULL(u.first_name, ''), ' ', IFNULL(u.last_name, '')) AS customer_name
     FROM payments p
     LEFT JOIN master_user u ON u.id = p.userid
     WHERE ${PAYMENT_ACTIVE} AND ${DATE_RANGE}${pm.sql}${s.sql}
     ORDER BY ${safeSort} ${order}
     LIMIT ? OFFSET ?`,
    [start, end, ...pm.params, ...s.params, limit, offset]
  );
};

exports.countPackageBuyers = async (packageId, start, end, search) => {
  const s = buyerSearchWhere(String(search || "").trim());
  const rows = await query(
    `SELECT COUNT(*) AS total FROM (
       SELECT u.id
       FROM payments p
       LEFT JOIN master_user u ON u.id = p.userid
       WHERE ${PAYMENT_ACTIVE} AND p.package_id = ? AND ${DATE_RANGE}${s.sql}
       GROUP BY u.id
     ) t`,
    [packageId, start, end, ...s.params]
  );
  return Number(rows[0]?.total || 0);
};

exports.getPackageBuyersPaged = async ({ packageId, start, end, search, sortBy, sortOrder, limit, offset }) => {
  const s = buyerSearchWhere(String(search || "").trim());
  const safeSort = BUYER_SORT[sortBy] || "date_current";
  const order = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  return query(
    `SELECT
       u.id AS userid,
       MAX(u.first_name) AS first_name,
       MAX(u.last_name) AS last_name,
       CONCAT(IFNULL(MAX(u.first_name), ''), ' ', IFNULL(MAX(u.last_name), '')) AS user_name,
       COUNT(p.pay_id) AS buy_count,
       MAX(p.date_current) AS date_current
     FROM payments p
     LEFT JOIN master_user u ON u.id = p.userid
     WHERE ${PAYMENT_ACTIVE} AND p.package_id = ? AND ${DATE_RANGE}${s.sql}
     GROUP BY u.id
     ORDER BY ${safeSort} ${order}
     LIMIT ? OFFSET ?`,
    [packageId, start, end, ...s.params, limit, offset]
  );
};
