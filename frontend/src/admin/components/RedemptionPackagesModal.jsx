import { useEffect, useState } from "react";
import { adminDashboardApi } from "../services/adminDashboardApi";

export default function RedemptionPackagesModal({ codeId, codeName, onClose, cacheRef }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!codeId) return undefined;
    let cancelled = false;

    const cached = cacheRef?.current?.get(codeId);
    if (cached) {
      setData(cached);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setData(null);

    (async () => {
      try {
        const res = await adminDashboardApi.getRedemptionCodeById(codeId);
        if (cancelled) return;
        const payload = res.data?.data || null;
        if (payload && cacheRef?.current) {
          cacheRef.current.set(codeId, payload);
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
  }, [codeId, cacheRef]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = data?.code_name || codeName || "Redemption Code";

  return (
    <div className="modal-backdrop-lite" onClick={onClose} role="presentation">
      <div
        className="modal-card-lite coupon-applicable-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="redemption-packages-title"
      >
        <div className="coupon-applicable-modal-head">
          <div>
            <h5 id="redemption-packages-title" className="mb-1">
              {title}
            </h5>
            {data?.status ? (
              <p className="coupon-applicable-meta mb-0">
                Status: <strong>{data.status}</strong>
              </p>
            ) : null}
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>

        {loading ? (
          <p className="text-muted py-3 mb-0">Loading packages…</p>
        ) : !data ? (
          <p className="text-muted py-3 mb-0">Could not load code details.</p>
        ) : (
          <div className="coupon-applicable-modal-body">
            <section className="coupon-applicable-section">
              <h6 className="coupon-applicable-section-title">
                Packages Assigned
                <span className="coupon-applicable-count">({(data.package_names || []).length})</span>
              </h6>
              <ul className="coupon-applicable-list mb-0">
                {(data.package_names || []).map((name, idx) => (
                  <li key={`p-${idx}-${name}`}>{name}</li>
                ))}
                {!data.package_names?.length ? <li className="text-muted">None</li> : null}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
