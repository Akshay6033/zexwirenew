import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AnalyticsDateRangePicker from "../../components/AnalyticsDateRangePicker";
import AnalyticsServerTable from "../../components/AnalyticsServerTable";
import { useAnalyticsSalesRoute } from "../../hooks/useAnalyticsSalesRoute";
import { packageBuyersPath } from "../../utils/analyticsDateRoute";

const PAYMENT_FILTER_OPTIONS = [
  { value: "All", label: "All" },
  { value: "paypal", label: "Paypal" },
  { value: "Razorpay", label: "Razorpay" },
  { value: "Stripe", label: "Stripe" },
  { value: "Coinbase", label: "Coinbase" },
  { value: "OfflinePayment", label: "Offline Payment" }
];

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

function StatCard({ tone, label, value, growth, growthIsPercent = true, growthSuffix = "", icon }) {
  const growthText = growthIsPercent
    ? null
    : `${Math.abs(Number(growth) || 0).toLocaleString()}${growthSuffix}`;
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
        {growthIsPercent ? (
          <GrowthBadge value={growth} isPercent />
        ) : (
          <span className="analytics-growth analytics-growth--up">
            <span aria-hidden="true">▲</span> {growthText}
          </span>
        )}
        <span className="analytics-stat-card__info" title="Compared to previous period">
          ⓘ
        </span>
      </div>
    </div>
  );
}

function AnalyticsSalesPage() {
  const { startDate, endDate, filter, tab, goToDashboard, setTab, setPaymentFilter } =
    useAnalyticsSalesRoute();
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const abortRef = useRef(null);

  const dateParams = { start_date: startDate, end_date: endDate };

  const loadSummary = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSummaryLoading(true);
    try {
      const res = await adminDashboardApi.getAnalyticsSalesSummary(dateParams, {
        signal: controller.signal
      });
      if (!controller.signal.aborted) setSummary(res.data?.data || null);
    } catch (error) {
      if (error.name === "CanceledError" || error.code === "ERR_CANCELED") return;
      setSummary(null);
      toast.error(error.response?.data?.message || "Could not load sales summary");
    } finally {
      if (!controller.signal.aborted) setSummaryLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const t = setTimeout(loadSummary, 150);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
    };
  }, [loadSummary]);

  const handleRangeApply = (start, end) => {
    goToDashboard(start, end, filter, tab);
  };

  const g = summary?.growth || {};
  const s = summary?.summary || {};

  const packageColumns = [
    { key: "sr", label: "Sr.No", render: (_r, { start, index }) => start + index + 1 },
    { key: "name", label: "Item Name", sortKey: "pname", render: (r) => r.item_name },
    {
      key: "qty",
      label: "Quantity Sold",
      sortKey: "quantity",
      render: (r) => Number(r.quantity_sold).toLocaleString()
    },
    {
      key: "total",
      label: "Total Amount",
      sortKey: "total_amount",
      render: (r) => `$ ${Number(r.total_amount).toLocaleString()}`
    },
    {
      key: "avg",
      label: "Average Price",
      sortKey: "avg_price",
      render: (r) => `$ ${Number(r.average_price).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    },
    {
      key: "view",
      label: "View Details",
      render: (r) => (
        <Link
          to={packageBuyersPath(r.package_id, startDate, endDate)}
          className="btn btn-sm btn-secondary"
        >
          View
        </Link>
      )
    }
  ];

  const customerColumns = [
    { key: "sr", label: "Sr.No", render: (_r, { start, index }) => start + index + 1 },
    {
      key: "name",
      label: "Customer Name",
      sortKey: "customer_name",
      render: (r) => (
        <Link to={`/users/${r.userid}/history`} className="text-primary text-decoration-none">
          {r.customer_name}
        </Link>
      )
    },
    {
      key: "count",
      label: "No of payments done",
      sortKey: "payment_count",
      render: (r) => Number(r.payment_count).toLocaleString()
    },
    {
      key: "total",
      label: "Total Amount",
      sortKey: "total_amount",
      render: (r) => `$ ${Number(r.total_amount).toLocaleString()}`
    }
  ];

  const paymentColumns = [
    { key: "sr", label: "Sr.No", render: (_r, { start, index }) => start + index + 1 },
    {
      key: "name",
      label: "Customer Name",
      sortKey: "customer_name",
      render: (r) => (
        <Link to={`/users/${r.userid}/history`} className="text-primary text-decoration-none">
          {r.customer_name}
        </Link>
      )
    },
    { key: "txn", label: "Transaction ID", sortKey: "payment_id", render: (r) => r.transaction_id },
    { key: "method", label: "Payment Method", sortKey: "payment_method", render: (r) => r.payment_method },
    {
      key: "total",
      label: "Total Amount",
      sortKey: "total_amount",
      render: (r) => `$ ${Number(r.total_amount).toLocaleString()}`
    },
    { key: "time", label: "Time", sortKey: "date_current", render: (r) => r.date_current }
  ];

  return (
    <div className={`container-fluid analytics-sales-page ${summaryLoading && !summary ? "is-loading" : ""}`}>
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h4 className="mt-2 mb-2">Analytics - Sales</h4>
        <AnalyticsDateRangePicker startDate={startDate} endDate={endDate} onApply={handleRangeApply} />
      </div>

      <div className="analytics-stat-grid">
        <StatCard
          tone="sales"
          label="Total No of Sales"
          value={Number(s.total_sale_count || 0).toLocaleString()}
          growth={g.sale_count_percent ?? 0}
          icon="✅"
        />
        <StatCard
          tone="pr"
          label="Total Sales (USD)"
          value={`$ ${Number(s.total_usd_amount || 0).toLocaleString()}`}
          growth={g.usd_amount_delta ?? 0}
          growthIsPercent={false}
          growthSuffix=" USD"
          icon="💵"
        />
        <StatCard
          tone="new"
          label="Sales % Growth"
          value={`${Number(g.sale_count_growth_percent ?? g.week_wise_increase ?? 0)}%`}
          growth={g.week_wise_increase ?? g.sale_count_growth_percent ?? 0}
          icon="📈"
        />
        <StatCard
          tone="active"
          label="Sales % Growth (USD)"
          value={`${Number(g.usd_growth_percent ?? g.month_wise_increase ?? 0)}%`}
          growth={g.month_wise_increase ?? g.usd_growth_percent ?? 0}
          icon="💹"
        />
      </div>

      <div className="card m-b-30 analytics-panel data-table">
        <div className="card-body table-responsive">
          <div className="analytics-sales-tabs-wrap d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <ul className="nav analytics-sales-tabs">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${tab === "package" ? "active" : ""}`}
                  onClick={() => setTab("package")}
                >
                  Package
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${tab === "customer" ? "active" : ""}`}
                  onClick={() => setTab("customer")}
                >
                  Customer
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${tab === "payment" ? "active" : ""}`}
                  onClick={() => setTab("payment")}
                >
                  Payment method
                </button>
              </li>
            </ul>
            {tab === "payment" && (
              <div className="analytics-sales-filter dropdown">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary analytics-sales-filter-btn"
                  onClick={() => setFilterOpen((o) => !o)}
                  aria-expanded={filterOpen}
                >
                  ☰ Filter
                </button>
                {filterOpen && (
                  <ul className="analytics-sales-filter-menu show">
                    {PAYMENT_FILTER_OPTIONS.map((opt) => (
                      <li key={opt.value}>
                        <button
                          type="button"
                          className={filter === opt.value ? "active" : ""}
                          onClick={() => {
                            setPaymentFilter(opt.value);
                            setFilterOpen(false);
                          }}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {tab === "package" && (
            <AnalyticsServerTable
              tableKey={`pkg-${startDate}-${endDate}`}
              columns={packageColumns}
              defaultSortBy="total_amount"
              fetchRows={(params) =>
                adminDashboardApi.getAnalyticsSalesPackages({ ...dateParams, ...params })
              }
            />
          )}
          {tab === "customer" && (
            <AnalyticsServerTable
              tableKey={`cust-${startDate}-${endDate}`}
              columns={customerColumns}
              defaultSortBy="total_amount"
              fetchRows={(params) =>
                adminDashboardApi.getAnalyticsSalesCustomers({ ...dateParams, ...params })
              }
            />
          )}
          {tab === "payment" && (
            <AnalyticsServerTable
              tableKey={`pay-${startDate}-${endDate}-${filter}`}
              columns={paymentColumns}
              defaultSortBy="date_current"
              extraQuery={{ payment_filter: filter }}
              fetchRows={(params) =>
                adminDashboardApi.getAnalyticsSalesPayments({ ...dateParams, ...params })
              }
            />
          )}
        </div>
      </div>

      {summaryLoading && summary && (
        <div className="analytics-refresh-indicator">Updating…</div>
      )}
    </div>
  );
}

export default AnalyticsSalesPage;
