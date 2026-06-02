const db = require("../config/db");

const SORT_COLUMNS = {
  id: "pr.id",
  release_no: "pr.release_no",
  title: "pr.title",
  date: "pr.date",
  pname: "mp.pname",
  user: "TRIM(CONCAT(IFNULL(mu.first_name,''),' ',IFNULL(mu.last_name,'')))",
  status: "pr.status"
};

function sanitizeSearch(raw) {
  return String(raw || "")
    .trim()
    .slice(0, 200)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function tabWhereClause(tab) {
  const t = String(tab || "room").toLowerCase();
  switch (t) {
    case "all":
      return { sql: "pr.active = 1", params: [] };
    case "draft":
      return { sql: "pr.active = 1 AND pr.status = 0", params: [] };
    case "pending":
      return { sql: "pr.active = 1 AND pr.status = 1", params: [] };
    case "published":
      return { sql: "pr.active = 1 AND pr.status = 2", params: [] };
    case "action":
      return { sql: "pr.active = 1 AND pr.status = 3", params: [] };
    case "rejected":
      return { sql: "pr.active = 1 AND pr.status = 5", params: [] };
    case "deleted":
      return { sql: "pr.active = 2", params: [] };
    case "gallery":
      return { sql: "1 = 0", params: [] };
    case "room":
    default:
      return { sql: "pr.active = 1 AND pr.status <> 0", params: [] };
  }
}

const BASE_FROM = `
  FROM master_press_release pr
  LEFT JOIN master_package mp ON mp.id = pr.p_id
  LEFT JOIN master_user mu ON mu.id = pr.user_id
  LEFT JOIN master_company mc ON mc.id = pr.company
  LEFT JOIN admin_newswire an ON an.id = pr.created_press
`;

exports.getSummaryCounts = (callback) => {
  const sql = `
    SELECT
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS editorial_room,
      SUM(CASE WHEN active = 1 AND status = 0 THEN 1 ELSE 0 END) AS draft,
      SUM(CASE WHEN active = 1 AND status = 1 THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN active = 1 AND status = 2 THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN active = 1 AND status = 3 THEN 1 ELSE 0 END) AS action_required,
      SUM(CASE WHEN active = 1 AND status = 5 THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN active = 2 THEN 1 ELSE 0 END) AS deleted,
      SUM(CASE WHEN active = 1 AND view_flag = 1 THEN 1 ELSE 0 END) AS badge_new,
      SUM(CASE WHEN active = 1 AND view_flag = 1 AND status = 0 THEN 1 ELSE 0 END) AS badge_draft,
      SUM(CASE WHEN active = 1 AND view_flag = 1 AND status = 1 THEN 1 ELSE 0 END) AS badge_pending,
      SUM(CASE WHEN active = 1 AND view_flag = 1 AND status = 3 THEN 1 ELSE 0 END) AS badge_action_required,
      SUM(CASE WHEN active = 1 AND view_flag = 1 AND status = 2 THEN 1 ELSE 0 END) AS badge_published,
      SUM(CASE WHEN active = 1 AND view_flag = 1 AND status = 5 THEN 1 ELSE 0 END) AS badge_rejected
    FROM master_press_release
  `;
  db.query(sql, [], callback);
};

/** Legacy `notification_pr_*` — unread counts (`active=1`, `view_flag=1`, optional status). */
exports.getNotificationCounts = (callback) => {
  const sql = `
    SELECT
      SUM(CASE WHEN active = 1 AND view_flag = 1 THEN 1 ELSE 0 END) AS new_total,
      SUM(CASE WHEN active = 1 AND view_flag = 1 AND status = 0 THEN 1 ELSE 0 END) AS draft,
      SUM(CASE WHEN active = 1 AND view_flag = 1 AND status = 1 THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN active = 1 AND view_flag = 1 AND status = 3 THEN 1 ELSE 0 END) AS action_required,
      SUM(CASE WHEN active = 1 AND view_flag = 1 AND status = 2 THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN active = 1 AND view_flag = 1 AND status = 5 THEN 1 ELSE 0 END) AS rejected
    FROM master_press_release
  `;
  db.query(sql, [], callback);
};

/** Opening a status tab marks those PRs as seen (`view_flag` → 0). Room/all do not clear sidebar badges. */
exports.markTabViewed = (tab, callback) => {
  const t = String(tab || "room").toLowerCase();
  if (t === "gallery" || t === "deleted" || t === "room" || t === "all") {
    return callback(null, { affectedRows: 0 });
  }

  let sql = "UPDATE master_press_release SET view_flag = 0 WHERE active = 1 AND view_flag = 1";
  const params = [];
  const statusByTab = { draft: 0, pending: 1, published: 2, action: 3, rejected: 5 };

  if (statusByTab[t] !== undefined) {
    sql += " AND status = ?";
    params.push(statusByTab[t]);
  }

  db.query(sql, params, (err, result) => {
    if (err) return callback(err);
    callback(null, { affectedRows: result?.affectedRows ?? 0 });
  });
};

exports.countEditorialForTab = (tab, searchRaw, callback) => {
  const { sql: tabSql, params: tabParams } = tabWhereClause(tab);
  const term = sanitizeSearch(searchRaw);
  let searchSql = "";
  const params = [...tabParams];
  if (term.length > 0) {
    searchSql = ` AND (
      CONCAT_WS(' ',
        CAST(pr.release_no AS CHAR),
        IFNULL(pr.title,''),
        IFNULL(pr.date,''),
        IFNULL(mp.pname,''),
        IFNULL(mu.first_name,''),
        IFNULL(mu.last_name,''),
        IFNULL(mc.cname,''),
        IFNULL(an.username,'')
      ) LIKE ?
    )`;
    params.push(`%${term}%`);
  }
  const sql = `SELECT COUNT(*) AS total ${BASE_FROM} WHERE ${tabSql} ${searchSql}`;
  db.query(sql, params, callback);
};

exports.listEditorialPressReleases = ({ tab, search, sortBy, sortOrder, limit, offset }, callback) => {
  const { sql: tabSql, params: tabParams } = tabWhereClause(tab);
  const safeSortBy = SORT_COLUMNS[sortBy] || "pr.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const term = sanitizeSearch(search);
  let searchSql = "";
  const params = [...tabParams];
  if (term.length > 0) {
    searchSql = ` AND (
      CONCAT_WS(' ',
        CAST(pr.release_no AS CHAR),
        IFNULL(pr.title,''),
        IFNULL(pr.date,''),
        IFNULL(mp.pname,''),
        IFNULL(mu.first_name,''),
        IFNULL(mu.last_name,''),
        IFNULL(mc.cname,''),
        IFNULL(an.username,'')
      ) LIKE ?
    )`;
    params.push(`%${term}%`);
  }
  params.push(Number(limit), Number(offset));
  const sql = `
    SELECT
      pr.id,
      pr.release_no AS release_no,
      pr.title,
      pr.date,
      pr.status,
      pr.active AS press_active,
      pr.p_id AS package_id,
      pr.pdf_flag,
      pr.add_note,
      mp.pname,
      mp.active AS package_active,
      mu.first_name,
      mu.last_name,
      mc.cname,
      an.username AS staff_username
    ${BASE_FROM}
    WHERE ${tabSql}
    ${searchSql}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

/** Same filters as list; capped rows for CSV export. */
exports.listEditorialPressReleasesForExport = ({ tab, search, sortBy, sortOrder }, callback) => {
  const { sql: tabSql, params: tabParams } = tabWhereClause(tab);
  const safeSortBy = SORT_COLUMNS[sortBy] || "pr.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const term = sanitizeSearch(search);
  let searchSql = "";
  const params = [...tabParams];
  if (term.length > 0) {
    searchSql = ` AND (
      CONCAT_WS(' ',
        CAST(pr.release_no AS CHAR),
        IFNULL(pr.title,''),
        IFNULL(pr.date,''),
        IFNULL(mp.pname,''),
        IFNULL(mu.first_name,''),
        IFNULL(mu.last_name,''),
        IFNULL(mc.cname,''),
        IFNULL(an.username,'')
      ) LIKE ?
    )`;
    params.push(`%${term}%`);
  }
  const sql = `
    SELECT
      pr.id,
      pr.release_no AS release_no,
      pr.title,
      pr.date,
      pr.status,
      pr.active AS press_active,
      mp.pname,
      mu.first_name,
      mu.last_name,
      mc.cname,
      an.username AS staff_username
    ${BASE_FROM}
    WHERE ${tabSql}
    ${searchSql}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT 10000
  `;
  db.query(sql, params, callback);
};
