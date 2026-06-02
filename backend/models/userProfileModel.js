const pool = require("../config/db").promise();
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

function md5(value) {
  return crypto.createHash("md5").update(String(value || "")).digest("hex");
}

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

exports.getSingleUser = async (userId) => {
  const rows = await query("SELECT * FROM master_user WHERE id = ? LIMIT 1", [userId]);
  return rows[0] || null;
};

exports.getCountries = async () => {
  return query("SELECT id, country_name FROM master_country WHERE active = 1 ORDER BY country_name ASC");
};

exports.getCountryCodes = async () => {
  try {
    return await query(
      `SELECT country_code_id, country_code, iso_code
       FROM country_code
       WHERE active = 1
       ORDER BY iso_code ASC`
    );
  } catch {
    return [];
  }
};

exports.getUserStatus = async (userId) => {
  const rows = await query("SELECT active FROM master_user WHERE id = ? LIMIT 1", [userId]);
  return rows[0] || null;
};

exports.updateProfile = async (userId, payload, profileImageFilename) => {
  const existing = await exports.getSingleUser(userId);
  if (!existing) return 0;

  const email = String(payload.email || "").trim().toLowerCase();
  const mobile = String(payload.mobile || "").trim();
  const countrycodeid = payload.countrycodeid === "" || payload.countrycodeid == null ? null : Number(payload.countrycodeid);

  const emailCount = await query(
    "SELECT COUNT(*) AS c FROM master_user WHERE active != 2 AND email = ? AND id != ?",
    [email, userId]
  );
  if (Number(emailCount[0]?.c) > 0) return 3;

  const phoneCount = await query(
    "SELECT COUNT(*) AS c FROM master_user WHERE active != 2 AND mobile = ? AND id != ?",
    [mobile, userId]
  );
  if (Number(phoneCount[0]?.c) > 0) return 2;

  let password = existing.password;
  let passwordNormal = existing.password_normal;
  const newPassword = String(payload.password || "");
  if (newPassword) {
    password = md5(newPassword);
    passwordNormal = newPassword;
  }

  if (String(existing.mobile) !== mobile || Number(existing.countrycodeid) !== Number(countrycodeid)) {
    await pool.query("UPDATE master_user SET mobile_verification = 0 WHERE id = ?", [userId]);
    await pool.query("DELETE FROM rel_phone_verification_userwise WHERE rel_phne_user_id = ?", [userId]);
  }

  if (String(existing.email).toLowerCase() !== email) {
    await pool.query("UPDATE master_user SET email_verification = 0 WHERE id = ?", [userId]);
    await pool.query("DELETE FROM rel_email_verification_userwise WHERE rel_user_id = ?", [userId]);
  }

  let profileImage = existing.profile_image;
  if (profileImageFilename) {
    if (profileImage && profileImage !== profileImageFilename) {
      const oldPath = path.join(__dirname, "..", "uploads", "profile_image", profileImage);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          /* ignore */
        }
      }
    }
    profileImage = profileImageFilename;
  }

  const countryRaw = payload.country;
  const country =
    countryRaw === "" || countryRaw == null || countryRaw === "0" || Number(countryRaw) === 0
      ? existing.country
      : Number(countryRaw);

  await pool.query(
    `UPDATE master_user SET
      first_name = ?,
      last_name = ?,
      email = ?,
      countrycodeid = ?,
      mobile = ?,
      location = ?,
      country = ?,
      password = ?,
      password_normal = ?,
      company_name = ?,
      company_address = ?,
      company_website = ?,
      any_other = ?,
      profile_image = ?
     WHERE id = ?`,
    [
      String(payload.first_name || "").trim(),
      String(payload.last_name || "").trim(),
      email,
      Number.isFinite(countrycodeid) && countrycodeid > 0 ? countrycodeid : null,
      mobile,
      String(payload.location || "").trim(),
      country,
      password,
      passwordNormal,
      String(payload.company_name || "").trim(),
      String(payload.company_address || "").trim(),
      String(payload.company_website || "").trim(),
      String(payload.any_other || "").trim(),
      profileImage,
      userId
    ]
  );

  return 1;
};
