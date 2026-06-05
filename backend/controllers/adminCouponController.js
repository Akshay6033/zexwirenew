const adminCouponModel = require("../models/adminCouponModel");
const { getCachedPackages, getCachedAllUserIds } = require("../utils/couponLookupCache");

const PACKAGE_PREVIEW_LIMIT = 5;

function parseIdList(csv) {
  if (!csv) return [];
  return String(csv)
    .split(",")
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function joinIdList(ids) {
  const unique = [...new Set((ids || []).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0))];
  return unique.join(",");
}

function collectPackageIdsFromRows(rows) {
  const set = new Set();
  for (const row of rows) {
    parseIdList(row.package).forEach((id) => set.add(id));
  }
  return [...set];
}

function formatUserLabel(u) {
  return `${String(u.first_name || "").trim()} ${String(u.last_name || "").trim()}`.trim();
}

function formatDiscountLabel(row) {
  if (!row) return "";
  const value = row.c_value ?? "";
  return Number(row.c_discount) === 1 ? `${value} %` : `${value} USD`;
}

async function buildPackageNameMap(packageIds) {
  if (!packageIds.length) return new Map();
  const rows = await adminCouponModel.getPackagesByIds(packageIds);
  return new Map(rows.map((r) => [Number(r.id), r.pname]));
}

function resolvePackagePreview(packageCsv, packageMap) {
  const ids = parseIdList(packageCsv);
  const names = ids.map((id) => packageMap.get(id)).filter(Boolean);
  return {
    package_names: names.slice(0, PACKAGE_PREVIEW_LIMIT),
    package_count: names.length,
    package_more_count: Math.max(0, names.length - PACKAGE_PREVIEW_LIMIT)
  };
}

async function enrichOfferDetail(offer) {
  const packageIds = parseIdList(offer.package);
  const userIds = parseIdList(offer.user);
  const [packageRows, userRows] = await Promise.all([
    packageIds.length ? adminCouponModel.getPackagesByIds(packageIds) : [],
    userIds.length ? adminCouponModel.searchUsers({ ids: userIds }) : []
  ]);
  const packageMap = new Map(packageRows.map((r) => [Number(r.id), r.pname]));
  const userMap = new Map(userRows.map((u) => [Number(u.id), formatUserLabel(u)]));

  return {
    ...offer,
    discount_label: formatDiscountLabel(offer),
    package_names: packageIds.map((id) => packageMap.get(id)).filter(Boolean),
    user_names: userIds.map((id) => userMap.get(id)).filter(Boolean),
    package_ids: packageIds,
    user_ids: userIds
  };
}

exports.getCoupons = async (req, res) => {
  try {
    const { start = "0", length = "10", search = "", sortBy = "id", sortOrder = "desc" } = req.query;
    const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
    const parsedLength = Math.min(Math.max(parseInt(length, 10) || 10, 1), 100);
    const searchTerm = String(search || "").trim();

    const [counts, rows] = await Promise.all([
      adminCouponModel.countOffers(searchTerm),
      adminCouponModel.listOffers({
        search: searchTerm,
        sortBy,
        sortOrder,
        limit: parsedLength,
        offset: parsedStart
      })
    ]);

    const packageIds = collectPackageIdsFromRows(rows);
    const packageMap = await buildPackageNameMap(packageIds);

    const data = rows.map((row) => {
      const preview = resolvePackagePreview(row.package, packageMap);
      return {
        id: row.id,
        c_name: row.c_name,
        c_code: row.c_code,
        c_discount: row.c_discount,
        c_value: row.c_value,
        active: row.active,
        discount_label: formatDiscountLabel(row),
        package_names: preview.package_names,
        package_count: preview.package_count,
        package_more_count: preview.package_more_count
      };
    });

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
    console.error("getCoupons:", err);
    return res.status(500).json({ status: false, message: "Could not fetch coupons." });
  }
};

exports.getCouponMeta = async (req, res) => {
  try {
    const packages = await getCachedPackages();
    return res.json({
      status: true,
      data: {
        packages: packages.map((p) => ({ id: p.id, label: p.pname }))
      }
    });
  } catch (err) {
    console.error("getCouponMeta:", err);
    return res.status(500).json({ status: false, message: "Could not load coupon form data." });
  }
};

exports.getCouponMetaUsers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const limit = req.query.limit || 40;
    const ids = String(req.query.ids || "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((n) => n > 0);

    const rows = await adminCouponModel.searchUsers({
      search: ids.length ? "" : search,
      limit,
      ids
    });

    return res.json({
      status: true,
      data: rows.map((u) => ({
        id: u.id,
        label: formatUserLabel(u)
      }))
    });
  } catch (err) {
    console.error("getCouponMetaUsers:", err);
    return res.status(500).json({ status: false, message: "Could not load users." });
  }
};

exports.getCouponMetaAllUserIds = async (req, res) => {
  try {
    const ids = await getCachedAllUserIds();
    return res.json({ status: true, data: { ids } });
  } catch (err) {
    console.error("getCouponMetaAllUserIds:", err);
    return res.status(500).json({ status: false, message: "Could not load user ids." });
  }
};

const APPLICABLE_USER_PREVIEW = 100;

exports.getCouponApplicable = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Coupon id is required." });

    const offer = await adminCouponModel.getOfferById(id);
    if (!offer) return res.status(404).json({ status: false, message: "Coupon not found." });

    const packageIds = parseIdList(offer.package);
    const userIds = parseIdList(offer.user);
    const previewUserIds =
      userIds.length > APPLICABLE_USER_PREVIEW ? userIds.slice(0, APPLICABLE_USER_PREVIEW) : userIds;

    const [packageRows, userRows] = await Promise.all([
      packageIds.length ? adminCouponModel.getPackagesByIds(packageIds) : [],
      previewUserIds.length ? adminCouponModel.searchUsers({ ids: previewUserIds }) : []
    ]);

    const packageMap = new Map(packageRows.map((r) => [Number(r.id), r.pname]));
    const packageNames = packageIds.map((pid) => packageMap.get(pid)).filter(Boolean);
    const userNames = userRows.map((u) => formatUserLabel(u)).filter(Boolean);

    return res.json({
      status: true,
      data: {
        c_name: offer.c_name,
        c_code: offer.c_code,
        discount_label: formatDiscountLabel(offer),
        package_names: packageNames,
        package_count: packageNames.length,
        user_names: userNames,
        user_count: userIds.length,
        user_more_count: Math.max(0, userIds.length - userNames.length)
      }
    });
  } catch (err) {
    console.error("getCouponApplicable:", err);
    return res.status(500).json({ status: false, message: "Could not load coupon details." });
  }
};

exports.getCouponHistory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Coupon id is required." });

    const offer = await adminCouponModel.getOfferById(id);
    if (!offer) return res.status(404).json({ status: false, message: "Coupon not found." });

    const packageIds = parseIdList(offer.package);
    const userIds = parseIdList(offer.user);
    const packageRows = packageIds.length ? await adminCouponModel.getPackagesByIds(packageIds) : [];
    const packageMap = new Map(packageRows.map((r) => [Number(r.id), r.pname]));
    const packageNames = packageIds.map((pid) => packageMap.get(pid)).filter(Boolean);

    return res.json({
      status: true,
      data: {
        id: offer.id,
        c_name: offer.c_name,
        c_code: offer.c_code,
        discount_label: formatDiscountLabel(offer),
        c_limit: offer.c_limit,
        c_limit_use: offer.c_limit_use,
        c_limit_pending: offer.c_limit_pending,
        start_date: offer.start_date,
        end_date: offer.end_date,
        package_names: packageNames,
        package_count: packageNames.length,
        user_count: userIds.length
      }
    });
  } catch (err) {
    console.error("getCouponHistory:", err);
    return res.status(500).json({ status: false, message: "Could not load coupon history." });
  }
};

exports.getCouponHistoryUsers = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { start = "0", length = "50", search = "" } = req.query;
    if (!id) return res.status(400).json({ status: false, message: "Coupon id is required." });

    const offer = await adminCouponModel.getOfferById(id);
    if (!offer) return res.status(404).json({ status: false, message: "Coupon not found." });

    const userIds = parseIdList(offer.user);
    const searchTerm = String(search || "").trim();
    const parsedStart = Math.max(parseInt(start, 10) || 0, 0);
    const parsedLength = Math.min(Math.max(parseInt(length, 10) || 50, 1), 100);

    if (userIds.length > 500 && searchTerm.length > 0 && searchTerm.length < 3) {
      return res.json({
        status: true,
        data: [],
        meta: {
          recordsTotal: userIds.length,
          recordsFiltered: 0,
          start: parsedStart,
          length: parsedLength,
          search: searchTerm,
          searchMinLength: 3
        }
      });
    }

    const result = await adminCouponModel.listUsersByIdsPaginated(userIds, {
      search: searchTerm,
      limit: parsedLength,
      offset: parsedStart
    });

    const data = (result.rows || []).map((u) => ({
      id: u.id,
      label: formatUserLabel(u)
    }));

    return res.json({
      status: true,
      data,
      meta: {
        recordsTotal: result.recordsTotal,
        recordsFiltered: result.recordsFiltered,
        start: parsedStart,
        length: parsedLength,
        search: searchTerm
      }
    });
  } catch (err) {
    console.error("getCouponHistoryUsers:", err);
    return res.status(500).json({ status: false, message: "Could not load coupon users." });
  }
};

exports.getCouponById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Coupon id is required." });

    const offer = await adminCouponModel.getOfferById(id);
    if (!offer) return res.status(404).json({ status: false, message: "Coupon not found." });

    const data = await enrichOfferDetail(offer);
    return res.json({ status: true, data });
  } catch (err) {
    console.error("getCouponById:", err);
    return res.status(500).json({ status: false, message: "Could not fetch coupon." });
  }
};

exports.checkCouponAvailability = async (req, res) => {
  try {
    const code = String(req.body.code || "").trim();
    const name = String(req.body.name || "").trim();
    const excludeId = req.body.exclude_id ? Number(req.body.exclude_id) : null;

    if (code) {
      const codeTaken = await adminCouponModel.codeExists(code, excludeId);
      if (codeTaken) return res.json({ status: true, code: 1, name: 0 });
    }
    if (name) {
      const nameTaken = await adminCouponModel.nameExists(name, excludeId);
      if (nameTaken) return res.json({ status: true, code: 0, name: 2 });
    }
    return res.json({ status: true, code: 0, name: 0 });
  } catch (err) {
    console.error("checkCouponAvailability:", err);
    return res.status(500).json({ status: false, message: "Could not verify coupon availability." });
  }
};

async function resolvePackageUserFields(body) {
  let packageIds = Array.isArray(body.package) ? body.package : body.package ? [body.package] : [];
  let userIds = Array.isArray(body.user) ? body.user : body.user ? [body.user] : [];

  packageIds = packageIds.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
  userIds = userIds.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);

  if (!packageIds.length) {
    packageIds = (await getCachedPackages()).map((p) => Number(p.id));
  }
  if (!userIds.length) {
    userIds = await getCachedAllUserIds();
  }

  return {
    package: joinIdList(packageIds),
    user: joinIdList(userIds)
  };
}

exports.createCoupon = async (req, res) => {
  try {
    const cName = String(req.body.c_name || "").trim();
    const cCode = String(req.body.c_code || "").trim();
    const cDiscount = Number(req.body.c_discount);
    const cValue = String(req.body.c_value || "").trim();
    const cLimit = Number(req.body.c_limit);
    const startDate = String(req.body.start_date || "").trim();
    const endDate = String(req.body.end_date || "").trim();

    if (!cName) return res.status(400).json({ status: false, message: "Coupon name is required." });
    if (!cCode) return res.status(400).json({ status: false, message: "Coupon code is required." });
    if (![1, 2].includes(cDiscount)) {
      return res.status(400).json({ status: false, message: "Select discount type (% or Flat USD)." });
    }
    if (!cValue) return res.status(400).json({ status: false, message: "Discount value is required." });
    if (!Number.isFinite(cLimit) || cLimit < 1) {
      return res.status(400).json({ status: false, message: "Enter number of times the coupon can be used." });
    }
    if (!startDate) return res.status(400).json({ status: false, message: "Start date is required." });
    if (!endDate) return res.status(400).json({ status: false, message: "End date is required." });

    if (await adminCouponModel.codeExists(cCode)) {
      return res.status(400).json({ status: false, message: "Coupon code already exist" });
    }
    if (await adminCouponModel.nameExists(cName)) {
      return res.status(400).json({ status: false, message: "Coupon name already exist" });
    }

    const { package: packageCsv, user: userCsv } = await resolvePackageUserFields(req.body);

    const offer = {
      c_name: cName,
      c_code: cCode,
      c_discount: cDiscount,
      c_value: cValue,
      c_limit: cLimit,
      c_limit_use: 0,
      c_limit_pending: cLimit,
      start_date: startDate,
      end_date: endDate,
      package: packageCsv,
      user: userCsv,
      active: 1
    };

    await adminCouponModel.insertOffer(offer, { c_limit: cLimit });
    return res.json({ status: true, message: "Coupon added successfully" });
  } catch (err) {
    console.error("createCoupon:", err);
    return res.status(500).json({ status: false, message: "Could not create coupon." });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Coupon id is required." });

    const existing = await adminCouponModel.getOfferById(id);
    if (!existing) return res.status(404).json({ status: false, message: "Coupon not found." });

    const cName = String(req.body.c_name || "").trim();
    const cCode = String(req.body.c_code || "").trim();
    const cDiscount = Number(req.body.c_discount);
    const cValue = String(req.body.c_value || "").trim();
    const cLimit = Number(req.body.c_limit);
    const cLimitPending = Number(req.body.c_limit_pending);
    const startDate = String(req.body.start_date || "").trim();
    const endDate = String(req.body.end_date || "").trim();

    if (!cName || !cCode || !cValue || !startDate || !endDate) {
      return res.status(400).json({ status: false, message: "Please fill all required fields." });
    }
    if (![1, 2].includes(cDiscount)) {
      return res.status(400).json({ status: false, message: "Select discount type." });
    }
    if (!Number.isFinite(cLimit) || cLimit < 0) {
      return res.status(400).json({ status: false, message: "Invalid coupon usage limit." });
    }

    const { package: packageCsv, user: userCsv } = await resolvePackageUserFields(req.body);
    const pendingBase = Number.isFinite(cLimitPending) ? cLimitPending : Number(existing.c_limit_pending) || 0;

    const offer = {
      c_name: cName,
      c_code: cCode,
      c_discount: cDiscount,
      c_value: cValue,
      c_limit: cLimit,
      c_limit_pending: pendingBase + cLimit,
      start_date: startDate,
      end_date: endDate,
      package: packageCsv,
      user: userCsv
    };

    const ok = await adminCouponModel.updateOffer(id, offer, { c_limit: cLimit });
    if (!ok) return res.status(404).json({ status: false, message: "Coupon not found." });
    return res.json({ status: true, message: "Coupon updated successfully" });
  } catch (err) {
    console.error("updateCoupon:", err);
    return res.status(500).json({ status: false, message: "Could not update coupon." });
  }
};

exports.updateCouponStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const nextActive = Number(req.body.active) === 1 ? 1 : 0;
    if (!id) return res.status(400).json({ status: false, message: "Coupon id is required." });

    const ok = await adminCouponModel.updateOfferStatus(id, nextActive);
    if (!ok) return res.status(404).json({ status: false, message: "Coupon not found." });

    return res.json({
      status: true,
      message: nextActive ? "Coupon activated Successfully" : "Coupon Deactived Successfully"
    });
  } catch (err) {
    console.error("updateCouponStatus:", err);
    return res.status(500).json({ status: false, message: "Could not update coupon status." });
  }
};

exports.deleteCouponPermanently = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: false, message: "Coupon id is required." });

    const ok = await adminCouponModel.deleteOfferPermanently(id);
    if (!ok) return res.status(404).json({ status: false, message: "Coupon not found." });

    return res.json({ status: true, message: "Coupon deleted permanently" });
  } catch (err) {
    console.error("deleteCouponPermanently:", err);
    return res.status(500).json({ status: false, message: "Could not delete coupon." });
  }
};
