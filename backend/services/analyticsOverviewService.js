const analyticsModel = require("../models/analyticsModel");

function toYmd(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return { start: toYmd(start), end: toYmd(end) };
}

function parseRange(startInput, endInput) {
  const fallback = defaultRange();
  let start = toYmd(startInput) || fallback.start;
  let end = toYmd(endInput) || fallback.end;
  if (start > end) [start, end] = [end, start];
  return { start, end };
}

function previousPeriod(start, end) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const days = Math.max(Math.round((endMs - startMs) / 86400000), 1);
  const prevEnd = new Date(startMs - 86400000);
  const prevStart = new Date(prevEnd.getTime() - days * 86400000);
  return { start: toYmd(prevStart), end: toYmd(prevEnd), days };
}

function pctGrowth(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

function absGrowth(current, previous) {
  return current - previous;
}

function buildMonthBuckets(start, end) {
  const buckets = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  cur.setDate(1);
  last.setDate(1);
  while (cur <= last) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      label: cur.toLocaleString("en-US", { month: "short" })
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return buckets;
}

function buildYearBuckets(start, end) {
  const buckets = [];
  const y1 = new Date(start).getFullYear();
  const y2 = new Date(end).getFullYear();
  for (let y = y1; y <= y2; y += 1) {
    buckets.push({ key: String(y), label: String(y) });
  }
  return buckets;
}

function mergeSeries(buckets, rows) {
  const map = new Map((rows || []).map((r) => [String(r.bucket), Number(r.value || 0)]));
  return buckets.map((b) => ({
    label: b.label,
    value: map.get(b.key) ?? 0
  }));
}

function formatDisplayDate(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

async function buildOverview(startDate, endDate, mode = "month") {
  const { start, end } = parseRange(startDate, endDate);
  const prev = previousPeriod(start, end);
  const isYear = mode === "year";

  const [
    totalSales,
    totalPr,
    totalNewUsers,
    totalActiveUsers,
    prevSales,
    prevPr,
    prevNewUsers,
    prevActiveUsers,
    salesRows,
    prRows,
    newUserRows,
    activeUserRows,
    locations
  ] = await Promise.all([
    analyticsModel.getTotalSales(start, end),
    analyticsModel.getTotalPrSubmitted(start, end),
    analyticsModel.getTotalNewUsers(start, end),
    analyticsModel.getTotalActiveUsers(start, end),
    analyticsModel.getTotalSales(prev.start, prev.end),
    analyticsModel.getTotalPrSubmitted(prev.start, prev.end),
    analyticsModel.getTotalNewUsers(prev.start, prev.end),
    analyticsModel.getTotalActiveUsers(prev.start, prev.end),
    isYear ? analyticsModel.getSalesByYear(start, end) : analyticsModel.getSalesByMonth(start, end),
    isYear ? analyticsModel.getPrPublishedByYear(start, end) : analyticsModel.getPrPublishedByMonth(start, end),
    isYear ? analyticsModel.getNewUsersByYear(start, end) : analyticsModel.getNewUsersByMonth(start, end),
    isYear ? analyticsModel.getActiveUsersByYear(start, end) : analyticsModel.getActiveUsersByMonth(start, end),
    analyticsModel.getGlobalTopLocations(start, end)
  ]);

  const buckets = isYear ? buildYearBuckets(start, end) : buildMonthBuckets(start, end);
  const chart = {
    labels: buckets.map((b) => b.label),
    sales: mergeSeries(buckets, salesRows),
    prSubmitted: mergeSeries(buckets, prRows),
    newUsers: mergeSeries(buckets, newUserRows),
    activeUsers: mergeSeries(buckets, activeUserRows)
  };

  const locationTotal = (locations || []).reduce((sum, row) => sum + Number(row.total_sales || 0), 0);

  return {
    start_date: start,
    end_date: end,
    start_date_display: formatDisplayDate(start),
    end_date_display: formatDisplayDate(end),
    mode: isYear ? "year" : "month",
    summary: {
      total_sales: totalSales,
      total_pr_submitted: totalPr,
      total_new_users: totalNewUsers,
      total_active_users: totalActiveUsers
    },
    growth: {
      sales_percent: pctGrowth(totalSales, prevSales),
      pr_delta: absGrowth(totalPr, prevPr),
      new_users_percent: pctGrowth(totalNewUsers, prevNewUsers),
      active_users_percent: pctGrowth(totalActiveUsers, prevActiveUsers),
      compare_label: `${formatDisplayDate(prev.start)} – ${formatDisplayDate(prev.end)}`
    },
    chart,
    locations: (locations || []).map((row) => ({
      country_name: row.country_name || "Unknown",
      total_sales: Number(row.total_sales || 0),
      payment_count: Number(row.payment_count || 0)
    })),
    location_total: locationTotal
  };
}

module.exports = { buildOverview, defaultRange, parseRange, previousPeriod };
