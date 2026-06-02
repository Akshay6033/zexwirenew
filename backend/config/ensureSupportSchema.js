const fs = require("fs");
const path = require("path");
const pool = require("./db").promise();

let ensured = false;

async function ensureSupportSchema() {
  if (ensured) return;
  try {
    const [rows] = await pool.query("SHOW TABLES LIKE 'master_support'");
    if (rows.length) {
      ensured = true;
      return;
    }
    const sqlPath = path.join(__dirname, "..", "migrations", "001_support_tables.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    const blocks = sql.match(/CREATE TABLE[\s\S]*?;/gi) || [];
    for (const statement of blocks) {
      await pool.query(statement);
    }
    console.log("Support tables created (master_support, master_replay_message)");
    ensured = true;
  } catch (err) {
    console.error("ensureSupportSchema:", err.message);
  }
}

module.exports = { ensureSupportSchema };
