const feedCache = new Map();
const articleCache = new Map();
const TTL_MS = 60_000;

function fresh(entry) {
  return entry && Date.now() - entry.at < TTL_MS;
}

export function getCachedFeed(page) {
  const entry = feedCache.get(page);
  return fresh(entry) ? entry.data : null;
}

export function setCachedFeed(page, data) {
  feedCache.set(page, { at: Date.now(), data });
}

export function getCachedArticle(slug) {
  const entry = articleCache.get(slug);
  return fresh(entry) ? entry.data : null;
}

export function setCachedArticle(slug, data) {
  articleCache.set(slug, { at: Date.now(), data });
}
