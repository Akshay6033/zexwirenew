/**
 * Creates master_support and master_replay_message if missing.
 * Run: node scripts/run-support-migration.js
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../config/db").promise();

async function run() {
  const sqlPath = path.join(__dirname, "..", "migrations", "001_support_tables.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const blocks = sql.match(/CREATE TABLE[\s\S]*?;/gi) || [];

  for (const statement of blocks) {
    await pool.query(statement);
    const name = statement.match(/`(\w+)`/)?.[1] || "table";
    console.log("Created:", name);
  }

  const [support] = await pool.query("SHOW TABLES LIKE 'master_support'");
  const [replay] = await pool.query("SHOW TABLES LIKE 'master_replay_message'");
  console.log("master_support:", support.length ? "yes" : "no");
  console.log("master_replay_message:", replay.length ? "yes" : "no");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
