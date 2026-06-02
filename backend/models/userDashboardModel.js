const pool = require("../config/db").promise();
const prCreditService = require("../services/prCreditService");

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

exports.getUserStatus = async (userId) => {
  const rows = await query("SELECT active FROM master_user WHERE id = ? LIMIT 1", [userId]);
  return rows[0] || null;
};

exports.getUserSessionDetails = async (userId) => {
  const rows = await query(
    `SELECT id, first_name, last_name, email, plan_id, pr, profile_image, active
     FROM master_user WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

exports.getPrRecords = async (userId) => {
  return query("SELECT * FROM master_pr_record WHERE user_id = ?", [userId]);
};

exports.getUserPrStatusRows = async (userId) => {
  return query("SELECT * FROM master_user_pr_status WHERE u_id = ?", [userId]);
};

exports.expireOutdatedPackages = async (userId) => {
  const today = new Date().toISOString().slice(0, 10);
  await pool.query(
    `UPDATE master_pr_record
     SET status = 0
     WHERE user_id = ?
       AND package_end_date IS NOT NULL
       AND DATE(package_end_date) < ?
       AND status != 0`,
    [userId, today]
  );
  await pool.query(
    `UPDATE master_user_pr_status
     SET status = 0, active = 0
     WHERE u_id = ?
       AND package_end_date IS NOT NULL
       AND DATE(package_end_date) < ?`,
    [userId, today]
  );
  await prCreditService.syncExhaustedPackageRecords(pool, userId);
};

exports.getAffiliateRelationship = async (userId, packageId, paymentMethod, paymentId) => {
  if (!userId || !packageId || paymentMethod == null || paymentMethod === "" || paymentId == null || paymentId === "") {
    return null;
  }
  const rows = await query(
    `SELECT affiliate_coupons_relationship, affiliate_coupons_relationship_end_pr
     FROM affiliate_coupons_relationship
     WHERE affiliate_coupons_rel_ationship_userid = ?
       AND affiliate_coupons_relationship_package_id = ?
       AND affiliate_coupons_relationship_payment_method = ?
       AND affiliate_coupons_relationship_payment_id = ?
       AND active = 1
     LIMIT 1`,
    [userId, packageId, paymentMethod, paymentId]
  );
  return rows[0] || null;
};

exports.updateAffiliateRelationshipEndPr = async (relationshipId, endPr) => {
  await pool.query(
    "UPDATE affiliate_coupons_relationship SET affiliate_coupons_relationship_end_pr = ? WHERE affiliate_coupons_relationship = ?",
    [endPr, relationshipId]
  );
};

exports.syncAffiliatePackageStatus = async (userId) => {
  const affiliateRows = await exports.getPrRecords(userId);
  for (const val of affiliateRows) {
    const rel = await exports.getAffiliateRelationship(
      val.user_id,
      val.package_id,
      val.payment_method,
      val.payment_id
    );
    if (!rel || Number(rel.affiliate_coupons_relationship_end_pr) === 1) continue;

    if (Number(val.status) === 0 && Number(val.usepr_limit) === 0) {
      await exports.updateAffiliateRelationshipEndPr(rel.affiliate_coupons_relationship, 1);
    } else if (Number(val.status) === 0 && Number(val.usepr_limit) >= 1) {
      await exports.updateAffiliateRelationshipEndPr(rel.affiliate_coupons_relationship, 2);
    }
  }
};

exports.dashboardPublishCount = async (userId) => {
  const rows = await query(
    `SELECT COUNT(*) AS count FROM master_press_release
     WHERE active = 1 AND status = 2 AND user_id = ?`,
    [userId]
  );
  return Number(rows[0]?.count) || 0;
};

exports.buyPackageCount = async (userId) => {
  const rows = await query(
    `SELECT COUNT(*) AS count FROM master_pr_record WHERE user_id = ? AND status = 1`,
    [userId]
  );
  return Number(rows[0]?.count) || 0;
};

exports.getEarlyPackageDetails = async (userId) => {
  const today = new Date().toISOString().slice(0, 10);
  return query(
    `SELECT master_package.pname, master_pr_record.package_end_date
     FROM master_pr_record
     LEFT JOIN master_package ON master_package.id = master_pr_record.package_id
     WHERE master_pr_record.user_id = ?
       AND master_pr_record.status = 1
       AND master_pr_record.usepr_limit > 0
       AND master_pr_record.package_end_date >= ?
     ORDER BY master_pr_record.id DESC
     LIMIT 2`,
    [userId, today]
  );
};

exports.getLastFivePr = async (userId) => {
  return query(
    `SELECT id, release_no, title, url, date
     FROM master_press_release
     WHERE active = 1 AND user_id = ?
     ORDER BY id DESC
     LIMIT 5`,
    [userId]
  );
};

exports.getPackageDetails = async (userId) => {
  return query(
    `SELECT master_pr_record.id,
            master_package.pname,
            master_pr_record.pr_limit,
            master_pr_record.use_pr,
            master_pr_record.pending_pr,
            master_pr_record.package_end_date,
            master_pr_record.status,
            master_pr_record.active,
            master_pr_record.usepr_limit,
            master_pr_record.package_id,
            master_pr_record.user_id
     FROM master_pr_record
     LEFT JOIN master_package ON master_package.id = master_pr_record.package_id
     WHERE master_pr_record.user_id = ?
     ORDER BY master_pr_record.id DESC`,
    [userId]
  );
};

const PACKAGE_DETAILS_FROM = `
  FROM master_pr_record
  LEFT JOIN master_package ON master_package.id = master_pr_record.package_id
  WHERE master_pr_record.user_id = ?`;

function packageDetailsSearchClause(search) {
  const term = String(search || "").trim();
  if (!term) {
    return { sql: "", params: [] };
  }
  const like = `%${term}%`;
  return {
    sql: ` AND CONCAT_WS(' ',
            IFNULL(master_package.pname, ''),
            IFNULL(master_pr_record.usepr_limit, ''),
            IFNULL(DATE_FORMAT(master_pr_record.package_end_date, '%b %d, %Y'), ''),
            IFNULL(DATE_FORMAT(master_pr_record.package_end_date, '%Y-%m-%d'), '')
          ) LIKE ?`,
    params: [like]
  };
}

exports.countPackageDetails = async (userId, search = "") => {
  const { sql, params } = packageDetailsSearchClause(search);
  const rows = await query(
    `SELECT COUNT(*) AS count ${PACKAGE_DETAILS_FROM}${sql}`,
    [userId, ...params]
  );
  return Number(rows[0]?.count) || 0;
};

exports.getPackageDetailsPaginated = async (userId, { page = 1, limit = 10, search = "" } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const { sql, params } = packageDetailsSearchClause(search);

  return query(
    `SELECT master_pr_record.id,
            master_package.pname,
            master_pr_record.pr_limit,
            master_pr_record.use_pr,
            master_pr_record.pending_pr,
            master_pr_record.package_end_date,
            master_pr_record.status,
            master_pr_record.active,
            master_pr_record.usepr_limit,
            master_pr_record.package_id,
            master_pr_record.user_id
     ${PACKAGE_DETAILS_FROM}${sql}
     ORDER BY master_pr_record.id DESC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    [userId, ...params]
  );
};

/** Legacy notificationLast + GetLastnotification (latest status per PR, newest first). */
exports.getDashboardNotifications = async (userId, limit = 50) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  return query(
    `SELECT ps.id, ps.press_id, ps.status_note, ps.status_datetime, ps.status, ps.created_press
     FROM master_press_status ps
     INNER JOIN (
       SELECT press_id, MAX(id) AS max_id
       FROM master_press_status
       GROUP BY press_id
     ) latest ON ps.id = latest.max_id
     INNER JOIN master_press_release pr ON pr.id = ps.press_id
     WHERE pr.user_id = ?
     ORDER BY ps.id DESC
     LIMIT ${safeLimit}`,
    [userId]
  );
};
