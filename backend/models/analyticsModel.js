const db = require("../config/db");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

exports.getTotalSales = (start, end) =>
  query(
    `SELECT COALESCE(SUM(usd_amount), 0) AS total
     FROM payments
     WHERE date_current >= ? AND date_current <= ?`,
    [start, end]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getTotalPrSubmitted = (start, end) =>
  query(
    `SELECT COUNT(id) AS total
     FROM master_press_release
     WHERE active != 2 AND date_current >= ? AND date_current <= ?`,
    [start, end]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getTotalNewUsers = (start, end) =>
  query(
    `SELECT COUNT(id) AS total
     FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?`,
    [start, end]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getTotalActiveUsers = (start, end) =>
  query(
    `SELECT COUNT(id) AS total
     FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?`,
    [start, end]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getSalesByMonth = (start, end) =>
  query(
    `SELECT DATE_FORMAT(date_current, '%Y-%m') AS bucket,
            DATE_FORMAT(date_current, '%b') AS label,
            COALESCE(SUM(usd_amount), 0) AS value
     FROM payments
     WHERE active = 1 AND date_current >= ? AND date_current <= ?
     GROUP BY DATE_FORMAT(date_current, '%Y-%m'), DATE_FORMAT(date_current, '%b')
     ORDER BY bucket`,
    [start, end]
  );

exports.getPrPublishedByMonth = (start, end) =>
  query(
    `SELECT DATE_FORMAT(date_current, '%Y-%m') AS bucket,
            DATE_FORMAT(date_current, '%b') AS label,
            COUNT(id) AS value
     FROM master_press_release
     WHERE active = 1 AND status = 2 AND date_current >= ? AND date_current <= ?
     GROUP BY DATE_FORMAT(date_current, '%Y-%m'), DATE_FORMAT(date_current, '%b')
     ORDER BY bucket`,
    [start, end]
  );

exports.getNewUsersByMonth = (start, end) =>
  query(
    `SELECT DATE_FORMAT(created_date, '%Y-%m') AS bucket,
            DATE_FORMAT(created_date, '%b') AS label,
            COUNT(id) AS value
     FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?
     GROUP BY DATE_FORMAT(created_date, '%Y-%m'), DATE_FORMAT(created_date, '%b')
     ORDER BY bucket`,
    [start, end]
  );

exports.getActiveUsersByMonth = (start, end) =>
  query(
    `SELECT DATE_FORMAT(created_date, '%Y-%m') AS bucket,
            DATE_FORMAT(created_date, '%b') AS label,
            COUNT(id) AS value
     FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?
     GROUP BY DATE_FORMAT(created_date, '%Y-%m'), DATE_FORMAT(created_date, '%b')
     ORDER BY bucket`,
    [start, end]
  );

exports.getSalesByYear = (start, end) =>
  query(
    `SELECT YEAR(date_current) AS bucket, YEAR(date_current) AS label, COALESCE(SUM(usd_amount), 0) AS value
     FROM payments
     WHERE active = 1 AND date_current >= ? AND date_current <= ?
     GROUP BY YEAR(date_current)
     ORDER BY bucket`,
    [start, end]
  );

exports.getPrPublishedByYear = (start, end) =>
  query(
    `SELECT YEAR(date_current) AS bucket, YEAR(date_current) AS label, COUNT(id) AS value
     FROM master_press_release
     WHERE active = 1 AND status = 2 AND date_current >= ? AND date_current <= ?
     GROUP BY YEAR(date_current)
     ORDER BY bucket`,
    [start, end]
  );

exports.getNewUsersByYear = (start, end) =>
  query(
    `SELECT YEAR(created_date) AS bucket, YEAR(created_date) AS label, COUNT(id) AS value
     FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?
     GROUP BY YEAR(created_date)
     ORDER BY bucket`,
    [start, end]
  );

exports.getActiveUsersByYear = (start, end) =>
  query(
    `SELECT YEAR(created_date) AS bucket, YEAR(created_date) AS label, COUNT(id) AS value
     FROM master_user
     WHERE active = 1 AND created_date >= ? AND created_date <= ?
     GROUP BY YEAR(created_date)
     ORDER BY bucket`,
    [start, end]
  );

const PR_NOT_DELETED = "active != 2";

exports.getPrSubmittedCount = (start, end) =>
  query(
    `SELECT COUNT(id) AS total FROM master_press_release
     WHERE ${PR_NOT_DELETED} AND date_current >= ? AND date_current <= ?`,
    [start, end]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getPrRejectCount = (start, end) =>
  query(
    `SELECT COUNT(id) AS total FROM master_press_release
     WHERE ${PR_NOT_DELETED} AND status = 5 AND date_current >= ? AND date_current <= ?`,
    [start, end]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getPrSuccessCount = (start, end) =>
  query(
    `SELECT COUNT(id) AS total FROM master_press_release
     WHERE ${PR_NOT_DELETED} AND status = 2 AND date_current >= ? AND date_current <= ?`,
    [start, end]
  ).then((rows) => Number(rows[0]?.total || 0));

exports.getPrTillNowCount = () =>
  query(`SELECT COUNT(id) AS total FROM master_press_release WHERE ${PR_NOT_DELETED}`).then(
    (rows) => Number(rows[0]?.total || 0)
  );

function prChartByMonth(statusClause, start, end) {
  const extra = statusClause ? ` AND ${statusClause}` : "";
  return query(
    `SELECT DATE_FORMAT(date_current, '%Y-%m') AS bucket,
            DATE_FORMAT(date_current, '%b') AS label,
            COUNT(id) AS value
     FROM master_press_release
     WHERE ${PR_NOT_DELETED}${extra} AND date_current >= ? AND date_current <= ?
     GROUP BY DATE_FORMAT(date_current, '%Y-%m'), DATE_FORMAT(date_current, '%b')
     ORDER BY bucket`,
    [start, end]
  );
}

function prChartByYear(statusClause, start, end) {
  const extra = statusClause ? ` AND ${statusClause}` : "";
  return query(
    `SELECT YEAR(date_current) AS bucket, YEAR(date_current) AS label, COUNT(id) AS value
     FROM master_press_release
     WHERE ${PR_NOT_DELETED}${extra} AND date_current >= ? AND date_current <= ?
     GROUP BY YEAR(date_current)
     ORDER BY bucket`,
    [start, end]
  );
}

exports.getPrTotalByMonth = (start, end) => prChartByMonth(null, start, end);
exports.getPrPendingByMonth = (start, end) => prChartByMonth("status = 1", start, end);
exports.getPrActionByMonth = (start, end) => prChartByMonth("status = 3", start, end);
exports.getPrRejectedByMonth = (start, end) => prChartByMonth("status = 5", start, end);
exports.getPrPublishedByMonth = (start, end) => prChartByMonth("status = 2", start, end);

exports.getPrTotalByYear = (start, end) => prChartByYear(null, start, end);
exports.getPrPendingByYear = (start, end) => prChartByYear("status = 1", start, end);
exports.getPrActionByYear = (start, end) => prChartByYear("status = 3", start, end);
exports.getPrRejectedByYear = (start, end) => prChartByYear("status = 5", start, end);
exports.getPrPublishedByYear = (start, end) => prChartByYear("status = 2", start, end);

exports.getGlobalTopPrLocations = (start, end) =>
  query(
    `SELECT
       COALESCE(mc.country_name, 'Unknown') AS country_name,
       COUNT(mpr.id) AS pr_count
     FROM master_press_release mpr
     INNER JOIN master_user u ON u.id = mpr.user_id
     LEFT JOIN master_country mc ON mc.id = u.country
     WHERE mpr.active != 2
       AND mpr.date_current >= ? AND mpr.date_current <= ?
     GROUP BY mc.id, mc.country_name
     HAVING pr_count > 0
     ORDER BY pr_count DESC
     LIMIT 12`,
    [start, end]
  );

exports.getGlobalTopLocations = (start, end) =>
  query(
    `SELECT
       COALESCE(mc.country_name, 'Unknown') AS country_name,
       COALESCE(SUM(p.usd_amount), 0) AS total_sales,
       COUNT(p.pay_id) AS payment_count
     FROM payments p
     LEFT JOIN master_user u ON u.id = p.userid
     LEFT JOIN master_country mc ON mc.id = u.country
     WHERE p.date_current >= ? AND p.date_current <= ?
     GROUP BY mc.id, mc.country_name
     HAVING total_sales > 0
     ORDER BY total_sales DESC
     LIMIT 12`,
    [start, end]
  );
