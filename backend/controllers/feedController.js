const feedModel = require("../models/feedModel");

const NEWSROOM_BASE = (process.env.NEWSROOM_BASE_URL || "https://pr.zexprwire.com").replace(/\/$/, "");
const RESERVED_PATHS = new Set(["api", "uploads", "favicon.ico"]);

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function channelWebsite(website) {
  const w = String(website || "").trim();
  if (!w || w === "https://" || w === "http://") return NEWSROOM_BASE;
  if (/^https?:\/\//i.test(w)) return w;
  return `https://${w}`;
}

function itemLink(item) {
  if (Number(item.status) === 2 && item.url) {
    return `${NEWSROOM_BASE}/newsroom/${item.url}`;
  }
  return `${NEWSROOM_BASE}/`;
}

function buildMediaContactHtml(item, companies) {
  if (Number(item.show_contact_details) !== 1 || !item.company) return "";
  const company = companies.find((c) => Number(c.id) === Number(item.company));
  if (!company) return "";

  const cname = escapeXml(company.cname);
  const email = escapeXml(company.email);
  const website = escapeXml(company.website);

  return `
                        <div style="background:gainsboro;border:1px solid black;padding: 10px;border-color:silver;border-radius:5px;">
                            <h5>Media Contact</h5>
                            <p>
                                <span>Company Name:-${cname}</span>
                            </p>
                            <p>
                                <span>Email:-<a rel="alternate" type="application/rss+xml" href='mailto:${email}' data-wpel-link="external" target="_blank" rel="follow external noopener noreferrer">${email}</a></span>
                            </p>
                            <p>
                                <span>Company Website:-<a rel="alternate" type="application/rss+xml" href='${website}' data-wpel-link="external" target="_blank" rel="follow external noopener noreferrer">${website}</a></span>
                            </p>
                        </div>`;
}

function buildRssXml({ vendor, pressReleases, companies }) {
  const channelTitle = vendor?.dname ? escapeXml(vendor.dname) : "Press Release Feed";
  const channelLink = escapeXml(channelWebsite(vendor?.website));

  let itemsXml = "";
  for (const pr of pressReleases || []) {
    if (!pr?.title) continue;
    const title = escapeXml(pr.title);
    const link = escapeXml(itemLink(pr));
    const body = pr.description || "";
    const contact = buildMediaContactHtml(pr, companies);
    itemsXml += `
                <item>
                    <title>${title}</title>
                    <link>${link}</link>
                    <description><![CDATA[${body}${contact}]]></description>
                </item>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>${channelTitle}</title>
        <link>${channelLink}</link>${itemsXml}
    </channel>
</rss>`;
}

exports.rss = async (req, res) => {
  const pathUrl = String(req.params.url || "").trim();
  if (!pathUrl || RESERVED_PATHS.has(pathUrl.toLowerCase())) {
    return res.status(404).send("Not found");
  }

  try {
    const { vendor, vendorRss } = await feedModel.getVendorByUrlSegment(pathUrl);
    if (!vendor && !vendorRss) {
      return res.status(404).send("Vendor feed not found");
    }

    const vendorId = vendorRss?.vendor_id || vendor?.id;
    const companies = await feedModel.getActiveCompanies();
    let pressReleases = [];

    if (vendorId) {
      const packageIds = await feedModel.resolvePackageIdsForVendor(vendorId);
      if (packageIds.length) {
        pressReleases = await feedModel.getPressReleasesForPackageIds(packageIds);
      }
    }

    const xml = buildRssXml({
      vendor: vendor || { dname: vendorRss?.vendor_name, website: "" },
      pressReleases,
      companies
    });

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    return res.send(xml);
  } catch (err) {
    console.error("feedController.rss", err);
    return res.status(500).send("Could not generate feed");
  }
};
