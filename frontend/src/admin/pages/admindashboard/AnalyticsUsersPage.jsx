import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AnalyticsLineChart, { USERS_CHART_SERIES } from "../../components/AnalyticsLineChart";
import AnalyticsDateRangePicker from "../../components/AnalyticsDateRangePicker";
import AdminDataTable from "../../components/AdminDataTable";
import AnalyticsLocationsPanel from "../../components/AnalyticsLocationsPanel";
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

function StatCard({ tone, label, value, growth, growthIsPercent = true, showGrowth = true, icon }) {
  return (
    <div className={`analytics-stat-card analytics-stat-card--${tone}`}>
      <div className="analytics-stat-card__body">
        <div className="analytics-stat-card__value">{value}</div>
        <div className="analytics-stat-card__label">{label}</div>
        <div className="analytics-stat-card__icon" aria-hidden="true">
          {icon}
        </div>
      </div>
      {showGrowth && (
        <div className="analytics-stat-card__footer">
          <GrowthBadge value={growth} isPercent={growthIsPercent} />
          <span className="analytics-stat-card__info" title="Compared to previous period">
            ⓘ
          </span>
        </div>
      )}
    </div>
  );
}

function AnalyticsUsersPage() {
  const { startDate, endDate, mode, goToDashboard, setChartMode } = useAnalyticsDashboardRoute({
    legacyDashboard: "users"
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
      const res = await adminDashboardApi.getAnalyticsUsersSummary(
        { start_date: startDate, end_date: endDate, mode },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setData(res.data?.data || null);
    } catch (error) {
      if (error.name === "CanceledError" || error.code === "ERR_CANCELED") return;
      setData(null);
      toast.error(error.response?.data?.message || "Could not load users analytics");
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
    const c = data.chart;
    return {
      labels: c.labels,
      totalAccount: c.totalAccount,
      newSignup: c.newSignup,
      activeAccount: c.activeAccount,
      deletedAccount: c.deletedAccount
    };
  }, [data]);

  const handleRangeApply = (start, end) => {
    goToDashboard(start, end, mode);
  };

  const dateParams = useMemo(
    () => ({ start_date: startDate, end_date: endDate }),
    [startDate, endDate]
  );

  const columns = useMemo(
    () => [
      { key: "sr_no", label: "Sr.No", sortKey: null },
      {
        key: "customer_name",
        label: "User Name",
        sortKey: "customer_name",
        render: (r) => (
          <Link to={`/users/${r.userid}/history`} className="text-primary text-decoration-none">
            {r.customer_name}
          </Link>
        )
      },
      { key: "country_name", label: "Country", sortKey: "country_name" },
      {
        key: "pr_count",
        label: "Total PR",
        sortKey: "pr_count",
        render: (r) => Number(r.pr_count || 0).toLocaleString()
      },
      {
        key: "total_amount",
        label: "Total Amount",
        sortKey: "total_amount",
        render: (r) => `$ ${Number(r.total_amount || 0).toLocaleString()}`
      },
      {
        key: "payment_count",
        label: "Payment",
        sortKey: "payment_count",
        render: (r) => Number(r.payment_count || 0).toLocaleString()
      },
      { key: "signup_date", label: "DOJ", sortKey: "signup_date", render: (r) => r.signup_date }
    ],
    []
  );

  const fetchRows = useCallback(
    (params) => adminDashboardApi.getAnalyticsUsersList({ ...dateParams, ...params }),
    [dateParams]
  );

  const g = data?.growth || {};
  const s = data?.summary || {};

  return (
    <div className={`container-fluid analytics-overview-page ${loading && !data ? "is-loading" : ""}`}>
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h4 className="mt-2 mb-2">Analytics - Users</h4>
        <AnalyticsDateRangePicker startDate={startDate} endDate={endDate} onApply={handleRangeApply} />
      </div>

      <div className="analytics-stat-grid">
        <StatCard
          tone="sales"
          label="Total Accounts"
          value={Number(s.total_accounts || 0).toLocaleString()}
          growth={g.total_accounts_percent ?? 0}
          icon="👥"
        />
        <StatCard
          tone="pr"
          label="New Signups"
          value={Number(s.new_signups || 0).toLocaleString()}
          growth={g.new_signups_percent ?? 0}
          icon="📊"
        />
        <StatCard
          tone="new"
          label="Active Accounts Login"
          value={Number(s.active_accounts_login || 0).toLocaleString()}
          growth={g.active_accounts_percent ?? 0}
          icon="🎯"
        />
        <StatCard
          tone="active"
          label="Active Account %"
          value={`${Number(s.active_account_percent || 0)}%`}
          growth={g.active_account_percent_delta ?? 0}
          growthIsPercent={false}
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
            <AnalyticsLineChart chart={chartPayload} series={USERS_CHART_SERIES} />
          ) : (
            <p className="text-muted mb-0">No chart data for this range.</p>
          )}
        </div>
      </div>

      <AnalyticsLocationsPanel
        title="Global Users by Top Locations"
        locations={data?.locations || []}
        locationTotal={data?.location_total || 0}
        countKey="user_count"
        markerFormat="number"
        emptyMessage={loading ? "" : "No paying users by country in this date range."}
      />

      <div className="card m-b-30 analytics-panel data-table">
        <div className="card-body table-responsive">
          <h5 className="mb-3">User Details</h5>
          <AdminDataTable
            embedded
            tableKey={`users-${startDate}-${endDate}`}
            columns={columns}
            fetchRows={fetchRows}
            defaultSortBy="total_amount"
            emptyMessage="No users with payments in this date range."
          />
        </div>
      </div>

      {loading && data && <div className="analytics-refresh-indicator">Updating…</div>}
    </div>
  );
}

export default AnalyticsUsersPage;
