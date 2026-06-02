const db = require("../config/db");

const SORT_COLUMNS = {
  dname: "d.dname",
  nopublication: "d.nopublication",
  credits: "d.credits",
  active: "d.active",
  timestamp: "d.timestamp",
  id: "d.id"
};

function cleanSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

exports.cleanSlug = cleanSlug;

/** Legacy CodeIgniter path: /Feed/RSS/{vendor} */
exports.buildVendorFeedUrl = (req, cleanName) => {
  const base = `${req.protocol}://${req.get("host")}`;
  const segment = encodeURIComponent(String(cleanName || "").trim());
  return `${base}/Feed/RSS/${segment}`;
};

exports.countAllDistributions = (callback) => {
  db.query("SELECT COUNT(*) AS total FROM master_distribution", [], callback);
};

exports.countFilteredDistributions = (search, callback) => {
  const where = search ? "WHERE d.dname LIKE ? OR d.website LIKE ?" : "";
  const params = search ? [`%${search}%`, `%${search}%`] : [];
  const sql = `
    SELECT COUNT(*) AS total
    FROM master_distribution d
    ${where}
  `;
  db.query(sql, params, callback);
};

exports.getDistributions = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "d.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const where = search ? "WHERE d.dname LIKE ? OR d.website LIKE ?" : "";
  const params = search
    ? [`%${search}%`, `%${search}%`, Number(limit), Number(offset)]
    : [Number(limit), Number(offset)];

  const sql = `
    SELECT
      d.id,
      d.dname,
      d.url,
      d.nopublication,
      d.use_credits,
      d.credits,
      d.website,
      d.active,
      d.timestamp,
      rss.vendor_url
    FROM master_distribution d
    LEFT JOIN master_vendor_rss rss ON rss.vendor_id = d.id
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  db.query(sql, params, callback);
};

exports.getDistributionById = (id, callback) => {
  db.query("SELECT * FROM master_distribution WHERE id = ? LIMIT 1", [id], callback);
};

exports.insertDistribution = (payload, callback) => {
  const sql = `
    INSERT INTO master_distribution
      (dname, url, nopublication, credits, use_credits, website, active)
    VALUES
      (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [
      payload.dname,
      payload.url,
      payload.nopublication,
      payload.credits,
      payload.use_credits,
      payload.website,
      payload.active
    ],
    callback
  );
};

exports.insertVendorRss = (payload, callback) => {
  const sql = `
    INSERT INTO master_vendor_rss
      (vendor_id, url, vendor_name, vendor_url, active)
    VALUES
      (?, ?, ?, ?, 1)
  `;
  db.query(sql, [payload.vendor_id, payload.url, payload.vendor_name, payload.vendor_url], callback);
};

exports.insertVendorAddCredits = (payload, callback) => {
  const sql = `
    INSERT INTO master_vendor_add_credits
      (vendor_id, added_credits, who_added_credits, active)
    VALUES
      (?, ?, ?, 1)
  `;
  db.query(sql, [payload.vendor_id, payload.added_credits, payload.who_added_credits], callback);
};

exports.updateDistribution = (id, payload, callback) => {
  const sql = `
    UPDATE master_distribution
    SET dname = ?, url = ?, credits = ?, use_credits = ?, website = ?
    WHERE id = ?
  `;
  db.query(sql, [payload.dname, payload.url, payload.credits, payload.use_credits, payload.website, id], callback);
};

exports.updateVendorRss = (vendorId, payload, callback) => {
  const sql = `
    UPDATE master_vendor_rss
    SET vendor_name = ?, url = ?, vendor_url = ?
    WHERE vendor_id = ?
  `;
  db.query(sql, [payload.vendor_name, payload.url, payload.vendor_url, vendorId], callback);
};

exports.updateDistributionStatus = (id, active, callback) => {
  db.query("UPDATE master_distribution SET active = ? WHERE id = ?", [active, id], callback);
};

exports.getVendorCreditHistory = (vendorId, callback) => {
  const sql = `
    SELECT
      vac.id,
      vac.vendor_id,
      vac.added_credits,
      vac.who_added_credits,
      vac.timestamp,
      a.username AS added_by_username
    FROM master_vendor_add_credits vac
    LEFT JOIN admin_newswire a ON a.id = vac.who_added_credits
    WHERE vac.vendor_id = ?
    ORDER BY vac.id DESC
  `;
  db.query(sql, [vendorId], callback);
};
