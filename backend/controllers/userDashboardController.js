const userDashboardModel = require("../models/userDashboardModel");
const userProfileModel = require("../models/userProfileModel");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

async function ensureActiveUser(userId, res) {
  const statusRow = await userProfileModel.getUserStatus(userId);
  if (!statusRow) {
    res.status(404).json({ status: false, message: "User not found." });
    return false;
  }
  if (Number(statusRow.active) === 2) {
    res.status(403).json({
      status: false,
      code: "account_deleted",
      message: "Your account is deleted. Please contact support."
    });
    return false;
  }
  return true;
}

async function runDashboardBootstrap(userId) {
  const user = await userDashboardModel.getUserSessionDetails(userId);
  if (!user) return null;

  try {
    await userDashboardModel.expireOutdatedPackages(userId);
  } catch (err) {
    console.error("expireOutdatedPackages", userId, err.message || err);
  }

  try {
    await userDashboardModel.syncAffiliatePackageStatus(userId);
  } catch (err) {
    console.error("syncAffiliatePackageStatus", userId, err.message || err);
  }

  return userDashboardModel.getUserSessionDetails(userId);
}

exports.getHome = async (req, res) => {
  const userId = req.userId;

  try {
    const statusRow = await userDashboardModel.getUserStatus(userId);
    if (!statusRow) {
      return res.status(404).json({ status: false, message: "User not found." });
    }
    if (Number(statusRow.active) === 2) {
      return res.status(403).json({
        status: false,
        code: "account_deleted",
        message: "Your account is deleted. Please contact support."
      });
    }

    const user = await runDashboardBootstrap(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found." });
    }

    let notifications = [];
    try {
      notifications = await userDashboardModel.getDashboardNotifications(userId, 50);
    } catch (err) {
      console.error("getDashboardNotifications", userId, err.message || err, err.sqlMessage || "");
      notifications = [];
    }

    const [
      publishCount,
      packageCount,
      earlyPackages,
      lastFivePr
    ] = await Promise.all([
      userDashboardModel.dashboardPublishCount(userId),
      userDashboardModel.buyPackageCount(userId),
      userDashboardModel.getEarlyPackageDetails(userId),
      userDashboardModel.getLastFivePr(userId)
    ]);

    return res.json({
      status: true,
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          plan_id: Number(user.plan_id) || 0,
          pr: Number(user.pr) || 0,
          profile_image: user.profile_image || ""
        },
        publishCount,
        packageCount,
        earlyPackages,
        lastFivePr,
        notifications
      }
    });
  } catch (err) {
    console.error("getHome", userId, err.message || err, err.sqlMessage || err.stack);
    return res.status(500).json({ status: false, message: "Could not load dashboard." });
  }
};

exports.getPackages = async (req, res) => {
  const userId = req.userId;

  try {
    const statusRow = await userDashboardModel.getUserStatus(userId);
    if (!statusRow) {
      return res.status(404).json({ status: false, message: "User not found." });
    }
    if (Number(statusRow.active) === 2) {
      return res.status(403).json({
        status: false,
        code: "account_deleted",
        message: "Your account is deleted. Please contact support."
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.q || req.query.search || "").trim();

    const [total, rows] = await Promise.all([
      userDashboardModel.countPackageDetails(userId, search),
      userDashboardModel.getPackageDetailsPaginated(userId, { page, limit, search })
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      status: true,
      data: {
        rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          rangeStart: total ? (page - 1) * limit + 1 : 0,
          rangeEnd: total ? Math.min(page * limit, total) : 0
        }
      }
    });
  } catch (err) {
    console.error("getPackages", userId, err.message || err, err.sqlMessage || "");
    return res.status(500).json({ status: false, message: "Could not load package details." });
  }
};

function sanitizeUserForProfile(user) {
  if (!user) return null;
  return {
    id: user.id,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    mobile: user.mobile || "",
    location: user.location || "",
    country: user.country,
    countrycodeid: user.countrycodeid,
    company_name: user.company_name || "",
    company_address: user.company_address || "",
    company_website: user.company_website || "",
    any_other: user.any_other || "",
    profile_image: user.profile_image || "",
    email_verification: Number(user.email_verification) || 0,
    mobile_verification: Number(user.mobile_verification) || 0
  };
}

exports.getProfile = async (req, res) => {
  const userId = req.userId;
  try {
    if (!(await ensureActiveUser(userId, res))) return;

    const [singleUser, countryCodes, countries] = await Promise.all([
      userProfileModel.getSingleUser(userId),
      userProfileModel.getCountryCodes(),
      userProfileModel.getCountries()
    ]);

    return res.json({
      status: true,
      data: {
        singleUser: sanitizeUserForProfile(singleUser),
        countryCodes,
        countries
      }
    });
  } catch (err) {
    console.error("getProfile", err);
    return res.status(500).json({ status: false, message: "Could not load profile." });
  }
};

exports.updateProfile = async (req, res) => {
  const userId = req.userId;
  try {
    if (!(await ensureActiveUser(userId, res))) return;

    const body = req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const confirmPassword = String(body.pswd1 || body.confirmPassword || "");

    if (!body.first_name || !body.last_name || !email || !body.mobile) {
      return res.json({ status: false, code: 0, message: "Required fields are missing." });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.json({ status: false, code: 0, message: "Please enter valid email" });
    }

    if (password) {
      if (!PASSWORD_REGEX.test(password)) {
        return res.json({
          status: false,
          code: 0,
          message:
            "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character"
        });
      }
      if (password !== confirmPassword) {
        return res.json({ status: false, code: 0, message: "Password doesn't match" });
      }
    }

    const profileImageFilename = req.file ? req.file.filename : null;
    const result = await userProfileModel.updateProfile(userId, body, profileImageFilename);

    if (result === 1) {
      const updated = await userProfileModel.getSingleUser(userId);
      return res.json({
        status: true,
        code: 1,
        message: "Profile Updated successfully!",
        data: { singleUser: sanitizeUserForProfile(updated) }
      });
    }
    if (result === 2) {
      return res.json({ status: false, code: 2, message: "Mobile number already exists!" });
    }
    if (result === 3) {
      return res.json({ status: false, code: 3, message: "Email id already exists!" });
    }
    return res.json({ status: false, code: 0, message: "Something went wrong please try again!" });
  } catch (err) {
    console.error("updateProfile", err);
    return res.status(500).json({ status: false, code: 0, message: "Something went wrong please try again!" });
  }
};
