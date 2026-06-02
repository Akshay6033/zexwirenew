/**
 * Sidebar badge rules (legacy):
 * - New PR or status change → that status count +1 (view_flag=1 in DB)
 * - Admin opens that status tab → count 0 (mark-viewed API)
 */
export const EDITORIAL_COUNTS_REFRESH = "editorial-counts-refresh";

export function refreshEditorialCounts() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EDITORIAL_COUNTS_REFRESH));
  }
}
