const adminCouponModel = require("../models/adminCouponModel");

const TTL_MS = 5 * 60 * 1000;
let packagesCache = null;
let packagesCacheAt = 0;
let allUserIdsCache = null;
let allUserIdsCacheAt = 0;

async function getCachedPackages() {
  if (packagesCache && Date.now() - packagesCacheAt < TTL_MS) {
    return packagesCache;
  }
  packagesCache = await adminCouponModel.getActivePackages();
  packagesCacheAt = Date.now();
  return packagesCache;
}

async function getCachedAllUserIds() {
  if (allUserIdsCache && Date.now() - allUserIdsCacheAt < TTL_MS) {
    return allUserIdsCache;
  }
  allUserIdsCache = await adminCouponModel.getAllActiveUserIds();
  allUserIdsCacheAt = Date.now();
  return allUserIdsCache;
}

function invalidateCouponCaches() {
  packagesCache = null;
  packagesCacheAt = 0;
  allUserIdsCache = null;
  allUserIdsCacheAt = 0;
}

module.exports = { getCachedPackages, getCachedAllUserIds, invalidateCouponCaches };
