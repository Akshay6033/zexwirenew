/**
 * Inserts a few demo support tickets (only if table is empty).
 * Run: node scripts/seed-support-demo.js
 */
require("dotenv").config();
const adminSupportModel = require("../models/adminSupportModel");

(async () => {
  const pool = require("../config/db").promise();
  const [[{ c }]] = await pool.query("SELECT COUNT(*) AS c FROM master_support");
  if (Number(c) > 0) {
    console.log("master_support already has", c, "rows — skip seed.");
    process.exit(0);
  }

  const demos = [
    {
      cname: "Abhishek",
      email: "abhishek@example.com",
      mobile: "9876543210",
      countryCode: "IND | +91",
      subject: "Package inquiry",
      description: "I need help with my media package purchase.",
      query: 3
    },
    {
      cname: "Lakshay",
      email: "lakshay@example.com",
      mobile: "9123456780",
      countryCode: "IND | +91",
      subject: "Payment failed",
      description: "Payment error during checkout.",
      query: 2
    }
  ];

  for (const d of demos) {
    const id = await adminSupportModel.createTicket({ ...d, user_id: 0, admin_subadmin_id: 1 });
    console.log("Created ticket", id, "-", d.subject);
  }
  console.log("Done. Refresh /admindashboard/manage_support");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
