import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminDataTable from "../../components/AdminDataTable";
import { saleDashboardPath } from "../../utils/analyticsDateRoute";

function AnalyticsPackageBuyersPage() {
  const { packageId, startDate, endDate } = useParams();
  const backTo = saleDashboardPath(startDate, endDate, "All", 0);

  const columns = [
    { key: "sr", label: "Sl.No.", render: (_r, { start, index }) => start + index + 1 },
    {
      key: "name",
      label: "User Name",
      sortKey: "user_name",
      render: (r) => (
        <Link to={`/users/${r.userid}/history`} className="text-primary text-decoration-none">
          {r.user_name}
        </Link>
      )
    },
    {
      key: "qty",
      label: "Package Buy Qty",
      sortKey: "buy_count",
      render: (r) => Number(r.buy_count).toLocaleString()
    },
    { key: "date", label: "Datetime", sortKey: "date_current", render: (r) => r.date_current }
  ];

  return (
    <div className="container-fluid analytics-package-buyers-page">
      <AdminPageBackHead title="View package sold details" backTo={backTo} />

      <AdminDataTable
        tableKey={`buyers-${packageId}-${startDate}-${endDate}`}
        columns={columns}
        extraQuery={{
          package_id: packageId,
          start_date: startDate,
          end_date: endDate
        }}
        fetchRows={(params) => adminDashboardApi.getAnalyticsSalesPackageBuyers(params)}
        emptyMessage="No buyers for this package in the selected range."
        loadingLabel="Loading package buyers…"
      />
    </div>
  );
}

export default AnalyticsPackageBuyersPage;
