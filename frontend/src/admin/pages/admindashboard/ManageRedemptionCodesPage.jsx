import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { useConfirm } from "../../context/ConfirmContext";
import RedemptionPackagesModal from "../../components/RedemptionPackagesModal";

const PAGE_SIZES = [10, 25, 50, 100];
const ICON_SZ = 14;

function SvgEye() {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SZ} height={ICON_SZ} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
    </svg>
  );
}

function IconLink({ to, label, children }) {
  return (
    <Link to={to} className="edit-icon-btn redemption-view-icon-btn" title={label} aria-label={label}>
      {children}
    </Link>
  );
}

function isRowActive(row) {
  return row.active === 1 || row.active === true;
}

function statusBadgeClass(status) {
  const map = {
    Active: "redemption-status-active",
    Inactive: "redemption-status-inactive",
    Expired: "redemption-status-expired",
    Depleted: "redemption-status-depleted"
  };
  return map[status] || "redemption-status-inactive";
}

function ManageRedemptionCodesPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);
  const packagesCacheRef = useRef(new Map());
  const [packagesModal, setPackagesModal] = useState(null);
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
      const res = await adminDashboardApi.getRedemptionCodes(query);
      setRows(res.data?.data || []);
      setTotal(res.data?.meta?.recordsTotal || 0);
      setFilteredTotal(res.data?.meta?.recordsFiltered || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setFilteredTotal(0);
      toast.error(error.response?.data?.message || "Could not load redemption codes");
    } finally {
      setLoading(false);
      setInitialLoad(false);
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

  const refreshList = () => setReloadTick((t) => t + 1);

  const openPackagesPopup = (row) => {
    setPackagesModal({ id: row.id, name: row.code_name });
  };

  const closePackagesPopup = () => setPackagesModal(null);

  const toggleActive = async (row) => {
    const isActive = isRowActive(row);
    const ok = await confirm(
      isActive ? "Are you sure Deactive Redemption Code ?" : "Are you sure Active Redemption Code ?"
    );
    if (!ok) return;
    try {
      if (isActive) {
        await adminDashboardApi.deactivateRedemptionCode(row.id);
        toast.success("Redemption code deactivated successfully.");
      } else {
        await adminDashboardApi.activateRedemptionCode(row.id);
        toast.success("Redemption code activated successfully.");
      }
      refreshList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update code status");
    }
  };

  return (
    <div className="container-fluid manage-redemption-page manage-coupon-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4>Redemption Codes</h4>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn refresh-icon-btn"
            onClick={refreshList}
            aria-label="Refresh redemption codes"
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
            onClick={() => navigate("/admindashboard/add_redemption_code")}
          >
            Create Redemption Code
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
                  placeholder="Code name (min 3 chars)"
                />
              </label>
            </div>

            <table className="table table-bordered table-bg1 mb-0">
              <thead>
                <tr>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("code_name")}>
                      Code <span>{sortArrow("code_name")}</span>
                    </button>
                  </th>
                  <th>Packages Assigned</th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("usage_limit")}>
                      Usage Limit <span>{sortArrow("usage_limit")}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("redeemed_count")}>
                      Redeemed <span>{sortArrow("redeemed_count")}</span>
                    </button>
                  </th>
                  <th>Remaining</th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("expiry_date")}>
                      Expiry <span>{sortArrow("expiry_date")}</span>
                    </button>
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
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
                    <td colSpan={9} className="text-center text-muted py-4">
                      Loading redemption codes…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && !initialLoad && (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-4">
                      No redemption codes found.
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.code_name}</strong>
                    </td>
                    <td className="coupon-packages-cell">
                      {(row.package_names || []).map((name) => (
                        <div key={`${row.id}-${name}`}>{name}</div>
                      ))}
                      {row.package_names_more > 0 ? (
                        <button
                          type="button"
                          className="coupon-packages-more-btn"
                          onClick={() => openPackagesPopup(row)}
                        >
                          +{row.package_names_more} more
                        </button>
                      ) : null}
                      {row.package_count > 0 && row.package_names_more === 0 ? (
                        <button
                          type="button"
                          className="coupon-packages-more-btn coupon-packages-view-btn"
                          onClick={() => openPackagesPopup(row)}
                        >
                          View all
                        </button>
                      ) : null}
                    </td>
                    <td>{row.usage_limit}</td>
                    <td>{row.redeemed_count}</td>
                    <td>{row.remaining}</td>
                    <td>{row.expiry_label}</td>
                    <td>
                      <span className={`redemption-status-badge ${statusBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <IconLink
                          to={`/admindashboard/redemption_code_logs/${row.id}`}
                          label="View Redemptions"
                        >
                          <SvgEye />
                        </IconLink>
                        <button
                          type="button"
                          className="edit-icon-btn"
                          onClick={() => navigate(`/admindashboard/edit_redemption_code/${row.id}`)}
                          aria-label="Edit redemption code"
                          title="Edit"
                        >
                          ✎
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`status-toggle ${isRowActive(row) ? "on" : "off"}`}
                        onClick={() => toggleActive(row)}
                        aria-label={
                          isRowActive(row) ? "Deactivate redemption code" : "Activate redemption code"
                        }
                        title={isRowActive(row) ? "Deactivate" : "Activate"}
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

      {packagesModal ? (
        <RedemptionPackagesModal
          codeId={packagesModal.id}
          codeName={packagesModal.name}
          onClose={closePackagesPopup}
          cacheRef={packagesCacheRef}
        />
      ) : null}
    </div>
  );
}

export default ManageRedemptionCodesPage;
