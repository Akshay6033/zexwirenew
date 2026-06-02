const analyticsModel = require("../models/analyticsModel");
const { parseRange, previousPeriod } = require("./analyticsOverviewService");

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

async function buildPr(startDate, endDate, mode = "month") {
  const { start, end } = parseRange(startDate, endDate);
  const prev = previousPeriod(start, end);
  const isYear = mode === "year";

  const chartFetches = isYear
    ? [
        analyticsModel.getPrTotalByYear(start, end),
        analyticsModel.getPrPendingByYear(start, end),
        analyticsModel.getPrActionByYear(start, end),
        analyticsModel.getPrRejectedByYear(start, end),
        analyticsModel.getPrPublishedByYear(start, end)
      ]
    : [
        analyticsModel.getPrTotalByMonth(start, end),
        analyticsModel.getPrPendingByMonth(start, end),
        analyticsModel.getPrActionByMonth(start, end),
        analyticsModel.getPrRejectedByMonth(start, end),
        analyticsModel.getPrPublishedByMonth(start, end)
      ];

  const [
    totalPr,
    totalReject,
    totalSuccess,
    totalTillNow,
    prevPr,
    prevReject,
    prevSuccess,
    totalRows,
    pendingRows,
    actionRows,
    rejectedRows,
    publishedRows,
    locations
  ] = await Promise.all([
    analyticsModel.getPrSubmittedCount(start, end),
    analyticsModel.getPrRejectCount(start, end),
    analyticsModel.getPrSuccessCount(start, end),
    analyticsModel.getPrTillNowCount(),
    analyticsModel.getPrSubmittedCount(prev.start, prev.end),
    analyticsModel.getPrRejectCount(prev.start, prev.end),
    analyticsModel.getPrSuccessCount(prev.start, prev.end),
    ...chartFetches,
    analyticsModel.getGlobalTopPrLocations(start, end)
  ]);

  const buckets = isYear ? buildYearBuckets(start, end) : buildMonthBuckets(start, end);
  const chart = {
    labels: buckets.map((b) => b.label),
    totalPr: mergeSeries(buckets, totalRows),
    pending: mergeSeries(buckets, pendingRows),
    actionRequired: mergeSeries(buckets, actionRows),
    rejected: mergeSeries(buckets, rejectedRows),
    published: mergeSeries(buckets, publishedRows)
  };

  const locationTotal = (locations || []).reduce((sum, row) => sum + Number(row.pr_count || 0), 0);

  return {
    start_date: start,
    end_date: end,
    start_date_display: formatDisplayDate(start),
    end_date_display: formatDisplayDate(end),
    mode: isYear ? "year" : "month",
    summary: {
      total_pr_submitted: totalPr,
      total_pr_rejection: totalReject,
      total_pr_success: totalSuccess,
      total_pr_till_now: totalTillNow
    },
    growth: {
      pr_submitted_percent: pctGrowth(totalPr, prevPr),
      pr_reject_delta: absGrowth(totalReject, prevReject),
      pr_success_delta: absGrowth(totalSuccess, prevSuccess),
      compare_label: `${formatDisplayDate(prev.start)} – ${formatDisplayDate(prev.end)}`
    },
    chart,
    locations: (locations || []).map((row) => ({
      country_name: row.country_name || "Unknown",
      pr_count: Number(row.pr_count || 0)
    })),
    location_total: locationTotal
  };
}

module.exports = { buildPr };
