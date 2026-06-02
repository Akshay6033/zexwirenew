const STORAGE_KEY = "editorial_skip_mark_tab";

/** After saving a status change, skip mark-viewed once for this tab. */
export function setEditorialSkipMarkViewed(tab) {
  if (!tab) return;
  sessionStorage.setItem(STORAGE_KEY, String(tab).toLowerCase());
}

export function consumeEditorialSkipMarkViewed(tab) {
  const t = String(tab || "").toLowerCase();
  const skip = sessionStorage.getItem(STORAGE_KEY);
  if (skip && skip === t) {
    sessionStorage.removeItem(STORAGE_KEY);
    return true;
  }
  return false;
}
