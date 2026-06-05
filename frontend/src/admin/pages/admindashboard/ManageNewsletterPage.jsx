import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { useConfirm } from "../../context/ConfirmContext";

const PAGE_SIZES = [10, 25, 50, 100];

function ManageNewsletterPage() {
  const { confirm } = useConfirm();
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
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState({ id: "", email: "", timestamp: "" });
  const [viewLoading, setViewLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const currentPage = Math.floor(query.start / query.length) + 1;
  const totalPages = Math.max(Math.ceil(filteredTotal / query.length), 1);
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

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminDashboardApi.getNewsletters(query);
      setRows(res.data?.data || []);
      setSelectedIds([]);
      setTotal(res.data?.meta?.recordsTotal || 0);
      setFilteredTotal(res.data?.meta?.recordsFiltered || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setFilteredTotal(0);
      toast.error(error.response?.data?.message || "Could not load newsletters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const openView = async (row) => {
    setViewModalOpen(true);
    setViewLoading(true);
    try {
      const res = await adminDashboardApi.getNewsletterById(row.id);
      setViewData(res.data?.data || { id: "", email: "", timestamp: "" });
    } catch (error) {
      setViewData({ id: "", email: "", timestamp: "" });
      toast.error(error.response?.data?.message || "Could not load newsletter");
    } finally {
      setViewLoading(false);
    }
  };

  const deletePermanently = async (row) => {
    const ok = await confirm("Are you sure delete permanently Newsletter ?");
    if (!ok) return;
    try {
      await adminDashboardApi.deleteNewsletterPermanently(row.id);
      toast.success("Newsletter deleted successfully");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete newsletter");
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const toggleSelectAllCurrentPage = () => {
    const currentIds = rows.map((row) => row.id);
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const deleteSelected = async () => {
    if (!selectedIds.length) {
      toast.error("Please select at least one newsletter.");
      return;
    }
    const ok = await confirm("Are you sure delete selected newsletters permanently ?");
    if (!ok) return;
    try {
      const res = await adminDashboardApi.deleteNewslettersBulk({ ids: selectedIds });
      toast.success(res.data?.message || "Selected newsletters deleted successfully");
      setSelectedIds([]);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete selected newsletters");
    }
  };

  const downloadCsv = () => {
    const params = new URLSearchParams({
      search: query.search || "",
      sortBy: query.sortBy || "id",
      sortOrder: query.sortOrder || "desc"
    });
    window.open(`${import.meta.env.VITE_API_URL || "/api"}/admindashboard/newsletters/export.csv?${params.toString()}`, "_blank");
  };

  const allCurrentSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  return (
    <div className="container-fluid manage-newsletter-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4 className="mt-2 mb-2">Manage Newsletter</h4>
        <div className="d-flex gap-2 align-items-center manage-user-head-actions">
          <button type="button" className="btn manage-user-download-btn" onClick={downloadCsv}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3 1.4 1.42-4.7 4.7-4.7-4.7 1.4-1.42 2.3 2.3V4a1 1 0 0 1 1-1Zm-7 14h14v3H5v-3Z" />
            </svg>
            <span>Download CSV</span>
          </button>
          <button type="button" className="btn refresh-icon-btn" onClick={() => window.location.reload()} aria-label="Refresh page" title="Refresh">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
            </svg>
          </button>
          <button type="button" className="btn add-vendor-btn-outline-danger" onClick={deleteSelected}>
            Delete Selected
          </button>
        </div>
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
                  <th>
                    <input type="checkbox" checked={allCurrentSelected} onChange={toggleSelectAllCurrentPage} />
                  </th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("id")}>Sr.No <span>{sortArrow("id")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("email")}>Email id <span>{sortArrow("email")}</span></button></th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted py-4">No newsletters found.</td></tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelectRow(row.id)} /></td>
                    <td>{query.start + index + 1}</td>
                    <td>{row.email}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button type="button" className="edit-icon-btn" onClick={() => openView(row)} aria-label="View newsletter">✉</button>
                        <button type="button" className="edit-icon-btn country-delete-icon-btn" onClick={() => deletePermanently(row)} aria-label="Delete newsletter permanently">🗑</button>
                      </div>
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
                <button type="button" className="login-log-page-btn" disabled={!canGoPrevious} onClick={() => setQuery((prev) => ({ ...prev, start: Math.max(prev.start - prev.length, 0) }))}>Previous</button>
                <button type="button" className="login-log-page-btn active">{currentPage}</button>
                <button type="button" className="login-log-page-btn" disabled={!canGoNext} onClick={() => setQuery((prev) => ({ ...prev, start: Math.min(prev.start + prev.length, Math.max(filteredTotal - prev.length, 0)) }))}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewModalOpen && (
        <div className="modal-backdrop-lite">
          <div className="modal-card-lite distribution-modal">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">View Newsletter</h5>
              <button type="button" className="btn-close" onClick={() => setViewModalOpen(false)} />
            </div>
            {viewLoading ? (
              <div className="text-muted">Loading...</div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="form-label">Email Id</label>
                  <input className="form-control" value={viewData.email || ""} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label">Date & Time</label>
                  <input className="form-control" value={viewData.timestamp || ""} disabled />
                </div>
                <div className="d-flex justify-content-end">
                  <button type="button" className="btn btn-secondary" onClick={() => setViewModalOpen(false)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageNewsletterPage;
