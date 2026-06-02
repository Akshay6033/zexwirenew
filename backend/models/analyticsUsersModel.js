const db = require("../config/db");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const BASELINE_DATE = "2021-01-01";

exports.getTotalAccountCount = () =>
  query(`SELECT COUNT(id) AS total FROM master_user WHERE active != 2`).then((rows) =>
    Number(rows[0]?.total || 0)
  );

exports.getTotalActiveUserCount = () =>
  query(`SELECT COUNT(id) AS total FROM master_user WHERE active = 1`).then((rows) =>
    Number(rows[0]?.total || 0)
  );

exports.getSignupCount = (start, end) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?`,
    [start, end]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getActiveAccountCount = (start, end) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?`,
    [start, end]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getGrowthBaselineAccountCount = (endDate) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user
     WHERE active != 2 AND created_date >= ? AND created_date < ?`,
    [BASELINE_DATE, endDate]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getAccountCountInMonth = (monthStart, monthEnd) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user
     WHERE active != 2 AND created_date >= ? AND created_date <= ?`,
    [monthStart, monthEnd]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getNewSignupInMonth = (monthStart, monthEnd) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?`,
    [monthStart, monthEnd]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getActiveInMonth = (monthStart, monthEnd) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?`,
    [monthStart, monthEnd]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getDeletedInMonth = (monthStart, monthEnd) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user
     WHERE active = 2 AND created_date >= ? AND created_date <= ?`,
    [monthStart, monthEnd]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getAccountCountInYear = (year) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user WHERE created_date >= ? AND created_date <= ?`,
    [`${year}-01-01`, `${year}-12-31`]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getNewSignupInYear = (year) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?`,
    [`${year}-01-01`, `${year}-12-31`]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getActiveInYear = (year) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?`,
    [`${year}-01-01`, `${year}-12-31`]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getDeletedInYear = (year) =>
  query(
    `SELECT COUNT(id) AS total FROM master_user
     WHERE active = 2 AND created_date >= ? AND created_date <= ?`,
    [`${year}-01-01`, `${year}-12-31`]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getTopUserSalesByCountry = (start, end) =>
  query(
    `SELECT
       COALESCE(mc.country_name, 'Unknown') AS country_name,
       COUNT(DISTINCT p.userid) AS user_count
     FROM payments p
     INNER JOIN master_user u ON u.id = p.userid
     LEFT JOIN master_country mc ON mc.id = u.country
     WHERE p.date_current >= ? AND p.date_current <= ?
     GROUP BY mc.id, mc.country_name
     HAVING user_count > 0
     ORDER BY user_count DESC
     LIMIT 12`,
    [start, end]
  );

const USER_LIST_SORT = {
  customer_name: "customer_name",
  country_name: "country_name",
  total_amount: "total_amount",
  payment_count: "payment_count",
  signup_date: "signup_date",
  pr_count: "pr_count",
  userid: "userid"
};

function userListSearchWhere(term) {
  if (!term) return { sql: "", params: [] };
  return {
    sql: ` AND (
      CONCAT(IFNULL(u.first_name,''), ' ', IFNULL(u.last_name,'')) LIKE ?
      OR IFNULL(mc.country_name, '') LIKE ?
      OR CAST(u.id AS CHAR) LIKE ?
    )`,
    params: [`%${term}%`, `%${term}%`, `%${term}%`]
  };
}

exports.countUserPrSales = async (start, end, search) => {
  const s = userListSearchWhere(String(search || "").trim());
  const rows = await query(
    `SELECT COUNT(DISTINCT u.id) AS total
     FROM payments p
     INNER JOIN master_user u ON u.id = p.userid
     LEFT JOIN master_country mc ON mc.id = u.country
     WHERE p.date_current >= ? AND p.date_current <= ?${s.sql}`,
    [start, end, ...s.params]
  );
  return Number(rows[0]?.total || 0);
};

exports.getUserPrSalesPaged = async ({ start, end, search, sortBy, sortOrder, limit, offset }) => {
  const s = userListSearchWhere(String(search || "").trim());
  const safeSort = USER_LIST_SORT[sortBy] || "total_amount";
  const order = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  return query(
    `SELECT
       pay.userid,
       pay.customer_name,
       pay.country_name,
       pay.signup_date,
       pay.payment_count,
       pay.total_amount,
       COALESCE(pr.pr_count, 0) AS pr_count
     FROM (
       SELECT
         u.id AS userid,
         CONCAT(IFNULL(u.first_name, ''), ' ', IFNULL(u.last_name, '')) AS customer_name,
         COALESCE(mc.country_name, '') AS country_name,
         DATE(u.created_date) AS signup_date,
         COUNT(DISTINCT p.pay_id) AS payment_count,
         COALESCE(SUM(p.usd_amount), 0) AS total_amount
       FROM payments p
       INNER JOIN master_user u ON u.id = p.userid
       LEFT JOIN master_country mc ON mc.id = u.country
       WHERE p.date_current >= ? AND p.date_current <= ?${s.sql}
       GROUP BY u.id, u.first_name, u.last_name, mc.country_name, u.created_date
     ) pay
     LEFT JOIN (
       SELECT user_id, COUNT(id) AS pr_count
       FROM master_press_release
       WHERE status = 2 AND date_current >= ? AND date_current <= ?
       GROUP BY user_id
     ) pr ON pr.user_id = pay.userid
     ORDER BY ${safeSort} ${order}
     LIMIT ? OFFSET ?`,
    [start, end, ...s.params, start, end, limit, offset]
  );
};

/** Single scan: counts grouped by YYYY-MM for chart buckets. */
function rowsToMonthMap(rows) {
  const map = Object.create(null);
  for (const row of rows || []) {
    if (row.ym) map[row.ym] = Number(row.cnt || 0);
  }
  return map;
}

exports.getAccountsCreatedByMonth = (rangeStart, rangeEnd) =>
  query(
    `SELECT DATE_FORMAT(created_date, '%Y-%m') AS ym, COUNT(id) AS cnt
     FROM master_user
     WHERE active != 2 AND created_date >= ? AND created_date <= ?
     GROUP BY ym`,
    [rangeStart, rangeEnd]
  ).then(rowsToMonthMap);

exports.getSignupsByMonth = (rangeStart, rangeEnd) =>
  query(
    `SELECT DATE_FORMAT(created_date, '%Y-%m') AS ym, COUNT(id) AS cnt
     FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?
     GROUP BY ym`,
    [rangeStart, rangeEnd]
  ).then(rowsToMonthMap);

exports.getActiveUsersByMonth = (rangeStart, rangeEnd) =>
  query(
    `SELECT DATE_FORMAT(created_date, '%Y-%m') AS ym, COUNT(id) AS cnt
     FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?
     GROUP BY ym`,
    [rangeStart, rangeEnd]
  ).then(rowsToMonthMap);

exports.getDeletedUsersByMonth = (rangeStart, rangeEnd) =>
  query(
    `SELECT DATE_FORMAT(created_date, '%Y-%m') AS ym, COUNT(id) AS cnt
     FROM master_user
     WHERE active = 2 AND created_date >= ? AND created_date <= ?
     GROUP BY ym`,
    [rangeStart, rangeEnd]
  ).then(rowsToMonthMap);

exports.getYearlyAccountCounts = (years) => {
  if (!years.length) return Promise.resolve({});
  const placeholders = years.map(() => "?").join(",");
  const params = years.flatMap((y) => [`${y}-01-01`, `${y}-12-31`]);
  const cases = years
    .map(
      (y, i) =>
        `SUM(CASE WHEN created_date >= ? AND created_date <= ? THEN 1 ELSE 0 END) AS y_${y}`
    )
    .join(", ");
  return query(
    `SELECT ${cases} FROM master_user`,
    params
  ).then((rows) => {
    const out = Object.create(null);
    const row = rows[0] || {};
    for (const y of years) out[y] = Number(row[`y_${y}`] || 0);
    return out;
  });
};

exports.getYearlySignups = (years) => {
  if (!years.length) return Promise.resolve({});
  const params = years.flatMap((y) => [`${y}-01-01`, `${y}-12-31`]);
  const cases = years
    .map((y) => `SUM(CASE WHEN created_date >= ? AND created_date <= ? THEN 1 ELSE 0 END) AS y_${y}`)
    .join(", ");
  return query(
    `SELECT ${cases} FROM master_user WHERE active = 1`,
    params
  ).then((rows) => {
    const out = Object.create(null);
    const row = rows[0] || {};
    for (const y of years) out[y] = Number(row[`y_${y}`] || 0);
    return out;
  });
};

exports.getYearlyActiveUsers = (years) =>
  exports.getYearlySignups(years);

exports.getYearlyDeletedUsers = (years) => {
  if (!years.length) return Promise.resolve({});
  const params = years.flatMap((y) => [`${y}-01-01`, `${y}-12-31`]);
  const cases = years
    .map((y) => `SUM(CASE WHEN created_date >= ? AND created_date <= ? THEN 1 ELSE 0 END) AS y_${y}`)
    .join(", ");
  return query(
    `SELECT ${cases} FROM master_user WHERE active = 2`,
    params
  ).then((rows) => {
    const out = Object.create(null);
    const row = rows[0] || {};
    for (const y of years) out[y] = Number(row[`y_${y}`] || 0);
    return out;
  });
};
