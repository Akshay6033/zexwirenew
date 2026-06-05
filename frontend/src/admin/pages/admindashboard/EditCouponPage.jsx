import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminPageLoader from "../../components/AdminPageLoader";
import CouponForm from "../../components/CouponForm";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { getCachedCouponPackages } from "../../utils/couponMetaCache";

function EditCouponPage() {
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
        const [pkgList, couponRes] = await Promise.all([
          getCachedCouponPackages(async () => {
            const res = await adminDashboardApi.getCouponMeta();
            return res.data?.data?.packages || [];
          }),
          adminDashboardApi.getCouponById(id)
        ]);
        if (cancelled) return;
        setPackages(pkgList);
        const offer = couponRes.data?.data;
        if (!offer) {
          toast.error("Coupon not found");
          navigate("/admindashboard/manage_coupon");
          return;
        }
        setInitial({
          c_name: offer.c_name,
          c_code: offer.c_code,
          c_discount: offer.c_discount,
          c_value: offer.c_value,
          c_limit: offer.c_limit,
          c_limit_pending: offer.c_limit_pending,
          start_date: offer.start_date,
          end_date: offer.end_date,
          package_ids: offer.package_ids || [],
          user_ids: offer.user_ids || []
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || "Could not load coupon");
          navigate("/admindashboard/manage_coupon");
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
      await adminDashboardApi.updateCoupon(id, payload);
      toast.success("Coupon updated successfully");
      navigate("/admindashboard/manage_coupon");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update coupon");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <AdminPageLoader label="Loading coupon…" />;

  return (
    <div className="container-fluid manage-coupon-page create-pr-legacy-page">
      <AdminPageBackHead title="Edit Coupon" backTo="/admindashboard/manage_coupon" />

      <div className="row">
        <div className="col-lg-12">
          <div className="card m-b-30 form-body-border">
            <div className="card-body form-body">
              <CouponForm
                initial={initial}
                packages={packages}
                submitting={submitting}
                submitLabel="Update Coupon"
                onSubmit={onSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditCouponPage;
