const express = require("express");
const feedController = require("../controllers/feedController");

const router = express.Router();

/** Legacy CodeIgniter: /Feed/RSS/GN19 */
router.get("/Feed/RSS/:url", feedController.rss);
router.get("/feed/rss/:url", feedController.rss);

/** Short URL still supported: /GN19 */
router.get("/:url", feedController.rss);

module.exports = router;
