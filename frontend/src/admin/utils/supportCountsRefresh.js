export const SUPPORT_COUNTS_REFRESH = "support-counts-refresh";

export function refreshSupportCounts() {
  window.dispatchEvent(new CustomEvent(SUPPORT_COUNTS_REFRESH));
}
