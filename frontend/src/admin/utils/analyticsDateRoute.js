const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(value) {
  if (!DATE_RE.test(String(value || ""))) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && toYmd(d) === value;
}

export function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultAnalyticsRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { start: toYmd(start), end: toYmd(end) };
}

/** Legacy: Admindashboard/overviewdashboard/2026-05-12/2026-05-18/month */
export function overviewDashboardPath(start, end, mode = "month") {
  return `/admindashboard/overviewdashboard/${start}/${end}/${mode}`;
}

export function analyticsOverviewPath(start, end, mode = "month") {
  return `/admindashboard/analytics/overview/${start}/${end}/${mode}`;
}

/** Legacy: Admindashboard/prdashboard/2026-05-13/2026-05-19/month */
export function prDashboardPath(start, end, mode = "month") {
  return `/admindashboard/prdashboard/${start}/${end}/${mode}`;
}

export function defaultPrRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return { start: toYmd(start), end: toYmd(end) };
}

/** Legacy: Admindashboard/userdashboard/2026-04-19/2026-05-19/month */
export function userDashboardPath(start, end, mode = "month") {
  return `/admindashboard/userdashboard/${start}/${end}/${mode}`;
}

export function analyticsUsersPath(start, end, mode = "month") {
  return `/admindashboard/analytics/users/${start}/${end}/${mode}`;
}

export function defaultUsersRange() {
  return defaultPrRange();
}

export const SALES_TABS = ["package", "customer", "payment"];

export function tabToIndex(tab) {
  const i = SALES_TABS.indexOf(tab);
  return i >= 0 ? i : 0;
}

export function indexToTab(index) {
  const n = parseInt(index, 10);
  return SALES_TABS[n] || "package";
}

/** Legacy: Admindashboard/sale_dashboard/2026-04-19/2026-05-19/All/0 */
export function saleDashboardPath(start, end, filter = "All", tabIndex = 0) {
  const f = String(filter || "All");
  return `/admindashboard/sale_dashboard/${start}/${end}/${f}/${tabIndex}`;
}

export function analyticsSalesPath(start, end, filter = "All", tab = "package") {
  const tabIndex = tabToIndex(tab);
  return `/admindashboard/analytics/sales/${start}/${end}/${filter || "All"}/${tabIndex}`;
}

export function packageBuyersPath(packageId, start, end) {
  return `/admindashboard/view_total_package_details/${packageId}/${start}/${end}`;
}

export function defaultSalesRange() {
  return defaultPrRange();
}

const PAYMENT_FILTERS = new Set(["All", "paypal", "Paypal", "Razorpay", "Stripe", "Coinbase", "OfflinePayment"]);

export function normalizePaymentFilter(value) {
  const v = String(value || "All");
  if (v === "Offline Payment") return "OfflinePayment";
  if (PAYMENT_FILTERS.has(v)) return v === "Paypal" ? "paypal" : v;
  return "All";
}

export function parseSalesRoute(startParam, endParam, filterParam, tabParam, fallback) {
  const fb = fallback || defaultSalesRange();
  let start = isValidYmd(startParam) ? startParam : fb.start;
  let end = isValidYmd(endParam) ? endParam : fb.end;
  if (start > end) [start, end] = [end, start];
  const filter = normalizePaymentFilter(filterParam);
  const tab = indexToTab(tabParam);
  return { start, end, filter, tab };
}

export function parseRouteDates(startParam, endParam, modeParam, fallback) {
  const fb = fallback || defaultAnalyticsRange();
  let start = isValidYmd(startParam) ? startParam : fb.start;
  let end = isValidYmd(endParam) ? endParam : fb.end;
  if (start > end) [start, end] = [end, start];
  const mode = modeParam === "year" ? "year" : "month";
  return { start, end, mode };
}
