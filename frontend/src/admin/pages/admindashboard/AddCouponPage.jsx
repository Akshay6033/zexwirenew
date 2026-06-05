import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import CouponForm from "../../components/CouponForm";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { getCachedCouponPackages } from "../../utils/couponMetaCache";

function AddCouponPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getCachedCouponPackages(async () => {
          const res = await adminDashboardApi.getCouponMeta();
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
    setAvailabilityError("");
    setSubmitting(true);
    try {
      const check = await adminDashboardApi.checkCouponAvailability({
        code: payload.c_code,
        name: payload.c_name
      });
      if (check.data?.code === 1) {
        setAvailabilityError("Coupon code already exist");
        return;
      }
      if (check.data?.name === 2) {
        setAvailabilityError("Coupon name already exist");
        return;
      }

      await adminDashboardApi.createCoupon(payload);
      toast.success("Coupon added successfully");
      navigate("/admindashboard/manage_coupon");
    } catch (error) {
      const message = error.response?.data?.message || "Could not add coupon";
      setAvailabilityError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid manage-coupon-page create-pr-legacy-page">
      <AdminPageBackHead title="Add New Coupon" backTo="/admindashboard/manage_coupon" />

      <div className="row">
        <div className="col-lg-12">
          <div className="card m-b-30 form-body-border">
            <div className="card-body form-body">
              {availabilityError ? <h6 className="field-error mb-3">{availabilityError}</h6> : null}
              {packages.length === 0 ? (
                <p className="text-muted small mb-3">Loading packages…</p>
              ) : null}
              <CouponForm packages={packages} submitting={submitting} submitLabel="Submit" onSubmit={onSubmit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddCouponPage;
