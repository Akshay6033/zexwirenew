const db = require("../config/db");

const SORT_COLUMNS = {
  id: "c.id",
  country_name: "c.country_name",
  active: "c.active",
  timestamp: "c.timestamp"
};

exports.countAllCountries = (callback) => {
  db.query("SELECT COUNT(*) AS total FROM master_country", [], callback);
};

exports.countFilteredCountries = (search, callback) => {
  const where = search ? "WHERE c.country_name LIKE ?" : "";
  const params = search ? [`%${search}%`] : [];
  const sql = `SELECT COUNT(*) AS total FROM master_country c ${where}`;
  db.query(sql, params, callback);
};

exports.getCountries = ({ search, sortBy, sortOrder, limit, offset }, callback) => {
  const safeSortBy = SORT_COLUMNS[sortBy] || "c.id";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  const where = search ? "WHERE c.country_name LIKE ?" : "";
  const params = search ? [`%${search}%`, Number(limit), Number(offset)] : [Number(limit), Number(offset)];
  const sql = `
    SELECT c.id, c.country_name, c.active, c.timestamp
    FROM master_country c
    ${where}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  db.query(sql, params, callback);
};

exports.getCountryByName = (countryName, callback) => {
  db.query("SELECT id FROM master_country WHERE country_name = ? LIMIT 1", [countryName], callback);
};

exports.insertCountry = (countryName, callback) => {
  db.query("INSERT INTO master_country (country_name, active) VALUES (?, 1)", [countryName], callback);
};

exports.updateCountry = (id, countryName, callback) => {
  db.query("UPDATE master_country SET country_name = ? WHERE id = ?", [countryName, id], callback);
};

exports.updateCountryStatus = (id, active, callback) => {
  db.query("UPDATE master_country SET active = ? WHERE id = ?", [active, id], callback);
};

exports.deleteCountryPermanently = (id, callback) => {
  db.query("DELETE FROM master_country WHERE id = ?", [id], callback);
};
