const pool = require("../config/db").promise();

const PUBLISHED_WHERE = "pr.active = 1 AND pr.status = 2";

/** Home feed: count + top PR, then list for the clamped page (handles page > last). */
exports.getFeedBundle = async (requestedPage, perPage) => {
  const requested = Math.max(parseInt(requestedPage, 10) || 1, 1);

  const [countRows, topPr] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM master_press_release pr WHERE ${PUBLISHED_WHERE}`),
    pool.query(
      `SELECT pr.id, pr.title, pr.url
       FROM master_press_release pr
       WHERE ${PUBLISHED_WHERE}
       ORDER BY pr.id DESC
       LIMIT 2`
    )
  ]);

  const total = Number(countRows[0]?.[0]?.total) || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
  const page = Math.min(requested, totalPages);
  const offset = (page - 1) * perPage;

  const [itemRows] = await pool.query(
    `SELECT pr.id, pr.title, pr.url, pr.publish_date_orignal AS publish_date
     FROM master_press_release pr
     WHERE ${PUBLISHED_WHERE}
     ORDER BY pr.publish_date_orignal DESC, pr.id DESC
     LIMIT ? OFFSET ?`,
    [perPage, offset]
  );

  return {
    total,
    items: itemRows || [],
    topPr: topPr[0] || [],
    page,
    requestedPage: requested,
    pageAdjusted: requested !== page
  };
};

/** Article detail: article + company + related in parallel (legacy data, no user/country loops). */
exports.getArticleBundle = async (url) => {
  const slug = String(url || "").trim();
  const [articleRows] = await pool.query(
    `SELECT
      pr.id,
      pr.title,
      pr.url,
      pr.description,
      pr.publish_date_orignal AS publish_date,
      pr.show_contact_details,
      pr.company AS company_id
     FROM master_press_release pr
     WHERE ${PUBLISHED_WHERE} AND pr.url = ?
     LIMIT 1`,
    [slug]
  );

  const row = articleRows[0];
  if (!row) return null;

  const companyId = row.company_id;
  const needCompany = Number(row.show_contact_details) === 1 && companyId;

  const relatedPromise = companyId
    ? pool.query(
        `SELECT pr.id, pr.title, pr.url
         FROM master_press_release pr
         WHERE ${PUBLISHED_WHERE}
           AND pr.company = ?
           AND pr.id <> ?
         ORDER BY pr.publish_date_orignal DESC, pr.id DESC
         LIMIT 15`,
        [companyId, row.id]
      )
    : Promise.resolve([[]]);

  const companyPromise = needCompany
    ? pool.query(
        `SELECT id, cname, mobile, email, website FROM master_company WHERE id = ? LIMIT 1`,
        [companyId]
      )
    : Promise.resolve([[]]);

  const [[relatedRows], [companyRows]] = await Promise.all([relatedPromise, companyPromise]);

  return {
    article: row,
    company: companyRows[0] || null,
    related: relatedRows || []
  };
};
