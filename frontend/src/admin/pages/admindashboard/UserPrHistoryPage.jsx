import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminDateTimeCell from "../../components/AdminDateTimeCell";

const HISTORY_PAGE_SIZE = 10;

function UserPrHistoryPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const initialFetchRef = useRef(true);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyQInput, setHistoryQInput] = useState("");
  const [historyQ, setHistoryQ] = useState("");
  const [historyRows, setHistoryRows] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    initialFetchRef.current = true;
    setUser(null);
    setHistoryPage(1);
    setHistoryQInput("");
    setHistoryQ("");
    setHistoryRows([]);
    setHistoryTotal(0);
    setLoading(true);
  }, [userId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setHistoryQ(historyQInput.trim());
      setHistoryPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [historyQInput]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    const useFullPageLoader = initialFetchRef.current;

    (async () => {
      if (useFullPageLoader) setLoading(true);
      else setHistoryLoading(true);
      try {
        const res = await adminDashboardApi.getUserPrStatusPaged(userId, {
          page: historyPage,
          limit: HISTORY_PAGE_SIZE,
          ...(historyQ ? { q: historyQ } : {})
        });
        if (cancelled) return;
        const d = res.data?.data;
        const total = Number(d?.total ?? 0);
        const limit = Number(d?.limit ?? HISTORY_PAGE_SIZE);
        const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
        const nextPage = historyPage > totalPages ? totalPages : historyPage;

        setUser(d?.user ?? null);
        setHistoryRows(d?.rows || []);
        setHistoryTotal(total);
        if (nextPage !== historyPage) setHistoryPage(nextPage);
        initialFetchRef.current = false;
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || "Could not load PR history");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHistoryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, historyPage, historyQ]);

  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE) || 1);
  const historyFrom = historyTotal === 0 ? 0 : (historyPage - 1) * HISTORY_PAGE_SIZE + 1;
  const historyTo = Math.min(historyPage * HISTORY_PAGE_SIZE, historyTotal);

  return (
    <div className="container-fluid user-pr-history-page">
      <AdminPageBackHead title="View Increase PR [History]" onBack={() => navigate("/users")} />

      {loading && <AdminPageLoader label="Loading PR history…" />}
      {!loading && user && (
        <div className="card table-bg distribution-table-card">
          <div className="card-body">
            <p className="mb-1">
              <strong>User Name :-</strong> {user.first_name} {user.last_name}
            </p>
            <p className="mb-3">
              <strong>User Email :-</strong> {user.email}
            </p>
            <div className="text-center mb-2">
              <span className="badge bg-info">PR History</span>
            </div>
            <div className="d-flex flex-column flex-md-row gap-2 align-items-stretch align-items-md-end justify-content-between mb-2 increase-pr-history-toolbar">
              <div className="flex-grow-1" style={{ maxWidth: 420 }}>
                <label className="form-label small mb-1" htmlFor="pr-history-page-search">
                  Search history
                </label>
                <input
                  id="pr-history-page-search"
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="Package name, reason, admin, amounts…"
                  value={historyQInput}
                  onChange={(e) => setHistoryQInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="small text-muted pb-1">
                {historyLoading
                  ? "Loading…"
                  : historyTotal === 0
                    ? "No matching records"
                    : `Showing ${historyFrom}–${historyTo} of ${historyTotal}`}
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={historyPage <= 1 || historyLoading}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="small text-muted">
                Page {historyPage} of {historyTotalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={historyLoading || historyPage >= historyTotalPages || historyTotal === 0}
                onClick={() => setHistoryPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered table-bg1 mb-0">
                <thead>
                  <tr>
                    <th>Package Name</th>
                    <th>Increase PR</th>
                    <th>Total PR</th>
                    <th>PR Price</th>
                    <th>Date &amp; Time</th>
                    <th>Original Validity</th>
                    <th>Admin Added Validity</th>
                    <th>Reason</th>
                    <th>Who increased PR?</th>
                  </tr>
                </thead>
                <tbody>
                  {!historyLoading && historyRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center text-muted">
                        {historyQ ? "No rows match your search" : "No records"}
                      </td>
                    </tr>
                  )}
                  {historyLoading && (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-4">
                        Loading history…
                      </td>
                    </tr>
                  )}
                  {!historyLoading &&
                    historyRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.pname}</td>
                        <td>
                          {row.og_pr != null && row.og_pr !== "" ? (
                            <Link to={`/users/pr-increase-history/${row.id}`} className="text-primary">
                              {row.og_pr}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{row.pr}</td>
                        <td>$ {row.usd_amount}</td>
                        <td>
                          <AdminDateTimeCell value={row.timestamp} />
                        </td>
                        <td>{Number(row.admin_validity) !== 0 ? row.admin_validity : row.package_validity}</td>
                        <td>{row.package_validity}</td>
                        <td>{row.reason}</td>
                        <td>{row.admin_username || row.admin_id}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <button type="button" className="btn btn-secondary" onClick={() => navigate("/users")}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPrHistoryPage;
