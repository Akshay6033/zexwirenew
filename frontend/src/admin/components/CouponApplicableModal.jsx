import { useEffect, useState } from "react";
import { adminDashboardApi } from "../services/adminDashboardApi";

export default function CouponApplicableModal({ couponId, couponName, onClose, cacheRef }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!couponId) return;
    let cancelled = false;

    const cached = cacheRef?.current?.get(couponId);
    if (cached) {
      setData(cached);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setData(null);

    (async () => {
      try {
        const res = await adminDashboardApi.getCouponApplicable(couponId);
        if (cancelled) return;
        const payload = res.data?.data || null;
        if (payload && cacheRef?.current) {
          cacheRef.current.set(couponId, payload);
        }
        setData(payload);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [couponId, cacheRef]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = data?.c_name || couponName || "Coupon";

  return (
    <div className="modal-backdrop-lite" onClick={onClose} role="presentation">
      <div
        className="modal-card-lite coupon-applicable-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-applicable-title"
      >
        <div className="coupon-applicable-modal-head">
          <div>
            <h5 id="coupon-applicable-title" className="mb-1">
              {title}
            </h5>
            {data?.c_code ? (
              <p className="coupon-applicable-meta mb-0">
                Code: <strong>{data.c_code}</strong>
                {data.discount_label ? (
                  <>
                    {" "}
                    · Discount: <strong>{data.discount_label}</strong>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>

        {loading ? (
          <p className="text-muted py-3 mb-0">Loading packages and users…</p>
        ) : !data ? (
          <p className="text-muted py-3 mb-0">Could not load coupon details.</p>
        ) : (
          <div className="coupon-applicable-modal-body">
            <section className="coupon-applicable-section">
              <h6 className="coupon-applicable-section-title">
                Applicable to Packages
                <span className="coupon-applicable-count">({data.package_count || 0})</span>
              </h6>
              <ul className="coupon-applicable-list mb-0">
                {(data.package_names || []).map((name, idx) => (
                  <li key={`p-${idx}-${name}`}>{name}</li>
                ))}
                {!data.package_names?.length ? <li className="text-muted">None</li> : null}
              </ul>
            </section>

            <section className="coupon-applicable-section">
              <h6 className="coupon-applicable-section-title">
                Applicable to Users
                <span className="coupon-applicable-count">({data.user_count || 0})</span>
              </h6>
              <ul className="coupon-applicable-list mb-0">
                {(data.user_names || []).map((name, idx) => (
                  <li key={`u-${idx}-${name}`}>{name}</li>
                ))}
                {!data.user_names?.length && !data.user_count ? (
                  <li className="text-muted">None</li>
                ) : null}
              </ul>
              {data.user_more_count > 0 ? (
                <p className="coupon-applicable-more-note small text-muted mb-0 mt-2">
                  +{data.user_more_count} more users (open Edit Coupon to see full list)
                </p>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
