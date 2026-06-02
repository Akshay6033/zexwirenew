import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { useConfirm } from "../../context/ConfirmContext";

const PAGE_SIZES = [10, 25, 50, 100];
const PASSWORD_REGEX =
  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;
const INITIAL_FORM = {
  id: null,
  username: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: ""
};

function ManageStaffPage() {
  const { confirm } = useConfirm();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ recordsTotal: 0, recordsFiltered: 0 });
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
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentPage = Math.floor(query.start / query.length) + 1;
  const filteredTotal = meta.recordsFiltered || 0;
  const startEntry = filteredTotal === 0 ? 0 : query.start + 1;
  const endEntry = Math.min(query.start + query.length, filteredTotal);
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < filteredTotal;

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await adminDashboardApi.getManageStaff(query);
      setRows(res.data?.data || []);
      setMeta({
        recordsTotal: res.data?.meta?.recordsTotal || 0,
        recordsFiltered: res.data?.meta?.recordsFiltered || 0
      });
    } catch (error) {
      setRows([]);
      setMeta({ recordsTotal: 0, recordsFiltered: 0 });
      toast.error(error.response?.data?.message || "Could not load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const typed = searchInput.trim();
      const nextSearch = typed.length >= 3 ? typed : "";
      setQuery((prev) => {
        if (prev.start === 0 && prev.search === nextSearch) return prev;
        return { ...prev, start: 0, search: nextSearch };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadStaff();
  }, [query]);

  const openAddModal = () => {
    setForm(INITIAL_FORM);
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setForm({
      id: row.id,
      username: row.username || "",
      email: row.email || "",
      phone: row.phone || "",
      password: "",
      confirmPassword: ""
    });
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalOpen(true);
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

  const validateForm = () => {
    const errors = {};
    const username = String(form.username || "").trim();
    const email = String(form.email || "").trim();
    const phone = String(form.phone || "").trim();
    const password = String(form.password || "");
    const confirmPassword = String(form.confirmPassword || "");

    if (!username) errors.username = "Enter user name";
    if (!email) errors.email = "Enter email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter valid email";
    if (!phone) errors.phone = "Enter phone number";
    else if (phone.length < 10 || phone.length > 13) errors.phone = "Phone should be 10 to 13 digits";
    if (!form.id && !password) errors.password = "Set a password";
    if (password && !PASSWORD_REGEX.test(password)) {
      errors.password =
        "Password must be 8-15 chars with uppercase, lowercase, number and special character";
    }
    if (password && confirmPassword !== password) {
      errors.confirmPassword = "Password did not match";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitForm = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        username: String(form.username || "").trim(),
        email: String(form.email || "").trim(),
        phone: String(form.phone || "").trim(),
        password: String(form.password || "")
      };
      if (form.id) {
        await adminDashboardApi.updateManageStaff(form.id, payload);
        toast.success("Staff updated successfully");
      } else {
        await adminDashboardApi.createManageStaff(payload);
        toast.success("Staff added successfully");
      }
      setModalOpen(false);
      loadStaff();
    } catch (error) {
      setFormErrors({ submit: error.response?.data?.message || "Could not save staff" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (row) => {
    const ok = await confirm(row.active ? "Are you sure Deactive Staff ?" : "Are you sure Active Staff ?");
    if (!ok) return;
    try {
      await adminDashboardApi.updateManageStaffStatus(row.id, { active: row.active ? 0 : 1 });
      toast.success(row.active ? "Staff deactivated successfully" : "Staff activated successfully");
      loadStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update staff status");
    }
  };

  const deletePermanently = async (row) => {
    const ok = await confirm("Are you sure delete permanently Staff ?");
    if (!ok) return;
    try {
      await adminDashboardApi.deleteManageStaffPermanently(row.id);
      toast.success("Staff deleted permanently");
      loadStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete staff");
    }
  };

  return (
    <div className="container-fluid manage-user-page manage-package-page manage-staff-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4 className="mt-2 mb-2">Manage Staff</h4>
        <div className="d-flex gap-2">
          <button type="button" className="btn refresh-icon-btn" onClick={() => window.location.reload()} aria-label="Refresh page" title="Refresh">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
            </svg>
          </button>
          <button type="button" className="btn add-vendor-btn" onClick={openAddModal}>Add New Staff</button>
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
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("id")}>Sl.No. <span>{sortArrow("id")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("username")}>User Name <span>{sortArrow("username")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("email")}>Email <span>{sortArrow("email")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("phone")}>Mobile No <span>{sortArrow("phone")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("active")}>Active / Deactive <span>{sortArrow("active")}</span></button></th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted py-4">No staff found.</td></tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{query.start + index + 1}</td>
                    <td>{row.username}</td>
                    <td>{row.email}</td>
                    <td>{row.phone}</td>
                    <td>
                      <button type="button" className={`status-toggle ${row.active ? "on" : "off"}`} onClick={() => toggleStatus(row)}>
                        <span className="status-toggle-knob" />
                      </button>
                    </td>
                    <td>
                      <button type="button" className="edit-icon-btn me-2" onClick={() => openEditModal(row)}>✎</button>
                      <button type="button" className="edit-icon-btn country-delete-icon-btn" onClick={() => deletePermanently(row)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="login-log-pagination-wrap">
              <div className="small text-muted">
                Showing {startEntry} to {endEntry} of {filteredTotal} entries
                {query.search ? ` (filtered from ${meta.recordsTotal || 0} total entries)` : ""}
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

      {modalOpen && (
        <div className="modal-backdrop-lite">
          <div className="modal-card-lite distribution-modal manage-user-modal">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{form.id ? "Edit Staff" : "Add New Staff"}</h5>
              <button type="button" className="btn-close" onClick={() => setModalOpen(false)} />
            </div>
            <div className="row g-2">
              <div className="col-md-6"><label className="form-label">User Name</label><input className="form-control" value={form.username} onChange={(e) => { setForm((p) => ({ ...p, username: e.target.value })); setFormErrors((prev) => ({ ...prev, username: "" })); }} />{formErrors.username ? <div className="field-error mt-1">{formErrors.username}</div> : null}</div>
              <div className="col-md-6"><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setFormErrors((prev) => ({ ...prev, email: "" })); }} />{formErrors.email ? <div className="field-error mt-1">{formErrors.email}</div> : null}</div>
              <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={(e) => { setForm((p) => ({ ...p, phone: e.target.value.replace(/[^\d]/g, "") })); setFormErrors((prev) => ({ ...prev, phone: "" })); }} />{formErrors.phone ? <div className="field-error mt-1">{formErrors.phone}</div> : null}</div>
              <div className="col-md-6">
                <label className="form-label">Password {form.id ? "(optional)" : ""}</label>
                <div className="password-field-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control pe-5"
                    value={form.password}
                    onChange={(e) => { setForm((p) => ({ ...p, password: e.target.value })); setFormErrors((prev) => ({ ...prev, password: "" })); }}
                  />
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {!showPassword ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M2.1 3.51L3.5 2.1l18.4 18.39-1.41 1.41-3.11-3.11A11.8 11.8 0 0 1 12 20C6.5 20 2 16 1 12c.48-1.9 1.58-3.65 3.11-5.08L2.1 3.5Zm5.05 5.04A4.97 4.97 0 0 0 7 10a5 5 0 0 0 7.45 4.33l-1.62-1.62A2.5 2.5 0 0 1 9.3 9.17L7.15 8.55Zm13.74 3.45a11.84 11.84 0 0 1-2.7 4.3l-1.42-1.42A9.92 9.92 0 0 0 19 12a10.14 10.14 0 0 0-7-4c-.8 0-1.6.1-2.34.3L7.95 6.6A12.3 12.3 0 0 1 12 6c5.5 0 10 4 11 8ZM12 9a3 3 0 0 1 3 3v.2l-3.2-3.2H12Z"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 5c5.5 0 10 4 11 7-1 3-5.5 7-11 7S2 15 1 12c1-3 5.5-7 11-7Zm0 2C8 7 4.7 9.5 3.2 12 4.7 14.5 8 17 12 17s7.3-2.5 8.8-5C19.3 9.5 16 7 12 7Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {formErrors.password ? <div className="field-error mt-1">{formErrors.password}</div> : null}
              </div>
              <div className="col-md-6">
                <label className="form-label">Confirm Password {form.id ? "(optional)" : ""}</label>
                <div className="password-field-wrap">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-control pe-5"
                    value={form.confirmPassword}
                    onChange={(e) => { setForm((p) => ({ ...p, confirmPassword: e.target.value })); setFormErrors((prev) => ({ ...prev, confirmPassword: "" })); }}
                  />
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none password-toggle-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {!showConfirmPassword ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M2.1 3.51L3.5 2.1l18.4 18.39-1.41 1.41-3.11-3.11A11.8 11.8 0 0 1 12 20C6.5 20 2 16 1 12c.48-1.9 1.58-3.65 3.11-5.08L2.1 3.5Zm5.05 5.04A4.97 4.97 0 0 0 7 10a5 5 0 0 0 7.45 4.33l-1.62-1.62A2.5 2.5 0 0 1 9.3 9.17L7.15 8.55Zm13.74 3.45a11.84 11.84 0 0 1-2.7 4.3l-1.42-1.42A9.92 9.92 0 0 0 19 12a10.14 10.14 0 0 0-7-4c-.8 0-1.6.1-2.34.3L7.95 6.6A12.3 12.3 0 0 1 12 6c5.5 0 10 4 11 8ZM12 9a3 3 0 0 1 3 3v.2l-3.2-3.2H12Z"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 5c5.5 0 10 4 11 7-1 3-5.5 7-11 7S2 15 1 12c1-3 5.5-7 11-7Zm0 2C8 7 4.7 9.5 3.2 12 4.7 14.5 8 17 12 17s7.3-2.5 8.8-5C19.3 9.5 16 7 12 7Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {formErrors.confirmPassword ? <div className="field-error mt-1">{formErrors.confirmPassword}</div> : null}
              </div>
            </div>
            {formErrors.submit ? <div className="field-error mt-2">{formErrors.submit}</div> : null}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={submitting} onClick={submitForm}>
                {submitting ? "Please wait..." : form.id ? "Update Staff" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageStaffPage;
