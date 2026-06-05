/** API base for axios (includes /api suffix). */
export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || "/api";
}

/** Backend origin without /api (for uploads, RSS feeds, CSV links). */
export function getApiOrigin() {
  const base = getApiBaseUrl();
  if (base.startsWith("http")) {
    return base.replace(/\/api\/?$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:5000";
}

export function getUploadsBaseUrl() {
  return import.meta.env.VITE_UPLOADS_URL || `${getApiOrigin()}/uploads`;
}
