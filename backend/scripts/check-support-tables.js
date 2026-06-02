require("dotenv").config();
const pool = require("../config/db").promise();

(async () => {
  const [tables] = await pool.query("SHOW TABLES");
  const names = tables.map((t) => Object.values(t)[0]);
  const support = names.filter((n) => /support|replay|chat/i.test(n));
  console.log("Support-related tables:", support.length ? support : "(none)");
  console.log("Total tables:", names.length);
  const admin = names.filter((n) => /admin/i.test(n));
  console.log("Admin tables:", admin);
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
