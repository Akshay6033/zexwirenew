const db = require("../config/db");

exports.getAll = (callback) => {
  const sql = `
    SELECT id, name, email, address, gst, active, timestamp
    FROM manage_invoice_company
    ORDER BY id ASC
  `;
  db.query(sql, [], callback);
};

exports.getById = (id, callback) => {
  const sql = `
    SELECT id, name, email, address, gst, active, timestamp
    FROM manage_invoice_company
    WHERE id = ?
    LIMIT 1
  `;
  db.query(sql, [id], callback);
};

exports.update = ({ id, name, email, address, gst }, callback) => {
  const sql = `
    UPDATE manage_invoice_company
    SET name = ?, email = ?, address = ?, gst = ?
    WHERE id = ?
  `;
  db.query(sql, [name, email, address, gst, id], callback);
};
