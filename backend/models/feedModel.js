const pool = require("../config/db").promise();
const { cleanSlug } = require("./distributionModel");

function urlLookupVariants(pathSegment) {
  const raw = String(pathSegment || "").trim();
  if (!raw) return [];
  const slug = cleanSlug(raw);
  const lower = raw.toLowerCase();
  return [...new Set([raw, slug, lower].filter(Boolean))];
}

exports.getVendorByUrlSegment = async (pathSegment) => {
  const variants = urlLookupVariants(pathSegment);
  if (!variants.length) return { vendor: null, vendorRss: null };

  const placeholders = variants.map(() => "?").join(", ");

  const [vendorRows] = await pool.query(
    `SELECT * FROM master_distribution
     WHERE url IN (${placeholders}) OR dname IN (${placeholders})
     LIMIT 1`,
    [...variants, ...variants]
  );

  const [rssRows] = await pool.query(
    `SELECT * FROM master_vendor_rss
     WHERE url IN (${placeholders})
        OR vendor_name IN (${placeholders})
     LIMIT 1`,
    [...variants, ...variants]
  );

  return {
    vendor: vendorRows[0] || null,
    vendorRss: rssRows[0] || null
  };
};

exports.getActiveCompanies = async () => {
  const [rows] = await pool.query("SELECT * FROM master_company WHERE active = 1");
  return rows || [];
};

exports.getActivePackages = async () => {
  const [rows] = await pool.query("SELECT id, dis_id FROM master_package WHERE active = 1");
  return rows || [];
};

exports.getPressReleasesForPackageIds = async (packageIds) => {
  if (!packageIds?.length) return [];
  const placeholders = packageIds.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT *
     FROM master_press_release
     WHERE p_id IN (${placeholders})
       AND active = 1
       AND status = 2
     ORDER BY publish_date_orignal DESC`,
    packageIds
  );
  return rows || [];
};

exports.resolvePackageIdsForVendor = async (vendorId) => {
  const packages = await exports.getActivePackages();
  const vid = Number(vendorId);
  if (!vid) return [];

  const planIds = [];
  for (const pkg of packages) {
    let disIds = [];
    try {
      const parsed = JSON.parse(pkg.dis_id || "[]");
      disIds = Array.isArray(parsed) ? parsed : [];
    } catch {
      disIds = [];
    }
    if (disIds.some((d) => Number(d) === vid)) {
      planIds.push(pkg.id);
    }
  }
  return planIds;
};
