import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { useConfirm } from "../../context/ConfirmContext";
import { useEditorialCounts } from "../../context/EditorialCountsContext";
import { refreshEditorialCounts } from "../../utils/editorialCountsRefresh";
import { consumeEditorialSkipMarkViewed } from "../../utils/editorialSkipMarkViewed";
import AdminBackButton from "../../components/AdminBackButton";
import { formatEditorialSubmissionDate } from "../../utils/adminDateFormat";

const PAGE_SIZES = [10, 25, 50, 100];
const ICON_SZ = 14;

function SvgTrash() {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SZ} height={ICON_SZ} aria-hidden="true">
      <path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

function SvgPencil() {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SZ} height={ICON_SZ} aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.08H5v-.92l7.06-7.06.92.92L5.92 19.33zM20.71 7.04a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}

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

function SvgUpload() {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SZ} height={ICON_SZ} aria-hidden="true">
      <path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
    </svg>
  );
}

function IconLink({ to, label, className, children, state }) {
  return (
    <Link
      to={to}
      state={state}
      className={`edit-icon-btn ${className || ""}`.trim()}
      title={label}
      aria-label={label}
    >
      {children}
    </Link>
  );
}

const TAB_TITLES = {
  room: "Manage Editorial Room",
  all: "All Press Release",
  draft: "Draft Press Release",
  pending: "Pending Press Release",
  published: "Published Press Release",
  action: "Action Required Press Release",
  rejected: "Rejected Press Release",
  deleted: "Manage Deleted PR",
  gallery: "Manage Gallery"
};

function statusLabel(status) {
  const s = Number(status);
  if (s === 0) return "Draft";
  if (s === 1) return "Pending";
  if (s === 2) return "Published";
  if (s === 3) return "Action Required";
  if (s === 5) return "Rejected";
  return `Status ${s}`;
}

function StatCard({ label, value, to, active }) {
  const inner = (
    <>
      <p>{label}</p>
      <h4>{value}</h4>
    </>
  );
  const cardClass = ["editorial-stat-card", active && "editorial-stat-card-active"].filter(Boolean).join(" ");
  if (to) {
    return (
      <Link to={to} className={`${cardClass} editorial-stat-card-link`.trim()}>
        {inner}
      </Link>
    );
  }
  return <div className={cardClass}>{inner}</div>;
}

export default function ManageEditorialPage() {
  const { confirm } = useConfirm();
  const [searchParams] = useSearchParams();
  const tab = (searchParams.get("tab") || "room").toLowerCase();

  const { summary, refresh: refreshCounts, clearTabBadge } = useEditorialCounts();

  const [rows, setRows] = useState([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsFiltered, setRecordsFiltered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({
    start: 0,
    length: 10,
    search: "",
    sortBy: "id",
    sortOrder: "desc"
  });

  const pageTitle = TAB_TITLES[tab] || TAB_TITLES.room;
  const isSubTab = tab !== "room" && tab !== "gallery";
  const returnToList = `/admindashboard/manage_editorial?tab=${tab}`;
  const editLinkState = { returnTo: returnToList };

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
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setQuery((prev) => ({ ...prev, start: 0 }));
  }, [tab]);

  /** Legacy: opening a status list marks those PRs seen. Skip once after save status change. */
  useEffect(() => {
    if (tab === "gallery" || tab === "room" || tab === "all" || tab === "deleted") return;
    if (consumeEditorialSkipMarkViewed(tab)) {
      refreshCounts();
      return;
    }
    clearTabBadge(tab);
  }, [tab, clearTabBadge, refreshCounts]);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await adminDashboardApi.getEditorialPressReleases({
        tab,
        start: query.start,
        length: query.length,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder
      });
      setRows(res.data?.data || []);
      setRecordsTotal(res.data?.meta?.recordsTotal ?? 0);
      setRecordsFiltered(res.data?.meta?.recordsFiltered ?? 0);
    } catch (error) {
      setRows([]);
      setRecordsTotal(0);
      setRecordsFiltered(0);
      toast.error(error.response?.data?.message || "Could not load press releases.");
    } finally {
      setLoading(false);
    }
    refreshCounts();
  };

  useEffect(() => {
    loadList();
  }, [tab, query.start, query.length, query.search, query.sortBy, query.sortOrder]);

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

  const showLastAction = useMemo(() => ["all", "pending", "action"].includes(tab), [tab]);
  const showPdf = tab === "published";
  const showCompany = tab !== "room";
  const showActions = tab !== "all" && tab !== "gallery";

  const colSpan = useMemo(() => {
    let n = 6;
    if (showCompany) n += 1;
    if (showLastAction) n += 1;
    if (showPdf) n += 1;
    if (showActions) n += 1;
    return n;
  }, [showCompany, showLastAction, showPdf, showActions]);

  const downloadCsv = () => {
    window.open(
      adminDashboardApi.exportEditorialPressReleasesCsvUrl({
        tab,
        search: query.search || "",
        sortBy: query.sortBy || "id",
        sortOrder: query.sortOrder || "desc"
      }),
      "_blank"
    );
  };

  const onDeletePress = async (row) => {
    const ok = await confirm("Are you sure delete this press release?");
    if (!ok) return;

    const isPublishedDelete = tab === "published" || (Number(row.status) === 2 && tab === "room");

    try {
      const res = isPublishedDelete
        ? await adminDashboardApi.deletePressReleasePublished(row.id)
        : await adminDashboardApi.deletePressRelease(row.id);

      if (!res.data?.status) {
        toast.error(res.data?.message || "Delete failed.");
        return;
      }
      toast.success(res.data.message || "Press release deleted.");
      refreshEditorialCounts();
      await loadList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed.");
    }
  };

  const packageCell = (row) => {
    const active = Number(row.package_active) === 1;
    return (
      <span>
        {row.pname || "—"}{" "}
        {row.pname ? (
          <span style={{ color: active ? "green" : "red", fontSize: "12px" }}>
            {active ? "[ Active ]" : "[ currently inactive ]"}
          </span>
        ) : null}
      </span>
    );
  };

  const actionsWrap = (children) => (
    <div className="d-flex flex-wrap gap-1 align-items-center editorial-row-actions">{children}</div>
  );

  const actionsCell = (row) => {
    const id = row.id;
    const st = Number(row.status);
    const isDeleted = Number(row.press_active) === 2;
    const isPublished = st === 2;

    if (tab === "gallery" || !showActions) return "—";

    if (isDeleted) {
      return actionsWrap(
        <IconLink to={`/admindashboard/press-release/${id}/view`} label="View press release">
          <SvgEye />
        </IconLink>
      );
    }

    if (isPublished && tab === "room") {
      return actionsWrap(
        <>
          <button type="button" className="edit-icon-btn country-delete-icon-btn" title="Delete press release" aria-label="Delete press release" onClick={() => onDeletePress(row)}>
            <SvgTrash />
          </button>
          <IconLink to={`/admindashboard/press-release/${id}/view`} label="View press release">
            <SvgEye />
          </IconLink>
        </>
      );
    }

    if (tab === "published") {
      return actionsWrap(
        <>
          <button type="button" className="edit-icon-btn country-delete-icon-btn" title="Delete press release" aria-label="Delete press release" onClick={() => onDeletePress(row)}>
            <SvgTrash />
          </button>
          <IconLink to={`/admindashboard/press-release/${id}/view`} label="View press release">
            <SvgEye />
          </IconLink>
          <button type="button" className="edit-icon-btn editorial-upload-icon-btn" title="Upload report — coming soon" aria-label="Upload report">
            <SvgUpload />
          </button>
        </>
      );
    }

    if (tab === "rejected") {
      return actionsWrap(
        <IconLink
          to={`/admindashboard/press-release/${id}/edit`}
          label="Edit press release"
          state={editLinkState}
        >
          <SvgPencil />
        </IconLink>
      );
    }

    const historyLinkState = { returnTo: returnToList, fromTab: tab };

    if (tab === "action" || tab === "pending") {
      return actionsWrap(
        <>
          <IconLink to={`/admindashboard/press-release/${id}/edit`} label="Edit press release" state={editLinkState}>
            <SvgPencil />
          </IconLink>
          <IconLink
            to={`/admindashboard/press-release/${id}/history`}
            label="View press release status history"
            state={historyLinkState}
          >
            <SvgEye />
          </IconLink>
        </>
      );
    }

    return actionsWrap(
      <>
        <button type="button" className="edit-icon-btn country-delete-icon-btn" title="Delete press release" aria-label="Delete press release" onClick={() => onDeletePress(row)}>
          <SvgTrash />
        </button>
        <IconLink to={`/admindashboard/press-release/${id}/edit`} label="Edit press release" state={editLinkState}>
          <SvgPencil />
        </IconLink>
        <IconLink to={`/admindashboard/press-release/${id}/view`} label="View press release">
          <SvgEye />
        </IconLink>
      </>
    );
  };

  if (tab === "gallery") {
    return <Navigate to="/admindashboard/manage_gallery" replace />;
  }

  return (
    <div className="container-fluid manage-editorial-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-start flex-wrap gap-3 mb-2">
        <h4 className="mt-2 mb-2">{pageTitle}</h4>
        <div className="d-flex gap-2 align-items-center manage-user-head-actions flex-wrap">
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
          {tab === "room" && (
            <Link to="/admindashboard/press-release/create" className="btn editorial-add-btn">
              ADD NEW PRESS RELEASE
            </Link>
          )}
          {isSubTab && <AdminBackButton to="/admindashboard/manage_editorial" />}
        </div>
      </div>

      <div className="editorial-stats">
        <StatCard label="Editorial Room" value={summary.editorialRoom} to="/admindashboard/manage_editorial" active={tab === "room"} />
        <StatCard label="Published" value={summary.published} to="/admindashboard/manage_editorial?tab=published" active={tab === "published"} />
        <StatCard label="Pending" value={summary.pending} to="/admindashboard/manage_editorial?tab=pending" active={tab === "pending"} />
        <StatCard label="Draft" value={summary.draft} to="/admindashboard/manage_editorial?tab=draft" active={tab === "draft"} />
        <StatCard label="Action Required" value={summary.actionRequired} to="/admindashboard/manage_editorial?tab=action" active={tab === "action"} />
        <StatCard label="Rejected" value={summary.rejected} to="/admindashboard/manage_editorial?tab=rejected" active={tab === "rejected"} />
      </div>

      <div className="admin-card">
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

        <div className="editorial-table-scroll" role="region" aria-label="Press releases table" tabIndex={0}>
          <table className="table table-bordered table-bg1 editorial-table mb-0">
            <thead>
              <tr>
                <th scope="col" className="editorial-col-id">
                  <button type="button" className="login-log-sort" onClick={() => onSort("release_no")}>
                    Release ID <span>{sortArrow("release_no")}</span>
                  </button>
                </th>
                {showActions && <th scope="col" className="editorial-col-actions">Actions</th>}
                <th scope="col" className="editorial-col-title">
                  <button type="button" className="login-log-sort" onClick={() => onSort("title")}>
                    Title <span>{sortArrow("title")}</span>
                  </button>
                </th>
                <th scope="col">
                  <button type="button" className="login-log-sort" onClick={() => onSort("date")}>
                    {tab === "published" ? "Published Date" : tab === "draft" ? "Publish Date" : "Submission Date"}{" "}
                    <span>{sortArrow("date")}</span>
                  </button>
                </th>
                <th scope="col" className="editorial-col-package">
                  <button type="button" className="login-log-sort" onClick={() => onSort("pname")}>
                    Package Name <span>{sortArrow("pname")}</span>
                  </button>
                </th>
                <th scope="col" className="editorial-col-user">
                  <button type="button" className="login-log-sort" onClick={() => onSort("user")}>
                    User <span>{sortArrow("user")}</span>
                  </button>
                </th>
                {showCompany && <th scope="col" className="editorial-col-company">Company</th>}
                {showLastAction && <th scope="col" className="editorial-col-staff">Last Action By</th>}
                {showPdf && <th scope="col">Report Uploaded</th>}
                <th scope="col" className="editorial-col-status">
                  <button type="button" className="login-log-sort" onClick={() => onSort("status")}>
                    Status <span>{sortArrow("status")}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={colSpan} className="text-center text-muted py-4">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && tab === "gallery" && (
                <tr>
                  <td colSpan={colSpan} className="text-center text-muted py-4">
                    No gallery rows in this view.
                  </td>
                </tr>
              )}
              {!loading && tab !== "gallery" && rows.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="text-center text-muted py-4">
                    No data available in table
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => {
                  const titleFull = row.title || "";
                  const titleShort = titleFull.length > 72 ? `${titleFull.slice(0, 72)}…` : titleFull;
                  return (
                    <tr key={row.id}>
                      <td className="editorial-col-id">{row.release_no}</td>
                      {showActions && <td className="editorial-col-actions">{actionsCell(row)}</td>}
                      <td className="editorial-col-title" title={titleFull}>
                        {titleShort || "—"}
                      </td>
                      <td className="editorial-col-date">{formatEditorialSubmissionDate(row.date)}</td>
                      <td className="editorial-col-package">{packageCell(row)}</td>
                      <td className="editorial-col-user">
                        {(row.first_name || "").trim()} {(row.last_name || "").trim()}
                      </td>
                      {showCompany && (
                        <td className="editorial-col-company" title={row.cname || ""}>
                          {row.cname || "—"}
                        </td>
                      )}
                      {showLastAction && <td className="editorial-col-staff">{row.staff_username || "—"}</td>}
                      {showPdf && <td>{Number(row.pdf_flag) === 0 ? "No" : "Yes"}</td>}
                      <td className="editorial-col-status">
                        {statusLabel(row.status)}
                        {row.add_note ? (
                          <div>
                            <span className="editor_note">PR note added!</span>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 px-2 py-3 border-top">
          <span className="small text-muted">
            Showing {startEntry} to {endEntry} of {recordsFiltered} entries
            {recordsFiltered !== recordsTotal ? ` (filtered from ${recordsTotal} in this tab)` : ""}
          </span>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!canGoPrevious} onClick={() => setQuery((p) => ({ ...p, start: Math.max(0, p.start - p.length) }))}>
              Previous
            </button>
            <span className="small text-muted align-self-center">
              Page {currentPage} / {totalPages}
            </span>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!canGoNext} onClick={() => setQuery((p) => ({ ...p, start: p.start + p.length }))}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
