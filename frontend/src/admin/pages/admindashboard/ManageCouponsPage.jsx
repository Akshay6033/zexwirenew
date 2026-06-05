import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { useConfirm } from "../../context/ConfirmContext";
import CouponApplicableModal from "../../components/CouponApplicableModal";

const PAGE_SIZES = [10, 25, 50, 100];

function ManageCouponsPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);
  const abortRef = useRef(null);
  const applicableCacheRef = useRef(new Map());
  const [applicableModal, setApplicableModal] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({
    start: 0,
    length: 10,
    search: "",
    sortBy: "id",
    sortOrder: "desc"
  });

  const startEntry = filteredTotal === 0 ? 0 : query.start + 1;
  const endEntry = Math.min(query.start + query.length, filteredTotal);
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < filteredTotal;
  const currentPage = Math.floor(query.start / query.length) + 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      const typed = searchInput.trim();
      const nextSearch = typed.length >= 3 ? typed : "";
      setQuery((prev) => {
        if (prev.start === 0 && prev.search === nextSearch) return prev;
        return { ...prev, start: 0, search: nextSearch };
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminDashboardApi.getCoupons(query);
      setRows(res.data?.data || []);
      setTotal(res.data?.meta?.recordsTotal || 0);
      setFilteredTotal(res.data?.meta?.recordsFiltered || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setFilteredTotal(0);
      toast.error(error.response?.data?.message || "Could not load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [query, reloadTick]);

  const onSort = (column) => {
    setQuery((prev) => ({
      ...prev,
      start: 0,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === "asc" ? "desc" : "asc"
    }));
  };

  const sortArrow = (column) => {
    if (query.sortBy !== column) return "↕";
    return query.sortOrder === "asc" ? "↑" : "↓";
  };

  const toggleStatus = async (row) => {
    const nextActive = row.active ? 0 : 1;
    const ok = await confirm(
      nextActive ? "Are you sure Active Coupon ?" : "Are you sure Deactive Coupon ?"
    );
    if (!ok) return;
    try {
      await adminDashboardApi.updateCouponStatus(row.id, { active: nextActive });
      toast.success(
        nextActive ? "Coupon activated Successfully" : "Coupon Deactived Successfully"
      );
      setReloadTick((t) => t + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update coupon status");
    }
  };

  const refreshList = () => setReloadTick((t) => t + 1);

  const openApplicablePopup = (row) => {
    setApplicableModal({ id: row.id, name: row.c_name });
  };

  const closeApplicablePopup = () => setApplicableModal(null);

  const deletePermanently = async (row) => {
    const ok = await confirm("Are you sure delete permanently Coupon ?");
    if (!ok) return;
    try {
      await adminDashboardApi.deleteCouponPermanently(row.id);
      toast.success("Coupon deleted permanently");
      refreshList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete coupon");
    }
  };

  return (
    <div className="container-fluid manage-coupon-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4>Manage Coupons</h4>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn refresh-icon-btn"
            onClick={refreshList}
            aria-label="Refresh coupons"
            title="Refresh"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z"
              />
            </svg>
          </button>
          <button
            type="button"
            className="btn add-vendor-btn"
            onClick={() => navigate("/admindashboard/add_coupon")}
          >
            Add New Coupons
          </button>
        </div>
      </div>

      <div className="data-table">
        <div className={`card m-b-30 table-bg distribution-table-card ${loading && !initialLoad ? "is-loading" : ""}`}>
          <div className="card-body table-responsive">
            <div className="login-log-controls">
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
              <label className="small text-muted m-0">
                Search:{" "}
                <input
                  className="form-control form-control-sm d-inline-block login-log-search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </label>
            </div>

            <table className="table table-bordered table-bg1 mb-0">
              <thead>
                <tr>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("id")}>
                      Sl.No. <span>{sortArrow("id")}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("id")}>
                      Coupon Id <span>{sortArrow("id")}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("c_name")}>
                      Coupon Name <span>{sortArrow("c_name")}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("c_code")}>
                      Coupon Code <span>{sortArrow("c_code")}</span>
                    </button>
                  </th>
                  <th>Discount</th>
                  <th>Applicable to Packages</th>
                  <th>Edit Coupon</th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("active")}>
                      Active Deactive <span>{sortArrow("active")}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {initialLoad && loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      Loading coupons…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && !initialLoad && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      No coupons found.
                    </td>
                  </tr>
                )}
                {rows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{query.start + index + 1}</td>
                      <td>{row.id}</td>
                      <td>
                        <Link
                          to={`/admindashboard/coupon_history/${row.id}`}
                          className="coupon-name-link"
                        >
                          {row.c_name}
                        </Link>
                      </td>
                      <td>{row.c_code}</td>
                      <td>{row.discount_label}</td>
                      <td className="coupon-packages-cell">
                        {(row.package_names || []).map((name) => (
                          <div key={`${row.id}-${name}`}>{name}</div>
                        ))}
                        {row.package_more_count > 0 ? (
                          <button
                            type="button"
                            className="coupon-packages-more-btn"
                            onClick={() => openApplicablePopup(row)}
                          >
                            +{row.package_more_count} more
                          </button>
                        ) : null}
                        {(row.package_count > 0 || row.package_names?.length) &&
                        row.package_more_count === 0 ? (
                          <button
                            type="button"
                            className="coupon-packages-more-btn coupon-packages-view-btn"
                            onClick={() => openApplicablePopup(row)}
                          >
                            View all
                          </button>
                        ) : null}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="edit-icon-btn"
                            onClick={() => navigate(`/admindashboard/edit_coupon/${row.id}`)}
                            aria-label="Edit coupon"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="edit-icon-btn country-delete-icon-btn"
                            onClick={() => deletePermanently(row)}
                            aria-label="Delete coupon permanently"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`status-toggle ${row.active ? "on" : "off"}`}
                          onClick={() => toggleStatus(row)}
                          aria-label={row.active ? "Deactivate coupon" : "Activate coupon"}
                        >
                          <span className="status-toggle-knob" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <div className="login-log-pagination-wrap">
              <div className="small text-muted">
                Showing {startEntry} to {endEntry} of {filteredTotal} entries
                {query.search ? ` (filtered from ${total} total entries)` : ""}
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

      {applicableModal ? (
        <CouponApplicableModal
          couponId={applicableModal.id}
          couponName={applicableModal.name}
          onClose={closeApplicablePopup}
          cacheRef={applicableCacheRef}
        />
      ) : null}
    </div>
  );
}

export default ManageCouponsPage;
