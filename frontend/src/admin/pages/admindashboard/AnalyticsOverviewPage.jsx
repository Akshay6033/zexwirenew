import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AnalyticsLineChart from "../../components/AnalyticsLineChart";
import AnalyticsLocationsPanel from "../../components/AnalyticsLocationsPanel";
import AnalyticsDateRangePicker from "../../components/AnalyticsDateRangePicker";
import { useAnalyticsDashboardRoute } from "../../hooks/useAnalyticsDashboardRoute";

function GrowthBadge({ value, isPercent = true }) {
  const num = Number(value) || 0;
  const up = num >= 0;
  const text = isPercent ? `${Math.abs(num)}%` : String(Math.abs(num));
  return (
    <span className={`analytics-growth ${up ? "analytics-growth--up" : "analytics-growth--down"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span> {text}
    </span>
  );
}

function StatCard({ tone, label, value, growth, growthIsPercent = true, icon }) {
  return (
    <div className={`analytics-stat-card analytics-stat-card--${tone}`}>
      <div className="analytics-stat-card__body">
        <div className="analytics-stat-card__value">{value}</div>
        <div className="analytics-stat-card__label">{label}</div>
        <div className="analytics-stat-card__icon" aria-hidden="true">
          {icon}
        </div>
      </div>
      <div className="analytics-stat-card__footer">
        <GrowthBadge value={growth} isPercent={growthIsPercent} />
        <span className="analytics-stat-card__info" title="Compared to previous period">
          ⓘ
        </span>
      </div>
    </div>
  );
}

function AnalyticsOverviewPage() {
  const { startDate, endDate, mode, goToDashboard, setChartMode } = useAnalyticsDashboardRoute({
    legacyDashboard: "overview"
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await adminDashboardApi.getAnalyticsOverview(
        { start_date: startDate, end_date: endDate, mode },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setData(res.data?.data || null);
    } catch (error) {
      if (error.name === "CanceledError" || error.code === "ERR_CANCELED") return;
      setData(null);
      toast.error(error.response?.data?.message || "Could not load analytics");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [startDate, endDate, mode]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [load]);

  const chartPayload = useMemo(() => {
    if (!data?.chart) return null;
    return {
      labels: data.chart.labels,
      sales: data.chart.sales,
      prSubmitted: data.chart.prSubmitted,
      newUsers: data.chart.newUsers,
      activeUsers: data.chart.activeUsers
    };
  }, [data]);

  const handleRangeApply = (start, end) => {
    goToDashboard(start, end, mode);
  };

  return (
    <div className={`container-fluid analytics-overview-page ${loading && !data ? "is-loading" : ""}`}>
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h4 className="mt-2 mb-2">Analytics - Overview</h4>
        <AnalyticsDateRangePicker startDate={startDate} endDate={endDate} onApply={handleRangeApply} />
      </div>

      <div className="analytics-stat-grid">
        <StatCard
          tone="sales"
          label="Total Sales"
          value={`$ ${Number(data?.summary?.total_sales || 0).toLocaleString()}`}
          growth={data?.growth?.sales_percent ?? 0}
          icon="💵"
        />
        <StatCard
          tone="pr"
          label="PR Submitted"
          value={Number(data?.summary?.total_pr_submitted || 0).toLocaleString()}
          growth={data?.growth?.pr_delta ?? 0}
          growthIsPercent={false}
          icon="📊"
        />
        <StatCard
          tone="new"
          label="New Users"
          value={Number(data?.summary?.total_new_users || 0).toLocaleString()}
          growth={data?.growth?.new_users_percent ?? 0}
          icon="📦"
        />
        <StatCard
          tone="active"
          label="Active Users"
          value={Number(data?.summary?.total_active_users || 0).toLocaleString()}
          growth={data?.growth?.active_users_percent ?? 0}
          icon="📋"
        />
      </div>

      <div className="card m-b-30 analytics-panel">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h5 className="mb-0">Analytic Statistics</h5>
            <select
              className="form-select form-select-sm analytics-mode-select"
              value={mode}
              onChange={(e) => setChartMode(e.target.value)}
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          {loading && !chartPayload ? (
            <div className="analytics-chart-skeleton" />
          ) : chartPayload ? (
            <AnalyticsLineChart chart={chartPayload} />
          ) : (
            <p className="text-muted mb-0">No chart data for this range.</p>
          )}
        </div>
      </div>

      <AnalyticsLocationsPanel
        title="Global Sales by Top Locations"
        locations={data?.locations || []}
        locationTotal={data?.location_total || 0}
        countKey="total_sales"
        markerFormat="currency"
        emptyMessage={loading ? "" : "No sales by country in this date range."}
        renderListValue={(_, value) => (
          <span>$ {value.toLocaleString()}</span>
        )}
      />

      {loading && data && <div className="analytics-refresh-indicator">Updating…</div>}
    </div>
  );
}

export default AnalyticsOverviewPage;
