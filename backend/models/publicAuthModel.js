const pool = require("../config/db").promise();
const crypto = require("crypto");

function md5(value) {
  return crypto.createHash("md5").update(String(value || "")).digest("hex");
}

async function queryWithRetry(sql, params = [], retryCount = 1) {
  let lastError;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      lastError = err;
      const retryable = err && (err.code === "ECONNRESET" || err.code === "PROTOCOL_CONNECTION_LOST");
      if (!retryable || attempt === retryCount) break;
    }
  }
  throw lastError;
}

exports.md5 = md5;

exports.getCountryCodes = async () => {
  try {
    const [rows] = await queryWithRetry(
      `SELECT country_code_id AS id, country_code, iso_code
       FROM country_code
       WHERE active = 1
       ORDER BY iso_code ASC`
    );
    return (rows || []).map((row) => ({
      id: row.id,
      label: `${row.country_code || ""} ${row.iso_code || ""}`.trim()
    }));
  } catch {
    const [rows] = await queryWithRetry(
      `SELECT id, country_name, phonecode
       FROM master_country
       WHERE active = 1
       ORDER BY country_name ASC`
    );
    return (rows || []).map((row) => ({
      id: row.id,
      label: `${row.country_name || ""} ${row.phonecode || ""}`.trim()
    }));
  }
};

exports.findUserByEmail = async (email) => {
  const [rows] = await queryWithRetry(
    `SELECT id, first_name, last_name, email, password, active, email_verification,
            plan_id, pr, profile_image
     FROM master_user
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  return rows?.[0] || null;
};

exports.findActiveUserByEmail = async (email) => {
  const [rows] = await queryWithRetry(
    `SELECT id, first_name, last_name, email, password, active, email_verification
     FROM master_user
     WHERE email = ? AND active = 1
     LIMIT 1`,
    [email]
  );
  return rows?.[0] || null;
};

exports.findUserByMobile = async (mobile) => {
  const [rows] = await queryWithRetry(
    "SELECT id FROM master_user WHERE mobile = ? LIMIT 1",
    [mobile]
  );
  return rows?.[0] || null;
};

exports.findUserById = async (id) => {
  const [rows] = await queryWithRetry(
    `SELECT id, first_name, last_name, email, active, email_verification
     FROM master_user
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows?.[0] || null;
};

exports.createUser = async (payload) => {
  const countrycodeid =
    payload.countrycodeid === "" || payload.countrycodeid == null
      ? null
      : Number(payload.countrycodeid);
  const country = Number(payload.country) || (countrycodeid > 0 ? countrycodeid : 1);

  const [result] = await queryWithRetry(
    `INSERT INTO master_user
      (first_name, last_name, email, password, location, country, mobile,
       company_name, company_address, company_country, company_website, any_other, countrycodeid,
       created_date, plan_id, pr, active, email_verification)
     VALUES (?, ?, ?, ?, ?, ?, ?, '', '', 0, '', '', ?, CURDATE(), 0, 0, 1, 0)`,
    [
      payload.first_name,
      payload.last_name,
      payload.email,
      md5(payload.password),
      payload.location,
      country,
      payload.mobile,
      Number.isFinite(countrycodeid) && countrycodeid > 0 ? countrycodeid : null
    ]
  );
  return result.insertId;
};

exports.updatePassword = async (userId, plainPassword) => {
  await queryWithRetry("UPDATE master_user SET password = ? WHERE id = ?", [md5(plainPassword), userId]);
};

exports.saveEmailVerificationOtp = async (userId, otp) => {
  try {
    await queryWithRetry(
      "UPDATE master_user SET email_verification_otp = ? WHERE id = ?",
      [String(otp), userId]
    );
  } catch {
    await queryWithRetry("UPDATE master_user SET otp = ? WHERE id = ?", [String(otp), userId]);
  }
};

exports.getEmailVerificationOtp = async (userId) => {
  try {
    const [rows] = await queryWithRetry(
      "SELECT email_verification_otp AS otp FROM master_user WHERE id = ? LIMIT 1",
      [userId]
    );
    return rows?.[0]?.otp ?? null;
  } catch {
    const [rows] = await queryWithRetry("SELECT otp FROM master_user WHERE id = ? LIMIT 1", [userId]);
    return rows?.[0]?.otp ?? null;
  }
};

exports.markEmailVerified = async (userId) => {
  try {
    await queryWithRetry(
      "UPDATE master_user SET email_verification = 1, email_verification_otp = NULL WHERE id = ?",
      [userId]
    );
  } catch {
    await queryWithRetry("UPDATE master_user SET email_verification = 1, otp = NULL WHERE id = ?", [userId]);
  }
};

exports.incrementOtpSendCount = async (userId) => {
  try {
    const [rows] = await queryWithRetry(
      "SELECT otp_send_count FROM master_user WHERE id = ? LIMIT 1",
      [userId]
    );
    const current = Number(rows?.[0]?.otp_send_count) || 0;
    if (current >= 5) return current;
    await queryWithRetry("UPDATE master_user SET otp_send_count = ? WHERE id = ?", [current + 1, userId]);
    return current + 1;
  } catch {
    return 0;
  }
};
