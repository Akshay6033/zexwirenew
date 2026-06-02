const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const userPrController = require("../controllers/userPrController");
const { requireAdmin } = require("../middleware/adminAuth");

router.get("/summary", userController.getManageUserSummary);
router.get("/meta", userController.getUserMeta);
router.get("/list", userController.getManageUsers);
router.get("/staff/list", userController.getManageStaff);
router.post("/staff", userController.createStaff);
router.put("/staff/:id", userController.updateStaff);
router.patch("/staff/:id/status", userController.updateStaffStatus);
router.delete("/staff/:id", userController.deleteStaffPermanently);
router.get("/company/meta", userController.getCompanyMeta);
router.get("/company/list", userController.getManageCompanies);
router.post("/company", userController.createCompany);
router.put("/company/:id", userController.updateCompany);
router.patch("/company/:id/status", userController.updateCompanyStatus);
router.delete("/company/:id", userController.deleteCompanyPermanently);
router.get("/export.csv", userController.exportUsersCsv);
router.get("/deleted", userController.getDeletedUsers);

router.get("/pr/decrease-history/:prRecordId", requireAdmin, userPrController.getDecreasePrHistory);
router.get("/pr/increase-history/:userPrStatusId", requireAdmin, userPrController.getIncreasePrLineHistory);
router.post("/pr/decrease", requireAdmin, userPrController.postDecreasePr);

router.get("/:userId/history/payments", requireAdmin, userPrController.getUserHistoryPaymentsPaged);
router.get("/:userId/history/pr-records", requireAdmin, userPrController.getUserHistoryPrRecordsPaged);
router.get("/:userId/history/press-releases", requireAdmin, userPrController.getUserHistoryPressReleasesPaged);
router.get("/:userId/history", requireAdmin, userPrController.getUserFullHistory);
router.get("/:userId/pr/status-history", requireAdmin, userPrController.getUserPrStatusPaged);
router.get("/:userId/pr/increase-data", requireAdmin, userPrController.getIncreasePrFormData);
router.post("/:userId/pr/increase", requireAdmin, userPrController.postIncreasePr);
router.get("/:userId/pr/history", requireAdmin, userPrController.getUserPrHistoryView);
router.get("/:userId/pr/decrease/:prRecordId", requireAdmin, userPrController.getDecreasePrForm);

router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.patch("/:id/status", userController.updateUserStatus);
router.delete("/:id", userController.deleteUserPermanently);

module.exports = router;