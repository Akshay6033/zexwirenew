const pool = require("../config/db").promise();
const purchaseFulfillment = require("./purchaseFulfillmentService");

function normalizeCodeName(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function parseIdList(csv) {
  return String(csv || "")
    .split(",")
    .map((v) => Number(String(v).trim()))
    .filter((n) => n > 0);
}

function deriveCodeStatus(row) {
  if (Number(row.active) === 0) return "Inactive";
  const redeemed = Number(row.redeemed_count) || 0;
  const limit = Number(row.usage_limit) || 0;
  if (limit > 0 && redeemed >= limit) return "Depleted";
  if (row.expiry_date) {
    const exp = new Date(row.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    if (!Number.isNaN(exp.getTime()) && exp < today) return "Expired";
  }
  return "Active";
}

function isNewUser(createdDate) {
  if (!createdDate) return false;
  const created = new Date(createdDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return created >= cutoff;
}

async function redeemCodeForUser(userId, codeName, { requirePackageId = null } = {}) {
  const normalized = normalizeCodeName(codeName);
  if (!normalized) {
    return { status: false, message: "Invalid code. Please check and try again." };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [codeRows] = await conn.query(
      "SELECT * FROM master_redemption_code WHERE code_name = ? LIMIT 1 FOR UPDATE",
      [normalized]
    );
    const code = codeRows[0];
    if (!code) {
      await conn.rollback();
      return { status: false, message: "Invalid code. Please check and try again." };
    }

    const status = deriveCodeStatus(code);
    if (status === "Inactive") {
      await conn.rollback();
      return { status: false, message: "This code is currently inactive." };
    }
    if (status === "Expired") {
      await conn.rollback();
      return { status: false, message: "This code has expired and is no longer valid." };
    }
    if (status === "Depleted") {
      await conn.rollback();
      return { status: false, message: "This code has reached its maximum usage limit." };
    }

    const [userRows] = await conn.query(
      "SELECT id, first_name, last_name, email, created_date, active FROM master_user WHERE id = ? AND active != 2 LIMIT 1",
      [userId]
    );
    if (!userRows.length) {
      await conn.rollback();
      return { status: false, message: "User not found." };
    }
    const user = userRows[0];

    if (code.target_audience === "new_users" && !isNewUser(user.created_date)) {
      await conn.rollback();
      return { status: false, message: "This code is available for new users only." };
    }

    const [existingLog] = await conn.query(
      "SELECT id FROM master_redemption_log WHERE code_id = ? AND user_id = ? LIMIT 1",
      [code.id, userId]
    );
    if (existingLog.length) {
      await conn.rollback();
      return { status: false, message: "You have already redeemed this code." };
    }

    const packageIds = parseIdList(code.package_ids);
    if (!packageIds.length) {
      await conn.rollback();
      return { status: false, message: "This code has no packages configured." };
    }

    if (requirePackageId && !packageIds.includes(Number(requirePackageId))) {
      await conn.rollback();
      return {
        status: false,
        message: "This redemption code does not include the package you are purchasing."
      };
    }

    const [pkgRows] = await conn.query(
      `SELECT id, pname, n_press_rel, price, package_validity
       FROM master_package WHERE id IN (${packageIds.map(() => "?").join(",")}) AND active = 1`,
      packageIds
    );

    const granted = [];
    for (const pkg of pkgRows) {
      await purchaseFulfillment.fulfillPackagePurchase(conn, {
        userId,
        packageId: pkg.id,
        prCredits: Number(pkg.n_press_rel) || 0,
        usdAmount: 0,
        paymentId: `REDEEM-${code.id}-${userId}`,
        paymentMethod: "Redemption Code",
        reason: `Redemption code ${code.code_name}`,
        whoLabel: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User"
      });
      granted.push(pkg.pname);
    }

    await conn.query(
      "INSERT INTO master_redemption_log (code_id, user_id, packages_granted, redeemed_at) VALUES (?, ?, ?, NOW())",
      [code.id, userId, packageIds.join(",")]
    );

    const newRedeemed = Number(code.redeemed_count) + 1;
    await conn.query("UPDATE master_redemption_code SET redeemed_count = ? WHERE id = ?", [
      newRedeemed,
      code.id
    ]);

    await conn.commit();
    return {
      status: true,
      message: `Code redeemed successfully! The following packages have been added to your account: ${granted.join(", ")}.`,
      packageNames: granted
    };
  } catch (err) {
    await conn.rollback();
    console.error("redeemCodeForUser:", err);
    return { status: false, message: err.message || "Could not redeem code." };
  } finally {
    conn.release();
  }
}

module.exports = { redeemCodeForUser, normalizeCodeName };
