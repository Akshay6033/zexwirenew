const db = require("../config/db");

const SORT_COLUMNS = {
  id: "u.id",
  name: "u.first_name",
  email: "u.email",
  mobile: "u.mobile",
  active: "u.active"
};

const STAFF_SORT_COLUMNS = {
  id: "s.id",
  username: "s.username",
  email: "s.email",
  phone: "s.phone",
  active: "s.active"
};

const COMPANY_SORT_COLUMNS = {
  id: "c.id",
  cname: "c.cname",
  contact_person: "c.contact_person",
  email: "c.email",
  mobile: "c.mobile",
  country_name: "co.country_name",
  active: "c.active"
};

exports.getManageUserSummary = (callback) => {
  const userSummarySql = `
    SELECT
      (SELECT COUNT(id) FROM master_user WHERE active != 2) AS totalUsers,
      (SELECT COUNT(id) FROM master_user WHERE active = 1 AND MONTH(created_date) = MONTH(CURRENT_DATE())) AS activeThisMonth
  `;
  db.query(userSummarySql, [], (userErr, userRows) => {
    if (userErr) return callback(userErr);
    const base = userRows?.[0] || { totalUsers: 0, activeThisMonth: 0 };
    const tableExistsSql = `
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'master_press_release'
    `;
    db.query(tableExistsSql, [], (tableErr, tableRows) => {
      if (tableErr) return callback(tableErr);
      const hasPressReleaseTable = Number(tableRows?.[0]?.total || 0) > 0;
      if (!hasPressReleaseTable) {
        return callback(null, [{ ...base, submittedPr: 0 }]);
      }
      db.query(
        "SELECT COUNT(id) AS submittedPr FROM master_press_release WHERE active = 1 AND status != 0",
        [],
        (prErr, prRows) => {
          if (prErr) return callback(prErr);
          return callback(null, [{ ...base, submittedPr: Number(prRows?.[0]?.submittedPr || 0) }]);
        }
      );
    });
  });
};

exports.getCountries = (callback) => {
  db.query(
    "SELECT id, country_name FROM master_country WHERE active = 1 ORDER BY country_name ASC",
    [],
    callback
  );
};

/**
 * Dial codes for user forms (`master_user.countrycodeid` → `country_code.country_code_id`).
 * Table: country_code (country_code_id, country_code, iso_code, active, …).
 */
exports.getCountryCodesList = (callback) => {
  db.query(
    `SELECT country_code_id AS id,
            TRIM(CONCAT(IFNULL(iso_code, ''), ' ', IFNULL(country_code, ''))) AS label
     FROM country_code
     WHERE active = 1
     ORDER BY iso_code ASC`,
    [],
    (err, rows) => {
      if (!err && rows?.length) {
        return callback(
          null,
          rows.map((r) => ({
            id: Number(r.id),
            label: String(r.label || r.id).trim()
          }))
        );
      }
      if (err) {
        db.query(
          `SELECT id, TRIM(CONCAT(country_name, ' ', IFNULL(phonecode, ''))) AS label
           FROM master_country WHERE active = 1 ORDER BY country_name ASC`,
          [],
          (e2, rows2) => {
            if (e2) return callback(null, []);
            callback(
              null,
              (rows2 || []).map((r) => ({
                id: Number(r.id),
                label: String(r.label || r.id).trim()
              }))
            );
          }
        );
        return;
      }
      callback(null, []);
    }
  );
};

/** Reset phone verification when mobile or dial code changes (legacy PHP behaviour). Fails silently if columns/tables differ. */
exports.runOptionalPhoneVerificationReset = (userId, callback) => {
  db.query("UPDATE master_user SET mobile_verification = 0 WHERE id = ?", [userId], () => {
    db.query("DELETE FROM rel_phone_verification_userwise WHERE rel_phne_user_id = ?", [userId], (e1) => {
      if (e1) {
        db.query("DELETE FROM rel_phone_verification_userwise WHERE rel_phone_user_id = ?", [userId], () =>
          callback(null)
        );
      } else callback(null);
    });
  });
};

const MANAGE_USER_SEARCH_LIKE = `
  u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?
  OR CONCAT_WS(' ', u.first_name, u.last_name) LIKE ?
  OR CONCAT_WS(' ', u.last_name, u.first_name) LIKE ?
`;

exports.countManageUsers = (search, callback) => {
  const where = search ? `WHERE u.active != 2 AND (${MANAGE_USER_SEARCH_LIKE})` : "WHERE u.active != 2";
  const like = `%${search}%`;
  const params = search ? [like, like, like, like, like, like] : [];
  const sql = `SELECT COUNT(*) AS total FROM master_user u ${where}`;
  db.query(sql, params, callback);
};

exports.getManageUsers = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "u.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const where = search ? `WHERE u.active != 2 AND (${MANAGE_USER_SEARCH_LIKE})` : "WHERE u.active != 2";
  const like = `%${search}%`;
  const params = search
    ? [like, like, like, like, like, like, Number(limit), Number(offset)]
    : [Number(limit), Number(offset)];
  const sql = `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.mobile,
      u.location,
      u.country,
      u.company_name,
      u.company_address,
      u.company_country,
      u.company_website,
      u.any_other,
      u.countrycodeid,
      u.email_verification,
      u.active
    FROM master_user u
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.getUserByEmail = (email, excludeId, callback) => {
  const hasExclude = Number.isInteger(Number(excludeId)) && Number(excludeId) > 0;
  const sql = hasExclude
    ? "SELECT id FROM master_user WHERE email = ? AND id <> ? LIMIT 1"
    : "SELECT id FROM master_user WHERE email = ? LIMIT 1";
  const params = hasExclude ? [email, Number(excludeId)] : [email];
  db.query(sql, params, callback);
};

exports.createUser = (payload, callback) => {
  const sql = `
    INSERT INTO master_user
      (first_name, last_name, email, password, location, country, mobile,
       company_name, company_address, company_country, company_website, any_other, countrycodeid,
       created_date, plan_id, pr, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 0, 0, 1)
  `;
  const ccid = payload.countrycodeid;
  const countrycodeid =
    ccid === "" || ccid === undefined || ccid === null ? null : Number(ccid);
  const params = [
    payload.first_name,
    payload.last_name,
    payload.email,
    payload.password,
    payload.location,
    payload.country,
    payload.mobile,
    payload.company_name ?? "",
    payload.company_address ?? "",
    Number(payload.company_country) || 0,
    payload.company_website ?? "",
    payload.any_other ?? "",
    Number.isFinite(countrycodeid) && countrycodeid > 0 ? countrycodeid : null
  ];
  db.query(sql, params, callback);
};

exports.getUserById = (id, callback) => {
  db.query("SELECT * FROM master_user WHERE id = ? LIMIT 1", [id], callback);
};

exports.updateUser = (id, payload, callback) => {
  const ccid = payload.countrycodeid;
  const countrycodeid =
    ccid === "" || ccid === undefined || ccid === null ? null : Number(ccid);
  const sql = `
    UPDATE master_user
    SET first_name = ?, last_name = ?, email = ?, location = ?, country = ?, mobile = ?,
        company_name = ?, company_address = ?, company_country = ?, company_website = ?, any_other = ?,
        countrycodeid = ?
    WHERE id = ?
  `;
  const params = [
    payload.first_name,
    payload.last_name,
    payload.email,
    payload.location,
    payload.country,
    payload.mobile,
    payload.company_name ?? "",
    payload.company_address ?? "",
    Number(payload.company_country) || 0,
    payload.company_website ?? "",
    payload.any_other ?? "",
    Number.isFinite(countrycodeid) && countrycodeid > 0 ? countrycodeid : null,
    id
  ];
  db.query(sql, params, callback);
};

exports.updateUserPassword = (id, hashedPassword, callback) => {
  db.query("UPDATE master_user SET password = ? WHERE id = ?", [hashedPassword, id], callback);
};

exports.updateUserStatus = (id, active, callback) => {
  db.query("UPDATE master_user SET active = ? WHERE id = ?", [active, id], callback);
};

exports.deleteUserPermanently = (id, callback) => {
  db.query("DELETE FROM master_user WHERE id = ?", [id], callback);
};

exports.getManageUsersForExport = (callback) => {
  const sql = `
    SELECT u.id, u.first_name, u.last_name, u.email, u.mobile, u.active, u.created_date
    FROM master_user u
    WHERE u.active != 2
    ORDER BY u.id DESC
  `;
  db.query(sql, [], callback);
};

exports.countDeletedUsers = (search, callback) => {
  const where = search ? `WHERE u.active = 2 AND (${MANAGE_USER_SEARCH_LIKE})` : "WHERE u.active = 2";
  const like = `%${search}%`;
  const params = search ? [like, like, like, like, like, like] : [];
  const sql = `SELECT COUNT(*) AS total FROM master_user u ${where}`;
  db.query(sql, params, callback);
};

exports.getDeletedUsers = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "u.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const where = search ? `WHERE u.active = 2 AND (${MANAGE_USER_SEARCH_LIKE})` : "WHERE u.active = 2";
  const like = `%${search}%`;
  const params = search
    ? [like, like, like, like, like, like, Number(limit), Number(offset)]
    : [Number(limit), Number(offset)];
  const sql = `
    SELECT u.id, u.first_name, u.last_name, u.email, u.mobile, u.active
    FROM master_user u
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.countManageStaff = (search, callback) => {
  const where = search
    ? "WHERE s.user_type != 0 AND s.active != 2 AND (s.username LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)"
    : "WHERE s.user_type != 0 AND s.active != 2";
  const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
  const sql = `SELECT COUNT(*) AS total FROM admin_newswire s ${where}`;
  db.query(sql, params, callback);
};

exports.getManageStaff = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = STAFF_SORT_COLUMNS[sortBy] || "s.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const where = search
    ? "WHERE s.user_type != 0 AND s.active != 2 AND (s.username LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)"
    : "WHERE s.user_type != 0 AND s.active != 2";
  const params = search
    ? [`%${search}%`, `%${search}%`, `%${search}%`, Number(limit), Number(offset)]
    : [Number(limit), Number(offset)];
  const sql = `
    SELECT s.id, s.username, s.email, s.phone, s.active, s.user_type
    FROM admin_newswire s
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.getStaffByEmailOrUsername = (email, username, excludeId, callback) => {
  const hasExclude = Number.isInteger(Number(excludeId)) && Number(excludeId) > 0;
  const sql = hasExclude
    ? `
      SELECT id, email, username
      FROM admin_newswire
      WHERE (email = ? OR username = ?) AND id <> ?
      LIMIT 1
    `
    : `
      SELECT id, email, username
      FROM admin_newswire
      WHERE email = ? OR username = ?
      LIMIT 1
    `;
  const params = hasExclude ? [email, username, Number(excludeId)] : [email, username];
  db.query(sql, params, callback);
};

exports.createStaff = (payload, callback) => {
  const sql = `
    INSERT INTO admin_newswire
      (username, email, phone, password, user_type, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `;
  const params = [
    payload.username,
    payload.email,
    payload.phone,
    payload.password,
    Number(payload.user_type) || 1
  ];
  db.query(sql, params, callback);
};

exports.updateStaff = (id, payload, callback) => {
  const sql = `
    UPDATE admin_newswire
    SET username = ?, email = ?, phone = ?
    WHERE id = ? AND user_type != 0
  `;
  db.query(sql, [payload.username, payload.email, payload.phone, Number(id)], callback);
};

exports.updateStaffPassword = (id, hashedPassword, callback) => {
  db.query("UPDATE admin_newswire SET password = ? WHERE id = ? AND user_type != 0", [hashedPassword, Number(id)], callback);
};

exports.updateStaffStatus = (id, active, callback) => {
  db.query("UPDATE admin_newswire SET active = ? WHERE id = ? AND user_type != 0", [Number(active), Number(id)], callback);
};

exports.deleteStaffPermanently = (id, callback) => {
  db.query("UPDATE admin_newswire SET active = 2 WHERE id = ? AND user_type != 0", [Number(id)], callback);
};

exports.getCompanyMeta = (callback) => {
  db.query(
    "SELECT id, country_name FROM master_country WHERE active = 1 ORDER BY country_name ASC",
    [],
    (countryErr, countries) => {
      if (countryErr) return callback(countryErr);
      db.query(
        "SELECT id, username, email FROM admin_newswire WHERE active = 1 ORDER BY username ASC",
        [],
        (staffErr, staff) => {
          if (staffErr) return callback(staffErr);
          return callback(null, { countries: countries || [], staff: staff || [] });
        }
      );
    }
  );
};

exports.countManageCompanies = (search, callback) => {
  const where = search
    ? "WHERE c.active != 2 AND (c.cname LIKE ? OR c.contact_person LIKE ? OR c.email LIKE ? OR c.mobile LIKE ?)"
    : "WHERE c.active != 2";
  const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : [];
  const sql = `SELECT COUNT(*) AS total FROM master_company c ${where}`;
  db.query(sql, params, callback);
};

exports.getManageCompanies = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = COMPANY_SORT_COLUMNS[sortBy] || "c.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const where = search
    ? "WHERE c.active != 2 AND (c.cname LIKE ? OR c.contact_person LIKE ? OR c.email LIKE ? OR c.mobile LIKE ?)"
    : "WHERE c.active != 2";
  const params = search
    ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, Number(limit), Number(offset)]
    : [Number(limit), Number(offset)];
  const sql = `
    SELECT
      c.id, c.created_by, c.cname, c.address, c.contact_person, c.mobile, c.email, c.website, c.state, c.country, c.active,
      co.country_name
    FROM master_company c
    LEFT JOIN master_country co ON co.id = c.country
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.getCompanyByNameOrEmail = (cname, email, excludeId, callback) => {
  const hasExclude = Number.isInteger(Number(excludeId)) && Number(excludeId) > 0;
  const sql = hasExclude
    ? `
      SELECT id, cname, email
      FROM master_company
      WHERE (cname = ? OR email = ?) AND id <> ?
      LIMIT 1
    `
    : `
      SELECT id, cname, email
      FROM master_company
      WHERE cname = ? OR email = ?
      LIMIT 1
    `;
  const params = hasExclude ? [cname, email, Number(excludeId)] : [cname, email];
  db.query(sql, params, callback);
};

exports.createCompany = (payload, callback) => {
  const sql = `
    INSERT INTO master_company
      (created_by, cname, address, contact_person, mobile, email, website, state, country, admin_or_self, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
  `;
  const params = [
    Number(payload.created_by) || 0,
    payload.cname,
    payload.address,
    payload.contact_person,
    payload.mobile,
    payload.email,
    payload.website,
    payload.state,
    Number(payload.country) || 0
  ];
  db.query(sql, params, callback);
};

exports.updateCompany = (id, payload, callback) => {
  const sql = `
    UPDATE master_company
    SET cname = ?, address = ?, contact_person = ?, mobile = ?, email = ?, website = ?, state = ?, country = ?, created_by = ?
    WHERE id = ?
  `;
  const params = [
    payload.cname,
    payload.address,
    payload.contact_person,
    payload.mobile,
    payload.email,
    payload.website,
    payload.state,
    Number(payload.country) || 0,
    Number(payload.created_by) || 0,
    Number(id)
  ];
  db.query(sql, params, callback);
};

exports.updateCompanyStatus = (id, active, callback) => {
  db.query("UPDATE master_company SET active = ? WHERE id = ?", [Number(active), Number(id)], callback);
};

exports.deleteCompanyPermanently = (id, callback) => {
  db.query("UPDATE master_company SET active = 2 WHERE id = ?", [Number(id)], callback);
};
