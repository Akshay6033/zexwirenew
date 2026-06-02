const db = require("../config/db");

const SORT_COLUMNS = {
  id: "p.id",
  pname: "p.pname",
  price: "p.price",
  n_press_rel: "p.n_press_rel",
  package_type: "p.package_type",
  package_validity: "p.package_validity",
  reseller_normal: "p.reseller_normal",
  active: "p.active"
};

const SCOPE_WHERE = {
  all: "",
  online: "p.package_type = 1",
  offline: "p.package_type = 2",
  reseller: "p.reseller_normal = 1",
  crypto: "p.reseller_normal = 2",
  indian: "p.reseller_normal = 3",
  white_label: "p.reseller_normal = 4"
};

exports.ensureSequencerTable = (callback) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS master_package_pricing_sequence (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      package_id BIGINT NOT NULL,
      sequence_group TINYINT NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  db.query(sql, [], (createErr) => {
    if (createErr) return callback(createErr);
    db.query("SHOW COLUMNS FROM master_package_pricing_sequence LIKE 'sequence_group'", [], (columnErr, columnRows) => {
      if (columnErr) return callback(columnErr);
      const hasSequenceGroup = Boolean(columnRows?.length);
      if (hasSequenceGroup) return callback(null);
      db.query(
        "ALTER TABLE master_package_pricing_sequence ADD COLUMN sequence_group TINYINT NOT NULL DEFAULT 0 AFTER package_id",
        [],
        callback
      );
    });
  });
};

function buildWhere(scope, search) {
  const clauses = [];
  const params = [];
  const scopeClause = SCOPE_WHERE[scope] ?? "";
  if (scopeClause) clauses.push(scopeClause);
  if (search) {
    clauses.push("(p.pname LIKE ? OR p.price LIKE ? OR p.n_press_rel LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, params };
}

exports.countPackages = ({ scope, search }, callback) => {
  const { where, params } = buildWhere(scope, search);
  const sql = `SELECT COUNT(*) AS total FROM master_package p ${where}`;
  db.query(sql, params, callback);
};

exports.getPackages = ({ scope, search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "p.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const { where, params } = buildWhere(scope, search);
  const sql = `
    SELECT
      p.id,
      p.pname,
      p.price,
      p.n_press_rel,
      p.package_type,
      p.package_validity,
      p.reseller_normal,
      p.badge,
      p.active,
      p.dis_id,
      p.package_image
    FROM master_package p
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, [...params, Number(limit), Number(offset)], callback);
};

exports.ensurePackageMediaColumns = (callback) => {
  db.query("SHOW COLUMNS FROM master_package LIKE 'package_image'", [], (err, rows) => {
    if (err) return callback(err);
    if (rows?.length) return callback(null);
    db.query("ALTER TABLE master_package ADD COLUMN package_image VARCHAR(500) DEFAULT NULL", [], callback);
  });
};

exports.ensurePricingBannerTable = (callback) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS pricing_page_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      banner_image VARCHAR(500) DEFAULT NULL,
      banner_alt VARCHAR(255) DEFAULT NULL,
      banner_link VARCHAR(500) DEFAULT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  db.query(sql, [], callback);
};

exports.ensurePricingBannerRow = (callback) => {
  exports.ensurePricingBannerTable((tableErr) => {
    if (tableErr) return callback(tableErr);
    db.query("SELECT id FROM pricing_page_settings ORDER BY id ASC LIMIT 1", [], (err, rows) => {
      if (err) return callback(err);
      if (rows?.length) return callback(null, rows[0].id);
      db.query("INSERT INTO pricing_page_settings (banner_image, banner_alt, banner_link) VALUES (NULL, NULL, NULL)", [], (insertErr, result) => {
        if (insertErr) return callback(insertErr);
        return callback(null, result.insertId);
      });
    });
  });
};

exports.getPricingBanner = (callback) => {
  exports.ensurePricingBannerRow((ensureErr) => {
    if (ensureErr) return callback(ensureErr);
    db.query("SELECT id, banner_image, banner_alt, banner_link FROM pricing_page_settings ORDER BY id ASC LIMIT 1", [], callback);
  });
};

exports.getAllDistributions = (callback) => {
  db.query("SELECT id, dname FROM master_distribution WHERE active = 1 ORDER BY dname ASC", [], callback);
};

exports.insertPackage = (payload, callback) => {
  const sql = `
    INSERT INTO master_package
      (pname, price, n_press_rel, badge, package_type, package_validity, reseller_normal, dis_id, package_image, active)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `;
  db.query(
    sql,
    [
      payload.pname,
      payload.price,
      payload.n_press_rel,
      payload.badge,
      payload.package_type,
      payload.package_validity,
      payload.reseller_normal,
      payload.dis_id,
      payload.package_image || null
    ],
    callback
  );
};

exports.updatePackage = (id, payload, callback) => {
  const sql = `
    UPDATE master_package
    SET pname = ?, price = ?, n_press_rel = ?, badge = ?, package_type = ?, package_validity = ?, reseller_normal = ?, dis_id = ?, package_image = ?
    WHERE id = ?
  `;
  db.query(
    sql,
    [
      payload.pname,
      payload.price,
      payload.n_press_rel,
      payload.badge,
      payload.package_type,
      payload.package_validity,
      payload.reseller_normal,
      payload.dis_id,
      payload.package_image || null,
      id
    ],
    callback
  );
};

exports.getPackageById = (id, callback) => {
  db.query("SELECT id, package_image FROM master_package WHERE id = ? LIMIT 1", [id], callback);
};

exports.updatePricingBanner = ({ bannerImage, bannerAlt, bannerLink }, callback) => {
  exports.ensurePricingBannerRow((ensureErr, rowId) => {
    if (ensureErr) return callback(ensureErr);
    db.query(
      "UPDATE pricing_page_settings SET banner_image = ?, banner_alt = ?, banner_link = ? WHERE id = ?",
      [bannerImage || null, bannerAlt || null, bannerLink || null, rowId],
      callback
    );
  });
};

exports.clearPricingBanner = (callback) => {
  exports.ensurePricingBannerRow((ensureErr, rowId) => {
    if (ensureErr) return callback(ensureErr);
    db.query("UPDATE pricing_page_settings SET banner_image = NULL, banner_alt = NULL, banner_link = NULL WHERE id = ?", [rowId], callback);
  });
};

exports.updatePackageStatus = (id, active, callback) => {
  db.query("UPDATE master_package SET active = ? WHERE id = ?", [active, id], callback);
};

exports.replacePackageDescriptions = (packageId, descriptions, callback) => {
  db.query("DELETE FROM master_package_des WHERE package_id = ?", [packageId], (deleteErr) => {
    if (deleteErr) return callback(deleteErr);
    if (!descriptions.length) return callback(null);

    const values = descriptions.map((item) => [packageId, item.des_option, item.des]);
    db.query(
      "INSERT INTO master_package_des (package_id, des_option, des) VALUES ?",
      [values],
      callback
    );
  });
};

exports.getPackageDescriptions = (packageIds, callback) => {
  if (!packageIds.length) return callback(null, []);
  db.query(
    "SELECT p_des_id, package_id, des_option, des FROM master_package_des WHERE package_id IN (?) ORDER BY p_des_id ASC",
    [packageIds],
    callback
  );
};

exports.getSequencerPackages = (callback) => {
  const sql = `
    SELECT
      p.id,
      p.pname,
      p.price,
      p.package_type,
      p.reseller_normal,
      p.badge,
      p.active,
      p.package_image,
      COALESCE(seq.sort_order, 999999) AS sort_order
    FROM master_package p
    LEFT JOIN master_package_pricing_sequence seq ON seq.package_id = p.id
    ORDER BY COALESCE(seq.sort_order, 999999) ASC, p.pname ASC
  `;
  db.query(sql, [], callback);
};

function sequencerScopeConfig(scope) {
  if (scope === "global") return { where: "p.package_type = 1", group: 50 };
  if (scope === "online") return { where: "p.package_type = 1", group: 10 };
  if (scope === "offline") return { where: "p.package_type = 2", group: 20 };
  if (scope === "reseller") return { where: "p.reseller_normal = 1", group: 1 };
  if (scope === "crypto") return { where: "p.reseller_normal = 2", group: 2 };
  if (scope === "indian") return { where: "p.reseller_normal = 3", group: 3 };
  if (scope === "white_label") return { where: "p.reseller_normal = 4", group: 4 };
  if (scope === "normal") return { where: "p.reseller_normal = 0", group: 0 };
  return { where: "p.package_type = 1", group: 0 };
}

exports.getSequencerPackagesByScope = ({ scope }, callback) => {
  const config = sequencerScopeConfig(scope);
  const sql = `
    SELECT
      p.id,
      p.pname,
      p.price,
      p.package_type,
      p.reseller_normal,
      p.badge,
      p.active,
      p.package_image,
      COALESCE(seq.sort_order, 999999) AS sort_order
    FROM master_package p
    LEFT JOIN (
      SELECT package_id, sequence_group, MIN(sort_order) AS sort_order
      FROM master_package_pricing_sequence
      GROUP BY package_id, sequence_group
    ) seq ON seq.package_id = p.id AND seq.sequence_group = ?
    WHERE ${config.where}
    ORDER BY COALESCE(seq.sort_order, 999999) ASC, p.pname ASC
  `;
  db.query(sql, [config.group], callback);
};

exports.clearBadge = (badgeCode, callback) => {
  db.query("UPDATE master_package SET badge = 0 WHERE badge = ?", [badgeCode], callback);
};

exports.updatePackageSequencerFields = ({ packageId, badge, visible }, callback) => {
  const packageType = visible ? 1 : 2;
  db.query(
    "UPDATE master_package SET badge = ?, package_type = ? WHERE id = ?",
    [badge, packageType, packageId],
    callback
  );
};

exports.upsertSequence = ({ packageId, sequenceGroup, sortOrder }, callback) => {
  const group = Number(sequenceGroup) || 0;
  db.query(
    "UPDATE master_package_pricing_sequence SET sort_order = ? WHERE package_id = ? AND sequence_group = ?",
    [sortOrder, packageId, group],
    (updateErr, updateResult) => {
      if (updateErr) return callback(updateErr);
      if (Number(updateResult?.affectedRows || 0) > 0) return callback(null, updateResult);
      db.query(
        "INSERT INTO master_package_pricing_sequence (package_id, sequence_group, sort_order) VALUES (?, ?, ?)",
        [packageId, group, sortOrder],
        callback
      );
    }
  );
};
