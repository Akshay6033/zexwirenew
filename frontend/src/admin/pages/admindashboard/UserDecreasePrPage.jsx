import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminPageBackHead from "../../components/AdminPageBackHead";

function UserDecreasePrPage() {
  const { userId, prRecordId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rec, setRec] = useState(null);
  const [decreasePr, setDecreasePr] = useState("1");
  const [reason, setReason] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboardApi.getDecreasePrForm(userId, prRecordId);
        setRec(res.data?.data || null);
      } catch (e) {
        toast.error(e.response?.data?.message || "Could not load record");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, prRecordId]);

  const maxDecrease = Number(rec?.usepr_limit || 0);

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(decreasePr);
    if (!reason.trim()) {
      toast.error("Enter reason");
      return;
    }
    if (!n || n < 1 || n > maxDecrease) {
      toast.error("Invalid decrease amount");
      return;
    }
    setSaving(true);
    try {
      await adminDashboardApi.postDecreasePr({
        user_id: Number(userId),
        pr_record_id: Number(prRecordId),
        decrease_pr: n,
        decrease_reason: reason.trim()
      });
      toast.success("PR decreased successfully");
      navigate(`/users/${userId}/history`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not decrease PR");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid user-decrease-pr-page">
      <AdminPageBackHead title="Decrease PR" onBack={() => navigate(-1)} />

      {loading && <AdminPageLoader label="Loading decrease PR…" />}
      {!loading && rec && (
        <div className="card table-bg distribution-table-card" style={{ maxWidth: 560 }}>
          <div className="card-body">
            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="form-label">Package Name</label>
                <input type="text" className="form-control" readOnly value={rec.pname || ""} />
              </div>
              <div className="mb-3">
                <label className="form-label">PR Limit</label>
                <input type="text" className="form-control" readOnly value={rec.pr_limit ?? ""} />
              </div>
              <div className="mb-3">
                <label className="form-label">Remaining Credits</label>
                <input type="text" className="form-control" readOnly value={rec.usepr_limit ?? ""} />
              </div>
              <div className="mb-3">
                <label className="form-label">Decrease PR</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={maxDecrease}
                  value={decreasePr}
                  onChange={(e) => setDecreasePr(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Reason</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Enter Decrease PR Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Please wait…" : "Decrease PR"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDecreasePrPage;
