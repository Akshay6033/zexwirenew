const db = require("../config/db");

const GALLERY_FROM = `
  FROM upload_image ui
  LEFT JOIN master_press_release pr ON pr.id = ui.pr_id
  LEFT JOIN master_user mu ON mu.id = ui.userid
`;

const SORT_COLUMNS = {
  id: "ui.id",
  username: "TRIM(CONCAT(IFNULL(mu.first_name,''),' ',IFNULL(mu.last_name,'')))",
  image_name: "ui.image_name",
  image_path: "ui.image_path",
  date: "ui.timestamp"
};

function sanitizeSearch(raw) {
  return String(raw || "")
    .trim()
    .slice(0, 200)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function buildSearchClause(term) {
  if (!term.length) return { sql: "", params: [] };
  return {
    sql: ` AND (
      CONCAT_WS(' ',
        IFNULL(mu.first_name,''),
        IFNULL(mu.last_name,''),
        IFNULL(ui.image_name,''),
        IFNULL(ui.image_path,''),
        IFNULL(ui.timestamp,'')
      ) LIKE ?
    )`,
    params: [`%${term}%`]
  };
}

exports.countGallery = (searchRaw, callback) => {
  const term = sanitizeSearch(searchRaw);
  const { sql: searchSql, params: searchParams } = buildSearchClause(term);
  const sql = `SELECT COUNT(*) AS total ${GALLERY_FROM} WHERE 1=1 ${searchSql}`;
  db.query(sql, searchParams, callback);
};

exports.listGallery = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const term = sanitizeSearch(search);
  const { sql: searchSql, params: searchParams } = buildSearchClause(term);
  const safeSortBy = SORT_COLUMNS[sortBy] || "ui.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const params = [...searchParams, Number(limit), Number(offset)];
  const sql = `
    SELECT
      ui.id,
      ui.image_name,
      ui.image_path,
      ui.timestamp,
      mu.first_name,
      mu.last_name
    ${GALLERY_FROM}
    WHERE 1=1 ${searchSql}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.getGalleryImageById = (id, callback) => {
  db.query(
    `SELECT id, image_name, image_path FROM upload_image WHERE id = ? LIMIT 1`,
    [id],
    callback
  );
};

exports.deleteGalleryImage = (id, callback) => {
  db.query("DELETE FROM upload_image WHERE id = ? LIMIT 1", [id], callback);
};
