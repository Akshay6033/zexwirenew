const adminRedemptionModel = require("../models/adminRedemptionModel");

const PACKAGE_PREVIEW = 3;

function parseIdList(csv) {
  if (!csv) return [];
  return String(csv)
    .split(",")
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function joinIdList(ids) {
  const unique = [...new Set((ids || []).map((v) => Number(v)).filter((n) => n > 0))];
  return unique.join(",");
}

function normalizeCodeName(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function isExpiryInPast(expiryDate) {
  if (!expiryDate) return false;
  const exp = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return !Number.isNaN(exp.getTime()) && exp < today;
}

function deriveStatus(row) {
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

async function resolvePackageNames(packageIdsCsv) {
  const ids = parseIdList(packageIdsCsv);
  if (!ids.length) return [];
  const rows = await adminRedemptionModel.getPackagesByIds(ids);
  const map = new Map(rows.map((r) => [Number(r.id), r.pname]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

function enrichListRow(row, packageMap) {
  const ids = parseIdList(row.package_ids);
  const names = ids.map((id) => packageMap.get(id)).filter(Boolean);
  const redeemed = Number(row.redeemed_count) || 0;
  const limit = Number(row.usage_limit) || 0;
  return {
    id: row.id,
    code_name: row.code_name,
    package_names: names.slice(0, PACKAGE_PREVIEW),
    package_names_more: Math.max(0, names.length - PACKAGE_PREVIEW),
    package_count: names.length,
    usage_limit: limit,
    redeemed_count: redeemed,
    remaining: Math.max(0, limit - redeemed),
    expiry_date: row.expiry_date,
    expiry_label: row.expiry_date ? String(row.expiry_date).slice(0, 10) : "No Expiry",
    target_audience: row.target_audience,
    target_audience_label: row.target_audience === "new_users" ? "New Users Only" : "All Users",
    active: row.active,
    status: deriveStatus(row)
  };
}

exports.getRedemptionMeta = async (_req, res) => {
  try {
    const packages = await adminRedemptionModel.getAllPackages();
    return res.json({
      status: true,
      data: {
        packages: packages.map((p) => ({ id: p.id, label: p.pname }))
      }
    });
  } catch (err) {
    console.error("getRedemptionMeta:", err);
    return res.status(500).json({ status: false, message: "Could not load packages." });
  }
};

exports.listRedemptionCodes = async (req, res) => {
  try {
    const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
    const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
    const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
    const searchTerm = String(search || "").trim();

    const [counts, rows] = await Promise.all([
      adminRedemptionModel.countOffers(searchTerm),
      adminRedemptionModel.listCodes({
        search: searchTerm,
        sortBy,
        sortOrder,
        limit: parsedLength,
        offset: parsedStart
      })
    ]);

    const allPackageIds = new Set();
    for (const row of rows) {
      parseIdList(row.package_ids).forEach((id) => allPackageIds.add(id));
    }
    const packageRows = allPackageIds.size
      ? await adminRedemptionModel.getPackagesByIds([...allPackageIds])
      : [];
    const packageMap = new Map(packageRows.map((r) => [Number(r.id), r.pname]));

    const data = rows.map((row) => enrichListRow(row, packageMap));

    return res.json({
      status: true,
      data,
      meta: {
        recordsTotal: counts.recordsTotal,
        recordsFiltered: counts.recordsFiltered,
        start: parsedStart,
        length: parsedLength,
        search: searchTerm,
        sortBy,
        sortOrder: String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc"
      }
    });
  } catch (err) {
    console.error("listRedemptionCodes:", err);
    return res.status(500).json({ status: false, message: "Could not fetch redemption codes." });
  }
};

exports.getRedemptionCodeById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Code id is required." });

    const row = await adminRedemptionModel.getById(id);
    if (!row) return res.status(404).json({ status: false, message: "Redemption code not found." });

    const packageNames = await resolvePackageNames(row.package_ids);
    const redeemed = Number(row.redeemed_count) || 0;
    const limit = Number(row.usage_limit) || 0;

    return res.json({
      status: true,
      data: {
        ...row,
        package_ids: parseIdList(row.package_ids),
        package_names: packageNames,
        remaining: Math.max(0, limit - redeemed),
        expiry_label: row.expiry_date ? String(row.expiry_date).slice(0, 10) : "",
        target_audience_label: row.target_audience === "new_users" ? "New Users Only" : "All Users",
        status: deriveStatus(row)
      }
    });
  } catch (err) {
    console.error("getRedemptionCodeById:", err);
    return res.status(500).json({ status: false, message: "Could not fetch redemption code." });
  }
};

exports.checkRedemptionCodeName = async (req, res) => {
  try {
    const codeName = normalizeCodeName(req.body.code_name);
    const excludeId = req.body.exclude_id ? Number(req.body.exclude_id) : null;
    if (!codeName) return res.json({ status: true, exists: false });
    const exists = await adminRedemptionModel.getByCodeName(codeName, excludeId);
    return res.json({ status: true, exists });
  } catch (err) {
    console.error("checkRedemptionCodeName:", err);
    return res.status(500).json({ status: false, message: "Could not verify code name." });
  }
};

exports.createRedemptionCode = async (req, res) => {
  try {
    const codeName = normalizeCodeName(req.body.code_name);
    const packageIds = Array.isArray(req.body.package_ids)
      ? req.body.package_ids
      : req.body.package_ids
        ? [req.body.package_ids]
        : [];
    const usageLimit = Number(req.body.usage_limit);
    const expiryDate = String(req.body.expiry_date || "").trim() || null;
    const targetAudience =
      req.body.target_audience === "new_users" ? "new_users" : "all_users";
    const active = req.body.active === false || Number(req.body.active) === 0 ? 0 : 1;

    if (!codeName) {
      return res.status(400).json({ status: false, message: "Code name is required." });
    }
    const parsedPackageIds = packageIds.map((v) => Number(v)).filter((n) => n > 0);
    if (!parsedPackageIds.length) {
      return res.status(400).json({
        status: false,
        message: "Please select at least one package to assign."
      });
    }
    if (!Number.isFinite(usageLimit) || usageLimit < 1) {
      return res.status(400).json({ status: false, message: "Usage limit must be at least 1." });
    }
    if (isExpiryInPast(expiryDate)) {
      return res.status(400).json({ status: false, message: "Expiry date cannot be in the past." });
    }

    if (await adminRedemptionModel.getByCodeName(codeName)) {
      return res.status(400).json({
        status: false,
        message: "This code already exists. Please choose a different name."
      });
    }

    const id = await adminRedemptionModel.insertCode({
      code_name: codeName,
      package_ids: joinIdList(parsedPackageIds),
      usage_limit: usageLimit,
      redeemed_count: 0,
      expiry_date: expiryDate,
      target_audience: targetAudience,
      active
    });

    return res.json({
      status: true,
      message: "Redemption code created successfully.",
      data: { id }
    });
  } catch (err) {
    console.error("createRedemptionCode:", err);
    return res.status(500).json({ status: false, message: "Could not create redemption code." });
  }
};

exports.updateRedemptionCode = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Code id is required." });

    const existing = await adminRedemptionModel.getById(id);
    if (!existing) return res.status(404).json({ status: false, message: "Redemption code not found." });

    const codeName = normalizeCodeName(req.body.code_name || existing.code_name);
    const packageIds = Array.isArray(req.body.package_ids)
      ? req.body.package_ids
      : parseIdList(existing.package_ids);
    const usageLimit = Number(req.body.usage_limit ?? existing.usage_limit);
    const expiryDate =
      req.body.expiry_date === null || req.body.expiry_date === ""
        ? null
        : String(req.body.expiry_date || existing.expiry_date || "").trim() || null;
    const targetAudience =
      req.body.target_audience === "new_users" ? "new_users" : "all_users";
    const active =
      req.body.active === false || Number(req.body.active) === 0 ? 0 : 1;

    const parsedPackageIds = packageIds.map((v) => Number(v)).filter((n) => n > 0);
    if (!parsedPackageIds.length) {
      return res.status(400).json({
        status: false,
        message: "Please select at least one package to assign."
      });
    }
    if (!Number.isFinite(usageLimit) || usageLimit < 1) {
      return res.status(400).json({ status: false, message: "Usage limit must be at least 1." });
    }
    if (usageLimit < Number(existing.redeemed_count)) {
      return res.status(400).json({
        status: false,
        message: "Usage limit cannot be less than the number already redeemed."
      });
    }
    const existingExpiryYmd = existing.expiry_date
      ? String(existing.expiry_date).slice(0, 10)
      : null;
    const nextExpiryYmd = expiryDate ? String(expiryDate).slice(0, 10) : null;
    if (
      isExpiryInPast(expiryDate) &&
      nextExpiryYmd !== existingExpiryYmd
    ) {
      return res.status(400).json({ status: false, message: "Expiry date cannot be in the past." });
    }

    if (await adminRedemptionModel.getByCodeName(codeName, id)) {
      return res.status(400).json({
        status: false,
        message: "This code already exists. Please choose a different name."
      });
    }

    await adminRedemptionModel.updateCode(id, {
      code_name: codeName,
      package_ids: joinIdList(parsedPackageIds),
      usage_limit: usageLimit,
      expiry_date: expiryDate,
      target_audience: targetAudience,
      active
    });

    return res.json({ status: true, message: "Redemption code updated successfully." });
  } catch (err) {
    console.error("updateRedemptionCode:", err);
    return res.status(500).json({ status: false, message: "Could not update redemption code." });
  }
};

exports.deactivateRedemptionCode = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Code id is required." });

    const ok = await adminRedemptionModel.updateActive(id, 0);
    if (!ok) return res.status(404).json({ status: false, message: "Redemption code not found." });

    return res.json({ status: true, message: "Redemption code deactivated successfully." });
  } catch (err) {
    console.error("deactivateRedemptionCode:", err);
    return res.status(500).json({ status: false, message: "Could not deactivate redemption code." });
  }
};

exports.activateRedemptionCode = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Code id is required." });

    const ok = await adminRedemptionModel.updateActive(id, 1);
    if (!ok) return res.status(404).json({ status: false, message: "Redemption code not found." });

    return res.json({ status: true, message: "Redemption code activated successfully." });
  } catch (err) {
    console.error("activateRedemptionCode:", err);
    return res.status(500).json({ status: false, message: "Could not activate redemption code." });
  }
};

exports.listRedemptionLogs = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { start = "0", length = "25" } = req.query;
    if (!id) return res.status(400).json({ status: false, message: "Code id is required." });

    const code = await adminRedemptionModel.getById(id);
    if (!code) return res.status(404).json({ status: false, message: "Redemption code not found." });

    const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
    const parsedLength = Math.min(Math.max(parseInt(length, 10) || 25, 1), 100);

    const [total, rows] = await Promise.all([
      adminRedemptionModel.countRedemptions(id),
      adminRedemptionModel.listRedemptions(id, { limit: parsedLength, offset: parsedStart })
    ]);

    const data = await Promise.all(
      rows.map(async (row) => {
        const names = await resolvePackageNames(row.packages_granted);
        return {
          id: row.id,
          user_id: row.user_id,
          user_name: `${String(row.first_name || "").trim()} ${String(row.last_name || "").trim()}`.trim() || "—",
          email: row.email || "—",
          redeemed_at: row.redeemed_at,
          package_names: names
        };
      })
    );

    return res.json({
      status: true,
      data: {
        code: {
          id: code.id,
          code_name: code.code_name,
          status: deriveStatus(code)
        },
        redemptions: data
      },
      meta: {
        recordsTotal: total,
        recordsFiltered: total,
        start: parsedStart,
        length: parsedLength
      }
    });
  } catch (err) {
    console.error("listRedemptionLogs:", err);
    return res.status(500).json({ status: false, message: "Could not load redemptions." });
  }
};
