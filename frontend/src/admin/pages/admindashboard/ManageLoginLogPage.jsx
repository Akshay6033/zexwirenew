import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminDashboardApi } from "../../services/adminDashboardApi";

const PAGE_SIZES = [10, 25, 50, 100];

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function ManageLoginLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLengthParam = Number(searchParams.get("length"));
  const initialLength = PAGE_SIZES.includes(initialLengthParam) ? initialLengthParam : 10;
  const initialPage = Math.max(Number(searchParams.get("page")) || 1, 1);
  const initialSearch = (searchParams.get("search") || "").trim();
  const initialSortBy = searchParams.get("sortBy") || "dateTime";
  const initialSortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [query, setQuery] = useState({
    start: (initialPage - 1) * initialLength,
    length: initialLength,
    search: initialSearch,
    sortBy: initialSortBy,
    sortOrder: initialSortOrder
  });

  const currentPage = Math.floor(query.start / query.length) + 1;
  const totalPages = Math.max(Math.ceil(filteredTotal / query.length), 1);

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
        const res = await adminDashboardApi.getLoginLogs(query);
        setRows(res.data?.data || []);
        setTotal(res.data?.meta?.recordsTotal || 0);
        setFilteredTotal(res.data?.meta?.recordsFiltered || 0);
      } catch {
        setRows([]);
        setTotal(0);
        setFilteredTotal(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [query]);

  useEffect(() => {
    const page = Math.floor(query.start / query.length) + 1;
    setSearchParams({
      page: String(page),
      length: String(query.length),
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    });
  }, [query, setSearchParams]);

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

  const startEntry = filteredTotal === 0 ? 0 : query.start + 1;
  const endEntry = Math.min(query.start + query.length, filteredTotal);
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < filteredTotal;

  return (
    <div className="container-fluid manage-login-log-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4 className="mt-2 mb-2">Manage Login Log</h4>
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
                          <button type="button" className="login-log-sort" onClick={() => onSort("username")}>
                            Username Name <span>{sortArrow("username")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("ip_address")}>
                            IP address <span>{sortArrow("ip_address")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("dateTime")}>
                            Date Time <span>{sortArrow("dateTime")}</span>
                          </button>
                        </th>
                      </tr>
                  </thead>
                  <tbody>
                      {loading &&
                        Array.from({ length: query.length > 10 ? 10 : query.length }).map((_, index) => (
                          <tr key={`skeleton-${index}`} className="login-log-skeleton-row">
                            <td colSpan={4}>
                              <span className="login-log-skeleton-line" />
                            </td>
                          </tr>
                        ))}
                      {!loading && rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-4 login-log-empty">
                            No login logs found.
                          </td>
                        </tr>
                      ) : (
                        rows.map((value, index) => (
                          <tr key={value.id}>
                            <td>{query.start + index + 1}</td>
                            <td>{value.username}</td>
                            <td>{value.ip_address}</td>
                            <td>{formatDateTime(value.dateTime)}</td>
                          </tr>
                        ))
                      )}
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
                  onClick={() => setQuery((prev) => ({ ...prev, start: Math.max(prev.start - prev.length, 0) }))}
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
        </div>
      </div>
    </div>
  );
}

export default ManageLoginLogPage;
