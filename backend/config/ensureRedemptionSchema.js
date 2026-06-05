const fs = require("fs");
const path = require("path");
const pool = require("./db").promise();

let ensured = false;

async function ensureRedemptionSchema() {
  if (ensured) return;
  try {
    const [rows] = await pool.query("SHOW TABLES LIKE 'master_redemption_code'");
    if (rows.length) {
      ensured = true;
      return;
    }
    const sqlPath = path.join(__dirname, "..", "migrations", "002_redemption_codes.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    const blocks = sql.match(/CREATE TABLE[\s\S]*?;/gi) || [];
    for (const statement of blocks) {
      await pool.query(statement);
    }
    console.log("Redemption tables created (master_redemption_code, master_redemption_log)");
    ensured = true;
  } catch (err) {
    console.error("ensureRedemptionSchema:", err.message);
  }
}

module.exports = { ensureRedemptionSchema };
