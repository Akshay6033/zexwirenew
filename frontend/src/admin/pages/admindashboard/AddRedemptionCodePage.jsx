import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import RedemptionCodeForm from "../../components/RedemptionCodeForm";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { getCachedCouponPackages } from "../../utils/couponMetaCache";

function AddRedemptionCodePage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getCachedCouponPackages(async () => {
          const res = await adminDashboardApi.getRedemptionMeta();
          return res.data?.data?.packages || [];
        });
        if (!cancelled) setPackages(list);
      } catch (error) {
        if (!cancelled) toast.error(error.response?.data?.message || "Could not load packages");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (payload) => {
    setFormError("");
    setSubmitting(true);
    try {
      const check = await adminDashboardApi.checkRedemptionCodeName({ code_name: payload.code_name });
      if (check.data?.exists) {
        setFormError("This code already exists. Please choose a different name.");
        return;
      }

      await adminDashboardApi.createRedemptionCode(payload);
      toast.success("Redemption code created successfully.");
      navigate("/admindashboard/redemption_codes");
    } catch (error) {
      const message = error.response?.data?.message || "Could not create redemption code";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid manage-redemption-page manage-coupon-page create-pr-legacy-page">
      <AdminPageBackHead title="Create Redemption Code" backTo="/admindashboard/redemption_codes" />

      <div className="row">
        <div className="col-lg-12">
          <div className="card m-b-30 form-body-border">
            <div className="card-body form-body">
              {formError ? <h6 className="field-error mb-3">{formError}</h6> : null}
              {packages.length === 0 ? (
                <p className="text-muted small mb-3">Loading packages…</p>
              ) : null}
              <RedemptionCodeForm
                packages={packages}
                submitting={submitting}
                submitLabel="Create Code"
                onSubmit={onSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddRedemptionCodePage;
