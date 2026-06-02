const publicNewsroomModel = require("../models/publicNewsroomModel");
const publicPricingModel = require("../models/publicPricingModel");
const newsletterModel = require("../models/newsletterModel");
const { validateNewsletterRequest } = require("../utils/newsletterGuard");

const PER_PAGE_DEFAULT = 10;
const PER_PAGE_MAX = 50;

function buildPagination(page, perPage, total) {
  const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const maxButtons = 10;
  let start = Math.max(1, safePage - 4);
  let end = Math.min(totalPages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);
  const pages = [];
  for (let i = start; i <= end; i += 1) pages.push(i);
  return {
    page: safePage,
    perPage,
    total,
    totalPages,
    pages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages
  };
}

exports.getNewsroomFeed = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const perPage = Math.min(
      Math.max(parseInt(req.query.perPage, 10) || PER_PAGE_DEFAULT, 1),
      PER_PAGE_MAX
    );

    const bundle = await publicNewsroomModel.getFeedBundle(page, perPage);

    res.set("Cache-Control", "public, max-age=30");
    return res.json({
      status: true,
      data: {
        items: bundle.items,
        topPr: bundle.topPr,
        pagination: buildPagination(bundle.page, perPage, bundle.total),
        pageAdjusted: bundle.pageAdjusted,
        requestedPage: bundle.requestedPage
      }
    });
  } catch (err) {
    console.error("getNewsroomFeed", err);
    return res.status(500).json({ status: false, message: "Could not load newsroom." });
  }
};

exports.getNewsroomArticle = async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!slug) return res.status(400).json({ status: false, message: "Invalid article." });

  try {
    const bundle = await publicNewsroomModel.getArticleBundle(slug);
    if (!bundle) {
      return res.status(404).json({ status: false, message: "Article not found." });
    }

    const { article, company, related } = bundle;

    res.set("Cache-Control", "public, max-age=60");
    return res.json({
      status: true,
      data: {
        article: {
          id: article.id,
          title: article.title,
          url: article.url,
          description: article.description,
          publish_date: article.publish_date,
          show_contact_details: Number(article.show_contact_details) === 1
        },
        company,
        related
      }
    });
  } catch (err) {
    console.error("getNewsroomArticle", err);
    return res.status(500).json({ status: false, message: "Could not load article." });
  }
};

exports.getPricing = async (req, res) => {
  const section = String(req.query.section || "").trim().toLowerCase();
  const allowed = new Set(["", "normal", "reseller", "crypto", "indian", "whitelabel"]);
  if (!allowed.has(section)) {
    return res.status(400).json({ status: false, message: "Invalid pricing section." });
  }

  try {
    const bundle = await publicPricingModel.getPricingBundle({
      section: section && section !== "normal" ? section : section === "normal" ? "normal" : ""
    });
    res.set("Cache-Control", "public, max-age=60");
    return res.json({ status: true, data: bundle });
  } catch (err) {
    console.error("getPricing", err);
    return res.status(500).json({ status: false, message: "Could not load pricing packages." });
  }
};

exports.subscribeNewsletter = async (req, res) => {
  const guardError = await validateNewsletterRequest(req);
  if (guardError) {
    return res.status(guardError.status).json({ status: false, message: guardError.message });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();

  newsletterModel.findByEmail(email, (findErr, rows) => {
    if (findErr) {
      console.error("subscribeNewsletter find", findErr);
      return res.status(500).json({ status: false, message: "Could not subscribe." });
    }
    if (rows?.length) {
      return res.status(409).json({ status: false, message: "You have already Subscribed" });
    }

    newsletterModel.subscribeEmail(email, (insertErr) => {
      if (insertErr) {
        console.error("subscribeNewsletter insert", insertErr);
        return res.status(500).json({ status: false, message: "Could not subscribe." });
      }
      return res.json({ status: true, message: "Thank you for subscribing to our newsletter." });
    });
  });
};
