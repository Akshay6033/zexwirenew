const pool = require("../config/db").promise();

function parseDisIds(disIdRaw) {
  if (!disIdRaw) return [];
  try {
    const parsed = JSON.parse(disIdRaw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Legacy delete_editorial — restore vendor publication credits. */
async function restoreDistributionCredits(conn, packageId) {
  const [pkgRows] = await conn.query("SELECT dis_id FROM master_package WHERE id = ? LIMIT 1", [packageId]);
  if (!pkgRows.length) return;

  const disIds = parseDisIds(pkgRows[0].dis_id);
  for (const disId of disIds) {
    const [vendors] = await conn.query(
      "SELECT id, nopublication, use_credits FROM master_distribution WHERE id = ? LIMIT 1",
      [disId]
    );
    for (const vendor of vendors) {
      if (Number(vendor.nopublication) !== 0) {
        await conn.query(
          "UPDATE master_distribution SET use_credits = ?, nopublication = ? WHERE id = ?",
          [Number(vendor.use_credits) + 1, Number(vendor.nopublication) - 1, vendor.id]
        );
      }
    }
  }
}

function shouldRestoreUserCredits(pressRow) {
  if (Number(pressRow.paid_pr) !== 1) return false;
  const prStatus = Number(pressRow.status);
  const prevStatus = Number(pressRow.prev_status);
  return (
    prStatus === 1 ||
    prStatus === 3 ||
    prevStatus === 1 ||
    prevStatus === 3 ||
    prevStatus === 0
  );
}

/** Legacy delete_editorial — restore user package credits when applicable. */
async function restoreUserPackageCredits(conn, pressRow, prRecord, userPrRecord) {
  if (!shouldRestoreUserCredits(pressRow) || !prRecord) return;

  const useprLimit = Number(prRecord.usepr_limit || 0);
  const usePr = Number(prRecord.use_pr || 0);
  const pendingPr = Number(prRecord.pending_pr || 0);
  const nextLimit = useprLimit + 1;
  const nextUsePr = usePr - 1;
  const nextPending = pendingPr + 1;

  if (pendingPr !== 0) {
    await conn.query(
      "UPDATE master_pr_record SET usepr_limit = ?, use_pr = ?, pending_pr = ? WHERE id = ?",
      [nextLimit, nextUsePr, nextPending, prRecord.id]
    );
  } else {
    await conn.query(
      "UPDATE master_pr_record SET usepr_limit = ?, use_pr = ?, pending_pr = ?, status = 1 WHERE id = ?",
      [nextLimit, nextUsePr, nextPending, prRecord.id]
    );
    if (userPrRecord?.id) {
      await conn.query("UPDATE master_user_pr_status SET status = 1, active = 1 WHERE id = ?", [
        userPrRecord.id
      ]);
    }
  }
}

async function softDeletePress(conn, pressId) {
  const [result] = await conn.query(
    "UPDATE master_press_release SET active = 2 WHERE id = ? AND active != 2",
    [pressId]
  );
  return Number(result.affectedRows) > 0;
}

/** Legacy `delete_editorial` — soft delete + optional credit restore. */
exports.deleteEditorial = async (pressId) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pressRows] = await conn.query(
      `SELECT id, user_id, p_id, status, paid_pr, prev_status, active
       FROM master_press_release WHERE id = ? LIMIT 1 FOR UPDATE`,
      [pressId]
    );
    if (!pressRows.length) {
      const err = new Error("Press release not found.");
      err.status = 404;
      throw err;
    }

    const pressRow = pressRows[0];
    if (Number(pressRow.active) === 2) {
      const err = new Error("Press release is already deleted.");
      err.status = 400;
      throw err;
    }

    const userId = pressRow.user_id;
    const planId = pressRow.p_id;

    let userPrRecord = null;
    try {
      const [upsRows] = await conn.query(
        "SELECT id FROM master_user_pr_status WHERE u_id = ? AND plan_id = ? LIMIT 1 FOR UPDATE",
        [userId, planId]
      );
      userPrRecord = upsRows[0] || null;
    } catch {
      /* optional table */
    }

    const [prRows] = await conn.query(
      `SELECT id, usepr_limit, use_pr, pending_pr
       FROM master_pr_record WHERE user_id = ? AND package_id = ? LIMIT 1 FOR UPDATE`,
      [userId, planId]
    );
    const prRecord = prRows[0] || null;

    await restoreDistributionCredits(conn, planId);

    if (shouldRestoreUserCredits(pressRow)) {
      await restoreUserPackageCredits(conn, pressRow, prRecord, userPrRecord);
    }

    const ok = await softDeletePress(conn, pressId);
    if (!ok) {
      const err = new Error("Something went wrong !! please activate it again !!!");
      err.status = 500;
      throw err;
    }

    await conn.commit();
    return { message: "Press Release Deleted Successfully" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/** Legacy `delete_editorial_published` — soft delete only (no credit restore). */
exports.deleteEditorialPublished = async (pressId) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pressRows] = await conn.query(
      "SELECT id, active FROM master_press_release WHERE id = ? LIMIT 1 FOR UPDATE",
      [pressId]
    );
    if (!pressRows.length) {
      const err = new Error("Press release not found.");
      err.status = 404;
      throw err;
    }
    if (Number(pressRows[0].active) === 2) {
      const err = new Error("Press release is already deleted.");
      err.status = 400;
      throw err;
    }

    const ok = await softDeletePress(conn, pressId);
    if (!ok) {
      const err = new Error("Something went wrong !! please activate it again !!!");
      err.status = 500;
      throw err;
    }

    await conn.commit();
    return { message: "Publish Press Release Deleted Successfully" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
