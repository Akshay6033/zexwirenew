import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import { formatAdminDate } from "../../utils/adminDateFormat";

function UserIncreaseLineHistoryPage() {
  const { userPrStatusId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboardApi.getIncreasePrLineHistory(userPrStatusId);
        setRows(res.data?.data || []);
      } catch (e) {
        toast.error(e.response?.data?.message || "Could not load history");
      } finally {
        setLoading(false);
      }
    })();
  }, [userPrStatusId]);

  return (
    <div className="container-fluid">
      <AdminPageBackHead title="View Increase Pr History" onBack={() => navigate(-1)} />
      {loading && <AdminPageLoader label="Loading increase history…" />}
      {!loading && (
        <div className="card table-bg distribution-table-card">
          <div className="card-body table-responsive">
            <table className="table table-bordered table-bg1 mb-0">
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Increase Pr</th>
                  <th>Who increased PR?</th>
                  <th>Price</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted">No records</td></tr>
                )}
                {rows.map((row, idx) => (
                  <tr key={row.id ?? `${row.date}-${idx}`}>
                    <td>{row.pname}</td>
                    <td>{row.increase_pr}</td>
                    <td>{row.who_increase}</td>
                    <td>$ {row.price}</td>
                    <td>{row.reason}</td>
                    <td>{formatAdminDate(row.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserIncreaseLineHistoryPage;
