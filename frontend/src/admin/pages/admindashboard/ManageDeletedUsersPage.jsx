import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";

const PAGE_SIZES = [10, 25, 50, 100];
const CELL_MAX_LENGTH = 100;

function truncateWithEllipsis(value, maxLength = CELL_MAX_LENGTH) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function ManageDeletedUsersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({
    start: 0,
    length: 10,
    search: "",
    sortBy: "id",
    sortOrder: "desc"
  });
  const [preview, setPreview] = useState({ open: false, label: "", value: "" });

  const currentPage = Math.floor(query.start / query.length) + 1;
  const startEntry = filteredTotal === 0 ? 0 : query.start + 1;
  const endEntry = Math.min(query.start + query.length, filteredTotal);
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < filteredTotal;

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await adminDashboardApi.getDeletedUsers(query);
        setRows(res.data?.data || []);
        setTotal(res.data?.meta?.recordsTotal || 0);
        setFilteredTotal(res.data?.meta?.recordsFiltered || 0);
      } catch (error) {
        setRows([]);
        setTotal(0);
        setFilteredTotal(0);
        toast.error(error.response?.data?.message || "Could not load deleted users");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [query]);

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

  const renderTruncatedCell = (value) => {
    const fullValue = String(value || "-");
    const isLong = fullValue.length > CELL_MAX_LENGTH;
    const truncatedValue = isLong ? truncateWithEllipsis(fullValue) : fullValue;
    return (
      <div className="deleted-user-cell-wrap" title={fullValue}>
        <span className={isLong ? "deleted-user-long-text" : ""}>{truncatedValue}</span>
        {isLong ? (
          <button
            type="button"
            className="deleted-user-more-btn"
            onClick={() => setPreview({ open: true, label: "Full Value", value: fullValue })}
          >
            More
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="container-fluid manage-deleted-user-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4 className="mt-2 mb-2">Manage Deleted User</h4>
        <button type="button" className="btn refresh-icon-btn" onClick={() => window.location.reload()} aria-label="Refresh page" title="Refresh">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
          </svg>
        </button>
      </div>
      <div className="data-table">
        <div className="card m-b-30 table-bg distribution-table-card">
          <div className="card-body table-responsive">
            <div className="login-log-controls">
              <label className="small text-muted m-0">
                Show{" "}
                <select
                  className="form-select form-select-sm d-inline-block login-log-length"
                  value={query.length}
                  onChange={(e) => setQuery((prev) => ({ ...prev, start: 0, length: Number(e.target.value) }))}
                >
                  {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
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
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("id")}>Sl.No. <span>{sortArrow("id")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("name")}>Name <span>{sortArrow("name")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("email")}>Email <span>{sortArrow("email")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("mobile")}>Phone <span>{sortArrow("mobile")}</span></button></th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted py-4">No deleted users found.</td></tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{query.start + index + 1}</td>
                    <td>{renderTruncatedCell(`${row.first_name || ""} ${row.last_name || ""}`.trim() || "-")}</td>
                    <td>{renderTruncatedCell(row.email || "-")}</td>
                    <td>{renderTruncatedCell(row.mobile || "-")}</td>
                    <td>Deleted</td>
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
                <button type="button" className="login-log-page-btn" disabled={!canGoPrevious} onClick={() => setQuery((prev) => ({ ...prev, start: Math.max(prev.start - prev.length, 0) }))}>Previous</button>
                <button type="button" className="login-log-page-btn active">{currentPage}</button>
                <button type="button" className="login-log-page-btn" disabled={!canGoNext} onClick={() => setQuery((prev) => ({ ...prev, start: Math.min(prev.start + prev.length, Math.max(filteredTotal - prev.length, 0)) }))}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {preview.open ? (
        <div className="modal-backdrop-lite">
          <div className="modal-card-lite deleted-user-preview-box">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">{preview.label}</h6>
              <button type="button" className="btn-close" onClick={() => setPreview({ open: false, label: "", value: "" })} />
            </div>
            <div className="deleted-user-preview-text">{preview.value}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ManageDeletedUsersPage;
