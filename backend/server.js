const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

require("./config/db");
const { ensureSupportSchema } = require("./config/ensureSupportSchema");
const { ensureRedemptionSchema } = require("./config/ensureRedemptionSchema");

const app = express();
ensureSupportSchema();
ensureRedemptionSchema();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const publicRoutes = require("./routes/publicRoutes");
const userDashboardRoutes = require("./routes/userDashboardRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const feedRoutes = require("./routes/feedRoutes");

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);
app.use("/api/admindashboard", adminDashboardRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/user/dashboard", userDashboardRoutes);
app.use("/api/user/checkout", checkoutRoutes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

/** Vendor RSS feeds at /{vendor-slug} — must be after /api routes */
app.use(feedRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});