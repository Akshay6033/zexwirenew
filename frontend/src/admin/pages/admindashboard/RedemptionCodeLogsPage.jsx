import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminPageLoader from "../../components/AdminPageLoader";
import { adminDashboardApi } from "../../services/adminDashboardApi";

const PAGE_SIZES = [25, 50, 100];

function RedemptionCodeLogsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [codeInfo, setCodeInfo] = useState(null);
  const [rows, setRows] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [query, setQuery] = useState({ start: 0, length: 25 });

  const startEntry = filteredTotal === 0 ? 0 : query.start + 1;
  const endEntry = Math.min(query.start + query.length, filteredTotal);
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < filteredTotal;
  const currentPage = Math.floor(query.start / query.length) + 1;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboardApi.getRedemptionLogs(id, query);
        if (cancelled) return;
        setCodeInfo(res.data?.data?.code || null);
        setRows(res.data?.data?.redemptions || []);
        setFilteredTotal(res.data?.meta?.recordsFiltered ?? 0);
      } catch (error) {
        if (!cancelled) {
          setCodeInfo(null);
          setRows([]);
          toast.error(error.response?.data?.message || "Could not load redemptions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, query]);

  if (loading && !codeInfo) return <AdminPageLoader label="Loading redemptions…" />;

  if (!codeInfo) {
    return (
      <div className="container-fluid manage-redemption-page manage-coupon-page create-pr-legacy-page">
        <AdminPageBackHead title="View Redemptions" onBack={() => navigate("/admindashboard/redemption_codes")} />
        <p className="text-muted">Redemption code not found.</p>
      </div>
    );
  }

  return (
    <div className="container-fluid manage-redemption-page manage-coupon-page create-pr-legacy-page">
      <AdminPageBackHead title="View Redemptions" backTo="/admindashboard/redemption_codes" />

      <div className="row">
        <div className="col-lg-12">
          <div className="card m-b-30 table-bg distribution-table-card">
            <div className="card-body table-responsive">
              <h5 className="mb-1">Code: {codeInfo.code_name}</h5>
              <p className="text-muted small mb-3">Status: {codeInfo.status}</p>

              <div className="login-log-controls mb-3">
                <label className="small text-muted m-0">
                  Show{" "}
                  <select
                    className="form-select form-select-sm d-inline-block login-log-length"
                    value={query.length}
                    onChange={(e) =>
                      setQuery((prev) => ({ ...prev, start: 0, length: Number(e.target.value) }))
                    }
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>{" "}
                  entries
                </label>
              </div>

              <table className="table table-bordered table-bg1 mb-0">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Email</th>
                    <th>Redeemed On</th>
                    <th>Packages Granted</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        No redemptions yet for this code.
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.user_name}</td>
                      <td>{row.email}</td>
                      <td>{row.redeemed_at ? new Date(row.redeemed_at).toLocaleString() : "—"}</td>
                      <td className="coupon-packages-cell">
                        {(row.package_names || []).map((name) => (
                          <div key={`${row.id}-${name}`}>{name}</div>
                        ))}
                        {!row.package_names?.length ? "—" : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="login-log-pagination-wrap mt-3">
                <div className="small text-muted">
                  Showing {startEntry} to {endEntry} of {filteredTotal} redemptions
                </div>
                <div className="login-log-pagination">
                  <button
                    type="button"
                    className="login-log-page-btn"
                    disabled={!canGoPrevious}
                    onClick={() =>
                      setQuery((prev) => ({ ...prev, start: Math.max(prev.start - prev.length, 0) }))
                    }
                  >
                    Previous
                  </button>
                  <button type="button" className="login-log-page-btn active">
                    {currentPage}
                  </button>
                  <button
                    type="button"
                    className="login-log-page-btn"
                    disabled={!canGoNext}
                    onClick={() =>
                      setQuery((prev) => ({
                        ...prev,
                        start: Math.min(
                          prev.start + prev.length,
                          Math.max(filteredTotal - prev.length, 0)
                        )
                      }))
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RedemptionCodeLogsPage;
