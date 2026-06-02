const express = require("express");
const userAuth = require("../middleware/userAuth");
const userDashboardController = require("../controllers/userDashboardController");
const { uploadProfileImage } = require("../middleware/uploadProfile");

const router = express.Router();

router.use(userAuth);
router.get("/home", userDashboardController.getHome);
router.get("/packages", userDashboardController.getPackages);
router.get("/profile", userDashboardController.getProfile);
router.post("/profile", uploadProfileImage, userDashboardController.updateProfile);

module.exports = router;
