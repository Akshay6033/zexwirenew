const pool = require("../config/db").promise();

const SELECTABLE_PACKAGE_SQL = `
  SELECT mpr.id AS pr_record_id,
         mpr.package_id,
         mpr.usepr_limit,
         mpr.pending_pr,
         mpr.pr_limit,
         mpr.status,
         mpr.package_end_date,
         mp.pname
  FROM master_pr_record mpr
  LEFT JOIN master_package mp ON mp.id = mpr.package_id
  WHERE mpr.user_id = ?
    AND mpr.active = 1
    AND mpr.status = 1
    AND mpr.usepr_limit > 0
    AND (mpr.package_end_date IS NULL OR DATE(mpr.package_end_date) >= CURDATE())
  ORDER BY mpr.id DESC`;

/** Fix records that still show active but have no credits left. */
async function syncExhaustedPackageRecords(connOrPool, userId) {
  const q = connOrPool.query.bind(connOrPool);

  await q(
    `UPDATE master_pr_record
     SET status = 0
     WHERE user_id = ?
       AND active = 1
       AND status = 1
       AND usepr_limit <= 0`,
    [userId]
  );

  try {
    await q(
      `UPDATE master_user_pr_status ups
       INNER JOIN master_pr_record mpr
         ON mpr.user_id = ups.u_id AND mpr.package_id = ups.plan_id
       SET ups.status = 0, ups.active = 0
       WHERE mpr.user_id = ?
         AND mpr.usepr_limit <= 0`,
      [userId]
    );
  } catch {
    /* optional table */
  }
}

async function getSelectablePackages(userId, connOrPool = pool) {
  await syncExhaustedPackageRecords(connOrPool, userId);
  const [rows] = await connOrPool.query(SELECTABLE_PACKAGE_SQL, [userId]);
  return rows || [];
}

async function getPrRecordForCreate(conn, userId, packageId) {
  const [rows] = await conn.query(
    `SELECT id, usepr_limit, pr_limit, pending_pr, use_pr, status, active
     FROM master_pr_record
     WHERE user_id = ? AND package_id = ? AND active = 1
     ORDER BY id DESC
     LIMIT 1
     FOR UPDATE`,
    [userId, packageId]
  );
  return rows[0] || null;
}

function assertCanCreatePr(prRecord) {
  if (!prRecord) {
    const err = new Error("This user has no active PR allocation for this package. Use Increase PR first.");
    err.status = 400;
    throw err;
  }
  if (Number(prRecord.status) !== 1) {
    const err = new Error("This package is no longer active. Credits are exhausted or the package expired.");
    err.status = 400;
    throw err;
  }
  if (Number(prRecord.usepr_limit) <= 0) {
    const err = new Error("Please check credit limit. No PR credits remaining for this package.");
    err.status = 400;
    err.code = "CREDIT_LIMIT";
    throw err;
  }
}

/** Legacy add_master_press_release credit deduction. */
async function deductCreditAfterCreate(conn, userId, packageId) {
  const pr = await getPrRecordForCreate(conn, userId, packageId);
  assertCanCreatePr(pr);

  const prId = pr.id;
  const useprLimit = Number(pr.usepr_limit || 0);
  const prLimit = Number(pr.pr_limit || 0);
  const pendingPrLimit = useprLimit - 1;
  const newUsePr = prLimit - pendingPrLimit;

  if (useprLimit <= 1) {
    await conn.query(
      `UPDATE master_pr_record
       SET status = 0, usepr_limit = ?, use_pr = ?, pending_pr = ?
       WHERE id = ?`,
      [pendingPrLimit, newUsePr, pendingPrLimit, prId]
    );
    try {
      await conn.query(
        `UPDATE master_user_pr_status SET status = 0, active = 0 WHERE u_id = ? AND plan_id = ?`,
        [userId, packageId]
      );
    } catch {
      /* optional */
    }
  } else {
    await conn.query(
      `UPDATE master_pr_record SET usepr_limit = ?, use_pr = ?, pending_pr = ? WHERE id = ?`,
      [pendingPrLimit, newUsePr, pendingPrLimit, prId]
    );
  }
}

module.exports = {
  syncExhaustedPackageRecords,
  getSelectablePackages,
  getPrRecordForCreate,
  assertCanCreatePr,
  deductCreditAfterCreate
};
