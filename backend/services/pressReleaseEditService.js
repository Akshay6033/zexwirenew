const pool = require("../config/db").promise();

const STATUS_LABELS = {
  0: "Draft",
  1: "Pending",
  2: "Published",
  3: "Action Required",
  5: "Rejected"
};

function reasonForEditStatus(st) {
  if (st === 1) return "Pending";
  if (st === 2) return "Published";
  if (st === 3) return "Action Required";
  if (st === 5) return "Rejected";
  return "Not Approved";
}

function slugFromTitle(title) {
  return String(title || "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 250);
}

function formatPressReleaseDisplayDate(d = new Date()) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${mo}/${da} ${hh}:${mm}`;
}

function parseImageNamesJson(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    if (parsed && typeof parsed === "object") return Object.values(parsed).map(String).filter(Boolean);
  } catch {
    /* ignore */
  }
  return [];
}

async function loadGalleryRowsForUser(userId) {
  const tries = [
    ["SELECT id, image_name, image_size, image_path FROM upload_image WHERE active = 1 AND user_id = ? ORDER BY id DESC LIMIT 200", [userId]],
    ["SELECT id, image_name, image_size, image_path FROM upload_image WHERE active = 1 AND userid = ? ORDER BY id DESC LIMIT 200", [userId]]
  ];
  for (const [sql, params] of tries) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows || [];
    } catch {
      /* try next */
    }
  }
  return [];
}

async function getEditorialRow(id) {
  const [rows] = await pool.query(
    `SELECT pr.id, pr.release_no, pr.title, pr.description, pr.p_id, pr.user_id, pr.cat_id,
            pr.company, pr.date, pr.show_contact_details, pr.add_note, pr.paid_pr, pr.imageNames,
            pr.active, pr.status, pr.prev_status,
            u.first_name, u.last_name, u.email AS user_email,
            mp.id AS package_id, mp.pname
     FROM master_press_release pr
     LEFT JOIN master_user u ON u.id = pr.user_id
     LEFT JOIN master_package mp ON mp.id = pr.p_id
     WHERE pr.id = ? AND pr.active != 2
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getCompanyDetail(companyId) {
  if (!companyId) return null;
  try {
    const [rows] = await pool.query(
      `SELECT id, cname, address, contact_person, mobile, email, website, state, country, city
       FROM master_company WHERE id = ? AND active = 1 LIMIT 1`,
      [companyId]
    );
    return rows[0] || null;
  } catch {
    const [rows] = await pool.query(
      `SELECT id, cname, address, contact_person, mobile, email, website, state, country
       FROM master_company WHERE id = ? AND active = 1 LIMIT 1`,
      [companyId]
    );
    return rows[0] || null;
  }
}

exports.getEditData = async (pressId) => {
  const editorial = await getEditorialRow(pressId);
  if (!editorial) return null;

  const userId = Number(editorial.user_id);
  const [countries] = await pool.query(
    "SELECT id, country_name FROM master_country WHERE active = 1 ORDER BY country_name ASC LIMIT 500"
  );

  const [companies] = await pool.query(
    "SELECT id, cname, created_by FROM master_company WHERE created_by = ? AND active = 1 ORDER BY cname ASC",
    [String(userId)]
  );

  const gallery = await loadGalleryRowsForUser(userId);

  let uploadImages = [];
  try {
    const [imgs] = await pool.query(
      "SELECT id, image_name, image_path FROM upload_image WHERE pr_id = ? ORDER BY id DESC",
      [pressId]
    );
    uploadImages = imgs || [];
  } catch {
    /* pr_id column may be missing */
  }

  const [historyRows] = await pool.query(
    `SELECT ps.status, ps.status_note, ps.status_datetime, ps.created_press,
            an.username
     FROM master_press_status ps
     LEFT JOIN admin_newswire an ON an.id = ps.created_press
     WHERE ps.press_id = ?
     ORDER BY ps.id DESC`,
    [pressId]
  );

  const history = (historyRows || []).map((r) => ({
    status: r.status,
    status_label: STATUS_LABELS[r.status] || String(r.status),
    status_note: r.status_note || "",
    status_datetime: r.status_datetime,
    username: r.username || "—"
  }));

  const filenames = parseImageNamesJson(editorial.imageNames);
  const companyId = Number(editorial.company) || 0;
  const companyDetail = companyId ? await getCompanyDetail(companyId) : null;

  return {
    editorial: {
      ...editorial,
      status_label: STATUS_LABELS[editorial.status] ?? String(editorial.status),
      username: `${(editorial.first_name || "").trim()} ${(editorial.last_name || "").trim()}`.trim()
    },
    companies: companies || [],
    countries: countries || [],
    gallery,
    filenames,
    upload_images: uploadImages,
    press_rel_history: history,
    company_detail: companyDetail
  };
};

async function syncUserPrStatus(conn, userId, packageId, activeFlag) {
  try {
    await conn.query(
      `UPDATE master_user_pr_status SET status = ?, active = ? WHERE u_id = ? AND plan_id = ?`,
      [activeFlag ? 1 : 0, activeFlag ? 1 : 0, userId, packageId]
    );
  } catch {
    /* table optional */
  }
}

async function applyPrCreditOnReject(conn, prRow, mstPrRecord) {
  if (!mstPrRecord || Number(prRow.paid_pr) === 0) return;
  const useprLimit = Number(mstPrRecord.usepr_limit || 0);
  const pendingPr = Number(mstPrRecord.pending_pr || 0);
  const usePr = Number(mstPrRecord.use_pr || 0);

  await conn.query(
    `UPDATE master_pr_record SET usepr_limit = ?, use_pr = ?, pending_pr = ?, status = 1 WHERE id = ?`,
    [useprLimit + 1, Math.max(0, usePr - 1), pendingPr + 1, mstPrRecord.id]
  );
  await conn.query("UPDATE master_press_release SET paid_pr = 0 WHERE id = ?", [prRow.id]);
  await syncUserPrStatus(conn, prRow.user_id, prRow.p_id, true);
}

async function applyPrCreditOnConsume(conn, prRow, mstPrRecord) {
  if (!mstPrRecord || Number(prRow.paid_pr) !== 0) return;
  const useprLimit = Number(mstPrRecord.usepr_limit || 0);
  if (useprLimit <= 0 && Number(mstPrRecord.pending_pr || 0) <= 0) {
    const err = new Error("Please check credit limit");
    err.code = "CREDIT_LIMIT";
    throw err;
  }

  const pendingPr = Number(mstPrRecord.pending_pr || 0);
  const usePr = Number(mstPrRecord.use_pr || 0);
  const nextLimit = useprLimit - 1;
  const nextPending = pendingPr - 1;

  const prRecordStatus = nextLimit > 0 || nextPending > 0 ? 1 : 0;
  await conn.query(
    `UPDATE master_pr_record SET usepr_limit = ?, use_pr = ?, pending_pr = ?, status = ? WHERE id = ?`,
    [nextLimit, usePr + 1, nextPending, prRecordStatus, mstPrRecord.id]
  );
  await conn.query("UPDATE master_press_release SET paid_pr = 1 WHERE id = ?", [prRow.id]);
  await syncUserPrStatus(conn, prRow.user_id, prRow.p_id, prRecordStatus === 1);
}

exports.updatePressRelease = async (pressId, body, adminId) => {
  const conn = await pool.getConnection();
  try {
    const [existingRows] = await conn.query(
      "SELECT * FROM master_press_release WHERE id = ? AND active != 2 LIMIT 1",
      [pressId]
    );
    if (!existingRows.length) {
      const err = new Error("Press release not found.");
      err.status = 404;
      throw err;
    }
    const lastUpdate = existingRows[0];

    const title = String(body.title || "").trim().slice(0, 250);
    const description = String(body.description || "").trim();
    const pressStatus = Number(body.status);
    const showContact = Number(body.show_contact_details);
    const datetime = String(body.datetime || "").trim();
    const statusNote = String(body.status_note || "").trim();
    const statusDatetime = String(body.status_datetime || "").trim();
    let companyId = Number(body.company_id ?? body.company);
    const userId = Number(body.user_id) || Number(lastUpdate.user_id);
    const packageId = Number(body.packageid) || Number(lastUpdate.p_id);
    const imageNames = String(body.imageNames || "").trim().slice(0, 2000) || null;
    const createdPress = Number(adminId) || Number(body.created_press) || 0;

    if (!title || !description) {
      const err = new Error("Title and press release body are required.");
      err.status = 400;
      throw err;
    }
    if (![0, 1, 2, 3, 5].includes(pressStatus)) {
      const err = new Error("Invalid status.");
      err.status = 400;
      throw err;
    }
    if (pressStatus !== 0 && (!statusNote || !statusDatetime)) {
      const err = new Error("Status note and date/time are required for this action.");
      err.status = 400;
      throw err;
    }
    if (!showContact || showContact === 0) {
      const err = new Error('Select whether to show contact details (Yes/No).');
      err.status = 400;
      throw err;
    }

    const [titleDup] = await conn.query(
      "SELECT id FROM master_press_release WHERE title = ? AND id != ? AND active = 1 LIMIT 1",
      [title, pressId]
    );
    if (titleDup.length) {
      const err = new Error("Title already exists. Use a new title.");
      err.status = 409;
      throw err;
    }

    if (!Number.isInteger(companyId) || companyId < 1) {
      const cname = String(body.cname || "").trim();
      const address = String(body.address || "").trim();
      const contact_person = String(body.contact_person || "").trim();
      const mobile = String(body.mobile || "").trim();
      const email = String(body.email || "").trim();
      const website = String(body.website || "").trim();
      const state = String(body.state || "").trim();
      const city = String(body.city || "").trim();
      const country = Number(body.country);

      if (!cname || !email || !website || !state || !Number.isInteger(country) || country < 1) {
        const err = new Error("Select a company or fill company name, email, website, state, and country.");
        err.status = 400;
        throw err;
      }

      const [insCo] = await conn.query(
        `INSERT INTO master_company
          (created_by, cname, address, contact_person, mobile, email, website, state, country, city, admin_or_self, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
        [String(userId), cname, address, contact_person, mobile, email, website, state, country, city]
      );
      companyId = insCo.insertId;
    }

    const [mprRows] = await conn.query(
      "SELECT * FROM master_pr_record WHERE user_id = ? AND package_id = ? AND active = 1 LIMIT 1",
      [userId, packageId]
    );
    const mstPrRecord = mprRows[0] || null;

    await conn.beginTransaction();

    const oldStatus = Number(lastUpdate.status);
    const statusChanged = pressStatus !== oldStatus;
    const editorial = {
      prev_status: oldStatus,
      status: pressStatus,
      title,
      url: slugFromTitle(title),
      created_press: createdPress,
      description,
      show_contact_details: showContact === 2 ? 2 : 1,
      company: String(companyId),
      imageNames
    };
    if (statusChanged) {
      editorial.view_flag = 1;
    }

    editorial.reason = reasonForEditStatus(pressStatus);
    if (pressStatus === 2) {
      editorial.publish_date_orignal = formatPressReleaseDisplayDate();
    }

    await conn.query(
      `INSERT INTO master_press_status (press_id, status_note, status, created_press, status_datetime)
       VALUES (?, ?, ?, ?, ?)`,
      [pressId, statusNote, pressStatus, createdPress, statusDatetime]
    );

    if (pressStatus !== 0) {
      editorial.reason = statusNote;
      editorial.date = statusDatetime;
    } else {
      editorial.reason = "Not Approved / Draft";
      editorial.date = formatPressReleaseDisplayDate();
    }

    if (datetime) {
      editorial.date = datetime;
    }

    await conn.query("UPDATE master_press_release SET ? WHERE id = ?", [editorial, pressId]);

    if (pressStatus === 5 && mstPrRecord) {
      await applyPrCreditOnReject(conn, lastUpdate, mstPrRecord);
    } else if ([1, 2, 3].includes(pressStatus) && mstPrRecord) {
      try {
        await applyPrCreditOnConsume(conn, lastUpdate, mstPrRecord);
      } catch (creditErr) {
        if (creditErr.code === "CREDIT_LIMIT") {
          await conn.rollback();
          const err = new Error(creditErr.message);
          err.status = 400;
          throw err;
        }
        throw creditErr;
      }
    }

    const multiIds = Array.isArray(body.add_mult_images_id)
      ? body.add_mult_images_id.map((x) => Number(x)).filter((n) => n > 0)
      : [];
    for (const imgId of multiIds) {
      try {
        await conn.query("UPDATE upload_image SET pr_id = ? WHERE id = ?", [pressId, imgId]);
      } catch {
        /* optional */
      }
    }

    await conn.commit();
    return { id: pressId, status: pressStatus, message: "Press release updated successfully." };
  } catch (e) {
    try {
      await conn.rollback();
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    conn.release();
  }
};

/** Legacy `edit_master_press_release_after_publised` — update published PR content / move back to pending. */
exports.updatePressReleaseAfterPublished = async (pressId, body, adminId) => {
  const conn = await pool.getConnection();
  try {
    const [existingRows] = await conn.query(
      "SELECT * FROM master_press_release WHERE id = ? AND active != 2 LIMIT 1",
      [pressId]
    );
    if (!existingRows.length) {
      const err = new Error("Press release not found.");
      err.status = 404;
      throw err;
    }

    const title = String(body.title || "").trim().slice(0, 250);
    const description = String(body.description || "").trim();
    const pressStatus = Number(body.status);
    const showContact = Number(body.show_contact_details);
    const datetime = String(body.datetime || "").trim();
    const statusNote = String(body.status_note || "").trim();
    const statusDatetime = String(body.status_datetime || "").trim();
    let companyId = Number(body.company_id ?? body.company);
    const userId = Number(body.user_id) || Number(existingRows[0].user_id);
    const createdPress = Number(adminId) || Number(body.created_press) || 0;

    if (!title || !description) {
      const err = new Error("Title and press release body are required.");
      err.status = 400;
      throw err;
    }
    if (![1, 2].includes(pressStatus)) {
      const err = new Error("Invalid status for this action.");
      err.status = 400;
      throw err;
    }
    if (!statusNote || !statusDatetime) {
      const err = new Error("Status note and date/time are required.");
      err.status = 400;
      throw err;
    }
    if (!showContact || showContact === 0) {
      const err = new Error('Select whether to show contact details (Yes/No).');
      err.status = 400;
      throw err;
    }

    if (!Number.isInteger(companyId) || companyId < 1) {
      const cname = String(body.cname || "").trim();
      const address = String(body.address || "").trim();
      const contact_person = String(body.contact_person || "").trim();
      const mobile = String(body.mobile || "").trim();
      const email = String(body.email || "").trim();
      const website = String(body.website || "").trim();
      const state = String(body.state || "").trim();
      const country = Number(body.country);

      if (!cname || !email || !website || !state || !Number.isInteger(country) || country < 1) {
        const err = new Error("Select a company or fill company name, email, website, state, and country.");
        err.status = 400;
        throw err;
      }

      const [insCo] = await conn.query(
        `INSERT INTO master_company
          (created_by, cname, address, contact_person, mobile, email, website, state, country, city, admin_or_self, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 1, 1)`,
        [String(userId), cname, address, contact_person, mobile, email, website, state, country]
      );
      companyId = insCo.insertId;
    }

    await conn.beginTransaction();

    const oldStatus = Number(existingRows[0].status);
    const statusChanged = pressStatus !== oldStatus;

    const editorial = {
      status: pressStatus,
      title,
      url: slugFromTitle(title),
      created_press: createdPress,
      description,
      show_contact_details: showContact === 2 ? 2 : 1,
      company: String(companyId),
      prev_status: pressStatus !== 0 ? 2 : 2
    };
    if (statusChanged) {
      editorial.view_flag = 1;
    }

    if (pressStatus !== 0) {
      editorial.reason = statusNote;
      editorial.date = statusDatetime;
    } else {
      editorial.reason = "Not Approved / Draft";
      editorial.date = formatPressReleaseDisplayDate();
    }

    if (datetime) {
      editorial.date = datetime;
    }

    await conn.query(
      `INSERT INTO master_press_status (press_id, status_note, status, created_press, status_datetime)
       VALUES (?, ?, ?, ?, ?)`,
      [pressId, statusNote, pressStatus, createdPress, statusDatetime]
    );

    await conn.query("UPDATE master_press_release SET ? WHERE id = ?", [editorial, pressId]);

    await conn.commit();
    return { id: pressId, status: pressStatus, message: "Press release updated successfully." };
  } catch (e) {
    try {
      await conn.rollback();
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    conn.release();
  }
};

/** Legacy `view_press_release_status` — one table row per `master_press_status` entry. */
exports.getPressReleaseStatusHistoryView = async (pressId) => {
  const editorial = await getEditorialRow(pressId);
  if (!editorial) return null;

  const [rows] = await pool.query(
    `SELECT ps.id, ps.press_id, ps.status, ps.status_note, ps.status_datetime, ps.created_press,
            pr.release_no, pr.title,
            TRIM(CONCAT(IFNULL(mu.first_name,''), ' ', IFNULL(mu.last_name,''))) AS user_name,
            an.username AS staff_username
     FROM master_press_status ps
     INNER JOIN master_press_release pr ON pr.id = ps.press_id
     LEFT JOIN master_user mu ON mu.id = pr.user_id
     LEFT JOIN admin_newswire an ON an.id = ps.created_press
     WHERE ps.press_id = ?
     ORDER BY ps.id ASC`,
    [pressId]
  );

  const history = (rows || []).map((r) => ({
    id: r.id,
    release_no: r.release_no,
    title: r.title,
    user_name: (r.user_name || "").trim() || "—",
    status: r.status,
    status_label: STATUS_LABELS[r.status] || String(r.status),
    status_note: r.status_note || "",
    status_datetime: r.status_datetime,
    staff_username: r.staff_username || "—"
  }));

  return {
    press: {
      id: editorial.id,
      release_no: editorial.release_no,
      title: editorial.title,
      status: editorial.status,
      status_label: STATUS_LABELS[editorial.status] ?? String(editorial.status)
    },
    rows: history
  };
};

exports.STATUS_LABELS = STATUS_LABELS;
