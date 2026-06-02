const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const userModel = require("../models/authModel");
const distributionModel = require("../models/distributionModel");
const packageModel = require("../models/packageModel");
const categoryModel = require("../models/categoryModel");
const countryModel = require("../models/countryModel");
const newsletterModel = require("../models/newsletterModel");
const paymentMethodModel = require("../models/paymentMethodModel");
const paymentHistoryModel = require("../models/paymentHistoryModel");
const invoiceCompanyModel = require("../models/invoiceCompanyModel");
const invoiceModel = require("../models/invoiceModel");
const editorialModel = require("../models/editorialModel");
const galleryModel = require("../models/galleryModel");
const pressReleaseEditService = require("../services/pressReleaseEditService");
const pressReleaseDeleteService = require("../services/pressReleaseDeleteService");
const pool = require("../config/db").promise();
const prCreditService = require("../services/prCreditService");

const PASSWORD_REGEX =
  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

function toPublicUploadPath(req, filePath) {
  if (!filePath) return null;
  const normalized = String(filePath).replace(/\\/g, "/");
  const marker = "/uploads/";
  const index = normalized.lastIndexOf(marker);
  if (index !== -1) return normalized.slice(index);
  const fileName = path.basename(normalized);
  return `/uploads/${fileName}`;
}

function safeDeleteUpload(value) {
  if (!value) return;
  const normalized = String(value).replace(/\\/g, "/");
  const marker = "/uploads/";
  const index = normalized.indexOf(marker);
  if (index === -1) return;
  const relative = normalized.slice(index + 1);
  const absolute = path.join(__dirname, "..", relative);
  if (fs.existsSync(absolute)) fs.unlink(absolute, () => {});
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function normalizeSequencerScope(rawScope) {
  const allowed = new Set(["global", "online", "offline", "normal", "reseller", "crypto", "indian", "white_label"]);
  const scope = String(rawScope || "").trim().toLowerCase();
  return allowed.has(scope) ? scope : "global";
}

exports.postEditorialMarkViewed = (req, res) => {
  const tab = String(req.body?.tab || "room").toLowerCase();
  editorialModel.markTabViewed(tab, (err, result) => {
    if (err) {
      console.error("postEditorialMarkViewed", err);
      return res.status(500).json({ status: false, message: "Could not mark press releases as viewed." });
    }
    return res.json({ status: true, data: { tab, affectedRows: result?.affectedRows ?? 0 } });
  });
};

function mapEditorialBadges(r = {}) {
  return {
    newTotal: Number(r.badge_new ?? r.new_total) || 0,
    draft: Number(r.badge_draft ?? r.draft) || 0,
    pending: Number(r.badge_pending ?? r.pending) || 0,
    actionRequired: Number(r.badge_action_required ?? r.action_required) || 0,
    published: Number(r.badge_published ?? r.published) || 0,
    rejected: Number(r.badge_rejected ?? r.rejected) || 0
  };
}

exports.getEditorialSummary = (req, res) => {
  editorialModel.getSummaryCounts((err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not load editorial summary." });
    const r = rows?.[0] || {};
    return res.json({
      status: true,
      data: {
        editorialRoom: Number(r.editorial_room) || 0,
        published: Number(r.published) || 0,
        pending: Number(r.pending) || 0,
        draft: Number(r.draft) || 0,
        actionRequired: Number(r.action_required) || 0,
        rejected: Number(r.rejected) || 0,
        deleted: Number(r.deleted) || 0,
        badges: mapEditorialBadges(r)
      }
    });
  });
};

/** Legacy `notification_pr` / `notification_pr_pending` etc. (one request instead of six). */
exports.getEditorialNotifications = (req, res) => {
  editorialModel.getNotificationCounts((err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not load notifications." });
    const r = rows?.[0] || {};
    return res.json({ status: true, data: mapEditorialBadges(r) });
  });
};

function legacyImagesDataBaseUrl() {
  const raw = process.env.LEGACY_SITE_URL || process.env.PUBLIC_SITE_URL || "https://pr.zexprwire.com";
  return String(raw).replace(/\/$/, "");
}

function galleryImagePublicUrl(imageName) {
  const name = String(imageName || "").trim();
  if (!name) return "";
  return `${legacyImagesDataBaseUrl()}/images_data/${encodeURIComponent(path.basename(name))}`;
}

function resolveImagesDataFile(imageName) {
  const name = path.basename(String(imageName || "").trim());
  if (!name) return null;
  const candidates = [
    process.env.IMAGES_DATA_DIR,
    path.join(__dirname, "..", "images_data"),
    path.join(__dirname, "..", "..", "images_data")
  ].filter(Boolean);
  for (const dir of candidates) {
    const abs = path.join(dir, name);
    if (fs.existsSync(abs)) return abs;
  }
  return path.join(candidates[0] || path.join(__dirname, "..", "images_data"), name);
}

function safeUnlinkImagesData(imageName) {
  const abs = resolveImagesDataFile(imageName);
  if (!abs || !fs.existsSync(abs)) return;
  try {
    fs.unlinkSync(abs);
  } catch (e) {
    console.warn("safeUnlinkImagesData", e.message);
  }
}

/** Legacy `manage_gallery` — server-side list with search/sort/pagination. */
exports.getGalleryImages = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  const finishList = (recordsTotal, recordsFiltered) => {
    galleryModel.listGallery(
      { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
      (listErr, rows) => {
        if (listErr) {
          console.error("getGalleryImages list", listErr);
          return res.status(500).json({ status: false, message: "Could not load gallery." });
        }
        const data = (rows || []).map((row) => {
          const builtUrl = galleryImagePublicUrl(row.image_name);
          const imagePath = String(row.image_path || "").trim() || builtUrl;
          return {
            id: row.id,
            first_name: row.first_name,
            last_name: row.last_name,
            image_name: row.image_name,
            image_path: imagePath,
            image_url: builtUrl,
            timestamp: row.timestamp
          };
        });
        return res.json({
          status: true,
          data,
          meta: { recordsTotal, recordsFiltered, start: parsedStart, length: parsedLength }
        });
      }
    );
  };

  galleryModel.countGallery("", (totalErr, totalRows) => {
    if (totalErr) {
      console.error("getGalleryImages total", totalErr);
      return res.status(500).json({ status: false, message: "Could not load gallery count." });
    }
    const recordsTotal = Number(totalRows?.[0]?.total) || 0;

    if (!searchTerm) {
      return finishList(recordsTotal, recordsTotal);
    }

    galleryModel.countGallery(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) {
        console.error("getGalleryImages filtered", filteredErr);
        return res.status(500).json({ status: false, message: "Could not load gallery count." });
      }
      const recordsFiltered = Number(filteredRows?.[0]?.total) || 0;
      finishList(recordsTotal, recordsFiltered);
    });
  });
};

/** Legacy `delete_gallaryimage` — remove DB row and file under images_data. */
exports.deleteGalleryImage = (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ status: false, message: "Invalid image id." });

  galleryModel.getGalleryImageById(id, (err, rows) => {
    if (err) {
      console.error("deleteGalleryImage lookup", err);
      return res.status(500).json({ status: false, message: "Could not delete image." });
    }
    const row = rows?.[0];
    if (!row) return res.status(404).json({ status: false, message: "Image not found." });

    galleryModel.deleteGalleryImage(id, (delErr, result) => {
      if (delErr) {
        console.error("deleteGalleryImage", delErr);
        return res.status(500).json({ status: false, message: "Could not delete image." });
      }
      if ((result?.affectedRows ?? 0) < 1) {
        return res.status(404).json({ status: false, message: "Image not found." });
      }
      safeUnlinkImagesData(row.image_name);
      return res.json({ status: true, message: "Image deleted successfully." });
    });
  });
};

function formatPressReleaseDisplayDate(d = new Date()) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${mo}/${da} ${hh}:${mm}`;
}

function encodeCategoryArrayJson(rawIds) {
  const ids = (Array.isArray(rawIds) ? rawIds : [])
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return null;
  const strIds = [...new Set(ids.map(String))];
  let encoded = JSON.stringify(strIds);
  while (encoded.length > 20 && strIds.length > 1) {
    strIds.pop();
    encoded = JSON.stringify(strIds);
  }
  if (encoded.length > 20) {
    encoded = JSON.stringify([strIds[0]]);
  }
  return encoded;
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

function reasonForStatus(st) {
  if (st === 1) return "Pending";
  if (st === 2) return "Published";
  return "Not Approved";
}

async function loadGalleryRowsForUser(userId) {
  const tries = [
    ["SELECT id, image_name, image_size, image_path FROM upload_image WHERE active = 1 AND user_id = ? ORDER BY id DESC LIMIT 200", [userId]],
    ["SELECT id, image_name, image_size, image_path FROM upload_image WHERE active = 1 AND uid = ? ORDER BY id DESC LIMIT 200", [userId]],
    ["SELECT id, image_name, image_size, image_path FROM upload_image WHERE active = 1 AND u_id = ? ORDER BY id DESC LIMIT 200", [userId]],
    ["SELECT id, image_name, image_size, image_path FROM upload_image WHERE active = 1 AND userid = ? ORDER BY id DESC LIMIT 200", [userId]]
  ];
  for (const [sql, params] of tries) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows || [];
    } catch {
      /* try next column name */
    }
  }
  return [];
}

async function updatePrRecordAfterCreate(conn, userId, packageId) {
  return prCreditService.deductCreditAfterCreate(conn, userId, packageId);
}

exports.getPressReleaseCreateData = async (req, res) => {
  const userId = Number(req.query.user_id);
  try {
    const [users] = await pool.query(
      `SELECT id, first_name, last_name, email
       FROM master_user
       WHERE active != 2 AND IFNULL(plan_id, 0) != 0
       ORDER BY first_name ASC, last_name ASC
       LIMIT 5000`
    );
    const [categories] = await pool.query(
      "SELECT id, category_name FROM master_category WHERE active = 1 ORDER BY category_name ASC LIMIT 500"
    );
    const [countries] = await pool.query(
      "SELECT id, country_name FROM master_country WHERE active = 1 ORDER BY country_name ASC LIMIT 500"
    );

    const base = {
      users: users || [],
      categories: categories || [],
      countries: countries || []
    };

    if (!userId) {
      return res.json({ status: true, data: base });
    }

    const [uRows] = await pool.query(
      "SELECT id, first_name, last_name, email, mobile FROM master_user WHERE id = ? AND active != 2 LIMIT 1",
      [userId]
    );
    if (!uRows.length) return res.status(404).json({ status: false, message: "User not found." });
    const user = uRows[0];

    const allocated = await prCreditService.getSelectablePackages(userId);

    const [companies] = await pool.query(
      `SELECT DISTINCT c.id, c.cname
       FROM master_company c
       WHERE c.active = 1
         AND (
           c.created_by = ?
           OR TRIM(c.created_by) = TRIM(?)
           OR c.id IN (
             SELECT DISTINCT CAST(TRIM(pr.company) AS UNSIGNED)
             FROM master_press_release pr
             WHERE pr.user_id = ?
               AND pr.company IS NOT NULL
               AND TRIM(pr.company) REGEXP '^[0-9]+$'
           )
         )
       ORDER BY c.cname ASC`,
      [String(userId), String(userId), userId]
    );

    const gallery = await loadGalleryRowsForUser(userId);

    return res.json({
      status: true,
      data: {
        ...base,
        user,
        allocatedPackages: allocated,
        companies: companies || [],
        gallery
      }
    });
  } catch (e) {
    console.error("getPressReleaseCreateData", e);
    return res.status(500).json({ status: false, message: "Could not load create-PR data." });
  }
};

exports.getPressReleaseGalleryDetail = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: false, message: "Gallery id is required." });
  try {
    const [rows] = await pool.query(
      "SELECT id, image_name, image_size, image_path FROM upload_image WHERE active = 1 AND id = ? LIMIT 1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ status: false, message: "Image not found." });
    return res.json({ status: true, data: rows[0] });
  } catch (e) {
    console.error("getPressReleaseGalleryDetail", e);
    return res.status(500).json({ status: false, message: "Could not load gallery item." });
  }
};

exports.postPressReleaseAutofillCompany = async (req, res) => {
  const companyId = Number(req.body.company_id);
  if (!companyId) return res.status(400).json({ status: false, message: "company_id is required." });
  try {
    const [rows] = await pool.query(
      "SELECT id, cname, address, contact_person, mobile, email, website, state, country FROM master_company WHERE id = ? AND active = 1 LIMIT 1",
      [companyId]
    );
    return res.json({ status: true, data: rows[0] || null });
  } catch (e) {
    console.error("postPressReleaseAutofillCompany", e);
    return res.status(500).json({ status: false, message: "Could not load company." });
  }
};

exports.getPressReleaseCheckTitle = async (req, res) => {
  const title = String(req.query.title || "").trim();
  const excludeId = Number(req.query.exclude_id);
  if (!title) return res.json({ status: true, available: true });
  try {
    const sql = excludeId
      ? "SELECT id FROM master_press_release WHERE title = ? AND id != ? AND active = 1 LIMIT 1"
      : "SELECT id FROM master_press_release WHERE title = ? AND active = 1 LIMIT 1";
    const params = excludeId ? [title, excludeId] : [title];
    const [rows] = await pool.query(sql, params);
    return res.json({ status: true, available: !rows.length });
  } catch (e) {
    console.error("getPressReleaseCheckTitle", e);
    return res.status(500).json({ status: false, message: "Could not check title." });
  }
};

exports.getPressReleaseEditData = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: false, message: "Press release id is required." });
  try {
    const data = await pressReleaseEditService.getEditData(id);
    if (!data) return res.status(404).json({ status: false, message: "Press release not found." });
    return res.json({ status: true, data });
  } catch (e) {
    console.error("getPressReleaseEditData", e);
    return res.status(500).json({ status: false, message: "Could not load press release." });
  }
};

exports.putPressReleaseUpdate = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: false, message: "Press release id is required." });
  const adminId = Number(req.admin?.id) || Number(req.body.created_press) || 0;
  try {
    const result = await pressReleaseEditService.updatePressRelease(id, req.body, adminId);
    return res.json({ status: true, message: result.message, data: result });
  } catch (e) {
    console.error("putPressReleaseUpdate", e);
    const status = e.status || 500;
    return res.status(status).json({ status: false, message: e.message || "Could not update press release." });
  }
};

exports.getPressReleaseStatusHistory = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: false, message: "Press release id is required." });
  try {
    const data = await pressReleaseEditService.getPressReleaseStatusHistoryView(id);
    if (!data) return res.status(404).json({ status: false, message: "Press release not found." });
    return res.json({ status: true, data });
  } catch (e) {
    console.error("getPressReleaseStatusHistory", e);
    return res.status(500).json({ status: false, message: "Could not load status history." });
  }
};

exports.getPressReleaseViewData = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: false, message: "Press release id is required." });
  try {
    const data = await pressReleaseEditService.getEditData(id);
    if (!data) return res.status(404).json({ status: false, message: "Press release not found." });
    return res.json({ status: true, data });
  } catch (e) {
    console.error("getPressReleaseViewData", e);
    return res.status(500).json({ status: false, message: "Could not load press release." });
  }
};

exports.putPressReleaseAfterPublished = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: false, message: "Press release id is required." });
  const adminId = Number(req.admin?.id) || Number(req.body.created_press) || 0;
  try {
    const result = await pressReleaseEditService.updatePressReleaseAfterPublished(id, req.body, adminId);
    return res.json({ status: true, message: result.message, data: result });
  } catch (e) {
    console.error("putPressReleaseAfterPublished", e);
    const status = e.status || 500;
    return res.status(status).json({ status: false, message: e.message || "Could not update press release." });
  }
};

exports.postPressReleasePreviewSession = (req, res) => {
  /* Client uses React navigation state; endpoint reserved for future server-side preview parity */
  return res.json({ status: true, message: "Use in-app preview." });
};

exports.postPressReleaseCreate = async (req, res) => {
  const userId = Number(req.body.user_id);
  const packageId = Number(req.body.p_id);
  let companyId = Number(req.body.company_id);
  const title = String(req.body.title || "").trim().slice(0, 250);
  const description = String(req.body.description || "").trim();
  const status = Number(req.body.status);
  const createdPress = String(req.body.created_press ?? "0").trim().slice(0, 20) || "0";
  const showContact = Number(req.body.show_contact_details);
  const catIds = req.body.cat_ids;
  const imageNames = String(req.body.imageNames || "").trim().slice(0, 250);

  const safeStatus = status === 2 ? 2 : 1;
  const safeShowContact = showContact === 2 ? 2 : 1;

  if (!userId || !packageId || !title || !description) {
    return res.status(400).json({ status: false, message: "User, package, title, and body are required." });
  }
  if (!showContact || showContact === 0) {
    return res.status(400).json({ status: false, message: "Select whether to show contact details (Yes/No)." });
  }

  const catJson = encodeCategoryArrayJson(catIds);
  if (!catJson) {
    return res.status(400).json({ status: false, message: "Select at least one category." });
  }

  const urlSlug = slugFromTitle(title);
  const displayDate = formatPressReleaseDisplayDate();
  const dateCurrent = new Date().toISOString().slice(0, 10);
  let publishOriginal = null;
  if (safeStatus === 2) {
    publishOriginal = formatPressReleaseDisplayDate();
  }

  const conn = await pool.getConnection();
  try {
    const [uRows] = await conn.query("SELECT id FROM master_user WHERE id = ? AND active != 2 LIMIT 1", [userId]);
    if (!uRows.length) {
      await conn.release();
      return res.status(404).json({ status: false, message: "User not found." });
    }

    const [mprRows] = await conn.query(
      "SELECT id FROM master_pr_record WHERE user_id = ? AND package_id = ? AND active = 1 LIMIT 1",
      [userId, packageId]
    );
    const [pkgRow] = await conn.query("SELECT id FROM master_package WHERE id = ? AND active = 1 LIMIT 1", [packageId]);
    if (!pkgRow.length) {
      await conn.release();
      return res.status(400).json({ status: false, message: "Invalid package." });
    }
    if (!mprRows.length) {
      await conn.release();
      return res.status(400).json({
        status: false,
        message: "This user has no active PR allocation for this package. Use Increase PR first."
      });
    }

    await prCreditService.syncExhaustedPackageRecords(conn, userId);

    if (!Number.isInteger(companyId) || companyId < 1) {
      const cname = String(req.body.cname || "").trim();
      const address = String(req.body.address || "").trim();
      const contact_person = String(req.body.contact_person || "").trim();
      const mobile = String(req.body.mobile || "").trim();
      const email = String(req.body.email || "").trim();
      const website = String(req.body.website || "").trim();
      const state = String(req.body.state || "").trim();
      const country = Number(req.body.country);

      if (!cname || !email || !website || !state || !Number.isInteger(country) || country < 1) {
        await conn.release();
        return res.status(400).json({
          status: false,
          message: "Select a company or fill company name, email, website, city/state, and country."
        });
      }

      const [insCo] = await conn.query(
        `INSERT INTO master_company
          (created_by, cname, address, contact_person, mobile, email, website, state, country, city, admin_or_self, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 1, 1)`,
        [String(userId), cname, address, contact_person, mobile, email, website, state, country]
      );
      companyId = insCo.insertId;
    } else {
      const [coRows] = await conn.query(
        `SELECT c.id FROM master_company c
         WHERE c.id = ? AND c.active = 1 AND (
           c.created_by = ?
           OR TRIM(c.created_by) = TRIM(?)
           OR c.id IN (
             SELECT DISTINCT CAST(TRIM(pr.company) AS UNSIGNED)
             FROM master_press_release pr
             WHERE pr.user_id = ?
               AND pr.company IS NOT NULL
               AND TRIM(pr.company) REGEXP '^[0-9]+$'
           )
         )
         LIMIT 1`,
        [companyId, String(userId), String(userId), userId]
      );
      if (!coRows.length) {
        await conn.release();
        return res.status(400).json({ status: false, message: "Invalid company for this user." });
      }
    }

    const catIdNums = (Array.isArray(catIds) ? catIds : []).map((x) => Number(x)).filter((n) => n > 0);
    if (catIdNums.length) {
      const [ph] = await conn.query(
        `SELECT COUNT(*) AS c FROM master_category WHERE active = 1 AND id IN (${catIdNums.map(() => "?").join(",")})`,
        catIdNums
      );
      if (Number(ph[0]?.c || 0) !== catIdNums.length) {
        await conn.release();
        return res.status(400).json({ status: false, message: "One or more categories are invalid." });
      }
    }

    await conn.beginTransaction();

    const prRecord = await prCreditService.getPrRecordForCreate(conn, userId, packageId);
    try {
      prCreditService.assertCanCreatePr(prRecord);
    } catch (creditErr) {
      await conn.rollback();
      await conn.release();
      return res.status(creditErr.status || 400).json({
        status: false,
        code: creditErr.code || "CREDIT_LIMIT",
        message: creditErr.message
      });
    }

    const reason = reasonForStatus(safeStatus);
    const prevStatus = safeStatus;

    const [ins] = await conn.query(
      `INSERT INTO master_press_release
        (release_no, user_id, p_id, cat_id, title, url, description, date, publish_date_orignal, company,
         status, prev_status, paid_pr, reason, created_press, show_contact_details, add_note, view_flag, pdf_flag,
         date_current, report_upload, imageNames, addedimageNames, active)
       VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, NULL, 1, 0, ?, NULL, ?, NULL, 1)`,
      [
        userId,
        packageId,
        catJson,
        title,
        urlSlug,
        description,
        displayDate,
        publishOriginal,
        String(companyId),
        safeStatus,
        prevStatus,
        reason,
        createdPress,
        safeShowContact,
        dateCurrent,
        imageNames || null
      ]
    );

    const newId = ins.insertId;
    const releaseNo = 1000 + Number(newId);

    await conn.query("UPDATE master_press_release SET release_no = ? WHERE id = ?", [releaseNo, newId]);

    await updatePrRecordAfterCreate(conn, userId, packageId);

    const multiIds = Array.isArray(req.body.add_mult_images_id) ? req.body.add_mult_images_id.map((x) => Number(x)).filter((n) => n > 0) : [];
    for (const imgId of multiIds) {
      try {
        await conn.query("UPDATE upload_image SET pr_id = ? WHERE id = ?", [newId, imgId]);
      } catch {
        /* table or column may differ */
      }
    }

    await conn.commit();
    await conn.release();

    return res.json({
      status: true,
      message: safeStatus === 2 ? "Press release published." : "Press release saved as pending.",
      data: { id: newId, release_no: releaseNo }
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {
      /* ignore */
    }
    try {
      conn.release();
    } catch {
      /* ignore */
    }
    console.error("postPressReleaseCreate", e);
    return res.status(500).json({ status: false, message: e.message || "Could not create press release." });
  }
};

exports.deletePressRelease = async (req, res) => {
  const pressId = Number(req.params.id);
  if (!pressId) {
    return res.status(400).json({ status: false, message: "Press release id is required." });
  }
  try {
    const result = await pressReleaseDeleteService.deleteEditorial(pressId);
    return res.json({ status: true, message: result.message });
  } catch (err) {
    console.error("deletePressRelease", pressId, err.message || err);
    return res.status(err.status || 500).json({
      status: false,
      message: err.message || "Could not delete press release."
    });
  }
};

exports.deletePressReleasePublished = async (req, res) => {
  const pressId = Number(req.params.id);
  if (!pressId) {
    return res.status(400).json({ status: false, message: "Press release id is required." });
  }
  try {
    const result = await pressReleaseDeleteService.deleteEditorialPublished(pressId);
    return res.json({ status: true, message: result.message });
  } catch (err) {
    console.error("deletePressReleasePublished", pressId, err.message || err);
    return res.status(err.status || 500).json({
      status: false,
      message: err.message || "Could not delete press release."
    });
  }
};

exports.getEditorialPressReleases = (req, res) => {
  const {
    tab = "room",
    start = "0",
    length = "10",
    search = "",
    sortBy = "id",
    sortOrder = "desc"
  } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  editorialModel.countEditorialForTab(tab, "", (totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not count press releases." });
    const recordsTotal = totalRows?.[0]?.total || 0;
    editorialModel.countEditorialForTab(tab, searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not count filtered press releases." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;
      editorialModel.listEditorialPressReleases(
        {
          tab,
          search: searchTerm,
          sortBy,
          sortOrder,
          limit: parsedLength,
          offset: parsedStart
        },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not load press releases." });
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              tab: String(tab || "room").toLowerCase(),
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

function editorialStatusLabelCsv(status) {
  const s = Number(status);
  if (s === 0) return "Draft";
  if (s === 1) return "Pending";
  if (s === 2) return "Published";
  if (s === 3) return "Action Required";
  if (s === 5) return "Rejected";
  return String(status ?? "");
}

exports.exportEditorialPressReleasesCsv = (req, res) => {
  const { tab = "room", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const searchTerm = String(search || "").trim();
  editorialModel.listEditorialPressReleasesForExport(
    { tab, search: searchTerm, sortBy, sortOrder },
    (err, rows) => {
      if (err) return res.status(500).json({ status: false, message: "Could not export press releases." });
      const header = ["ID", "Release No", "Title", "Date", "Status", "Package", "User", "Company", "Last action"];
      const body = (rows || []).map((item) => [
        item.id,
        item.release_no,
        item.title,
        item.date,
        editorialStatusLabelCsv(item.status),
        item.pname,
        `${item.first_name || ""} ${item.last_name || ""}`.trim(),
        item.cname,
        item.staff_username
      ]);
      const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=\"editorial-press-${Date.now()}.csv\"`);
      return res.send(csv);
    }
  );
};

exports.addCountryCode = async (req, res) => {
  const { iso_code: isoCode, country_code: countryCode } = req.body;
  if (!isoCode || !countryCode) {
    return res.status(400).json({
      status: false,
      message: "Country name and country code are required."
    });
  }

  return res.json({
    status: true,
    message: "Country code added successfully.",
    data: { isoCode, countryCode }
  });
};

exports.sendProfileOtp = (req, res) => {
  const { user_id: userId } = req.body;
  if (!userId) {
    return res.status(400).json({ status: false, message: "User id is required." });
  }

  userModel.findById(userId, (err, result) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Something went wrong." });
    }
    if (!result.length) {
      return res.status(404).json({ status: false, message: "User not found." });
    }

    const user = result[0];
    const otp = Math.floor(100000 + Math.random() * 900000);
    userModel.saveOtp(user.id, otp, (saveErr) => {
      if (saveErr) {
        return res.status(500).json({ status: false, message: "Could not generate OTP." });
      }
      // TODO: Integrate mail provider for real OTP delivery.
      console.log(`Profile update OTP for ${user.username}: ${otp}`);
      return res.json({
        status: true,
        message: "An OTP has been sent to your registered email address."
      });
    });
  });
};

exports.updateProfile = (req, res) => {
  const { user_id: userId, username, password } = req.body;
  if (!userId || !username || !password) {
    return res.status(400).json({ status: false, message: "Required fields are missing." });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      status: false,
      message:
        "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character"
    });
  }

  userModel.findById(userId, async (err, result) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Something went wrong." });
    }
    if (!result.length) {
      return res.status(404).json({ status: false, message: "User not found." });
    }

    const user = result[0];

    const hashedPassword = await bcrypt.hash(password, 10);
    userModel.updateProfile(user.id, username, hashedPassword, (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ status: false, message: "Profile could not be updated." });
      }

      return res.json({
        status: true,
        message: "Profile updated successfully",
        data: {
          id: user.id,
          username
        }
      });
    });
  });
};

exports.getLoginLogs = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "dateTime", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  userModel.countAllLoginLogs((totalErr, totalRows) => {
    if (totalErr) {
      return res.status(500).json({ status: false, message: "Could not fetch total login logs count." });
    }
    const recordsTotal = totalRows?.[0]?.total || 0;

    userModel.countLoginLogs(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) {
        return res.status(500).json({ status: false, message: "Could not fetch filtered login logs count." });
      }
      const recordsFiltered = filteredRows?.[0]?.total || 0;

      userModel.getLoginLogs(
        {
          search: searchTerm,
          sortBy,
          sortOrder,
          limit: parsedLength,
          offset: parsedStart
        },
        (listErr, rows) => {
          if (listErr) {
            return res.status(500).json({ status: false, message: "Could not fetch login logs." });
          }
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder || "").toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.getDistributions = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  distributionModel.countAllDistributions((totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch distributions count." });
    const recordsTotal = totalRows?.[0]?.total || 0;

    distributionModel.countFilteredDistributions(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered distributions count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;

      distributionModel.getDistributions(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch distributions." });
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.createDistribution = (req, res) => {
  const { dname, credits, website, who_added_credits: whoAddedCredits } = req.body;
  if (!dname || credits === undefined || credits === null || credits === "") {
    return res.status(400).json({ status: false, message: "Vendor name and credits are required." });
  }

  const parsedCredits = Number(credits);
  if (!Number.isFinite(parsedCredits) || parsedCredits < 0) {
    return res.status(400).json({ status: false, message: "Credits must be a valid non-negative number." });
  }

  const cleanName = String(dname).trim();
  const slug = distributionModel.cleanSlug(cleanName);
  const websiteValue = String(website || "").trim();

  distributionModel.insertDistribution(
    {
      dname: cleanName,
      url: slug,
      nopublication: 0,
      credits: parsedCredits,
      use_credits: parsedCredits,
      website: websiteValue,
      active: 1
    },
    (insertErr, insertResult) => {
      if (insertErr) return res.status(500).json({ status: false, message: "Could not create vendor." });
      const vendorId = insertResult.insertId;
      const vendorUrl = distributionModel.buildVendorFeedUrl(req, cleanName);

      distributionModel.insertVendorRss(
        {
          vendor_id: vendorId,
          url: slug,
          vendor_name: cleanName,
          vendor_url: vendorUrl
        },
        (rssErr) => {
          if (rssErr) return res.status(500).json({ status: false, message: "Could not create vendor RSS mapping." });

          distributionModel.insertVendorAddCredits(
            {
              vendor_id: vendorId,
              added_credits: parsedCredits,
              who_added_credits: whoAddedCredits || 0
            },
            (creditErr) => {
              if (creditErr) return res.status(500).json({ status: false, message: "Could not create vendor credit history." });
              return res.json({ status: true, message: "Vendor added successfully" });
            }
          );
        }
      );
    }
  );
};

exports.updateDistribution = (req, res) => {
  const vendorId = Number(req.params.id);
  const { dname, credits, website, who_added_credits: whoAddedCredits } = req.body;

  if (!vendorId || !dname || credits === undefined || credits === null || credits === "") {
    return res.status(400).json({ status: false, message: "Required fields are missing." });
  }

  const nextCreditsValue = Number(credits);
  if (!Number.isFinite(nextCreditsValue) || nextCreditsValue < 0) {
    return res.status(400).json({ status: false, message: "Credits must be a valid non-negative number." });
  }

  distributionModel.getDistributionById(vendorId, (findErr, rows) => {
    if (findErr) return res.status(500).json({ status: false, message: "Could not fetch existing vendor." });
    if (!rows?.length) return res.status(404).json({ status: false, message: "Vendor not found." });

    const existing = rows[0];
    const cleanName = String(dname).trim();
    const slug = distributionModel.cleanSlug(cleanName);
    const websiteValue = String(website || "").trim();
    const previousCredits = Number(existing.credits || 0);
    const firstUseCredits = Number(existing.use_credits || 0);
    const creditsDiff = nextCreditsValue - previousCredits;
    const useCredits = Math.max(firstUseCredits + creditsDiff, 0);
    const vendorUrl = distributionModel.buildVendorFeedUrl(req, cleanName);

    distributionModel.updateDistribution(
      vendorId,
      { dname: cleanName, url: slug, credits: nextCreditsValue, use_credits: useCredits, website: websiteValue },
      (updateErr) => {
        if (updateErr) return res.status(500).json({ status: false, message: "Could not update vendor." });

        distributionModel.updateVendorRss(
          vendorId,
          { vendor_name: cleanName, url: slug, vendor_url: vendorUrl },
          (rssErr) => {
            if (rssErr) return res.status(500).json({ status: false, message: "Could not update vendor RSS mapping." });

            if (creditsDiff === 0) {
              return res.json({ status: true, message: "Vendor updated successfully" });
            }

            distributionModel.insertVendorAddCredits(
              {
                vendor_id: vendorId,
                added_credits: creditsDiff,
                who_added_credits: whoAddedCredits || 0
              },
              (creditErr) => {
                if (creditErr) return res.status(500).json({ status: false, message: "Could not update vendor credit history." });
                return res.json({ status: true, message: "Vendor updated successfully" });
              }
            );
          }
        );
      }
    );
  });
};

exports.updateDistributionStatus = (req, res) => {
  const vendorId = Number(req.params.id);
  const { active } = req.body;
  const nextActive = Number(active) === 1 ? 1 : 0;
  if (!vendorId) return res.status(400).json({ status: false, message: "Vendor id is required." });

  distributionModel.updateDistributionStatus(vendorId, nextActive, (err, updateResult) => {
    if (err) return res.status(500).json({ status: false, message: "Could not update vendor status." });
    if (!updateResult?.affectedRows) return res.status(404).json({ status: false, message: "Vendor not found." });
    return res.json({
      status: true,
      message: nextActive ? "Vendor activated successfully" : "Vendor deactivated successfully"
    });
  });
};

exports.getDistributionHistory = (req, res) => {
  const vendorId = Number(req.params.id);
  if (!vendorId) return res.status(400).json({ status: false, message: "Vendor id is required." });

  distributionModel.getDistributionById(vendorId, (vendorErr, vendorRows) => {
    if (vendorErr) return res.status(500).json({ status: false, message: "Could not fetch vendor." });
    if (!vendorRows?.length) return res.status(404).json({ status: false, message: "Vendor not found." });

    distributionModel.getVendorCreditHistory(vendorId, (historyErr, historyRows) => {
      if (historyErr) return res.status(500).json({ status: false, message: "Could not fetch vendor history." });
      return res.json({
        status: true,
        data: {
          vendor: vendorRows[0],
          creditsHistory: historyRows || []
        }
      });
    });
  });
};

exports.getPackages = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc", scope = "all" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  packageModel.ensurePackageMediaColumns((ensureErr) => {
    if (ensureErr) return res.status(500).json({ status: false, message: "Could not initialize package media fields." });
    packageModel.countPackages({ scope: "all", search: "" }, (totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch packages count." });
    const recordsTotal = totalRows?.[0]?.total || 0;

    packageModel.countPackages({ scope, search: searchTerm }, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered packages count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;

      packageModel.getPackages(
        { scope, search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch packages." });
          const packageIds = (rows || []).map((item) => item.id);
          packageModel.getPackageDescriptions(packageIds, (desErr, descriptions) => {
            if (desErr) return res.status(500).json({ status: false, message: "Could not fetch package descriptions." });
            const desMap = {};
            (descriptions || []).forEach((item) => {
              if (!desMap[item.package_id]) desMap[item.package_id] = [];
              desMap[item.package_id].push(item);
            });
            const data = (rows || []).map((item) => ({
              ...item,
              package_image: item.package_image || null,
              descriptions: desMap[item.id] || []
            }));
            return res.json({
              status: true,
              data,
              meta: {
                recordsTotal,
                recordsFiltered,
                start: parsedStart,
                length: parsedLength,
                search: searchTerm,
                sortBy,
                sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc",
                scope
              }
            });
          });
        }
      );
    });
  });
  });
};

exports.getPackageMeta = (req, res) => {
  packageModel.getAllDistributions((err, distributions) => {
    if (err) return res.status(500).json({ status: false, message: "Could not fetch package metadata." });
    return res.json({ status: true, data: { distributions: distributions || [] } });
  });
};

exports.createPackage = (req, res) => {
  const {
    pname,
    price,
    n_press_rel,
    badge = 0,
    package_type = 1,
    package_validity = 30,
    reseller_normal = 0,
    dis_id = [],
    descriptions = []
  } = req.body;

  if (!pname || price === undefined || n_press_rel === undefined) {
    return res.status(400).json({ status: false, message: "Package name, price and credits are required." });
  }

  packageModel.ensurePackageMediaColumns((ensureErr) => {
    if (ensureErr) return res.status(500).json({ status: false, message: "Could not initialize package media fields." });
    const payload = {
      pname: String(pname).trim(),
      price: Number(price),
      n_press_rel: Number(n_press_rel),
      badge: Number(badge) || 0,
      package_type: Number(package_type) || 1,
      package_validity: Number(package_validity) || 0,
      reseller_normal: Number(reseller_normal) || 0,
      dis_id: JSON.stringify(parseJsonArray(dis_id)),
      package_image: req.file ? toPublicUploadPath(req, req.file.path) : null
    };

    packageModel.insertPackage(payload, (insertErr, insertResult) => {
      if (insertErr) return res.status(500).json({ status: false, message: "Could not create package." });
      const packageId = insertResult.insertId;
      const parsedDescriptions = parseJsonArray(descriptions);
      const sanitizedDescriptions = Array.isArray(parsedDescriptions)
        ? parsedDescriptions
            .map((item) => ({
              des_option: Number(item.des_option) || 0,
              des: String(item.des || "").trim()
            }))
            .filter((item) => item.des_option && item.des)
        : [];
      packageModel.replacePackageDescriptions(packageId, sanitizedDescriptions, (desErr) => {
        if (desErr) return res.status(500).json({ status: false, message: "Package created but descriptions failed." });
        return res.json({ status: true, message: req.file ? "Package image uploaded successfully." : "Package added successfully" });
      });
    });
  });
};

exports.updatePackage = (req, res) => {
  const packageId = Number(req.params.id);
  const {
    pname,
    price,
    n_press_rel,
    badge = 0,
    package_type = 1,
    package_validity = 30,
    reseller_normal = 0,
    dis_id = [],
    descriptions = []
  } = req.body;
  if (!packageId) return res.status(400).json({ status: false, message: "Package id is required." });

  packageModel.ensurePackageMediaColumns((ensureErr) => {
    if (ensureErr) return res.status(500).json({ status: false, message: "Could not initialize package media fields." });
    packageModel.getPackageById(packageId, (findErr, existingRows) => {
      if (findErr) return res.status(500).json({ status: false, message: "Could not fetch package." });
      if (!existingRows?.length) return res.status(404).json({ status: false, message: "Package not found." });

      const existingImage = existingRows[0].package_image || null;
      const removeImage = String(req.body.remove_package_image || "0") === "1";
      const nextImage = req.file ? toPublicUploadPath(req, req.file.path) : removeImage ? null : existingImage;

      const payload = {
        pname: String(pname || "").trim(),
        price: Number(price),
        n_press_rel: Number(n_press_rel),
        badge: Number(badge) || 0,
        package_type: Number(package_type) || 1,
        package_validity: Number(package_validity) || 0,
        reseller_normal: Number(reseller_normal) || 0,
        dis_id: JSON.stringify(parseJsonArray(dis_id)),
        package_image: nextImage
      };

      packageModel.updatePackage(packageId, payload, (updateErr) => {
        if (updateErr) return res.status(500).json({ status: false, message: "Could not update package." });
        if ((req.file || removeImage) && existingImage && existingImage !== nextImage) safeDeleteUpload(existingImage);

        const parsedDescriptions = parseJsonArray(descriptions);
        const sanitizedDescriptions = Array.isArray(parsedDescriptions)
          ? parsedDescriptions
              .map((item) => ({
                des_option: Number(item.des_option) || 0,
                des: String(item.des || "").trim()
              }))
              .filter((item) => item.des_option && item.des)
          : [];
        packageModel.replacePackageDescriptions(packageId, sanitizedDescriptions, (desErr) => {
          if (desErr) return res.status(500).json({ status: false, message: "Package updated but descriptions failed." });
          return res.json({ status: true, message: req.file ? "Package image uploaded successfully." : "Package updated successfully" });
        });
      });
    });
  });
};

exports.updatePackageStatus = (req, res) => {
  const packageId = Number(req.params.id);
  const { active } = req.body;
  if (!packageId) return res.status(400).json({ status: false, message: "Package id is required." });
  const nextActive = Number(active) === 1 ? 1 : 0;
  packageModel.updatePackageStatus(packageId, nextActive, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not update package status." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Package not found." });
    return res.json({ status: true, message: nextActive ? "Package activated successfully" : "Package deactivated successfully" });
  });
};

exports.getPricingSequencer = (req, res) => {
  const scope = normalizeSequencerScope(req.query.scope);
  packageModel.ensureSequencerTable((tableErr) => {
    if (tableErr) return res.status(500).json({ status: false, message: "Could not initialize sequencer table." });
    packageModel.getSequencerPackagesByScope({ scope }, (err, rows) => {
      if (err) return res.status(500).json({ status: false, message: "Could not load pricing sequencer." });
      const data = (rows || []).map((item) => ({
        ...item,
        visible: Number(item.package_type) === 1,
        badge_label:
          Number(item.badge) === 1
            ? "Most Popular"
            : Number(item.badge) === 2
              ? "Best Value"
              : Number(item.badge) === 3
                ? "New"
                : "None"
      }));
      return res.json({ status: true, data, meta: { scope } });
    });
  });
};

exports.savePricingSequencer = (req, res) => {
  const { items = [] } = req.body;
  const scope = normalizeSequencerScope(req.body.scope);
  if (!Array.isArray(items)) return res.status(400).json({ status: false, message: "Items payload is required." });

  const badgeCode = (label) => {
    if (label === "Most Popular") return 1;
    if (label === "Best Value") return 2;
    if (label === "New") return 3;
    return 0;
  };

  packageModel.ensureSequencerTable((tableErr) => {
    if (tableErr) return res.status(500).json({ status: false, message: "Could not initialize sequencer table." });

    const mostPopular = items.find((item) => item.badge === "Most Popular");
    const bestValue = items.find((item) => item.badge === "Best Value");

    const afterClear = (callback) => {
      packageModel.clearBadge(1, () => {
        packageModel.clearBadge(2, () => callback());
      });
    };

    afterClear(() => {
      let pending = items.length;
      if (!pending) return res.json({ status: true, message: "Pricing page order updated successfully." });

      items.forEach((item, index) => {
        const packageId = Number(item.id);
        const sortOrder = index + 1;
        const badge = badgeCode(item.badge);
        const visible = Boolean(item.visible);
        const sequenceGroup =
          scope === "global" ? 50 :
            scope === "online" ? 10 :
              scope === "offline" ? 20 :
                scope === "reseller" ? 1 :
                  scope === "crypto" ? 2 :
                    scope === "indian" ? 3 :
                      scope === "white_label" ? 4 : 0;

        packageModel.upsertSequence({ packageId, sequenceGroup, sortOrder }, (seqErr) => {
          if (seqErr) {
            pending = -1;
            return res.status(500).json({ status: false, message: "Could not update package sequence." });
          }

          packageModel.updatePackageSequencerFields({ packageId, badge, visible }, (updateErr) => {
            if (updateErr && pending !== -1) {
              pending = -1;
              return res.status(500).json({ status: false, message: "Could not update sequencer fields." });
            }
            pending -= 1;
            if (pending === 0) {
              const info = [];
              if (mostPopular) info.push(`'Most Popular' set on ${mostPopular.pname || "selected package"}`);
              if (bestValue) info.push(`'Best Value' set on ${bestValue.pname || "selected package"}`);
              return res.json({
                status: true,
                message: "Pricing page order updated successfully.",
                info
              });
            }
          });
        });
      });
    });
  });
};

exports.resetPricingSequencer = (req, res) => {
  const scope = normalizeSequencerScope(req.body.scope);
  packageModel.ensureSequencerTable((tableErr) => {
    if (tableErr) return res.status(500).json({ status: false, message: "Could not initialize sequencer table." });
    packageModel.getSequencerPackagesByScope({ scope }, (listErr, rows) => {
      if (listErr) return res.status(500).json({ status: false, message: "Could not load packages for reset." });
      const sorted = [...(rows || [])].sort((a, b) => String(a.pname || "").localeCompare(String(b.pname || "")));
      const sequenceGroup =
        scope === "global" ? 50 :
          scope === "online" ? 10 :
            scope === "offline" ? 20 :
              scope === "reseller" ? 1 :
                scope === "crypto" ? 2 :
                  scope === "indian" ? 3 :
                    scope === "white_label" ? 4 : 0;
      let pending = sorted.length;
      if (!pending) return res.json({ status: true, message: "Reset to default completed." });
      sorted.forEach((row, index) => {
        packageModel.upsertSequence({ packageId: row.id, sequenceGroup, sortOrder: index + 1 }, (upsertErr) => {
          if (upsertErr) {
            pending = -1;
            return res.status(500).json({ status: false, message: "Could not reset sequence." });
          }
          pending -= 1;
          if (pending === 0) return res.json({ status: true, message: "Reset to default completed." });
        });
      });
    });
  });
};

exports.getPricingPreview = (req, res) => {
  const scope = normalizeSequencerScope(req.query.scope);
  packageModel.ensureSequencerTable((tableErr) => {
    if (tableErr) return res.status(500).json({ status: false, message: "Could not initialize preview data." });
    packageModel.getSequencerPackagesByScope({ scope }, (err, rows) => {
      if (err) return res.status(500).json({ status: false, message: "Could not load pricing preview." });
      const data = (rows || [])
        .filter((item) => Number(item.active) === 1)
        .map((item) => ({
          id: item.id,
          pname: item.pname,
          price: item.price,
          category:
            Number(item.reseller_normal) === 1
              ? "Reseller"
              : Number(item.reseller_normal) === 2
                ? "Crypto"
                : Number(item.reseller_normal) === 3
                  ? "Indian PR"
                  : Number(item.reseller_normal) === 4
                    ? "White Label"
                    : "Normal",
          package_image: item.package_image || null,
          badge_label:
            Number(item.badge) === 1
              ? "Most Popular"
              : Number(item.badge) === 2
                ? "Best Value"
                : Number(item.badge) === 3
                  ? "New"
                  : "None"
        }));
      return res.json({ status: true, data });
    });
  });
};

exports.getPricingBanner = (req, res) => {
  packageModel.getPricingBanner((err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not fetch pricing page banner." });
    const banner = rows?.[0] || null;
    return res.json({ status: true, data: banner });
  });
};

exports.getCategories = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  categoryModel.countAllCategories((totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch categories count." });
    const recordsTotal = totalRows?.[0]?.total || 0;

    categoryModel.countFilteredCategories(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered categories count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;

      categoryModel.getCategories(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch categories." });
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.checkCategoryAvailability = (req, res) => {
  const categoryName = String(req.body.name || req.query.name || "").trim();
  const excludeId = Number(req.body.exclude_id || req.query.exclude_id || 0);
  if (!categoryName) return res.status(400).json({ status: false, message: "Category name is required." });

  categoryModel.getCategoryByName(categoryName, excludeId, (err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not verify category availability." });
    return res.json({ status: true, exists: Boolean(rows?.length) });
  });
};

exports.createCategory = (req, res) => {
  const categoryName = String(req.body.category_name || "").trim();
  if (!categoryName) return res.status(400).json({ status: false, message: "Category name is required." });
  if (!/^[A-Za-z\s]+$/.test(categoryName)) {
    return res.status(400).json({ status: false, message: "Category name must contain only letters and spaces." });
  }

  categoryModel.getCategoryByName(categoryName, 0, (findErr, rows) => {
    if (findErr) return res.status(500).json({ status: false, message: "Could not verify category availability." });
    if (rows?.length) return res.status(400).json({ status: false, message: "Category already exist" });

    categoryModel.insertCategory(
      {
        category_name: categoryName,
        url: cleanSlug(categoryName)
      },
      (insertErr) => {
        if (insertErr) return res.status(500).json({ status: false, message: "Could not add category." });
        return res.json({ status: true, message: "Category added successfully" });
      }
    );
  });
};

exports.updateCategory = (req, res) => {
  const categoryId = Number(req.params.id);
  const categoryName = String(req.body.category_name || "").trim();
  if (!categoryId) return res.status(400).json({ status: false, message: "Category id is required." });
  if (!categoryName) return res.status(400).json({ status: false, message: "Category name is required." });
  if (!/^[A-Za-z\s]+$/.test(categoryName)) {
    return res.status(400).json({ status: false, message: "Category name must contain only letters and spaces." });
  }

  categoryModel.getCategoryByName(categoryName, categoryId, (findErr, rows) => {
    if (findErr) return res.status(500).json({ status: false, message: "Could not verify category availability." });
    if (rows?.length) return res.status(400).json({ status: false, message: "Category already exist" });

    categoryModel.updateCategory(
      categoryId,
      { category_name: categoryName, url: cleanSlug(categoryName) },
      (updateErr, result) => {
        if (updateErr) return res.status(500).json({ status: false, message: "Could not update category." });
        if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Category not found." });
        return res.json({ status: true, message: "Category updated successfully" });
      }
    );
  });
};

exports.updateCategoryStatus = (req, res) => {
  const categoryId = Number(req.params.id);
  const { active } = req.body;
  if (!categoryId) return res.status(400).json({ status: false, message: "Category id is required." });
  const nextActive = Number(active) === 1 ? 1 : 0;

  categoryModel.updateCategoryStatus(categoryId, nextActive, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not update category status." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Category not found." });
    return res.json({
      status: true,
      message: nextActive ? "Category activated successfully" : "Category deactivated successfully"
    });
  });
};

exports.getCountries = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  countryModel.countAllCountries((totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch countries count." });
    const recordsTotal = totalRows?.[0]?.total || 0;
    countryModel.countFilteredCountries(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered countries count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;
      countryModel.getCountries(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch countries." });
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.createCountry = (req, res) => {
  const countryName = String(req.body.country_name || "").trim();
  if (!countryName) return res.status(400).json({ status: false, message: "Country name is required." });
  if (!/^[A-Za-z\s]+$/.test(countryName)) {
    return res.status(400).json({ status: false, message: "Country name must contain only letters and spaces." });
  }
  countryModel.getCountryByName(countryName, (findErr, rows) => {
    if (findErr) return res.status(500).json({ status: false, message: "Could not verify country availability." });
    if (rows?.length) return res.status(400).json({ status: false, message: "Country already exist" });
    countryModel.insertCountry(countryName, (insertErr) => {
      if (insertErr) return res.status(500).json({ status: false, message: "Could not create country." });
      return res.json({ status: true, message: "Country added successfully" });
    });
  });
};

exports.updateCountry = (req, res) => {
  const countryId = Number(req.params.id);
  const countryName = String(req.body.country_name || "").trim();
  if (!countryId) return res.status(400).json({ status: false, message: "Country id is required." });
  if (!countryName) return res.status(400).json({ status: false, message: "Country name is required." });
  if (!/^[A-Za-z\s]+$/.test(countryName)) {
    return res.status(400).json({ status: false, message: "Country name must contain only letters and spaces." });
  }
  countryModel.updateCountry(countryId, countryName, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not update country." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Country not found." });
    return res.json({ status: true, message: "Country updated successfully" });
  });
};

exports.updateCountryStatus = (req, res) => {
  const countryId = Number(req.params.id);
  const { active } = req.body;
  if (!countryId) return res.status(400).json({ status: false, message: "Country id is required." });
  const nextActive = Number(active) === 1 ? 1 : 0;
  countryModel.updateCountryStatus(countryId, nextActive, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not update country status." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Country not found." });
    return res.json({ status: true, message: nextActive ? "Country activated successfully" : "Country deactivated successfully" });
  });
};

exports.deleteCountryPermanently = (req, res) => {
  const countryId = Number(req.params.id);
  if (!countryId) return res.status(400).json({ status: false, message: "Country id is required." });
  countryModel.deleteCountryPermanently(countryId, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not delete country permanently." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Country not found." });
    return res.json({ status: true, message: "Country deleted permanently" });
  });
};

exports.getNewsletters = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  newsletterModel.countAllNewsletters((totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch newsletters count." });
    const recordsTotal = totalRows?.[0]?.total || 0;
    newsletterModel.countFilteredNewsletters(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered newsletters count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;
      newsletterModel.getNewsletters(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch newsletters." });
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.getNewsletterById = (req, res) => {
  const newsletterId = Number(req.params.id);
  if (!newsletterId) return res.status(400).json({ status: false, message: "Newsletter id is required." });
  newsletterModel.getNewsletterById(newsletterId, (err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not fetch newsletter." });
    if (!rows?.length || Number(rows[0].active) !== 1) return res.status(404).json({ status: false, message: "Newsletter not found." });
    return res.json({ status: true, data: rows[0] });
  });
};

exports.deleteNewsletterPermanently = (req, res) => {
  const newsletterId = Number(req.params.id);
  if (!newsletterId) return res.status(400).json({ status: false, message: "Newsletter id is required." });
  newsletterModel.deleteNewsletterPermanently(newsletterId, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not delete newsletter permanently." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Newsletter not found." });
    return res.json({ status: true, message: "Newsletter deleted successfully" });
  });
};

exports.deleteNewslettersBulk = (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ status: false, message: "Please select at least one newsletter." });
  }
  const cleanedIds = ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (!cleanedIds.length) {
    return res.status(400).json({ status: false, message: "Invalid newsletter ids." });
  }
  newsletterModel.deleteNewslettersBulk(cleanedIds, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not delete selected newsletters." });
    return res.json({
      status: true,
      message: `${result?.affectedRows || 0} newsletter(s) deleted successfully`
    });
  });
};

exports.exportNewslettersCsv = (req, res) => {
  const { search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const searchTerm = String(search || "").trim();
  newsletterModel.getNewslettersForExport(
    { search: searchTerm, sortBy, sortOrder },
    (err, rows) => {
      if (err) return res.status(500).json({ status: false, message: "Could not export newsletters." });
      const header = ["ID", "Email", "Timestamp"];
      const body = (rows || []).map((item) => [item.id, item.email, item.timestamp]);
      const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=\"newsletters-${Date.now()}.csv\"`);
      return res.send(csv);
    }
  );
};

exports.getPaymentMethods = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  paymentMethodModel.countAllPaymentMethods((totalErr, totalRows) => {
    if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch payment methods count." });
    const recordsTotal = totalRows?.[0]?.total || 0;
    paymentMethodModel.countFilteredPaymentMethods(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered payment methods count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;
      paymentMethodModel.getPaymentMethods(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch payment methods." });
          return res.json({
            status: true,
            data: rows || [],
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.updatePaymentMethodStatus = (req, res) => {
  const methodId = Number(req.params.id);
  const { active } = req.body;
  if (!methodId) return res.status(400).json({ status: false, message: "Payment method id is required." });
  const nextActive = Number(active) === 1 ? 1 : 0;
  paymentMethodModel.updatePaymentMethodStatus(methodId, nextActive, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not update payment method status." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Payment method not found." });
    return res.json({ status: true, message: nextActive ? "Payment method activated Successfully" : "Payment method Deactived Successfully" });
  });
};

exports.getCoinbaseUsers = (req, res) => {
  const methodId = Number(req.params.id);
  const { start = "0", length = "25", search = "" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 25, 1), 100);
  const searchTerm = String(search || "").trim();
  if (!methodId) return res.status(400).json({ status: false, message: "Payment method id is required." });
  paymentMethodModel.getPaymentMethodById(methodId, (methodErr, methodRows) => {
    if (methodErr) return res.status(500).json({ status: false, message: "Could not fetch payment method." });
    if (!methodRows?.length) return res.status(404).json({ status: false, message: "Payment method not found." });
    const method = methodRows[0];
    if (String(method.PaymentMethod || "").toLowerCase() !== "coinbase") {
      return res.status(400).json({ status: false, message: "This action is only available for Coinbase." });
    }
    paymentMethodModel.countActiveUsers("", (totalErr, totalRows) => {
      if (totalErr) return res.status(500).json({ status: false, message: "Could not fetch users count." });
      const recordsTotal = totalRows?.[0]?.total || 0;
      paymentMethodModel.countActiveUsers(searchTerm, (filteredErr, filteredRows) => {
        if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered users count." });
        const recordsFiltered = filteredRows?.[0]?.total || 0;
        paymentMethodModel.getActiveUsersPaged(
          { search: searchTerm, limit: parsedLength, offset: parsedStart },
          (usersErr, userRows) => {
            if (usersErr) return res.status(500).json({ status: false, message: "Could not fetch users." });
            return res.json({
              status: true,
              data: {
                method: {
                  id: method.id,
                  PaymentMethod: method.PaymentMethod,
                  selected_user: method.selected_user,
                  auth_user_ids: method.auth_user_ids
                },
                users: userRows || [],
                meta: {
                  recordsTotal,
                  recordsFiltered,
                  start: parsedStart,
                  length: parsedLength,
                  search: searchTerm
                }
              }
            });
          }
        );
      });
    });
  });
};

exports.getCoinbaseUserIds = (req, res) => {
  const methodId = Number(req.params.id);
  const searchTerm = String(req.query.search || "").trim();
  if (!methodId) return res.status(400).json({ status: false, message: "Payment method id is required." });

  paymentMethodModel.getPaymentMethodById(methodId, (methodErr, methodRows) => {
    if (methodErr) return res.status(500).json({ status: false, message: "Could not fetch payment method." });
    if (!methodRows?.length) return res.status(404).json({ status: false, message: "Payment method not found." });
    const method = methodRows[0];
    if (String(method.PaymentMethod || "").toLowerCase() !== "coinbase") {
      return res.status(400).json({ status: false, message: "This action is only available for Coinbase." });
    }

    paymentMethodModel.getActiveUserIds(searchTerm, (idsErr, rows) => {
      if (idsErr) return res.status(500).json({ status: false, message: "Could not fetch user ids." });
      const ids = (rows || []).map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
      return res.json({
        status: true,
        data: {
          ids,
          total: ids.length,
          search: searchTerm
        }
      });
    });
  });
};

exports.updateCoinbaseUsers = (req, res) => {
  const methodId = Number(req.params.id);
  const { auth_user_ids: authUserIds = [] } = req.body;
  if (!methodId) return res.status(400).json({ status: false, message: "Payment method id is required." });
  paymentMethodModel.getPaymentMethodById(methodId, (methodErr, methodRows) => {
    if (methodErr) return res.status(500).json({ status: false, message: "Could not fetch payment method." });
    if (!methodRows?.length) return res.status(404).json({ status: false, message: "Payment method not found." });
    const method = methodRows[0];
    if (String(method.PaymentMethod || "").toLowerCase() !== "coinbase") {
      return res.status(400).json({ status: false, message: "This action is only available for Coinbase." });
    }
    const cleaned = Array.isArray(authUserIds)
      ? authUserIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    paymentMethodModel.updateCoinbaseUsers(methodId, cleaned.join(","), (updateErr) => {
      if (updateErr) return res.status(500).json({ status: false, message: "Could not update Coinbase users." });
      return res.json({ status: true, message: "User added successfully" });
    });
  });
};

exports.updatePricingBanner = (req, res) => {
  const { banner_alt: bannerAlt = "", banner_link: bannerLink = "", remove_banner = "0" } = req.body;
  const shouldRemove = String(remove_banner) === "1";

  packageModel.getPricingBanner((findErr, rows) => {
    if (findErr) return res.status(500).json({ status: false, message: "Could not fetch existing banner." });
    const existing = rows?.[0] || null;
    const existingImage = existing?.banner_image || null;
    const nextImage = req.file ? toPublicUploadPath(req, req.file.path) : shouldRemove ? null : existingImage;

    packageModel.updatePricingBanner(
      {
        bannerImage: nextImage,
        bannerAlt: String(bannerAlt || "").trim(),
        bannerLink: String(bannerLink || "").trim()
      },
      (updateErr) => {
        if (updateErr) return res.status(500).json({ status: false, message: "Could not update pricing page banner." });
        if ((req.file || shouldRemove) && existingImage && existingImage !== nextImage) safeDeleteUpload(existingImage);
        return res.json({ status: true, message: "Pricing page banner updated successfully." });
      }
    );
  });
};

function formatPaymentIdDisplay(row) {
  if (paymentHistoryModel.isOnlinePaymentMethod(row.payment_method)) {
    return row.payment_id || "";
  }
  if (row.offline_admin_username) {
    return `Offline Payment :- ${row.offline_admin_username}`;
  }
  return row.payment_id || "";
}

function formatDiscountDisplay(row) {
  const method = Number(row.offer_method);
  if (method === 1) {
    return `Coupon code:- ${row.offer_code || ""} ${row.offer_value ?? ""} % OFF`;
  }
  if (method === 2) {
    return `Coupon code:- ${row.offer_code || ""} $ ${row.offer_value ?? ""} FLAT OFF`;
  }
  return "No-Offer";
}

function mapPaymentListRow(row) {
  return {
    pay_id: row.pay_id,
    payment_method: row.payment_method,
    payment_id_display: formatPaymentIdDisplay(row),
    user_name: (row.user_name || "").trim() || "—",
    package_name: row.package_name || "—",
    usd_amount: row.usd_amount,
    date_current: row.date_current,
    discount_display: formatDiscountDisplay(row),
    status: "success",
    invoice_id: row.invoice_id || null
  };
}

exports.getPaymentHistory = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "pay_id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  paymentHistoryModel.countAllPayments((totalErr, totalRows) => {
    if (totalErr) {
      console.error("getPaymentHistory countAll", totalErr);
      return res.status(500).json({ status: false, message: "Could not fetch payment history count." });
    }
    const recordsTotal = totalRows?.[0]?.total || 0;

    paymentHistoryModel.countFilteredPayments(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) return res.status(500).json({ status: false, message: "Could not fetch filtered payment history count." });
      const recordsFiltered = filteredRows?.[0]?.total || 0;

      paymentHistoryModel.getPayments(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ status: false, message: "Could not fetch payment history." });
          return res.json({
            status: true,
            data: (rows || []).map(mapPaymentListRow),
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.getPaymentHistoryDetail = (req, res) => {
  const payId = Number(req.params.id);
  if (!payId) return res.status(400).json({ status: false, message: "Payment id is required." });

  paymentHistoryModel.getPaymentById(payId, (err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not fetch payment." });
    if (!rows?.length) return res.status(404).json({ status: false, message: "Payment not found." });

    const payment = rows[0];
    paymentHistoryModel.getPaymentReason(
      { userId: payment.userid, packageId: payment.package_id, timestamp: payment.timestamp },
      (reasonErr, reasonRows) => {
        if (reasonErr) return res.status(500).json({ status: false, message: "Could not fetch payment reason." });

        const hasOffer = payment.offer_id != null && Number(payment.offer_id) !== 0;
        const reason = reasonRows?.[0]?.reason_pr || null;

        return res.json({
          status: true,
          data: {
            pay_id: payment.pay_id,
            user_name: (payment.user_name || "").replace(/\s+/g, "") || "—",
            package_name: payment.package_name || "—",
            original_price_usd: payment.usd_amount,
            paid_usd: hasOffer ? payment.offer_price_usd : payment.usd_amount,
            coupon_name: hasOffer ? payment.offer_code || payment.offer_coupon_name || "—" : "N/A",
            reason: reason || "N/A",
            discount_label: (() => {
              if (!payment.offer_method) return "N/A";
              if (Number(payment.offer_method) === 1) return `${payment.offer_value} % OFF`;
              return `$ ${payment.offer_value} FLAT`;
            })(),
            payment_method: payment.payment_method,
            coinbase_network: payment.coinbase_network || "N/A",
            coinbase_chargeid: payment.coinbase_chargeid || "N/A",
            has_offer: hasOffer
          }
        });
      }
    );
  });
};

function resolveInvoiceFilePath(filename) {
  const safeName = path.basename(String(filename || "").trim());
  if (!safeName) return null;

  const candidates = [];
  if (process.env.INVOICES_UPLOAD_DIR) {
    candidates.push(path.join(process.env.INVOICES_UPLOAD_DIR, safeName));
  }
  if (process.env.LEGACY_INVOICES_PATH) {
    candidates.push(path.join(process.env.LEGACY_INVOICES_PATH, safeName));
  }
  candidates.push(path.join(__dirname, "..", "uploads", "invoices", safeName));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return { absolutePath: candidate, filename: safeName };
  }
  return { absolutePath: candidates[candidates.length - 1], filename: safeName, missing: true };
}

function mapInvoiceListRow(row) {
  const ts = row.timestamp ? new Date(row.timestamp) : null;
  const dateLabel =
    ts && !Number.isNaN(ts.getTime()) ? ts.toISOString().slice(0, 10) : "—";
  return {
    inv_id: row.inv_id,
    invoice_id: row.invoice_id,
    invoice_file: row.invoice || null,
    user_name: (row.user_name || "").trim() || "—",
    date: dateLabel,
    has_file: Boolean(row.invoice)
  };
}

exports.getInvoices = (req, res) => {
  const { start = "0", length = "10", search = "", sortBy = "inv_id", sortOrder = "desc" } = req.query;
  const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
  const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
  const searchTerm = String(search || "").trim();

  invoiceModel.countAllInvoices((totalErr, totalRows) => {
    if (totalErr) {
      console.error("getInvoices countAll", totalErr);
      return res.status(500).json({ status: false, message: "Could not fetch invoice count." });
    }
    const recordsTotal = totalRows?.[0]?.total || 0;

    invoiceModel.countFilteredInvoices(searchTerm, (filteredErr, filteredRows) => {
      if (filteredErr) {
        return res.status(500).json({ status: false, message: "Could not fetch filtered invoice count." });
      }
      const recordsFiltered = filteredRows?.[0]?.total || 0;

      invoiceModel.getInvoices(
        { search: searchTerm, sortBy, sortOrder, limit: parsedLength, offset: parsedStart },
        (listErr, rows) => {
          if (listErr) {
            return res.status(500).json({ status: false, message: "Could not fetch invoices." });
          }
          return res.json({
            status: true,
            data: (rows || []).map(mapInvoiceListRow),
            meta: {
              recordsTotal,
              recordsFiltered,
              start: parsedStart,
              length: parsedLength,
              search: searchTerm,
              sortBy,
              sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
            }
          });
        }
      );
    });
  });
};

exports.uploadInvoice = (req, res) => {
  const invId = Number(req.body.inv_id);
  if (!invId) return res.status(400).json({ status: false, message: "Invoice id is required." });
  if (!req.file?.filename) {
    return res.status(400).json({ status: false, message: "Please select a PDF file." });
  }

  invoiceModel.updateInvoiceFile(invId, req.file.filename, (err, result) => {
    if (err) {
      console.error("uploadInvoice", err);
      return res.status(500).json({ status: false, message: "Could not upload invoice." });
    }
    if (!result?.affectedRows) {
      return res.status(404).json({ status: false, message: "Invoice not found." });
    }
    return res.json({ status: true, message: "Invoice uploaded successfully." });
  });
};

exports.downloadInvoice = (req, res) => {
  const invId = Number(req.params.invId);
  if (!invId) return res.status(400).json({ status: false, message: "Invoice id is required." });

  paymentHistoryModel.getInvoiceByInvId(invId, (err, rows) => {
    if (err) {
      console.error("downloadInvoice", err);
      return res.status(500).json({ status: false, message: "Could not load invoice." });
    }
    if (!rows?.length) return res.status(404).json({ status: false, message: "Invoice not found." });

    const invoice = rows[0];
    const resolved = resolveInvoiceFilePath(invoice.invoice);
    if (!resolved?.filename) {
      return res.status(404).json({ status: false, message: "Invoice file name is missing." });
    }
    if (resolved.missing || !fs.existsSync(resolved.absolutePath)) {
      return res.status(404).json({
        status: false,
        message: "Invoice file not found on server. Copy files to backend/uploads/invoices or set INVOICES_UPLOAD_DIR."
      });
    }

    return res.download(resolved.absolutePath, resolved.filename);
  });
};

exports.exportPaymentHistoryCsv = (req, res) => {
  paymentHistoryModel.getPaymentsForExport((err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not export payment history." });

    const header = [
      "Id",
      "payment_id",
      "order_id",
      "Receive amount",
      "usd_amount",
      "offer_price_usd",
      "orignal_price_inr",
      "offer_code",
      "offer_value",
      "offer_method",
      "status",
      "bank_name",
      "payment_method",
      "userid",
      "package_id",
      "offer_id",
      "coinbase_network",
      "coinbase_chargeid",
      "timestamp"
    ];

    const body = (rows || []).map((row) => {
      let offerMethod = "N/A";
      if (row.offer_method != null) {
        if (Number(row.offer_method) === 1) offerMethod = "%";
        else if (Number(row.offer_method) === 2) offerMethod = "FLAT";
      }

      return [
        row.pay_id,
        row.payment_id,
        row.order_id,
        row.amount != null ? `INR ${row.amount}` : "",
        row.usd_amount != null ? `$ ${row.usd_amount}` : "",
        row.offer_price_usd != null ? `$ ${row.offer_price_usd}` : " ",
        row.orignal_price_inr != null ? `INR ${row.orignal_price_inr}` : "",
        row.offer_code,
        row.offer_value,
        offerMethod,
        row.status,
        row.bank_name,
        row.payment_method,
        row.user_full_name || row.userid,
        row.package_name || row.package_id,
        row.offer_id != null && row.offer_id !== 0 ? row.offer_name || row.offer_id : "N/A",
        row.coinbase_network || "N/A",
        row.coinbase_chargeid || "N/A",
        row.timestamp
      ];
    });

    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    res.setHeader("Content-Type", "application/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="Payment History_${dateStr}.csv"`);
    return res.send(csv);
  });
};

exports.getInvoiceCompanies = (req, res) => {
  invoiceCompanyModel.getAll((err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not fetch invoice company." });
    return res.json({ status: true, data: rows || [] });
  });
};

exports.getInvoiceCompanyById = (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ status: false, message: "Invoice company id is required." });

  invoiceCompanyModel.getById(id, (err, rows) => {
    if (err) return res.status(500).json({ status: false, message: "Could not fetch invoice company." });
    if (!rows?.length) return res.status(404).json({ status: false, message: "Invoice company not found." });
    return res.json({ status: true, data: rows[0] });
  });
};

exports.updateInvoiceCompany = (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const address = String(req.body.address || "").trim();
  const gst = String(req.body.gst || "").trim();

  if (!id) return res.status(400).json({ status: false, message: "Invoice company id is required." });
  if (!name || !email || !address || !gst) {
    return res.status(400).json({ status: false, message: "Name, email, address and GST are required." });
  }

  invoiceCompanyModel.update({ id, name, email, address, gst }, (err, result) => {
    if (err) return res.status(500).json({ status: false, message: "Could not update invoice company." });
    if (!result?.affectedRows) return res.status(404).json({ status: false, message: "Invoice company not found." });
    return res.json({ status: true, message: "Updated successfully" });
  });
};
