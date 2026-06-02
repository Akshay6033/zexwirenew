const pool = require("../config/db").promise();

const SECTION_WHERE = {
  normal: "p.reseller_normal = 0",
  reseller: "p.reseller_normal = 1",
  crypto: "p.reseller_normal = 2",
  indian: "p.reseller_normal = 3",
  whitelabel: "p.reseller_normal = 4"
};

const CATEGORY_LABELS = {
  online: "Online",
  offline: "Offline",
  crypto: "Crypto",
  indian: "Indian PR",
  reseller: "Reseller",
  whitelabel: "White Label"
};

function mapCategoryKey(row) {
  const resellerNormal = Number(row.reseller_normal) || 0;
  if (resellerNormal === 1) return "reseller";
  if (resellerNormal === 2) return "crypto";
  if (resellerNormal === 3) return "indian";
  if (resellerNormal === 4) return "whitelabel";
  if (Number(row.package_type) === 2) return "offline";
  return "online";
}

function mapBadgeLabel(badge) {
  const code = Number(badge) || 0;
  if (code === 1) return "Most Popular";
  if (code === 2) return "Best Value";
  if (code === 3) return "New";
  return null;
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

exports.getPricingBundle = async ({ section } = {}) => {
  const sectionKey = String(section || "").trim().toLowerCase();
  const scopeClause = SECTION_WHERE[sectionKey] || "";
  const whereScope = scopeClause ? `AND ${scopeClause}` : "";

  let packageRows;
  try {
    [packageRows] = await queryWithRetry(
      `
      SELECT
        p.id,
        p.pname,
        p.price,
        p.badge,
        p.reseller_normal,
        p.package_type,
        p.n_press_rel,
        p.package_image,
        COALESCE(seq.sort_order, 999999) AS sort_order
      FROM master_package p
      LEFT JOIN (
        SELECT package_id, MIN(sort_order) AS sort_order
        FROM master_package_pricing_sequence
        GROUP BY package_id
      ) seq ON seq.package_id = p.id
      WHERE p.active = 1
        AND p.package_type = 1
        ${whereScope}
      ORDER BY p.reseller_normal ASC, sort_order ASC, p.pname ASC
      `
    );
  } catch (err) {
    // Graceful fallback when sequencer table/query is unavailable or connection is unstable.
    [packageRows] = await queryWithRetry(
      `
      SELECT
        p.id,
        p.pname,
        p.price,
        p.badge,
        p.reseller_normal,
        p.package_type,
        p.n_press_rel,
        p.package_image,
        999999 AS sort_order
      FROM master_package p
      WHERE p.active = 1
        AND p.package_type = 1
        ${whereScope}
      ORDER BY p.reseller_normal ASC, p.pname ASC
      `
    );
  }

  let bannerRow = null;
  try {
    const [bannerRows] = await queryWithRetry(
      "SELECT banner_image, banner_alt, banner_link FROM pricing_page_settings ORDER BY id ASC LIMIT 1"
    );
    bannerRow = bannerRows?.[0] || null;
  } catch {
    bannerRow = null;
  }

  const packages = packageRows || [];
  const ids = packages.map((row) => row.id);

  let descriptionRows = [];
  if (ids.length) {
    const [desRows] = await queryWithRetry(
      `
      SELECT package_id, des_option, des
      FROM master_package_des
      WHERE package_id IN (?)
      ORDER BY p_des_id ASC
      `,
      [ids]
    );
    descriptionRows = desRows || [];
  }

  const descriptionsByPackage = new Map();
  for (const row of descriptionRows) {
    const list = descriptionsByPackage.get(row.package_id) || [];
    list.push({
      des: row.des,
      included: Number(row.des_option) === 1
    });
    descriptionsByPackage.set(row.package_id, list);
  }

  const mapped = packages.map((row) => {
    const categoryKey = mapCategoryKey(row);
    return {
      id: row.id,
      pname: row.pname,
      price: row.price,
      badge: Number(row.badge) || 0,
      badgeLabel: mapBadgeLabel(row.badge),
      n_press_rel: row.n_press_rel,
      package_image: row.package_image || null,
      categoryKey,
      categoryLabel: CATEGORY_LABELS[categoryKey] || "Online",
      descriptions: descriptionsByPackage.get(row.id) || [],
      sort_order: Number(row.sort_order) || 999999
    };
  });

  const categoryCounts = {};
  for (const pkg of mapped) {
    categoryCounts[pkg.categoryKey] = (categoryCounts[pkg.categoryKey] || 0) + 1;
  }

  const categories = Object.keys(CATEGORY_LABELS).filter((key) => categoryCounts[key] > 0);

  const banner = bannerRow;

  return {
    packages: mapped,
    categories,
    banner: banner
      ? {
          image: banner.banner_image || null,
          alt: banner.banner_alt || "",
          link: banner.banner_link || null
        }
      : null
  };
};
