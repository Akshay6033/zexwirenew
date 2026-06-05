import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useConfirm } from "../../context/ConfirmContext";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { getApiOrigin } from "../../../utils/apiBase";

const PAGE_SIZES = [10, 25, 50, 100];

const INITIAL_FORM = {
  id: null,
  dname: "",
  credits: "",
  website: ""
};

/** Legacy feed path: /Feed/RSS/{vendor} (CodeIgniter Feed::RSS) */
function vendorFeedHref(row) {
  const stored = String(row?.vendor_url || "").trim();
  const name = String(row?.dname || row?.url || "").trim();
  if (!name && !stored) return "";

  if (stored && /\/Feed\/RSS\//i.test(stored)) return stored;

  try {
    const base = stored ? new URL(stored).origin : getApiOrigin();
    return `${base}/Feed/RSS/${encodeURIComponent(name)}`;
  } catch {
    return `${getApiOrigin()}/Feed/RSS/${encodeURIComponent(name)}`;
  }
}

function ManageDistributionPage() {
  const { confirm } = useConfirm();
  const adminUser = useMemo(() => JSON.parse(localStorage.getItem("adminUser") || "{}"), []);
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

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState({ vendor: null, creditsHistory: [] });

  const currentPage = Math.floor(query.start / query.length) + 1;
  const totalPages = Math.max(Math.ceil(filteredTotal / query.length), 1);
  const startEntry = filteredTotal === 0 ? 0 : query.start + 1;
  const endEntry = Math.min(query.start + query.length, filteredTotal);
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < filteredTotal;

  useEffect(() => {
    const timer = setTimeout(() => {
      const typed = searchInput.trim();
      const nextSearch = typed.length >= 2 ? typed : "";
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
      const res = await adminDashboardApi.getDistributions(query);
      setRows(res.data?.data || []);
      setTotal(res.data?.meta?.recordsTotal || 0);
      setFilteredTotal(res.data?.meta?.recordsFiltered || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setFilteredTotal(0);
      toast.error(error.response?.data?.message || "Could not load distributions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [query]);

  const openAddModal = () => {
    setForm(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setForm({
      id: row.id,
      dname: row.dname || "",
      credits: row.credits ?? "",
      website: row.website || ""
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!String(form.dname).trim()) nextErrors.dname = "Vendor name is required";
    if (form.credits === "" || form.credits === null || form.credits === undefined) nextErrors.credits = "Credits is required";
    const credits = Number(form.credits);
    if (Number.isNaN(credits) || credits < 0) nextErrors.credits = "Credits must be a valid non-negative number";
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fill all required vendor fields.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        dname: String(form.dname).trim(),
        credits: Number(form.credits),
        website: String(form.website || "").trim(),
        who_added_credits: adminUser.id || 0
      };
      if (form.id) {
        await adminDashboardApi.updateDistribution(form.id, payload);
        toast.success("Vendor updated successfully");
      } else {
        await adminDashboardApi.createDistribution(payload);
        toast.success("Vendor added successfully");
      }
      setModalOpen(false);
      setForm(INITIAL_FORM);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (row) => {
    const vendorName = String(row.dname || "this vendor").trim();
    const ok = await confirm(
      row.active
        ? `Are you sure Deactive Vendor "${vendorName}" ?`
        : `Are you sure Active Vendor "${vendorName}" ?`
    );
    if (!ok) return;

    try {
      await adminDashboardApi.updateDistributionStatus(row.id, { active: row.active ? 0 : 1 });
      toast.success(row.active ? "Vendor deactivated successfully" : "Vendor activated successfully");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update vendor status");
    }
  };

  const openHistory = async (row) => {
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await adminDashboardApi.getDistributionHistory(row.id);
      setHistoryData(res.data?.data || { vendor: null, creditsHistory: [] });
    } catch (error) {
      setHistoryData({ vendor: null, creditsHistory: [] });
      toast.error(error.response?.data?.message || "Could not load vendor history");
    } finally {
      setHistoryLoading(false);
    }
  };

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

  return (
    <div className="container-fluid manage-distribution-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4 className="mt-2 mb-2">Manage Vendor</h4>
        <div className="d-flex gap-2">
          <button type="button" className="btn refresh-icon-btn" onClick={() => window.location.reload()} aria-label="Refresh page" title="Refresh">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
            </svg>
          </button>
          <button type="button" className="btn add-vendor-btn" onClick={openAddModal}>
            Add New Vendor
          </button>
        </div>
      </div>

      <div className="data-table">
        <div className="row">
          <div className="col-lg-12 col-sm-12">
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

                <div className="table-odd">
                  <table className="table table-bordered table-bg1 mb-0">
                    <thead>
                      <tr>
                        <th><button type="button" className="login-log-sort" onClick={() => onSort("id")}>Sr.No <span>{sortArrow("id")}</span></button></th>
                        <th><button type="button" className="login-log-sort" onClick={() => onSort("dname")}>Vendor Name <span>{sortArrow("dname")}</span></button></th>
                        <th><button type="button" className="login-log-sort" onClick={() => onSort("nopublication")}>No. Of Publication <span>{sortArrow("nopublication")}</span></button></th>
                        <th><button type="button" className="login-log-sort" onClick={() => onSort("credits")}>Credits <span>{sortArrow("credits")}</span></button></th>
                        <th><span className="distribution-th-text">End point/Feed for Vendor</span></th>
                        <th><button type="button" className="login-log-sort" onClick={() => onSort("active")}>Active / Deactive <span>{sortArrow("active")}</span></button></th>
                        <th><span className="distribution-th-text">Edit</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loading && rows.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center text-muted py-4">No vendors found.</td>
                        </tr>
                      )}
                      {rows.map((row, index) => {
                        const feedUrl = vendorFeedHref(row);
                        return (
                        <tr key={row.id}>
                          <td>{query.start + index + 1}</td>
                          <td>
                            <button type="button" className="vendor-link-btn" onClick={() => openHistory(row)}>
                              {row.dname}
                            </button>
                          </td>
                          <td>{row.nopublication}</td>
                          <td>{row.credits}</td>
                          <td>
                            {feedUrl ? (
                              <a href={feedUrl} target="_blank" rel="noreferrer" className="vendor-url-link">
                                {feedUrl}
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`status-toggle ${row.active ? "on" : "off"}`}
                              onClick={() => toggleStatus(row)}
                              aria-label={row.active ? "Deactivate vendor" : "Activate vendor"}
                            >
                              <span className="status-toggle-knob" />
                            </button>
                          </td>
                          <td>
                            <button type="button" className="edit-icon-btn" onClick={() => openEditModal(row)} aria-label="Edit vendor">
                              ✎
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

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
                    <button type="button" className="login-log-page-btn active">{currentPage}</button>
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
      </div>

      {modalOpen && (
        <div className="modal-backdrop-lite">
          <div className="modal-card-lite distribution-modal">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{form.id ? "Edit Vendor" : "Add New Vendor"}</h5>
              <button type="button" className="btn-close" onClick={() => setModalOpen(false)} />
            </div>

            <div className="mb-3">
              <label className="form-label">Vendor Name</label>
              <input
                className="form-control"
                value={form.dname}
                onChange={(e) => setForm((prev) => ({ ...prev, dname: e.target.value }))}
              />
              {formErrors.dname && <div className="field-error">{formErrors.dname}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Credits</label>
              <input
                className="form-control"
                value={form.credits}
                onChange={(e) => setForm((prev) => ({ ...prev, credits: e.target.value }))}
              />
              {formErrors.credits && <div className="field-error">{formErrors.credits}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Website</label>
              <input
                className="form-control"
                value={form.website}
                onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
                {submitting ? "Please wait..." : form.id ? "Update Vendor" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModalOpen && (
        <div className="modal-backdrop-lite">
          <div className="modal-card-lite distribution-history-modal">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Vendor History</h5>
              <button type="button" className="btn-close" onClick={() => setHistoryModalOpen(false)} />
            </div>

            {historyLoading ? (
              <div className="text-muted">Loading...</div>
            ) : (
              <>
                <div className="table-responsive mb-3">
                  <table className="table table-bordered mb-0">
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>No Of Publication</th>
                        <th>Credits Limit</th>
                        <th>Available Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{historyData.vendor?.dname || "-"}</td>
                        <td>{historyData.vendor?.nopublication || 0}</td>
                        <td>{historyData.vendor?.credits || 0}</td>
                        <td>{historyData.vendor?.use_credits || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered mb-0">
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>Add Credits</th>
                        <th>Who's Add Credits</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.creditsHistory?.length ? (
                        historyData.creditsHistory.map((row) => (
                          <tr key={row.id}>
                            <td>{historyData.vendor?.dname || "-"}</td>
                            <td>{row.added_credits}</td>
                            <td>{row.added_by_username || row.who_added_credits}</td>
                            <td>{row.timestamp}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center text-muted">No credit history found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageDistributionPage;
