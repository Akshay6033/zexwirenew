import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import SupportFilterPanel from "../../components/SupportFilterPanel";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { refreshSupportCounts } from "../../utils/supportCountsRefresh";

const PAGE_SIZES = [10, 25, 50];
const MIN_SEARCH_CHARS = 3;

const DEFAULT_FILTERS = {
  dateFrom: "",
  dateTo: "",
  statusOpen: true,
  statusClosed: true,
  readUnread: false,
  readRead: false,
  readNotReplied: false
};

function formatTicketDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function countAppliedFilters(filters) {
  let n = 0;
  if (filters.dateFrom || filters.dateTo) n += 1;
  if (!filters.statusOpen || !filters.statusClosed) n += 1;
  if (filters.readUnread || filters.readRead || filters.readNotReplied) n += 1;
  return n;
}

function buildReadFilters(filters) {
  const list = [];
  if (filters.readUnread) list.push("unread");
  if (filters.readRead) list.push("read");
  if (filters.readNotReplied) list.push("not_replied");
  return list;
}

function ManageSupportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [counts, setCounts] = useState({ all: 0, open: 0, closed: 0 });

  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterWrapRef = useRef(null);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const chatEndRef = useRef(null);
  const detailPanelRef = useRef(null);

  const [addOpen, setAddOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [meta, setMeta] = useState({ query_options: [], countries: [], countryCodes: [] });
  const [addForm, setAddForm] = useState({
    email: "",
    countryCode: "IND | +91",
    mobile: "",
    subject: "",
    query: 7,
    description: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const typed = searchInput.trim();
      const nextSearch = typed.length >= MIN_SEARCH_CHARS ? typed : "";
      setSearch((prev) => {
        if (prev !== nextSearch) setPage(1);
        return nextSearch;
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const listParams = useCallback(() => {
    const readFilters = buildReadFilters(appliedFilters);
    return {
      page,
      limit,
      tab: statusTab,
      search: search || undefined,
      dateFrom: appliedFilters.dateFrom || undefined,
      dateTo: appliedFilters.dateTo || undefined,
      statusOpen: appliedFilters.statusOpen ? "true" : "false",
      statusClosed: appliedFilters.statusClosed ? "true" : "false",
      readFilters: readFilters.length ? readFilters.join(",") : undefined
    };
  }, [page, limit, search, appliedFilters, statusTab]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminDashboardApi.getSupportTickets(listParams());
      const data = res.data?.data || {};
      setTickets(data.tickets || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      if (data.counts) {
        setCounts({
          all: data.counts.all ?? 0,
          open: data.counts.open ?? 0,
          closed: data.counts.closed ?? 0
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  const loadMeta = useCallback(async () => {
    try {
      const res = await adminDashboardApi.getSupportMeta();
      const data = res.data?.data || { query_options: [], countries: [], countryCodes: [] };
      const codes = data.countryCodes?.length ? data.countryCodes : data.countries || [];
      setMeta({ ...data, countryCodes: codes });
      const first = codes[0];
      if (first?.label) {
        setAddForm((f) => (f.countryCode === "IND | +91" ? { ...f, countryCode: first.label } : f));
      }
    } catch {
      /* optional */
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const res = await adminDashboardApi.getSupportTicket(id);
      setDetail(res.data?.data || null);
      refreshSupportCounts();
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, unread_count: 0 } : t))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load ticket");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const ticketParam = searchParams.get("ticket");
    if (!ticketParam) return;
    const id = Number(ticketParam);
    if (Number.isFinite(id) && id > 0) {
      setSelectedId(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("ticket");
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (addOpen) loadMeta();
  }, [addOpen, loadMeta]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!filterOpen) return undefined;
    setDraftFilters({ ...appliedFilters });
    const onDocClick = (e) => {
      if (filterWrapRef.current && !filterWrapRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filterOpen]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  useLayoutEffect(() => {
    if (!selectedId || !detailPanelRef.current) return;
    detailPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages]);

  useEffect(() => {
    return () => {
      if (selectedFilePreview) URL.revokeObjectURL(selectedFilePreview);
    };
  }, [selectedFilePreview]);

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setSelectedFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    });
    setSelectedFile(file);
  };

  const onSelectTicket = (id) => {
    setSelectedId(id);
    setMessageText("");
    clearSelectedFile();
  };

  const onSendMessage = async () => {
    if (!selectedId || sending) return;
    const file = selectedFile;
    if (!messageText.trim() && !file) {
      toast.info("Type a message or attach a file");
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("description", messageText.trim());
      if (file) fd.append("selectfile", file);
      const res = await adminDashboardApi.sendSupportMessage(selectedId, fd);
      setDetail(res.data?.data || null);
      setMessageText("");
      clearSelectedFile();
      toast.success("Message sent");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const onResolve = async () => {
    if (!selectedId) return;
    const note = resolveNote.trim();
    if (!note) {
      toast.error("Please enter a resolution note.");
      return;
    }
    setSubmitting(true);
    try {
      await adminDashboardApi.resolveSupportTicket(selectedId, { note });
      toast.success("Ticket resolved");
      setResolveOpen(false);
      setResolveNote("");
      setSelectedId(null);
      setDetail(null);
      refreshSupportCounts();
      loadTickets();
      loadMeta();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resolve");
    } finally {
      setSubmitting(false);
    }
  };

  const onApprove = async () => {
    if (!selectedId) return;
    try {
      await adminDashboardApi.approveSupportTicket(selectedId);
      toast.success("Ticket approved and closed");
      setSelectedId(null);
      setDetail(null);
      refreshSupportCounts();
      loadTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve");
    }
  };

  const onDecline = async () => {
    if (!selectedId) return;
    try {
      const res = await adminDashboardApi.declineSupportTicket(selectedId);
      setDetail(res.data?.data || null);
      toast.success("Request declined");
      loadTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to decline");
    }
  };

  const onCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminDashboardApi.createSupportTicket(addForm);
      toast.success("Ticket created");
      setAddOpen(false);
      setAddForm({
        email: "",
        countryCode: "IND | +91",
        mobile: "",
        subject: "",
        query: 7,
        description: ""
      });
      const newId = res.data?.data?.ticket?.id;
      await loadTickets();
      loadMeta();
      if (newId) setSelectedId(newId);
      refreshSupportCounts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const syncStatusTabFromFilters = (filters) => {
    if (filters.statusOpen && !filters.statusClosed) return "open";
    if (!filters.statusOpen && filters.statusClosed) return "closed";
    return "all";
  };

  const applyFilters = () => {
    const next = { ...draftFilters };
    setAppliedFilters(next);
    setStatusTab(syncStatusTabFromFilters(next));
    setPage(1);
    setSelectedId(null);
    setDetail(null);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setStatusTab("all");
    setPage(1);
    setSelectedId(null);
    setDetail(null);
    setFilterOpen(false);
  };

  const appliedCount = countAppliedFilters(appliedFilters);
  const isClosed = detail?.ticket?.status === "closed";

  const pageNumbers = () => {
    const total = pagination.totalPages || 1;
    const current = pagination.page || 1;
    const pages = [];
    const add = (p) => pages.push(p);
    if (total <= 7) {
      for (let i = 1; i <= total; i += 1) add(i);
    } else {
      add(1);
      if (current > 3) add("…");
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i += 1) add(i);
      if (current < total - 2) add("…");
      add(total);
    }
    return pages;
  };

  const onStatusTab = (tab) => {
    setStatusTab(tab);
    setPage(1);
    setSelectedId(null);
    setDetail(null);
    let statusOpen = true;
    let statusClosed = true;
    if (tab === "open") {
      statusClosed = false;
    } else if (tab === "closed") {
      statusOpen = false;
    }
    const patch = { statusOpen, statusClosed };
    setAppliedFilters((f) => ({ ...f, ...patch }));
    setDraftFilters((f) => ({ ...f, ...patch }));
  };

  const totalEntries = pagination.total || 0;
  const startEntry = pagination.rangeStart || 0;
  const endEntry = pagination.rangeEnd || 0;
  const canGoPrevious = page > 1;
  const canGoNext = page < (pagination.totalPages || 1);

  return (
    <div className={`container-fluid manage-support-page${selectedId ? " support-has-detail" : ""}`}>
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h4 className="mt-2 mb-2">Support</h4>
        <div className="d-flex gap-2 align-items-center manage-user-head-actions position-relative">
          <button type="button" className="btn add-vendor-btn" onClick={() => setAddOpen(true)}>
            + Add New Query
          </button>
          <div className="support-filter-wrap" ref={filterWrapRef}>
            <button
              type="button"
              className={`support-filter-trigger${filterOpen ? " is-open" : ""}`}
              onClick={() => setFilterOpen((p) => !p)}
              aria-expanded={filterOpen}
            >
              Filters{appliedCount > 0 ? ` (${appliedCount})` : ""}
              <span className="support-filter-trigger-chevron" aria-hidden="true" />
            </button>
            {filterOpen && (
              <SupportFilterPanel
                appliedCount={countAppliedFilters(appliedFilters)}
                draftFilters={draftFilters}
                setDraftFilters={setDraftFilters}
                onApply={applyFilters}
                onClear={clearFilters}
              />
            )}
          </div>
          <button
            type="button"
            className="btn refresh-icon-btn"
            onClick={() => {
              loadTickets();
              loadMeta();
            }}
            aria-label="Refresh"
            title="Refresh"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="support-summary-row">
        <button
          type="button"
          className={`editorial-stat-card editorial-stat-card-link ${statusTab === "all" ? "editorial-stat-card-active" : ""}`}
          onClick={() => onStatusTab("all")}
        >
          <p>All Tickets</p>
          <h4>{counts.all}</h4>
        </button>
        <button
          type="button"
          className={`editorial-stat-card editorial-stat-card-link ${statusTab === "open" ? "editorial-stat-card-active" : ""}`}
          onClick={() => onStatusTab("open")}
        >
          <p>Open</p>
          <h4>{counts.open}</h4>
        </button>
        <button
          type="button"
          className={`editorial-stat-card editorial-stat-card-link ${statusTab === "closed" ? "editorial-stat-card-active" : ""}`}
          onClick={() => onStatusTab("closed")}
        >
          <p>Closed</p>
          <h4>{counts.closed}</h4>
        </button>
      </div>

      <div className={`support-split ${selectedId ? "has-detail" : ""}`}>
        <div className="data-table support-list-table">
          <div className="card m-b-30 table-bg distribution-table-card support-list-card">
            <div className="card-body table-responsive">
              <div className="login-log-controls editorial-filter-row support-table-toolbar">
                <label className="small text-muted m-0">
                  Show{" "}
                  <select
                    className="form-select form-select-sm d-inline-block login-log-length"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {PAGE_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>{" "}
                  entries
                </label>
                <label className="small text-muted m-0">
                  Search:{" "}
                  <input
                    className="form-control form-control-sm d-inline-block login-log-search editorial-search"
                    placeholder="min. 3 characters"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </label>
              </div>

              {loading ? (
                <div className="text-center text-muted py-5">Loading tickets…</div>
              ) : (
                <div className="support-table-scroll" role="region" aria-label="Support tickets" tabIndex={0}>
                <table className="table table-bordered table-bg1 mb-0 support-ticket-table">
                  <thead>
                    <tr>
                      <th scope="col" className="support-col-user">User Name</th>
                      <th scope="col" className="support-col-ticket">Ticket #</th>
                      <th scope="col" className="support-col-subject">Subject</th>
                      <th scope="col" className="support-col-date" title="Date the ticket was raised">
                        Raised On
                      </th>
                      <th scope="col" className="support-col-status">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-5 text-muted">
                          {search ? "No matching records found." : "No tickets found."}
                        </td>
                      </tr>
                    ) : (
                      tickets.map((row) => (
                        <tr
                          key={row.id}
                          className={selectedId === row.id ? "support-row-active" : ""}
                          onClick={() => onSelectTicket(row.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <td className="support-col-user">
                            {row.cname || "-"}
                            {row.unread_count > 0 ? (
                              <span className="badge rounded-pill bg-primary ms-1">{row.unread_count}</span>
                            ) : null}
                          </td>
                          <td className="support-col-ticket">{row.id}</td>
                          <td className="support-col-subject" title={row.subject || undefined}>
                            {row.subject || "-"}
                          </td>
                          <td className="support-col-date">{formatTicketDate(row.timestamp)}</td>
                          <td className="support-col-status">
                            <span
                              className={`badge rounded-pill ${
                                row.status === "open" ? "bg-success" : "bg-danger"
                              }`}
                            >
                              {row.status === "open" ? "Open" : "Closed"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              )}

              <div className="login-log-pagination-wrap">
                <div className="small text-muted">
                  Showing {startEntry} to {endEntry} of {totalEntries} entries
                  {search ? ` (filtered)` : ""}
                </div>
                <div className="login-log-pagination align-items-center flex-wrap">
                  <button
                    type="button"
                    className="login-log-page-btn"
                    disabled={!canGoPrevious}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  {pageNumbers().map((p, idx) =>
                    p === "…" ? (
                      <span key={`e-${idx}`} className="px-1">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`login-log-page-btn ${page === p ? "active" : ""}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="login-log-page-btn"
                    disabled={!canGoNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedId ? (
          <div className="support-detail-panel" ref={detailPanelRef}>
            {detailLoading ? (
              <div className="support-detail-loading">Loading conversation…</div>
            ) : detail ? (
              <>
                <div className="support-detail-head">
                  <div className="support-detail-head-top">
                    <h2 className="support-detail-title">Ticket No: {detail.ticket.id}</h2>
                    {!isClosed && (
                      <button
                        type="button"
                        className="support-resolve-btn"
                        onClick={() => {
                          setResolveNote("");
                          setResolveOpen(true);
                        }}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                  <p className="support-detail-date">{formatTicketDate(detail.ticket.timestamp)}</p>
                  {detail.ticket.subject ? (
                    <p className="support-detail-subject" title={detail.ticket.subject}>
                      {detail.ticket.subject}
                    </p>
                  ) : null}
                  {detail.show_approve_decline && !isClosed && (
                    <div className="support-detail-actions">
                      <button
                        type="button"
                        className="support-action-btn resolve"
                        onClick={() => {
                          setResolveNote("");
                          setResolveOpen(true);
                        }}
                      >
                        Mark as resolved
                      </button>
                      <button type="button" className="support-action-btn approve" onClick={onApprove}>
                        Approved
                      </button>
                      <button type="button" className="support-action-btn decline" onClick={onDecline}>
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                <div className="support-chat-body">
                  {detail.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`support-chat-item ${msg.is_user ? "support-chat-item--user" : "support-chat-item--admin"}`}
                    >
                      <div className="support-chat-bubble">
                        <p className="support-chat-text">{msg.description}</p>
                        {msg.files?.map((f) => (
                          <a
                            key={f.url}
                            className="support-chat-file"
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {f.name}
                          </a>
                        ))}
                      </div>
                      <p className="support-chat-meta">
                        Sent by: {msg.sender_name}
                        {msg.chatting_date_time ? ` · ${msg.chatting_date_time}` : ""}
                      </p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {!isClosed && (
                  <div className="support-chat-compose">
                    <input ref={fileRef} type="file" hidden onChange={onFileSelected} />
                    {selectedFile ? (
                      <div className="support-chat-attachment-preview">
                        {selectedFilePreview ? (
                          <img
                            src={selectedFilePreview}
                            alt=""
                            className="support-chat-attachment-thumb"
                          />
                        ) : (
                          <span className="support-chat-attachment-doc-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                              <path
                                fill="currentColor"
                                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm4 18H6V4h7v5h5v11Z"
                              />
                            </svg>
                          </span>
                        )}
                        <div className="support-chat-attachment-info">
                          <span className="support-chat-attachment-name">{selectedFile.name}</span>
                          <span className="support-chat-attachment-size">
                            {(selectedFile.size / 1024).toFixed(selectedFile.size > 102400 ? 0 : 1)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          className="support-chat-attachment-remove"
                          onClick={clearSelectedFile}
                          aria-label="Remove attachment"
                        >
                          ×
                        </button>
                      </div>
                    ) : null}
                    <div className="support-chat-compose-row">
                    <div className="support-chat-compose-tools">
                      <button
                        type="button"
                        className="support-attach-btn"
                        title="Attach file"
                        onClick={() => fileRef.current?.click()}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6h-1.5v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6H16.5Z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="support-attach-btn"
                        title="Attach image"
                        onClick={() => {
                          if (fileRef.current) {
                            fileRef.current.accept = "image/*";
                            fileRef.current.click();
                            fileRef.current.accept = "";
                          }
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5Z"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="support-chat-compose-field">
                      <input
                        type="text"
                        className="support-chat-input"
                        placeholder="Type here"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSendMessage();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="support-send-btn"
                        disabled={sending || (!messageText.trim() && !selectedFile)}
                        onClick={onSendMessage}
                        aria-label="Send message"
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"
                          />
                        </svg>
                      </button>
                    </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="support-detail-loading">Ticket not found</div>
            )}
          </div>
        ) : null}
      </div>

      {addOpen && (
        <div className="modal-backdrop-lite">
          <div className="modal-card-lite distribution-modal manage-user-modal">
            <div className="d-flex justify-content-between align-items-center mb-2 manage-user-modal__top">
              <h5 className="mb-0">Raise a new ticket</h5>
              <button type="button" className="btn-close" onClick={() => setAddOpen(false)} aria-label="Close" />
            </div>
            <form onSubmit={onCreateTicket} noValidate>
              <div className="manage-user-modal__scroll">
                <section
                  className="manage-user-modal__panel manage-user-modal__panel--personal"
                  aria-labelledby="support-sec-contact"
                >
                  <h6 id="support-sec-contact" className="manage-user-modal__panel-title">
                    Contact details
                  </h6>
                  <p className="manage-user-modal__panel-hint">Email, country dial code and phone number.</p>
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label">Email Id</label>
                      <input
                        className="form-control"
                        required
                        placeholder="Enter text here"
                        value={addForm.email}
                        onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Country code</label>
                      {meta.countryCodes?.length > 0 ? (
                        <select
                          className="form-select"
                          value={addForm.countryCode}
                          onChange={(e) => setAddForm((f) => ({ ...f, countryCode: e.target.value }))}
                        >
                          <option value="">Please select</option>
                          {meta.countryCodes.map((cc) => (
                            <option key={cc.id} value={cc.label}>
                              {cc.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="form-control"
                          placeholder="IND | +91"
                          value={addForm.countryCode}
                          onChange={(e) => setAddForm((f) => ({ ...f, countryCode: e.target.value }))}
                        />
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone Number</label>
                      <input
                        className="form-control"
                        placeholder="Enter text here"
                        value={addForm.mobile}
                        onChange={(e) =>
                          setAddForm((f) => ({ ...f, mobile: e.target.value.replace(/[^\d]/g, "") }))
                        }
                      />
                    </div>
                  </div>
                </section>

                <section
                  className="manage-user-modal__panel manage-user-modal__panel--other manage-user-modal__panel--last"
                  aria-labelledby="support-sec-ticket"
                >
                  <h6 id="support-sec-ticket" className="manage-user-modal__panel-title">
                    Ticket details
                  </h6>
                  <p className="manage-user-modal__panel-hint">Subject, category and message for the support team.</p>
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label">Subject</label>
                      <input
                        className="form-control"
                        required
                        placeholder="Enter text here"
                        value={addForm.subject}
                        onChange={(e) => setAddForm((f) => ({ ...f, subject: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">How may we help you?</label>
                      <select
                        className="form-select"
                        value={addForm.query}
                        onChange={(e) => setAddForm((f) => ({ ...f, query: Number(e.target.value) }))}
                      >
                        {(meta.query_options || []).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        required
                        rows={4}
                        placeholder="Enter text here"
                        value={addForm.description}
                        onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                  </div>
                </section>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top manage-user-modal__footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Please wait..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resolveOpen && (
        <div className="modal-backdrop-lite">
          <div className="modal-card-lite distribution-modal manage-user-modal" style={{ maxWidth: 480 }}>
            <div className="d-flex justify-content-between align-items-center mb-2 manage-user-modal__top">
              <h5 className="mb-0">Resolve Ticket</h5>
              <button type="button" className="btn-close" onClick={() => setResolveOpen(false)} aria-label="Close" />
            </div>
            <section className="manage-user-modal__panel manage-user-modal__panel--last text-center">
              <div className="support-resolve-icon mx-auto mb-2">✓</div>
              <p className="manage-user-modal__panel-hint mb-3">
                Are you sure you want to resolve this ticket? Please add a resolution note below.
              </p>
              <label className="form-label text-start w-100 mb-1">
                Resolution note <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control"
                rows={4}
                required
                placeholder="Enter resolution note"
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
              />
            </section>
            <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top manage-user-modal__footer">
              <button type="button" className="btn btn-secondary" onClick={() => setResolveOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting || !resolveNote.trim()}
                onClick={onResolve}
              >
                {submitting ? "Please wait..." : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageSupportPage;
