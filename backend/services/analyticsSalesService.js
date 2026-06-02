const analyticsSalesModel = require("../models/analyticsSalesModel");
const { parseRange } = require("./analyticsOverviewService");

function pctGrowth(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

function previousEqualPeriod(start, end) {
  const startMs = new Date(`${start}T00:00:00`).getTime();
  const endMs = new Date(`${end}T00:00:00`).getTime();
  const days = Math.max(Math.round((endMs - startMs) / 86400000), 1);
  const prevEnd = new Date(startMs - 86400000);
  const prevStart = new Date(prevEnd.getTime() - days * 86400000);
  return {
    start: prevStart.toISOString().slice(0, 10),
    end: prevEnd.toISOString().slice(0, 10)
  };
}

function previousCalendarMonthBefore(start) {
  const d = new Date(`${start}T00:00:00`);
  const end = new Date(d);
  end.setDate(end.getDate() - 1);
  const startPrev = new Date(d);
  startPrev.setMonth(startPrev.getMonth() - 1);
  return {
    start: startPrev.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

function formatCompareLabel(start, end) {
  const fmt = (ymd) => {
    const d = new Date(`${ymd}T00:00:00`);
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

async function buildSalesSummary(startDate, endDate) {
  const { start, end } = parseRange(startDate, endDate);
  const prevPeriod = previousEqualPeriod(start, end);
  const prevMonth = previousCalendarMonthBefore(start);

  const [current, prev, prevMonthTotals] = await Promise.all([
    analyticsSalesModel.getUsdSalesTotals(start, end),
    analyticsSalesModel.getUsdSalesTotals(prevPeriod.start, prevPeriod.end),
    analyticsSalesModel.getUsdSalesTotals(prevMonth.start, prevMonth.end)
  ]);

  const saleCount = Number(current.count || 0);
  const usdAmount = Number(current.usd_amount || 0);
  const prevCount = Number(prev.count || 0);
  const prevUsd = Number(prev.usd_amount || 0);
  const prevMonthUsd = Number(prevMonthTotals.usd_amount || 0);
  const prevMonthCount = Number(prevMonthTotals.count || 0);

  const usdDeltaPrevMonth = usdAmount - prevMonthUsd;
  const countDeltaPrevMonth = saleCount - prevMonthCount;

  let monthWiseIncrease = 0;
  if (usdDeltaPrevMonth !== 0 && prevMonthUsd !== 0) {
    monthWiseIncrease = Math.round((usdDeltaPrevMonth / prevMonthUsd) * 10000) / 100;
  }

  let weekWiseIncrease = 0;
  if (countDeltaPrevMonth !== 0 && prevMonthCount !== 0) {
    weekWiseIncrease = Math.round((countDeltaPrevMonth / prevMonthCount) * 10000) / 100;
  }

  let percentageTotalUsdSaleOverview = 0;
  let percentageTotalUsdSaleOverviewAbs = 0;
  let percentageTotalUsdSaleCountOverview = 0;
  let percentageTotalUsdSaleCountPercentageOverview = 0;

  if (prevCount !== 0) {
    percentageTotalUsdSaleOverview = pctGrowth(saleCount, prevCount);
    percentageTotalUsdSaleCountOverview = pctGrowth(saleCount, prevCount);
  }
  percentageTotalUsdSaleOverviewAbs = usdAmount - prevUsd;
  if (prevUsd !== 0) {
    percentageTotalUsdSaleCountPercentageOverview = pctGrowth(usdAmount, prevUsd);
  }

  return {
    start_date: start,
    end_date: end,
    summary: {
      total_sale_count: saleCount,
      total_usd_amount: usdAmount
    },
    growth: {
      sale_count_percent: percentageTotalUsdSaleOverview,
      usd_amount_delta: percentageTotalUsdSaleOverviewAbs,
      sale_count_growth_percent: percentageTotalUsdSaleCountOverview,
      usd_growth_percent: percentageTotalUsdSaleCountPercentageOverview,
      month_wise_increase: monthWiseIncrease,
      week_wise_increase: weekWiseIncrease,
      compare_label: formatCompareLabel(prevPeriod.start, prevPeriod.end)
    }
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

module.exports = {
  buildSalesSummary,
  parsePaging,
  parseRange
};
