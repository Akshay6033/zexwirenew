const pool = require("../config/db").promise();

const SORT_COLUMNS = {
  id: "r.id",
  code_name: "r.code_name",
  usage_limit: "r.usage_limit",
  redeemed_count: "r.redeemed_count",
  expiry_date: "r.expiry_date",
  active: "r.active",
  created_at: "r.created_at"
};

function buildSearchWhere(search) {
  const term = String(search || "").trim();
  if (!term) return { clause: "", params: [] };
  return {
    clause: " AND (r.code_name LIKE ? OR CAST(r.id AS CHAR) LIKE ?)",
    params: [`%${term}%`, `%${term}%`]
  };
}

exports.countAll = async () => {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM master_redemption_code r");
  return rows[0]?.total || 0;
};

exports.countFiltered = async (search) => {
  const { clause, params } = buildSearchWhere(search);
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM master_redemption_code r WHERE 1=1${clause}`,
    params
  );
  return rows[0]?.total || 0;
};

exports.countOffers = async (search) => {
  const recordsTotal = await exports.countAll();
  const term = String(search || "").trim();
  if (!term) return { recordsTotal, recordsFiltered: recordsTotal };
  const recordsFiltered = await exports.countFiltered(term);
  return { recordsTotal, recordsFiltered };
};

exports.listCodes = async ({ search, sortBy, sortOrder, limit, offset }) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "r.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const { clause, params } = buildSearchWhere(search);
  const [rows] = await pool.query(
    `
    SELECT
      r.id,
      r.code_name,
      r.package_ids,
      r.usage_limit,
      r.redeemed_count,
      r.expiry_date,
      r.target_audience,
      r.active,
      r.created_at,
      r.updated_at
    FROM master_redemption_code r
    WHERE 1=1${clause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
    `,
    [...params, Number(limit), Number(offset)]
  );
  return rows;
};

exports.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM master_redemption_code WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
};

exports.getByCodeName = async (codeName, excludeId = null) => {
  let sql = "SELECT id FROM master_redemption_code WHERE code_name = ?";
  const params = [codeName];
  if (excludeId) {
    sql += " AND id != ?";
    params.push(excludeId);
  }
  sql += " LIMIT 1";
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
};

exports.insertCode = async (row) => {
  const [result] = await pool.query("INSERT INTO master_redemption_code SET ?", [row]);
  return result.insertId;
};

exports.updateCode = async (id, row) => {
  const [result] = await pool.query("UPDATE master_redemption_code SET ? WHERE id = ?", [row, id]);
  return result.affectedRows > 0;
};

exports.updateActive = async (id, active) => {
  const [result] = await pool.query("UPDATE master_redemption_code SET active = ? WHERE id = ?", [active, id]);
  return result.affectedRows > 0;
};

exports.getPackagesByIds = async (ids) => {
  const unique = [...new Set((ids || []).map((id) => Number(id)).filter((n) => n > 0))];
  if (!unique.length) return [];
  const placeholders = unique.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT id, pname FROM master_package WHERE id IN (${placeholders})`,
    unique
  );
  const map = new Map(rows.map((r) => [Number(r.id), r.pname]));
  return unique.map((id) => ({ id, pname: map.get(id) || null })).filter((r) => r.pname);
};

exports.getAllPackages = async () => {
  const [rows] = await pool.query(
    `SELECT id, pname FROM master_package WHERE active = 1 ORDER BY pname ASC`
  );
  return rows;
};

exports.countRedemptions = async (codeId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM master_redemption_log WHERE code_id = ?",
    [codeId]
  );
  return rows[0]?.total || 0;
};

exports.listRedemptions = async (codeId, { limit, offset }) => {
  const [rows] = await pool.query(
    `
    SELECT
      l.id,
      l.code_id,
      l.user_id,
      l.packages_granted,
      l.redeemed_at,
      u.first_name,
      u.last_name,
      u.email
    FROM master_redemption_log l
    LEFT JOIN master_user u ON u.id = l.user_id
    WHERE l.code_id = ?
    ORDER BY l.redeemed_at DESC
    LIMIT ? OFFSET ?
    `,
    [codeId, Number(limit), Number(offset)]
  );
  return rows;
};
