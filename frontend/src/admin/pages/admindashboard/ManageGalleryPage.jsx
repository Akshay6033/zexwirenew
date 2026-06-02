import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { useConfirm } from "../../context/ConfirmContext";
import AdminBackButton from "../../components/AdminBackButton";
import GalleryThumb from "../../components/GalleryThumb";
import { legacyImagesDataUrl } from "../../utils/pressReleaseFormUtils";

const PAGE_SIZES = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 300;

function formatGalleryDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function rowPublicUrl(row) {
  const path = String(row?.image_path || "").trim();
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return row?.image_url || legacyImagesDataUrl(row?.image_name);
}

function SvgTrash() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
      <path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

function SvgCopy() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
      />
    </svg>
  );
}

function GalleryRow({ row, slNo, deletingId, onDelete, onCopyUrl }) {
  const url = rowPublicUrl(row);
  const thumbSrc = row.image_url || legacyImagesDataUrl(row.image_name);
  const username = `${(row.first_name || "").trim()} ${(row.last_name || "").trim()}`.trim() || "—";

  return (
    <tr>
      <td className="gallery-col-sl">{slNo}</td>
      <td className="gallery-col-actions">
        <div className="gallery-row-actions">
          <button
            type="button"
            className="edit-icon-btn country-delete-icon-btn"
            title="Delete image"
            aria-label="Delete image"
            disabled={deletingId === row.id}
            onClick={() => onDelete(row)}
          >
            <SvgTrash />
          </button>
          <button
            type="button"
            className="edit-icon-btn gallery-copy-icon-btn"
            title="Copy image URL"
            aria-label="Copy image URL"
            disabled={!url}
            onClick={() => onCopyUrl(url)}
          >
            <SvgCopy />
          </button>
        </div>
      </td>
      <td>{username}</td>
      <td className="gallery-col-image">
        {row.image_name ? <GalleryThumb src={thumbSrc} href={url} /> : "—"}
      </td>
      <td className="small gallery-col-url">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="gallery-url-link" title={url}>
            {url.length > 72 ? `${url.slice(0, 72)}…` : url}
          </a>
        ) : (
          "—"
        )}
      </td>
      <td className="gallery-col-date">{formatGalleryDate(row.timestamp)}</td>
    </tr>
  );
}

const GALLERY_IMAGE_HOST = (import.meta.env.VITE_LEGACY_SITE_URL || "https://pr.zexprwire.com").replace(/\/$/, "");

export default function ManageGalleryPage() {
  const { confirm } = useConfirm();
  const abortRef = useRef(null);

  useEffect(() => {
    const id = "gallery-preconnect";
    if (document.getElementById(id)) return undefined;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "preconnect";
    link.href = GALLERY_IMAGE_HOST;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);
  const [rows, setRows] = useState([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsFiltered, setRecordsFiltered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({
    start: 0,
    length: 10,
    search: "",
    sortBy: "id",
    sortOrder: "desc"
  });

  const currentPage = Math.floor(query.start / query.length) + 1;
  const totalPages = Math.max(Math.ceil(recordsFiltered / query.length), 1);
  const startEntry = recordsFiltered === 0 ? 0 : query.start + 1;
  const endEntry = Math.min(query.start + query.length, recordsFiltered);
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < recordsFiltered;

  useEffect(() => {
    const timer = setTimeout(() => {
      const typed = searchInput.trim();
      const nextSearch = typed.length >= 3 ? typed : "";
      setQuery((prev) => {
        if (prev.start === 0 && prev.search === nextSearch) return prev;
        return { ...prev, start: 0, search: nextSearch };
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadList = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await adminDashboardApi.getGalleryImages(
        {
          start: query.start,
          length: query.length,
          search: query.search,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder
        },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setRows(res.data?.data || []);
      setRecordsTotal(res.data?.meta?.recordsTotal ?? 0);
      setRecordsFiltered(res.data?.meta?.recordsFiltered ?? 0);
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return;
      setRows([]);
      setRecordsTotal(0);
      setRecordsFiltered(0);
      toast.error(error.response?.data?.message || "Could not load gallery.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [query.start, query.length, query.search, query.sortBy, query.sortOrder]);

  useEffect(() => {
    loadList();
    return () => abortRef.current?.abort();
  }, [loadList]);

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

  const onCopyUrl = useCallback((url) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => toast.success("URL copied!"),
      () => toast.error("Copy failed")
    );
  }, []);

  const onDelete = async (row) => {
    const ok = await confirm("Are you sure Delete Image ?", "Please Confirm");
    if (!ok) return;
    setDeletingId(row.id);
    try {
      const res = await adminDashboardApi.deleteGalleryImage(row.id);
      if (!res.data?.status) {
        toast.error(res.data?.message || "Delete failed.");
        return;
      }
      toast.success(res.data.message || "Image deleted successfully.");
      if (rows.length === 1 && query.start > 0) {
        setQuery((prev) => ({ ...prev, start: Math.max(0, prev.start - prev.length) }));
      } else {
        await loadList();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container-fluid manage-gallery-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-start flex-wrap gap-3 mb-2">
        <h4 className="mt-2 mb-2">Manage Gallery</h4>
        <div className="d-flex gap-2 align-items-center">
          <button type="button" className="btn refresh-icon-btn" onClick={loadList} aria-label="Refresh" title="Refresh">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
            </svg>
          </button>
          <AdminBackButton to="/admindashboard/manage_editorial" />
        </div>
      </div>

      <div className="data-table">
        <div className="card m-b-30 table-bg distribution-table-card">
          <div className="card-body">
            <div className="login-log-controls editorial-filter-row">
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
                  className="form-control form-control-sm d-inline-block login-log-search editorial-search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="min. 3 characters"
                />
              </label>
            </div>

            <div className="editorial-table-scroll gallery-table-scroll">
              <table className="table table-bordered table-bg1 gallery-table mb-0">
                <thead>
                  <tr>
                    <th scope="col" className="gallery-col-sl">Sl.No.</th>
                    <th scope="col" className="gallery-col-actions">Action</th>
                    <th scope="col">
                      <button type="button" className="login-log-sort" onClick={() => onSort("username")}>
                        Username <span>{sortArrow("username")}</span>
                      </button>
                    </th>
                    <th scope="col">Image</th>
                    <th scope="col">
                      <button type="button" className="login-log-sort" onClick={() => onSort("image_path")}>
                        Image URL <span>{sortArrow("image_path")}</span>
                      </button>
                    </th>
                    <th scope="col">
                      <button type="button" className="login-log-sort" onClick={() => onSort("date")}>
                        Date <span>{sortArrow("date")}</span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No data available in table
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows.map((row, index) => (
                      <GalleryRow
                        key={row.id}
                        row={row}
                        slNo={query.start + index + 1}
                        deletingId={deletingId}
                        onDelete={onDelete}
                        onCopyUrl={onCopyUrl}
                      />
                    ))}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 px-2 py-3 border-top">
              <span className="small text-muted">
                Showing {startEntry} to {endEntry} of {recordsFiltered} entries
                {recordsFiltered !== recordsTotal ? ` (filtered from ${recordsTotal} total)` : ""}
              </span>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={!canGoPrevious || loading}
                  onClick={() => setQuery((p) => ({ ...p, start: Math.max(0, p.start - p.length) }))}
                >
                  Previous
                </button>
                <span className="small text-muted align-self-center">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={!canGoNext || loading}
                  onClick={() => setQuery((p) => ({ ...p, start: p.start + p.length }))}
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
