const pool = require("../config/db").promise();

const SORT_COLUMNS = {
  id: "o.id",
  c_name: "o.c_name",
  c_code: "o.c_code",
  c_value: "o.c_value",
  active: "o.active",
  start_date: "o.start_date",
  end_date: "o.end_date"
};

const NOT_DELETED = "o.active != 2";

function buildSearchWhere(search) {
  const term = String(search || "").trim();
  if (!term) return { clause: "", params: [] };
  return {
    clause: " AND (o.c_name LIKE ? OR o.c_code LIKE ? OR CAST(o.id AS CHAR) LIKE ?)",
    params: [`%${term}%`, `%${term}%`, `%${term}%`]
  };
}

exports.countAllOffers = async () => {
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM master_offer o WHERE ${NOT_DELETED}`);
  return rows[0]?.total || 0;
};

exports.countFilteredOffers = async (search) => {
  const { clause, params } = buildSearchWhere(search);
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM master_offer o WHERE ${NOT_DELETED}${clause}`,
    params
  );
  return rows[0]?.total || 0;
};

/** One round-trip when possible: skip filtered count if search is empty. */
exports.countOffers = async (search) => {
  const [totalRows] = await pool.query(`SELECT COUNT(*) AS total FROM master_offer o WHERE ${NOT_DELETED}`);
  const recordsTotal = totalRows[0]?.total || 0;
  const term = String(search || "").trim();
  if (!term) {
    return { recordsTotal, recordsFiltered: recordsTotal };
  }
  const recordsFiltered = await exports.countFilteredOffers(term);
  return { recordsTotal, recordsFiltered };
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

exports.searchUsers = async ({ search = "", limit = 40, ids = [] } = {}) => {
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 40, 1), 100);
  const idList = [...new Set((ids || []).map((id) => Number(id)).filter((n) => n > 0))];

  if (idList.length) {
    const placeholders = idList.map(() => "?").join(",");
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name
       FROM master_user
       WHERE active = 1 AND id IN (${placeholders})`,
      idList
    );
    return rows;
  }

  const term = String(search || "").trim();
  if (!term) {
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name
       FROM master_user
       WHERE active = 1
       ORDER BY first_name ASC, last_name ASC
       LIMIT ?`,
      [parsedLimit]
    );
    return rows;
  }

  const like = `%${term}%`;
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name
     FROM master_user
     WHERE active = 1
       AND (
         first_name LIKE ?
         OR last_name LIKE ?
         OR CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, '')) LIKE ?
       )
     ORDER BY first_name ASC, last_name ASC
     LIMIT ?`,
    [like, like, like, parsedLimit]
  );
  return rows;
};

exports.listOffers = async ({ search, sortBy, sortOrder, limit, offset }) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "o.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const { clause, params } = buildSearchWhere(search);
  const [rows] = await pool.query(
    `
    SELECT
      o.id,
      o.c_name,
      o.c_code,
      o.c_discount,
      o.c_value,
      o.c_limit,
      o.c_limit_use,
      o.c_limit_pending,
      o.start_date,
      o.end_date,
      o.package,
      o.user,
      o.active
    FROM master_offer o
    WHERE ${NOT_DELETED}${clause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
    `,
    [...params, Number(limit), Number(offset)]
  );
  return rows;
};

exports.getOfferById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM master_offer WHERE id = ? AND active != 2 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const USER_IN_CHUNK = 500;

/** Paginate/search users within a coupon's assigned id list (no full-table scan). */
exports.listUsersByIdsPaginated = async (ids, { search, limit, offset }) => {
  const unique = [...new Set((ids || []).map((id) => Number(id)).filter((n) => n > 0))];
  if (!unique.length) {
    return { rows: [], recordsTotal: 0, recordsFiltered: 0 };
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const term = String(search || "").trim();

  if (!term) {
    const recordsTotal = unique.length;
    const pageIds = unique.slice(parsedOffset, parsedOffset + parsedLimit);
    if (!pageIds.length) {
      return { rows: [], recordsTotal, recordsFiltered: recordsTotal };
    }
    const placeholders = pageIds.map(() => "?").join(",");
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name
       FROM master_user
       WHERE active = 1 AND id IN (${placeholders})
       ORDER BY first_name ASC, last_name ASC`,
      pageIds
    );
    return { rows, recordsTotal, recordsFiltered: recordsTotal };
  }

  const like = `%${term}%`;
  const nameFilter =
    "(first_name LIKE ? OR last_name LIKE ? OR CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, '')) LIKE ?)";

  if (unique.length <= USER_IN_CHUNK) {
    const placeholders = unique.map(() => "?").join(",");
    const where = `active = 1 AND id IN (${placeholders}) AND ${nameFilter}`;
    const params = [...unique, like, like, like];
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM master_user WHERE ${where}`, params);
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name
       FROM master_user
       WHERE ${where}
       ORDER BY first_name ASC, last_name ASC
       LIMIT ? OFFSET ?`,
      [...params, parsedLimit, parsedOffset]
    );
    return {
      rows,
      recordsTotal: unique.length,
      recordsFiltered: countRows[0]?.total || 0
    };
  }

  const allMatches = [];

  for (let i = 0; i < unique.length; i += USER_IN_CHUNK) {
    const chunk = unique.slice(i, i + USER_IN_CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    const where = `active = 1 AND id IN (${placeholders}) AND ${nameFilter}`;
    const params = [...chunk, like, like, like];
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name
       FROM master_user
       WHERE ${where}
       ORDER BY first_name ASC, last_name ASC`,
      params
    );
    allMatches.push(...rows);
  }

  allMatches.sort((a, b) => {
    const la = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
    const lb = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
    return la.localeCompare(lb);
  });

  const recordsFiltered = allMatches.length;
  const rows = allMatches.slice(parsedOffset, parsedOffset + parsedLimit);

  return {
    rows,
    recordsTotal: unique.length,
    recordsFiltered
  };
};

exports.getActivePackages = async () => {
  const [rows] = await pool.query(
    `SELECT id, pname FROM master_package WHERE active = 1 ORDER BY pname ASC`
  );
  return rows;
};

exports.getActiveUsers = async () => {
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name FROM master_user WHERE active = 1 ORDER BY first_name ASC, last_name ASC`
  );
  return rows;
};

exports.getAllActivePackageIds = async () => {
  const [rows] = await pool.query(`SELECT id FROM master_package WHERE active = 1`);
  return rows.map((r) => r.id);
};

exports.getAllActiveUserIds = async () => {
  const [rows] = await pool.query(`SELECT id FROM master_user WHERE active = 1`);
  return rows.map((r) => r.id);
};

exports.codeExists = async (code, excludeId = null) => {
  let sql = `SELECT id FROM master_offer WHERE c_code = ? AND active != 2`;
  const params = [code];
  if (excludeId) {
    sql += " AND id != ?";
    params.push(excludeId);
  }
  sql += " LIMIT 1";
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
};

exports.nameExists = async (name, excludeId = null) => {
  let sql = `SELECT id FROM master_offer WHERE c_name = ? AND active != 2`;
  const params = [name];
  if (excludeId) {
    sql += " AND id != ?";
    params.push(excludeId);
  }
  sql += " LIMIT 1";
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
};

exports.insertOffer = async (offer, limitRow) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [insert] = await conn.query("INSERT INTO master_offer SET ?", [offer]);
    const offerId = insert.insertId;
    await conn.query("INSERT INTO master_offer_limit SET ?", [{ ...limitRow, offer_id: offerId }]);
    await conn.commit();
    return offerId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.updateOffer = async (id, offer, limitRow) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [update] = await conn.query("UPDATE master_offer SET ? WHERE id = ? AND active != 2", [offer, id]);
    if (!update.affectedRows) {
      await conn.rollback();
      return false;
    }
    await conn.query("INSERT INTO master_offer_limit SET ?", [{ ...limitRow, offer_id: id }]);
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.updateOfferStatus = async (id, active) => {
  const [result] = await pool.query("UPDATE master_offer SET active = ? WHERE id = ? AND active != 2", [
    active,
    id
  ]);
  return result.affectedRows > 0;
};

exports.deleteOfferPermanently = async (id) => {
  const [result] = await pool.query("UPDATE master_offer SET active = 2 WHERE id = ?", [id]);
  return result.affectedRows > 0;
};
