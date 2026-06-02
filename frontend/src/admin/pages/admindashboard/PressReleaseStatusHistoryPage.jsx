import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminPageLoader from "../../components/AdminPageLoader";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { formatEditorialSubmissionDate } from "../../utils/adminDateFormat";

const TAB_HISTORY_TITLES = {
  pending: "Pending Press Release [History]",
  action: "Pending Press Release [History]"
};

export default function PressReleaseStatusHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const pressId = Number(id);
  const fromTab = location.state?.fromTab || "pending";
  const returnTo = location.state?.returnTo || `/admindashboard/manage_editorial?tab=${fromTab}`;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [press, setPress] = useState(null);

  const pageTitle = TAB_HISTORY_TITLES[fromTab] || "Press Release [History]";

  const load = useCallback(async () => {
    if (!pressId) return;
    setLoading(true);
    try {
      const res = await adminDashboardApi.getPressReleaseStatusHistory(pressId);
      if (!res.data?.status) {
        toast.error(res.data?.message || "Could not load status history.");
        navigate(returnTo);
        return;
      }
      setPress(res.data.data?.press || null);
      setRows(res.data.data?.rows || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load status history.");
      navigate(returnTo);
    } finally {
      setLoading(false);
    }
  }, [pressId, navigate, returnTo]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <AdminPageLoader label="Loading status history…" />;

  return (
    <div className="container-fluid press-release-status-history-page">
      <AdminPageBackHead title={pageTitle} backTo={returnTo} />

      <div className="row">
        <div className="col-lg-12 col-sm-12">
          <div className="card m-b-30 table-bg">
            <div className="card-body table-responsive">
              {press && (
                <p className="text-muted small mb-3">
                  PR #{press.release_no} — {press.status_label}
                  {press.title && press.title.length > 80 ? `: ${press.title.slice(0, 80)}…` : press.title ? `: ${press.title}` : ""}
                </p>
              )}
              <table className="table table-bordered table-bg1 mb-0">
                <thead>
                  <tr>
                    <th>
                      Release
                      <br />
                      Number
                    </th>
                    <th>Title</th>
                    <th>User Name</th>
                    <th>Status</th>
                    <th>Comment</th>
                    <th>Date &amp; Time</th>
                    <th>
                      who&apos;s action on
                      <br />
                      this page
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No status history found for this press release.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.release_no ?? press?.release_no ?? "—"}</td>
                        <td className="press-status-history-title">{row.title ?? press?.title ?? "—"}</td>
                        <td>{row.user_name}</td>
                        <td>
                          <span
                            className={
                              Number(row.status) === 3
                                ? "press-status-history-badge press-status-history-badge--action"
                                : ""
                            }
                          >
                            {row.status_label}
                          </span>
                        </td>
                        <td className="press-status-history-comment">{row.status_note || "—"}</td>
                        <td>{formatEditorialSubmissionDate(row.status_datetime)}</td>
                        <td>{row.staff_username}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
