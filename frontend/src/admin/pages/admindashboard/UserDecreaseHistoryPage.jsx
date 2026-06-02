import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import { formatAdminDateTime } from "../../utils/adminDateFormat";

function UserDecreaseHistoryPage() {
  const { prRecordId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboardApi.getDecreasePrHistory(prRecordId);
        setRows(res.data?.data || []);
      } catch (e) {
        toast.error(e.response?.data?.message || "Could not load history");
      } finally {
        setLoading(false);
      }
    })();
  }, [prRecordId]);

  return (
    <div className="container-fluid">
      <AdminPageBackHead title="View Decrease PR History" onBack={() => navigate(-1)} />
      {loading && <AdminPageLoader label="Loading decrease history…" />}
      {!loading && (
        <div className="card table-bg distribution-table-card">
          <div className="card-body table-responsive">
            <table className="table table-bordered table-bg1 mb-0">
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Decrease Pr</th>
                  <th>Before decrease PR</th>
                  <th>Who decreased PR?</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted">No records</td></tr>
                )}
                {rows.map((row, idx) => (
                  <tr key={row.id ?? `${row.decrease_date_time}-${idx}`}>
                    <td>{row.pname}</td>
                    <td>{row.decrease_pr}</td>
                    <td>{row.before_decrease_pr ?? "—"}</td>
                    <td>{row.who_decrease}</td>
                    <td>{row.decrease_reason}</td>
                    <td>
                      {formatAdminDateTime(
                        row.decrease_date_time || row.history_timestamp || row.timestamp
                      )}
                    </td>
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

export default UserDecreaseHistoryPage;
