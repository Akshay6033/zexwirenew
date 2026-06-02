const pool = require("../config/db").promise();
const userPrModel = require("../models/userPrModel");

function todaySqlDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysSqlDate(baseYmd, days) {
  const d = new Date(`${baseYmd}T12:00:00`);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function parseHistoryPaging(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const q = String(req.query.q || "")
    .trim()
    .slice(0, 200)
    .replace(/%/g, "")
    .replace(/_/g, "");
  return { page, limit, offset, q };
}

function historySearchLike(q) {
  return q.length > 0 ? `%${q}%` : null;
}

async function attachDecreaseCountsToPrRecords(rows) {
  const ids = (rows || []).map((r) => r.pr_record_id).filter((id) => id != null);
  const countMap = {};
  if (!ids.length) {
    return (rows || []).map((row) => ({ ...row, decreaseHistoryCount: 0 }));
  }
  const placeholders = ids.map(() => "?").join(",");
  try {
    const [countRows] = await pool.query(
      `SELECT mst_pr_record_id AS pr_record_id, COUNT(*) AS total
       FROM decrease_pr_history
       WHERE mst_pr_record_id IN (${placeholders})
       GROUP BY mst_pr_record_id`,
      ids
    );
    for (const cr of countRows) {
      countMap[cr.pr_record_id] = Number(cr.total || 0);
    }
  } catch {
    try {
      const [countRowsAlt] = await pool.query(
        `SELECT mst_pr_recordid AS pr_record_id, COUNT(*) AS total
         FROM decrease_pr_history
         WHERE mst_pr_recordid IN (${placeholders})
         GROUP BY mst_pr_recordid`,
        ids
      );
      for (const cr of countRowsAlt) {
        countMap[cr.pr_record_id] = Number(cr.total || 0);
      }
    } catch {
      /* ignore */
    }
  }
  return (rows || []).map((row) => ({
    ...row,
    decreaseHistoryCount: countMap[row.pr_record_id] || 0
  }));
}

exports.getIncreasePrFormData = (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  userPrModel.getUserBasic(userId, (uErr, uRows) => {
    if (uErr) return res.status(500).json({ status: false, message: "Could not load user." });
    if (!uRows?.length) return res.status(404).json({ status: false, message: "User not found." });
    userPrModel.getActivePackages((pErr, packages) => {
      if (pErr) return res.status(500).json({ status: false, message: "Could not load packages." });
      return res.json({
        status: true,
        data: {
          user: uRows[0],
          packages: packages || [],
          userPrStatus: []
        }
      });
    });
  });
};

/** Paginated master_user_pr_status rows (PR history table on increase-pr page). Query: page, limit, q */
exports.getUserPrStatusPaged = (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  const page = req.query.page;
  const limit = req.query.limit;
  const q = req.query.q;
  userPrModel.getUserBasic(userId, (uErr, uRows) => {
    if (uErr) return res.status(500).json({ status: false, message: "Could not load user." });
    if (!uRows?.length) return res.status(404).json({ status: false, message: "User not found." });
    userPrModel.getUserPrStatusListPaged(userId, page, limit, q, (sErr, result) => {
      if (sErr) {
        console.error("getUserPrStatusPaged", sErr);
        return res.status(500).json({ status: false, message: "Could not load PR history." });
      }
      return res.json({
        status: true,
        data: {
          user: uRows[0],
          rows: result.rows,
          total: result.total,
          page: result.page,
          limit: result.limit
        }
      });
    });
  });
};

exports.getUserPrHistoryView = (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  userPrModel.getUserBasic(userId, (uErr, uRows) => {
    if (uErr) return res.status(500).json({ status: false, message: "Could not load user." });
    if (!uRows?.length) return res.status(404).json({ status: false, message: "User not found." });
    userPrModel.getUserPrStatusList(userId, (sErr, statusRows) => {
      if (sErr) return res.status(500).json({ status: false, message: "Could not load PR history." });
      return res.json({
        status: true,
        data: { user: uRows[0], userPrStatus: statusRows || [] }
      });
    });
  });
};

exports.getIncreasePrLineHistory = (req, res) => {
  const userPrStatusId = Number(req.params.userPrStatusId);
  if (!userPrStatusId) return res.status(400).json({ status: false, message: "Record id is required." });
  userPrModel.getIncreaseHistoryByUserPrId(userPrStatusId, (err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not load increase history." });
    return res.json({ status: true, data: rows || [] });
  });
};

/** User header + spending only; payment / PR / press tables use separate paged endpoints. */
exports.getUserFullHistory = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  try {
    const [uRows] = await pool.query(
      `SELECT id, first_name, last_name, email, mobile, created_date, timestamp AS last_login
       FROM master_user WHERE id = ? AND active != 2 LIMIT 1`,
      [userId]
    );
    if (!uRows.length) return res.status(404).json({ status: false, message: "User not found." });

    const sumSql = "SELECT COALESCE(SUM(price), 0) AS total FROM user_payment_history WHERE user_id = ?";
    const [sumRows] = await pool.query(sumSql, [userId]);

    return res.json({
      status: true,
      data: {
        user: uRows[0],
        spending: Number(sumRows[0]?.total || 0)
      }
    });
  } catch (e) {
    console.error("getUserFullHistory", e);
    return res.status(500).json({ status: false, message: "Could not load user history." });
  }
};

/** Query: page, limit, q — user_payment_history with remaining credits / expiry from latest master_pr_record per plan */
exports.getUserHistoryPaymentsPaged = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  const { page, limit, offset, q } = parseHistoryPaging(req);
  const like = historySearchLike(q);
  try {
    const [uRows] = await pool.query(
      "SELECT id FROM master_user WHERE id = ? AND active != 2 LIMIT 1",
      [userId]
    );
    if (!uRows.length) return res.status(404).json({ status: false, message: "User not found." });

    let searchSql = "";
    const baseParams = [userId];
    if (like) {
      searchSql = ` AND (
        mp.pname LIKE ? OR
        CAST(IFNULL(uph.price, '') AS CHAR) LIKE ? OR
        CAST(IFNULL(uph.og_pr, '') AS CHAR) LIKE ? OR
        IFNULL(uph.reason, '') LIKE ? OR
        CAST(IFNULL(uph.timestamp, '') AS CHAR) LIKE ?
      )`;
      for (let i = 0; i < 5; i += 1) baseParams.push(like);
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM user_payment_history uph
      LEFT JOIN master_package mp ON mp.id = uph.plan_id
      WHERE uph.user_id = ? ${searchSql}`;
    const [[countRow]] = await pool.query(countSql, baseParams);
    const total = Number(countRow?.total || 0);

    const dataSql = `
      SELECT uph.*, mp.pname,
        (SELECT mpr.usepr_limit FROM master_pr_record mpr
         WHERE mpr.user_id = uph.user_id AND mpr.package_id = uph.plan_id
         ORDER BY mpr.id DESC LIMIT 1) AS remainingCredits,
        (SELECT mpr.package_end_date FROM master_pr_record mpr
         WHERE mpr.user_id = uph.user_id AND mpr.package_id = uph.plan_id
         ORDER BY mpr.id DESC LIMIT 1) AS expiryDate
      FROM user_payment_history uph
      LEFT JOIN master_package mp ON mp.id = uph.plan_id
      WHERE uph.user_id = ? ${searchSql}
      ORDER BY uph.timestamp DESC
      LIMIT ? OFFSET ?`;
    const dataParams = [...baseParams, limit, offset];
    const [rows] = await pool.query(dataSql, dataParams);

    return res.json({
      status: true,
      data: { rows: rows || [], total, page, limit }
    });
  } catch (e) {
    console.error("getUserHistoryPaymentsPaged", e);
    return res.status(500).json({ status: false, message: "Could not load payment history." });
  }
};

/** Query: page, limit, q — master_pr_record list with decrease history counts */
exports.getUserHistoryPrRecordsPaged = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  const { page, limit, offset, q } = parseHistoryPaging(req);
  const like = historySearchLike(q);
  try {
    const [uRows] = await pool.query(
      "SELECT id FROM master_user WHERE id = ? AND active != 2 LIMIT 1",
      [userId]
    );
    if (!uRows.length) return res.status(404).json({ status: false, message: "User not found." });

    let searchSql = "";
    const baseParams = [userId];
    if (like) {
      searchSql = ` AND (
        mp.pname LIKE ? OR
        CAST(IFNULL(mpr.price_usd, '') AS CHAR) LIKE ? OR
        CAST(IFNULL(mpr.pr_limit, '') AS CHAR) LIKE ? OR
        CAST(IFNULL(mpr.usepr_limit, '') AS CHAR) LIKE ? OR
        CAST(IFNULL(mpr.timestamp, '') AS CHAR) LIKE ?
      )`;
      for (let i = 0; i < 5; i += 1) baseParams.push(like);
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM master_pr_record mpr
      LEFT JOIN master_package mp ON mp.id = mpr.package_id
      WHERE mpr.user_id = ? ${searchSql}`;
    const [[countRow]] = await pool.query(countSql, baseParams);
    const total = Number(countRow?.total || 0);

    const dataSql = `
      SELECT mpr.id AS pr_record_id, mpr.user_id, mpr.package_id, mpr.price_usd, mpr.pr_limit,
             mpr.usepr_limit, mpr.pending_pr, mpr.timestamp, mp.pname
      FROM master_pr_record mpr
      LEFT JOIN master_package mp ON mp.id = mpr.package_id
      WHERE mpr.user_id = ? ${searchSql}
      ORDER BY mpr.timestamp DESC
      LIMIT ? OFFSET ?`;
    const [rawRows] = await pool.query(dataSql, [...baseParams, limit, offset]);
    const withCounts = await attachDecreaseCountsToPrRecords(rawRows || []);

    return res.json({
      status: true,
      data: { rows: withCounts, total, page, limit }
    });
  } catch (e) {
    console.error("getUserHistoryPrRecordsPaged", e);
    return res.status(500).json({ status: false, message: "Could not load PR records." });
  }
};

/** Query: page, limit, q — press releases for user */
exports.getUserHistoryPressReleasesPaged = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  const { page, limit, offset, q } = parseHistoryPaging(req);
  const like = historySearchLike(q);
  try {
    const [uRows] = await pool.query(
      "SELECT id FROM master_user WHERE id = ? AND active != 2 LIMIT 1",
      [userId]
    );
    if (!uRows.length) return res.status(404).json({ status: false, message: "User not found." });

    let searchSql = "";
    const baseParams = [userId];
    if (like) {
      searchSql = ` AND (
        CAST(IFNULL(pr.release_no, '') AS CHAR) LIKE ? OR
        IFNULL(pr.title, '') LIKE ? OR
        IFNULL(mp.pname, '') LIKE ? OR
        CAST(IFNULL(pr.date_current, '') AS CHAR) LIKE ? OR
        CAST(IFNULL(pr.p_id, '') AS CHAR) LIKE ?
      )`;
      for (let i = 0; i < 5; i += 1) baseParams.push(like);
    }

    const baseWhere = "pr.user_id = ? AND pr.active != 0 AND pr.status = 2";

    const countSql = `
      SELECT COUNT(*) AS total
      FROM master_press_release pr
      LEFT JOIN master_package mp ON mp.id = pr.p_id
      WHERE ${baseWhere} ${searchSql}`;

    let total = 0;
    let rows = [];
    try {
      const [[countRow]] = await pool.query(countSql, baseParams);
      total = Number(countRow?.total || 0);
      const dataSql = `
        SELECT pr.release_no, pr.active, pr.title, pr.p_id, pr.date_current, pr.user_id, mp.pname AS package_name
        FROM master_press_release pr
        LEFT JOIN master_package mp ON mp.id = pr.p_id
        WHERE ${baseWhere} ${searchSql}
        ORDER BY pr.date_current DESC, pr.release_no DESC
        LIMIT ? OFFSET ?`;
      const [pressRows] = await pool.query(dataSql, [...baseParams, limit, offset]);
      rows = pressRows || [];
    } catch (inner) {
      console.warn("getUserHistoryPressReleasesPaged press query:", inner.code || inner.message);
      total = 0;
      rows = [];
    }

    return res.json({
      status: true,
      data: { rows, total, page, limit }
    });
  } catch (e) {
    console.error("getUserHistoryPressReleasesPaged", e);
    return res.status(500).json({ status: false, message: "Could not load press releases." });
  }
};

exports.getDecreasePrForm = (req, res) => {
  const userId = Number(req.params.userId);
  const prRecordId = Number(req.params.prRecordId);
  if (!userId || !prRecordId) {
    return res.status(400).json({ status: false, message: "User id and PR record id are required." });
  }
  userPrModel.getPrRecordForDecrease(userId, prRecordId, (err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not load PR record." });
    if (!rows?.length) return res.status(404).json({ status: false, message: "PR record not found." });
    return res.json({ status: true, data: rows[0] });
  });
};

exports.getDecreasePrHistory = (req, res) => {
  const prRecordId = Number(req.params.prRecordId);
  if (!prRecordId) return res.status(400).json({ status: false, message: "PR record id is required." });
  userPrModel.getDecreaseHistory(prRecordId, (err, rows) => {
    if (err) {
      console.error("getDecreasePrHistory SQL:", err.code, err.sqlMessage || err.message);
      return res.status(500).json({
        status: false,
        message: "Could not load decrease history.",
        detail: process.env.NODE_ENV === "development" ? err.sqlMessage || err.message : undefined
      });
    }
    return res.json({ status: true, data: rows || [] });
  });
};

exports.postIncreasePr = async (req, res) => {
  const userId = Number(req.params.userId);
  const adminId = req.admin?.id;
  const whoLabel = req.admin?.username || req.admin?.email || String(adminId);
  if (!adminId) return res.status(401).json({ status: false, message: "Unauthorized" });
  if (!userId) return res.status(400).json({ status: false, message: "User id is required." });
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ status: false, message: "Select at least one package." });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [userRows] = await conn.query("SELECT id FROM master_user WHERE id = ? AND active != 2 LIMIT 1", [userId]);
    if (!userRows.length) {
      await conn.rollback();
      return res.status(404).json({ status: false, message: "User not found." });
    }

    for (const raw of items) {
      const planId = Number(raw.plan_id);
      const pr = Number(raw.pr);
      const price = String(raw.price ?? "").trim();
      const reason = String(raw.reason ?? "").trim();
      const validityVal = raw.validity;
      const validity =
        validityVal === "" || validityVal === null || validityVal === undefined ? null : Number(validityVal);

      if (!planId || !Number.isFinite(pr) || pr <= 0 || !reason) {
        throw new Error("Each package needs PR amount, price, and reason.");
      }

      const [pkgRows] = await conn.query(
        "SELECT id, package_validity FROM master_package WHERE id = ? AND active = 1 LIMIT 1",
        [planId]
      );
      if (!pkgRows.length) throw new Error("Invalid package.");
      const packageValidityMaster = Number(pkgRows[0].package_validity || 0);

      const [upsRows] = await conn.query(
        "SELECT * FROM master_user_pr_status WHERE u_id = ? AND plan_id = ? LIMIT 1",
        [userId, planId]
      );

      const today = todaySqlDate();
      let prStatusId;

      if (upsRows.length) {
        const up = upsRows[0];
        const prId = up.id;
        const incresspr = Number(up.pr || 0);
        const packageValidityUserPr = Number(up.package_validity || 0);
        const packageEnd = up.package_end_date ? String(up.package_end_date).slice(0, 10) : null;
        const notExpired = packageEnd && new Date(packageEnd) >= new Date(today);

        const nextPr = notExpired ? pr + incresspr : pr;
        const nextOg = pr;

        if (validity !== null && Number.isFinite(validity) && validity > 0) {
          const updValidity = packageValidityUserPr + validity;
          const updEnd = addDaysSqlDate(today, validity);
          await conn.query(
            `UPDATE master_user_pr_status SET
              admin_id = ?, plan_id = ?, pr = ?, og_pr = ?, usd_amount = ?, payment_method = 'Offline Payment',
              reason = ?, status = 1, active = 1, package_validity = ?, package_end_date = ?,
              admin_validity = ?
            WHERE id = ?`,
            [adminId, planId, nextPr, nextOg, price, reason, updValidity, updEnd, packageValidityMaster, prId]
          );
        } else {
          const updValidity = packageValidityUserPr + packageValidityMaster;
          const updEnd = addDaysSqlDate(today, packageValidityMaster);
          await conn.query(
            `UPDATE master_user_pr_status SET
              admin_id = ?, plan_id = ?, pr = ?, og_pr = ?, usd_amount = ?, payment_method = 'Offline Payment',
              reason = ?, status = 1, active = 1, package_validity = ?, package_end_date = ?
            WHERE id = ?`,
            [adminId, planId, nextPr, nextOg, price, reason, updValidity, updEnd, prId]
          );
        }
        prStatusId = prId;

        await conn.query(
          `INSERT INTO user_payment_history (user_id, plan_id, og_pr, price, admin_id, reason)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, planId, pr, price, adminId, reason]
        );

        await conn.query(
          `INSERT INTO increase_pr_history (user_pr_id, u_id, plan_id, increase_pr, date, who_increase, price, reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [prStatusId, adminId, planId, pr, today, whoLabel, price, reason]
        );
      } else {
        let pkgVal;
        let pkgStart;
        let pkgEnd;
        let adminValidityNew;

        if (validity !== null && Number.isFinite(validity) && validity > 0) {
          pkgVal = validity;
          pkgStart = today;
          pkgEnd = addDaysSqlDate(today, validity);
          adminValidityNew = packageValidityMaster;
        } else {
          pkgVal = packageValidityMaster;
          pkgStart = today;
          pkgEnd = addDaysSqlDate(today, packageValidityMaster);
          adminValidityNew = 0;
        }

        const [ins] = await conn.query(
          `INSERT INTO master_user_pr_status
          (u_id, admin_id, plan_id, pr, og_pr, usd_amount, payment_method, reason, status, active,
           package_validity, package_start_date, package_end_date, admin_validity)
          VALUES (?, ?, ?, ?, ?, ?, 'Offline Payment', ?, 1, 1, ?, ?, ?, ?)`,
          [userId, adminId, planId, pr, pr, price, reason, pkgVal, pkgStart, pkgEnd, adminValidityNew]
        );
        prStatusId = ins.insertId;

        await conn.query(
          `INSERT INTO increase_pr_history (user_pr_id, u_id, plan_id, increase_pr, date, who_increase, price, reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [prStatusId, adminId, planId, pr, today, whoLabel, price, reason]
        );

        await conn.query(
          `INSERT INTO user_payment_history (user_id, plan_id, og_pr, price, admin_id, reason)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, planId, pr, price, adminId, reason]
        );
      }

      const [prRecRows] = await conn.query(
        "SELECT * FROM master_pr_record WHERE user_id = ? AND package_id = ? LIMIT 1",
        [userId, planId]
      );

      if (prRecRows.length) {
        const rec = prRecRows[0];
        const prRecordId = rec.id;
        const prLimit = Number(rec.pr_limit || 0);
        const prUserLimit = Number(rec.usepr_limit || 0);
        const pendingPr = rec.pending_pr == null ? 0 : Number(rec.pending_pr);
        const usedPr = rec.use_pr == null ? 0 : Number(rec.use_pr);
        const pkgValidityRec = Number(rec.package_validity || 0);
        const recEnd = rec.package_end_date ? String(rec.package_end_date).slice(0, 10) : null;
        const recNotExpired = recEnd && new Date(recEnd) >= new Date(today);

        let nextPrLimit;
        let nextUsePrLimit;
        let nextPending;
        let nextUsePr = usedPr;

        if (recNotExpired) {
          nextPrLimit = pr + prLimit;
          nextUsePrLimit = pr + prUserLimit;
          if (pendingPr == null || pendingPr === 0) nextPending = pendingPr;
          else nextPending = pr + pendingPr;
        } else {
          nextPrLimit = pr;
          nextUsePrLimit = pr;
          nextUsePr = 0;
          nextPending = 0;
        }

        let recValidity;
        let recEndDate;
        let adminValidityRec;

        if (validity !== null && Number.isFinite(validity) && validity > 0) {
          recValidity = pkgValidityRec + validity;
          recEndDate = addDaysSqlDate(today, validity);
          adminValidityRec = packageValidityMaster;
        } else {
          recValidity = pkgValidityRec + packageValidityMaster;
          recEndDate = addDaysSqlDate(today, packageValidityMaster);
          adminValidityRec = 0;
        }

        await conn.query(
          `UPDATE master_pr_record SET
            price_usd = ?, pr_limit = ?, usepr_limit = ?, use_pr = ?, pending_pr = ?,
            payment_method = 'Offline Payment', payment_id = 'Offline Payment', created_by = ?,
            status = 1, active = 1, package_validity = ?, package_end_date = ?, admin_validity_prrecord = ?
          WHERE id = ?`,
          [price, nextPrLimit, nextUsePrLimit, nextUsePr, nextPending, adminId, recValidity, recEndDate, adminValidityRec, prRecordId]
        );
      } else {
        let recVal;
        let recStart;
        let recEnd;
        let adminValidityIns;

        if (validity !== null && Number.isFinite(validity) && validity > 0) {
          recVal = validity;
          recStart = today;
          recEnd = addDaysSqlDate(today, validity);
          adminValidityIns = packageValidityMaster;
        } else {
          recVal = packageValidityMaster;
          recStart = today;
          recEnd = addDaysSqlDate(today, packageValidityMaster);
          adminValidityIns = packageValidityMaster;
        }

        await conn.query(
          `INSERT INTO master_pr_record
          (user_id, package_id, price_usd, pr_limit, usepr_limit, use_pr, pending_pr,
           payment_method, payment_id, created_by, status, active, package_validity, package_start_date, package_end_date, admin_validity_prrecord)
          VALUES (?, ?, ?, ?, ?, 0, 0, 'Offline Payment', 'Offline Payment', ?, 1, 1, ?, ?, ?, ?)`,
          [userId, planId, price, pr, pr, adminId, recVal, recStart, recEnd, adminValidityIns]
        );
      }

      let payPkgVal;
      let payStart;
      let payEnd;
      let adminValidityPayment;

      if (validity !== null && Number.isFinite(validity) && validity > 0) {
        payPkgVal = validity;
        payStart = today;
        payEnd = addDaysSqlDate(today, validity);
        adminValidityPayment = packageValidityMaster;
      } else {
        payPkgVal = packageValidityMaster;
        payStart = today;
        payEnd = addDaysSqlDate(today, packageValidityMaster);
        adminValidityPayment = null;
      }

      try {
        await conn.query(
          `INSERT INTO payments
          (payment_id, order_id, signature_hash, usd_amount, status, payment_method, userid, package_id, reason,
           package_validity, package_start_date, package_end_date, date_current, admin_validity_payment)
          VALUES (?, 'Offline Payment', 'Offline Payment', ?, 'Offline Payment', 'Offline Payment', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(adminId),
            price,
            userId,
            planId,
            reason,
            payPkgVal,
            payStart,
            payEnd,
            today,
            adminValidityPayment
          ]
        );
      } catch (payErr) {
        console.warn("payments insert skipped:", payErr.code || payErr.message);
      }

      try {
        await conn.query("UPDATE master_user SET plan_id = ?, pr = ?, reason = ? WHERE id = ?", [planId, pr, reason, userId]);
      } catch {
        await conn.query("UPDATE master_user SET plan_id = ?, pr = ? WHERE id = ?", [planId, pr, userId]);
      }
    }

    await conn.commit();
    return res.json({ status: true, message: "PR updated successfully" });
  } catch (e) {
    await conn.rollback();
    console.error("postIncreasePr", e);
    return res.status(500).json({
      status: false,
      message: e.message || "Could not update PR."
    });
  } finally {
    conn.release();
  }
};

exports.postDecreasePr = async (req, res) => {
  const userId = Number(req.body.user_id);
  const prRecordId = Number(req.body.pr_record_id);
  const decreasePr = Number(req.body.decrease_pr);
  const decreaseReason = String(req.body.decrease_reason || "").trim();
  const adminId = req.admin?.id;
  const whoLabel = req.admin?.username || req.admin?.email || String(adminId);
  if (!adminId) return res.status(401).json({ status: false, message: "Unauthorized" });

  if (!userId || !prRecordId || !decreasePr || decreasePr < 1 || !decreaseReason) {
    return res.status(400).json({ status: false, message: "Invalid decrease request." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT * FROM master_pr_record WHERE id = ? AND user_id = ? LIMIT 1",
      [prRecordId, userId]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ status: false, message: "PR record not found." });
    }
    const org = rows[0];
    const useLimit = Number(org.usepr_limit || 0);
    if (decreasePr > useLimit) {
      await conn.rollback();
      return res.status(400).json({ status: false, message: "Decrease amount exceeds remaining credits." });
    }

    const beforeDecreasePr = Number(org.pr_limit || 0);
    const prLimit = Number(org.pr_limit || 0);
    const usePr = org.use_pr == null ? 0 : Number(org.use_pr);
    const pendingPr = org.pending_pr == null ? 0 : Number(org.pending_pr);

    const mat = {
      pr_limit: prLimit,
      usepr_limit: useLimit - decreasePr,
      use_pr: usePr + decreasePr
    };

    if (pendingPr > 0) {
      mat.pending_pr = pendingPr - decreasePr;
    } else if ((pendingPr === 0 || org.pending_pr == null) && (usePr === 0 || org.use_pr == null)) {
      mat.pending_pr = prLimit - decreasePr;
    } else {
      mat.pending_pr = 0;
    }

    await conn.query(
      `UPDATE master_pr_record SET pr_limit = ?, usepr_limit = ?, use_pr = ?, pending_pr = ? WHERE id = ?`,
      [mat.pr_limit, mat.usepr_limit, mat.use_pr, mat.pending_pr, prRecordId]
    );

    if (mat.usepr_limit === 0 && mat.pending_pr === 0) {
      await conn.query("UPDATE master_pr_record SET status = 0 WHERE id = ?", [prRecordId]);
      await conn.query(
        "UPDATE master_user_pr_status SET status = 0, active = 0 WHERE u_id = ? AND plan_id = ?",
        [userId, org.package_id]
      );
    }

    await conn.query(
      `INSERT INTO decrease_pr_history
      (mst_pr_record_id, decrease_userid, decrease_pid, before_decrease_pr, decrease_pr, decrease_reason, who_decrease, decrease_date_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [prRecordId, userId, org.package_id, beforeDecreasePr, decreasePr, decreaseReason, whoLabel]
    );

    await conn.commit();
    return res.json({ status: true, message: "PR decreased successfully" });
  } catch (e) {
    await conn.rollback();
    console.error("postDecreasePr", e);
    return res.status(500).json({ status: false, message: "Could not decrease PR." });
  } finally {
    conn.release();
  }
};
