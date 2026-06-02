const analyticsUsersModel = require("../models/analyticsUsersModel");
const { parseRange, previousPeriod } = require("./analyticsOverviewService");

function pctGrowth(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

function formatCompareLabel(start, end) {
  const fmt = (ymd) => {
    const d = new Date(`${ymd}T00:00:00`);
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

function monthRangeList(start, end) {
  const buckets = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  cur.setDate(1);
  last.setDate(1);
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const monthStart = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const monthEndDate = new Date(y, m + 1, 0);
    const monthEnd = `${y}-${String(m + 1).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;
    buckets.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: cur.toLocaleString("en-US", { month: "short" }),
      monthStart,
      monthEnd
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return buckets;
}

function yearRangeList(start, end) {
  const y1 = new Date(start).getFullYear();
  const y2 = new Date(end).getFullYear();
  const buckets = [];
  for (let y = y1; y <= y2; y += 1) {
    buckets.push({ key: String(y), label: String(y), year: y });
  }
  return buckets;
}

function accountsBeforeMonth(monthStart, accountsFromBaseline) {
  const prefix = monthStart.slice(0, 7);
  let total = 0;
  for (const [ym, cnt] of Object.entries(accountsFromBaseline)) {
    if (ym < prefix) total += cnt;
  }
  return total;
}

async function buildMonthChart(start, end) {
  const buckets = monthRangeList(start, end);
  const labels = buckets.map((b) => b.label);
  const totalAccount = [];
  const newSignup = [];
  const activeAccount = [];
  const deletedAccount = [];

  if (!buckets.length) {
    return { labels, totalAccount, newSignup, activeAccount, deletedAccount };
  }

  const [accountsFromBaseline, signupsByMonth, activeByMonth, deletedByMonth] = await Promise.all([
    analyticsUsersModel.getAccountsCreatedByMonth("2021-01-01", end),
    analyticsUsersModel.getSignupsByMonth(start, end),
    analyticsUsersModel.getActiveUsersByMonth(start, end),
    analyticsUsersModel.getDeletedUsersByMonth(start, end)
  ]);

  for (const b of buckets) {
    const inMonth = accountsFromBaseline[b.key] || 0;
    const baseline = accountsBeforeMonth(b.monthStart, accountsFromBaseline);
    totalAccount.push({ label: b.label, value: baseline + inMonth });
    newSignup.push({ label: b.label, value: signupsByMonth[b.key] || 0 });
    activeAccount.push({ label: b.label, value: activeByMonth[b.key] || 0 });
    deletedAccount.push({ label: b.label, value: deletedByMonth[b.key] || 0 });
  }

  return { labels, totalAccount, newSignup, activeAccount, deletedAccount };
}

async function buildYearChart(start, end) {
  const buckets = yearRangeList(start, end);
  const labels = buckets.map((b) => b.label);
  const years = buckets.map((b) => b.year);

  if (!years.length) {
    return { labels, totalAccount: [], newSignup: [], activeAccount: [], deletedAccount: [] };
  }

  const [accountsByYear, signupsByYear, activeByYear, deletedByYear] = await Promise.all([
    analyticsUsersModel.getYearlyAccountCounts(years),
    analyticsUsersModel.getYearlySignups(years),
    analyticsUsersModel.getYearlyActiveUsers(years),
    analyticsUsersModel.getYearlyDeletedUsers(years)
  ]);

  return {
    labels,
    totalAccount: buckets.map((b) => ({ label: b.label, value: accountsByYear[b.year] || 0 })),
    newSignup: buckets.map((b) => ({ label: b.label, value: signupsByYear[b.year] || 0 })),
    activeAccount: buckets.map((b) => ({ label: b.label, value: activeByYear[b.year] || 0 })),
    deletedAccount: buckets.map((b) => ({ label: b.label, value: deletedByYear[b.year] || 0 }))
  };
}

async function buildUsers(startDate, endDate, mode = "month") {
  const { start, end } = parseRange(startDate, endDate);
  const prev = previousPeriod(start, end);
  const isYear = mode === "year";

  const [
    totalAccounts,
    signupInRange,
    activeInRange,
    totalActiveAll,
    prevSignup,
    prevActive,
    locations,
    chartData
  ] = await Promise.all([
    analyticsUsersModel.getTotalAccountCount(),
    analyticsUsersModel.getSignupCount(start, end),
    analyticsUsersModel.getActiveAccountCount(start, end),
    analyticsUsersModel.getTotalActiveUserCount(),
    analyticsUsersModel.getSignupCount(prev.start, prev.end),
    analyticsUsersModel.getActiveAccountCount(prev.start, prev.end),
    analyticsUsersModel.getTopUserSalesByCountry(start, end),
    isYear ? buildYearChart(start, end) : buildMonthChart(start, end)
  ]);

  const perActivePercent =
    totalActiveAll > 0 ? Math.round((activeInRange * 10000) / totalActiveAll) / 100 : 0;

  const prevActivePercent =
    totalActiveAll > 0
      ? Math.round((prevActive * 10000) / totalActiveAll) / 100
      : 0;

  return {
    start_date: start,
    end_date: end,
    mode: isYear ? "year" : "month",
    summary: {
      total_accounts: totalAccounts,
      new_signups: signupInRange,
      active_accounts_login: activeInRange,
      active_account_percent: perActivePercent
    },
    growth: {
      total_accounts_percent: 0,
      new_signups_percent: pctGrowth(signupInRange, prevSignup),
      active_accounts_percent: pctGrowth(activeInRange, prevActive),
      active_account_percent_delta: Math.round((perActivePercent - prevActivePercent) * 100) / 100,
      compare_label: formatCompareLabel(prev.start, prev.end)
    },
    chart: {
      labels: chartData.labels,
      totalAccount: chartData.totalAccount,
      newSignup: chartData.newSignup,
      activeAccount: chartData.activeAccount,
      deletedAccount: chartData.deletedAccount
    },
    locations: (locations || []).map((row) => ({
      country_name: row.country_name || "Unknown",
      user_count: Number(row.user_count || 0)
    })),
    location_total: (locations || []).reduce((sum, row) => sum + Number(row.user_count || 0), 0)
  };
}

function parsePaging(query) {
  const start = Math.max(parseInt(query.start, 10) || 0, 0);
  const length = Math.min(Math.max(parseInt(query.length, 10) || 10, 1), 100);
  const search = String(query.search || "").trim();
  const sortBy = String(query.sortBy || "").trim();
  const sortOrder = String(query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  return { start, length, search, sortBy, sortOrder, offset: start, limit: length };
}

module.exports = { buildUsers, parsePaging, parseRange };
