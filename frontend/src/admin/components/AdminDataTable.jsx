import { useEffect, useMemo, useState } from "react";
import AdminPageLoader from "./AdminPageLoader";

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Shared server-side table (same layout as Manage Staff / Manage Invoice).
 */
export default function AdminDataTable({
  tableKey,
  columns,
  fetchRows,
  extraQuery = {},
  emptyMessage = "No records found.",
  defaultSortBy,
  minSearchLength = 3,
  embedded = false,
  loadingLabel = "Loading…"
}) {
  const initialSort = defaultSortBy || columns.find((c) => c.sortKey)?.sortKey || "id";

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ recordsTotal: 0, recordsFiltered: 0 });
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({
    start: 0,
    length: 10,
    search: "",
    sortBy: initialSort,
    sortOrder: "desc"
  });

  const extraKey = useMemo(() => JSON.stringify(extraQuery), [extraQuery]);

  const searchPending = useMemo(() => {
    const typed = searchInput.trim();
    const nextSearch = typed.length >= minSearchLength ? typed : "";
    return nextSearch !== query.search;
  }, [searchInput, query.search, minSearchLength]);

  const tableBusy = loading || searchPending;

  const filteredTotal = meta.recordsFiltered || 0;
  const recordsTotal = meta.recordsTotal || 0;
  const currentPage = Math.floor(query.start / query.length) + 1;
  const startEntry = filteredTotal === 0 ? 0 : query.start + 1;
  const endEntry = Math.min(query.start + query.length, filteredTotal);
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < filteredTotal;

  useEffect(() => {
    const sort = defaultSortBy || columns.find((c) => c.sortKey)?.sortKey || "id";
    setQuery({
      start: 0,
      length: 10,
      search: "",
      sortBy: sort,
      sortOrder: "desc"
    });
    setSearchInput("");
  }, [tableKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const typed = searchInput.trim();
      const nextSearch = typed.length >= minSearchLength ? typed : "";
      setQuery((prev) => {
        if (prev.start === 0 && prev.search === nextSearch) return prev;
        return { ...prev, start: 0, search: nextSearch };
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, minSearchLength]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchRows({
          start: query.start,
          length: query.length,
          search: query.search,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          ...extraQuery
        });
        if (cancelled) return;
        setRows(res.data?.data || []);
        setMeta({
          recordsTotal: res.data?.meta?.recordsTotal || 0,
          recordsFiltered: res.data?.meta?.recordsFiltered || 0
        });
      } catch {
        if (!cancelled) {
          setRows([]);
          setMeta({ recordsTotal: 0, recordsFiltered: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [query, tableKey, extraKey]);

  const onSort = (sortKey) => {
    if (!sortKey) return;
    setQuery((prev) => ({
      ...prev,
      start: 0,
      sortBy: sortKey,
      sortOrder: prev.sortBy === sortKey && prev.sortOrder === "asc" ? "desc" : "asc"
    }));
  };

  const sortArrow = (sortKey) => {
    if (query.sortBy !== sortKey) return "↕";
    return query.sortOrder === "asc" ? "↑" : "↓";
  };

  const tableContent = (
    <>
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
            autoComplete="off"
          />
        </label>
      </div>

      <div className="table-odd admin-data-table__table-wrap" aria-busy={tableBusy}>
        {tableBusy && (
          <div className="admin-data-table__loading-overlay" role="status" aria-live="polite">
            <AdminPageLoader label={loadingLabel} />
          </div>
        )}
        <table className={`table table-bordered table-bg1 mb-0 ${tableBusy ? "admin-data-table__table--loading" : ""}`}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  {col.sortKey ? (
                    <button
                      type="button"
                      className="login-log-sort"
                      onClick={() => onSort(col.sortKey)}
                      disabled={tableBusy}
                    >
                      {col.label} <span>{sortArrow(col.sortKey)}</span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!tableBusy && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center text-muted py-4 login-log-empty">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!tableBusy &&
              rows.map((row, index) => (
                <tr key={row._rowKey || row.package_id || row.userid || row.pay_id || `${tableKey}-${index}`}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row, { index, start: query.start, query })
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="login-log-pagination-wrap">
        <div className="small text-muted">
          Showing {startEntry} to {endEntry} of {filteredTotal} entries
          {query.search && recordsTotal > filteredTotal
            ? ` (filtered from ${recordsTotal} total entries)`
            : ""}
        </div>
        <div className="login-log-pagination">
          <button
            type="button"
            className="login-log-page-btn"
            disabled={!canGoPrevious || tableBusy}
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
            disabled={!canGoNext || tableBusy}
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
    </>
  );

  if (embedded) {
    return <div className="admin-data-table admin-data-table--embedded">{tableContent}</div>;
  }

  return (
    <div className="data-table admin-data-table">
      <div className="card m-b-30 table-bg distribution-table-card">
        <div className="card-body table-responsive">{tableContent}</div>
      </div>
    </div>
  );
}
