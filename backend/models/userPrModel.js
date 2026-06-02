const db = require("../config/db");

exports.getActivePackages = (callback) => {
  db.query(
    "SELECT id, pname, price, n_press_rel, package_validity FROM master_package WHERE active = 1 ORDER BY pname ASC",
    [],
    callback
  );
};

exports.getUserBasic = (userId, callback) => {
  db.query(
    `SELECT id, first_name, last_name, email, mobile, created_date, timestamp AS last_login
     FROM master_user WHERE id = ? AND active != 2 LIMIT 1`,
    [userId],
    callback
  );
};

exports.sumUserPayments = (userId, callback) => {
  db.query(
    "SELECT COALESCE(SUM(price), 0) AS total FROM user_payment_history WHERE user_id = ?",
    [userId],
    callback
  );
};

exports.getUserPaymentHistory = (userId, callback) => {
  db.query(
    `SELECT uph.*, mp.pname
     FROM user_payment_history uph
     LEFT JOIN master_package mp ON mp.id = uph.plan_id
     WHERE uph.user_id = ?
     ORDER BY uph.timestamp DESC`,
    [userId],
    callback
  );
};

exports.getPrRecordRemainders = (userId, callback) => {
  db.query(
    `SELECT mpr.id AS pr_record_id, mpr.user_id, mpr.package_id, mpr.price_usd, mpr.pr_limit,
            mpr.usepr_limit, mpr.pending_pr, mpr.timestamp, mp.pname
     FROM master_pr_record mpr
     LEFT JOIN master_package mp ON mp.id = mpr.package_id
     WHERE mpr.user_id = ?
     ORDER BY mpr.timestamp DESC`,
    [userId],
    callback
  );
};

exports.countDecreaseHistoryForRecord = (prRecordId, callback) => {
  db.query(
    "SELECT COUNT(*) AS total FROM decrease_pr_history WHERE mst_pr_record_id = ?",
    [prRecordId],
    callback
  );
};

exports.getPressReleasesForUser = (userId, callback) => {
  db.query(
    `SELECT release_no, active, title, p_id, date_current, user_id
     FROM master_press_release
     WHERE user_id = ? AND active != 0 AND status = 2`,
    [userId],
    callback
  );
};

/** Joined list like legacy getUserprstatus */
exports.getUserPrStatusList = (userId, callback) => {
  db.query(
    `SELECT mus.*, mp.pname,
            COALESCE(an.username, CAST(mus.admin_id AS CHAR)) AS admin_username
     FROM master_user_pr_status mus
     LEFT JOIN master_package mp ON mp.id = mus.plan_id
     LEFT JOIN admin_newswire an ON an.id = mus.admin_id
     WHERE mus.u_id = ?
     ORDER BY mus.timestamp DESC`,
    [userId],
    callback
  );
};

const USER_PR_STATUS_BASE_FROM = `
     FROM master_user_pr_status mus
     LEFT JOIN master_package mp ON mp.id = mus.plan_id
     LEFT JOIN admin_newswire an ON an.id = mus.admin_id
     WHERE mus.u_id = ?
`;

/**
 * Paged PR status rows for a user (server-side pagination + optional search).
 * @param {function(Error|null, { rows: any[], total: number, page: number, limit: number }|null): void} callback
 */
exports.getUserPrStatusListPaged = (userId, page, limit, searchRaw, callback) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;
  const term = String(searchRaw || "")
    .trim()
    .slice(0, 200)
    .replace(/%/g, "")
    .replace(/_/g, "");
  const like = term.length > 0 ? `%${term}%` : null;

  let searchClause = "";
  const countParams = [userId];
  const dataParams = [userId];
  if (like) {
    searchClause = ` AND (
      mp.pname LIKE ? OR
      IFNULL(mus.reason, '') LIKE ? OR
      COALESCE(an.username, CAST(mus.admin_id AS CHAR)) LIKE ? OR
      CAST(IFNULL(mus.og_pr, '') AS CHAR) LIKE ? OR
      CAST(IFNULL(mus.pr, '') AS CHAR) LIKE ? OR
      CAST(IFNULL(mus.usd_amount, '') AS CHAR) LIKE ?
    )`;
    for (let i = 0; i < 6; i += 1) {
      countParams.push(like);
      dataParams.push(like);
    }
  }

  const countSql = `SELECT COUNT(*) AS total ${USER_PR_STATUS_BASE_FROM} ${searchClause}`;
  const dataSql = `
     SELECT mus.*, mp.pname,
            COALESCE(an.username, CAST(mus.admin_id AS CHAR)) AS admin_username
     ${USER_PR_STATUS_BASE_FROM}
     ${searchClause}
     ORDER BY mus.timestamp DESC
     LIMIT ? OFFSET ?
  `;
  dataParams.push(safeLimit, offset);

  db.query(countSql, countParams, (err, countRows) => {
    if (err) return callback(err);
    const total = Number(countRows[0]?.total || 0);
    db.query(dataSql, dataParams, (err2, rows) => {
      if (err2) return callback(err2);
      callback(null, {
        rows: rows || [],
        total,
        page: safePage,
        limit: safeLimit
      });
    });
  });
};

exports.getIncreaseHistoryByUserPrId = (userPrStatusId, callback) => {
  db.query(
    `SELECT h.*, mp.pname
     FROM increase_pr_history h
     LEFT JOIN master_package mp ON mp.id = h.plan_id
     WHERE h.user_pr_id = ?
     ORDER BY h.date DESC, h.id DESC`,
    [userPrStatusId],
    callback
  );
};

exports.getDecreaseHistory = (prRecordId, callback) => {
  // Legacy tables may omit `id`, use `mst_pr_recordid` instead of `mst_pr_record_id`, or omit `timestamp`.
  const sqlWithTs = `
    SELECT
      mp.pname,
      dh.decrease_pr,
      dh.before_decrease_pr,
      dh.decrease_reason,
      dh.who_decrease,
      dh.decrease_date_time,
      dh.\`timestamp\` AS history_timestamp
    FROM decrease_pr_history dh
    LEFT JOIN master_package mp ON mp.id = dh.decrease_pid
    WHERE dh.mst_pr_record_id = ?
    ORDER BY COALESCE(dh.decrease_date_time, dh.\`timestamp\`) DESC
  `;
  const sqlNoTs = `
    SELECT
      mp.pname,
      dh.decrease_pr,
      dh.before_decrease_pr,
      dh.decrease_reason,
      dh.who_decrease,
      dh.decrease_date_time
    FROM decrease_pr_history dh
    LEFT JOIN master_package mp ON mp.id = dh.decrease_pid
    WHERE dh.mst_pr_record_id = ?
    ORDER BY dh.decrease_date_time DESC
  `;

  const sqlNoBefore = `
    SELECT
      mp.pname,
      dh.decrease_pr,
      dh.decrease_reason,
      dh.who_decrease,
      dh.decrease_date_time
    FROM decrease_pr_history dh
    LEFT JOIN master_package mp ON mp.id = dh.decrease_pid
    WHERE dh.mst_pr_record_id = ?
    ORDER BY dh.decrease_date_time DESC
  `;

  db.query(sqlWithTs, [prRecordId], (err, rows) => {
    if (!err) return callback(null, rows);
    db.query(sqlNoTs, [prRecordId], (err2, rows2) => {
      if (!err2) return callback(null, rows2);
      const sqlAltFk = sqlNoTs.replace(/mst_pr_record_id/g, "mst_pr_recordid");
      db.query(sqlAltFk, [prRecordId], (err3, rows3) => {
        if (!err3) return callback(null, rows3);
        db.query(sqlNoBefore, [prRecordId], (err4, rows4) => {
          if (!err4) return callback(null, rows4);
          const sqlAltFk2 = sqlNoBefore.replace(/mst_pr_record_id/g, "mst_pr_recordid");
          db.query(sqlAltFk2, [prRecordId], callback);
        });
      });
    });
  });
};

exports.getPrRecordForDecrease = (userId, prRecordId, callback) => {
  db.query(
    `SELECT mpr.*, mp.pname
     FROM master_pr_record mpr
     LEFT JOIN master_package mp ON mp.id = mpr.package_id
     WHERE mpr.id = ? AND mpr.user_id = ?
     LIMIT 1`,
    [prRecordId, userId],
    callback
  );
};
