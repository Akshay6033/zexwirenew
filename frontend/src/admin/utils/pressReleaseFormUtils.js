/** Extract image filenames from HTML body (legacy imageNames JSON). */
export function extractImageNamesFromHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const names = [];
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    const name = src.substring(src.lastIndexOf("/") + 1);
    if (name) names.push(name);
  });
  if (!names.length) return "";
  return JSON.stringify(names);
}

export function legacyImagesDataUrl(filename) {
  const base =
    import.meta.env.VITE_LEGACY_SITE_URL ||
    import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
    "https://pr.zexprwire.com";
  return `${String(base).replace(/\/$/, "")}/images_data/${encodeURIComponent(filename)}`;
}

/** Map DB date string to `datetime-local` input value. */
export function toDatetimeLocalValue(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const normalized = raw.replace(/\//g, "-").replace(" ", "T");
  const d = new Date(normalized.includes("T") ? normalized : `${normalized}`);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
