import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminPageLoader from "../../components/AdminPageLoader";
import RedemptionCodeForm from "../../components/RedemptionCodeForm";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { getCachedCouponPackages } from "../../utils/couponMetaCache";

function EditRedemptionCodePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [pkgList, codeRes] = await Promise.all([
          getCachedCouponPackages(async () => {
            const res = await adminDashboardApi.getRedemptionMeta();
            return res.data?.data?.packages || [];
          }),
          adminDashboardApi.getRedemptionCodeById(id)
        ]);
        if (cancelled) return;
        setPackages(pkgList);
        const code = codeRes.data?.data;
        if (!code) {
          toast.error("Redemption code not found");
          navigate("/admindashboard/redemption_codes");
          return;
        }
        setInitial({
          code_name: code.code_name,
          package_ids: code.package_ids || [],
          usage_limit: code.usage_limit,
          expiry_date: code.expiry_date,
          target_audience: code.target_audience,
          active: code.active
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || "Could not load redemption code");
          navigate("/admindashboard/redemption_codes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const onSubmit = async (payload) => {
    setSubmitting(true);
    try {
      await adminDashboardApi.updateRedemptionCode(id, payload);
      toast.success("Redemption code updated successfully.");
      navigate("/admindashboard/redemption_codes");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update redemption code");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <AdminPageLoader label="Loading redemption code…" />;

  return (
    <div className="container-fluid manage-redemption-page manage-coupon-page create-pr-legacy-page">
      <AdminPageBackHead title="Edit Redemption Code" backTo="/admindashboard/redemption_codes" />

      <div className="row">
        <div className="col-lg-12">
          <div className="card m-b-30 form-body-border">
            <div className="card-body form-body">
              <RedemptionCodeForm
                initial={initial}
                packages={packages}
                submitting={submitting}
                submitLabel="Update Code"
                onSubmit={onSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditRedemptionCodePage;
