import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminPageLoader from "../../components/AdminPageLoader";
import { adminDashboardApi } from "../../services/adminDashboardApi";

const USER_PAGE_SIZES = [25, 50, 100];

function CouponHistoryUsersPanel({ couponId, userCount }) {
  const abortRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({ start: 0, length: 50, search: "" });
  const [searchMinHint, setSearchMinHint] = useState(false);

  const startEntry = filteredTotal === 0 ? 0 : query.start + 1;
  const endEntry = Math.min(query.start + query.length, filteredTotal);
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < filteredTotal;
  const currentPage = Math.floor(query.start / query.length) + 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      const typed = searchInput.trim();
      const needsMin = userCount > 500;
      const nextSearch = typed.length === 0 ? "" : needsMin && typed.length < 3 ? "" : typed;
      setSearchMinHint(needsMin && typed.length > 0 && typed.length < 3);
      setQuery((prev) => {
        if (prev.start === 0 && prev.search === nextSearch) return prev;
        return { ...prev, start: 0, search: nextSearch };
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, userCount]);

  useEffect(() => {
    if (!couponId) return undefined;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboardApi.getCouponHistoryUsers(couponId, query, {
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        setRows(res.data?.data || []);
        setFilteredTotal(res.data?.meta?.recordsFiltered ?? 0);
        if (res.data?.meta?.searchMinLength) setSearchMinHint(true);
      } catch (error) {
        if (controller.signal.aborted || error.code === "ERR_CANCELED") return;
        setRows([]);
        setFilteredTotal(0);
        toast.error(error.response?.data?.message || "Could not load users");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [couponId, query]);

  if (!userCount) {
    return <p className="text-muted small mb-0">No users assigned to this coupon.</p>;
  }

  return (
    <div className="coupon-history-users-panel">
      <div className="login-log-controls coupon-history-users-controls">
        <label className="small text-muted m-0">
          Show{" "}
          <select
            className="form-select form-select-sm d-inline-block login-log-length"
            value={query.length}
            onChange={(e) =>
              setQuery((prev) => ({ ...prev, start: 0, length: Number(e.target.value) }))
            }
          >
            {USER_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>{" "}
          users per page
        </label>
        <label className="small text-muted m-0">
          Search:{" "}
          <input
            className="form-control form-control-sm d-inline-block login-log-search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={userCount > 500 ? "Min 3 characters" : "Name"}
          />
        </label>
      </div>
      {searchMinHint ? (
        <p className="small text-muted mb-2">Type at least 3 characters to search {userCount} users.</p>
      ) : null}

      <div className={`coupon-history-users-list ${loading ? "is-loading" : ""}`}>
        <ul className="coupon-applicable-list mb-0">
          {rows.map((row, idx) => (
            <li key={`${row.id}-${idx}`}>{row.label}</li>
          ))}
          {!loading && rows.length === 0 ? (
            <li className="text-muted">No users found.</li>
          ) : null}
        </ul>
      </div>

      <div className="login-log-pagination-wrap mt-2">
        <div className="small text-muted">
          Showing {startEntry} to {endEntry} of {filteredTotal} users
          {query.search ? ` (of ${userCount} total assigned)` : ""}
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
                start: Math.min(prev.start + prev.length, Math.max(filteredTotal - prev.length, 0))
              }))
            }
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function CouponHistoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboardApi.getCouponHistory(id);
        if (!cancelled) setOffer(res.data?.data || null);
      } catch (error) {
        if (!cancelled) {
          setOffer(null);
          toast.error(error.response?.data?.message || "Could not load coupon history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <AdminPageLoader label="Loading coupon history…" />;

  if (!offer) {
    return (
      <div className="container-fluid manage-coupon-page create-pr-legacy-page">
        <AdminPageBackHead title="View Coupon History" onBack={() => navigate("/admindashboard/manage_coupon")} />
        <p className="text-muted">Coupon not found.</p>
      </div>
    );
  }

  return (
    <div className="container-fluid manage-coupon-page create-pr-legacy-page">
      <AdminPageBackHead title="View Coupon History" backTo="/admindashboard/manage_coupon" />

      <div className="row">
        <div className="col-lg-12">
          <div className="card m-b-30 table-bg distribution-table-card">
            <div className="card-body table-responsive">
              <h5 id="histroy-coupon" className="mb-1">
                Coupon History
              </h5>
              {offer.c_name ? (
                <p className="coupon-history-subtitle text-muted mb-3">
                  {offer.c_name} · {offer.c_code} · {offer.discount_label}
                </p>
              ) : null}

              <div className="table-odd coupon-history-scroll">
                <table className="table table-bordered table-bg1 mb-4">
                  <thead>
                    <tr>
                      <th>Coupon Code</th>
                      <th>Discount</th>
                      <th>
                        Applicable
                        <br />
                        to Packages
                      </th>
                      <th>
                        Applicable
                        <br />
                        to users
                      </th>
                      <th>
                        Maximum Number of times
                        <br />
                        the coupon can be used
                      </th>
                      <th>
                        How of times
                        <br />
                        the coupon used
                      </th>
                      <th>
                        Start Date
                        <br />
                        MM/DD/YYYY
                      </th>
                      <th>
                        End Date
                        <br />
                        MM/DD/YYYY
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{offer.c_code}</td>
                      <td>{offer.discount_label}</td>
                      <td className="coupon-packages-cell coupon-history-packages-cell">
                        <div className="coupon-history-packages-scroll">
                          {(offer.package_names || []).map((name, idx) => (
                            <div key={`${idx}-${name}`}>{name}</div>
                          ))}
                        </div>
                        {offer.package_count > 0 ? (
                          <div className="small text-muted mt-1">{offer.package_count} packages</div>
                        ) : null}
                      </td>
                      <td className="coupon-users-cell">
                        <strong>{offer.user_count || 0}</strong> users
                        <div className="small text-muted">Listed below</div>
                      </td>
                      <td>{offer.c_limit}</td>
                      <td>{offer.c_limit_use}</td>
                      <td>{offer.start_date}</td>
                      <td>{offer.end_date}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="table table-bordered table-bg1 coupon-usage-summary mb-4">
                  <thead>
                    <tr>
                      <th>
                        Maximum Number of times
                        <br />
                        the coupon can be used
                      </th>
                      <th>
                        How many times
                        <br />
                        the coupon is used
                      </th>
                      <th>
                        How many times still
                        <br />
                        the coupon can be used
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{offer.c_limit}</td>
                      <td>{offer.c_limit_use}</td>
                      <td>{offer.c_limit_pending}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="coupon-history-users-section">
                  <h6 className="coupon-applicable-section-title mb-2">
                    Applicable to Users
                    <span className="coupon-applicable-count">({offer.user_count || 0})</span>
                  </h6>
                  <CouponHistoryUsersPanel couponId={offer.id} userCount={offer.user_count || 0} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CouponHistoryPage;
