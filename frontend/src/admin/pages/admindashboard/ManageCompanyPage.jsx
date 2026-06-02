import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { useConfirm } from "../../context/ConfirmContext";

const PAGE_SIZES = [10, 25, 50, 100];
const INITIAL_FORM = {
  id: null,
  created_by: 0,
  cname: "",
  address: "",
  contact_person: "",
  mobile: "",
  email: "",
  website: "",
  state: "",
  country: 0
};

function ManageCompanyPage() {
  const { confirm } = useConfirm();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ recordsTotal: 0, recordsFiltered: 0 });
  const [countries, setCountries] = useState([]);
  const [staff, setStaff] = useState([]);
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
  const [submitting, setSubmitting] = useState(false);

  const currentPage = Math.floor(query.start / query.length) + 1;
  const filteredTotal = meta.recordsFiltered || 0;
  const startEntry = filteredTotal === 0 ? 0 : query.start + 1;
  const endEntry = Math.min(query.start + query.length, filteredTotal);
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < filteredTotal;

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const res = await adminDashboardApi.getManageCompanies(query);
      setRows(res.data?.data || []);
      setMeta({
        recordsTotal: res.data?.meta?.recordsTotal || 0,
        recordsFiltered: res.data?.meta?.recordsFiltered || 0
      });
    } catch (error) {
      setRows([]);
      setMeta({ recordsTotal: 0, recordsFiltered: 0 });
      toast.error(error.response?.data?.message || "Could not load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    adminDashboardApi.getManageCompanyMeta().then((res) => {
      setCountries(res.data?.data?.countries || []);
      setStaff(res.data?.data?.staff || []);
    });
  }, []);

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
    loadCompanies();
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

  const openAddModal = () => {
    setForm(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setForm({
      id: row.id,
      created_by: Number(row.created_by || 0),
      cname: row.cname || "",
      address: row.address || "",
      contact_person: row.contact_person || "",
      mobile: row.mobile || "",
      email: row.email || "",
      website: row.website || "",
      state: row.state || "",
      country: Number(row.country || 0)
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    const cname = String(form.cname || "").trim();
    const contact = String(form.contact_person || "").trim();
    const mobile = String(form.mobile || "").trim();
    const email = String(form.email || "").trim();
    const website = String(form.website || "").trim();
    const state = String(form.state || "").trim();
    const country = Number(form.country || 0);
    if (!cname) errors.cname = "Enter company name";
    if (!contact) errors.contact_person = "Enter contact person";
    if (!mobile) errors.mobile = "Enter mobile number";
    else if (mobile.length < 10 || mobile.length > 13) errors.mobile = "Mobile should be 10 to 13 digits";
    if (!email) errors.email = "Enter email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter valid email";
    if (!website) errors.website = "Enter website";
    if (!state) errors.state = "Enter state";
    if (!country) errors.country = "Select country";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitForm = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        created_by: Number(form.created_by || 0),
        cname: String(form.cname || "").trim(),
        address: String(form.address || "").trim(),
        contact_person: String(form.contact_person || "").trim(),
        mobile: String(form.mobile || "").trim(),
        email: String(form.email || "").trim(),
        website: String(form.website || "").trim(),
        state: String(form.state || "").trim(),
        country: Number(form.country || 0)
      };
      if (form.id) {
        await adminDashboardApi.updateManageCompany(form.id, payload);
        toast.success("Company updated successfully");
      } else {
        await adminDashboardApi.createManageCompany(payload);
        toast.success("Company added successfully");
      }
      setModalOpen(false);
      loadCompanies();
    } catch (error) {
      setFormErrors({ submit: error.response?.data?.message || "Could not save company" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (row) => {
    const ok = await confirm(row.active ? "Are you sure Deactive Company ?" : "Are you sure Active Company ?");
    if (!ok) return;
    try {
      await adminDashboardApi.updateManageCompanyStatus(row.id, { active: row.active ? 0 : 1 });
      toast.success(row.active ? "Company deactivated successfully" : "Company activated successfully");
      loadCompanies();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update company status");
    }
  };

  const deletePermanently = async (row) => {
    const ok = await confirm("Are you sure delete permanently Company ?");
    if (!ok) return;
    try {
      await adminDashboardApi.deleteManageCompanyPermanently(row.id);
      toast.success("Company deleted permanently");
      loadCompanies();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete company");
    }
  };

  return (
    <div className="container-fluid manage-user-page manage-package-page manage-company-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4 className="mt-2 mb-2">Manage Company</h4>
        <div className="d-flex gap-2">
          <button type="button" className="btn refresh-icon-btn" onClick={() => window.location.reload()} aria-label="Refresh page" title="Refresh">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
            </svg>
          </button>
          <button type="button" className="btn add-vendor-btn" onClick={openAddModal}>Add New Company</button>
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
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("cname")}>Company Name <span>{sortArrow("cname")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("contact_person")}>Contact Person <span>{sortArrow("contact_person")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("email")}>Email <span>{sortArrow("email")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("mobile")}>Mobile <span>{sortArrow("mobile")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("country_name")}>Country <span>{sortArrow("country_name")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("active")}>Active / Deactive <span>{sortArrow("active")}</span></button></th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No companies found.</td></tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{query.start + index + 1}</td>
                    <td>{row.cname}</td>
                    <td>{row.contact_person}</td>
                    <td>{row.email}</td>
                    <td>{row.mobile}</td>
                    <td>{row.country_name || "-"}</td>
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
              <h5 className="mb-0">{form.id ? "Edit Company" : "Add New Company"}</h5>
              <button type="button" className="btn-close" onClick={() => setModalOpen(false)} />
            </div>
            <div className="row g-2">
              <div className="col-md-6"><label className="form-label">Company Name</label><input className="form-control" value={form.cname} onChange={(e) => { setForm((p) => ({ ...p, cname: e.target.value })); setFormErrors((prev) => ({ ...prev, cname: "" })); }} />{formErrors.cname ? <div className="field-error mt-1">{formErrors.cname}</div> : null}</div>
              <div className="col-md-6"><label className="form-label">Contact Person</label><input className="form-control" value={form.contact_person} onChange={(e) => { setForm((p) => ({ ...p, contact_person: e.target.value })); setFormErrors((prev) => ({ ...prev, contact_person: "" })); }} />{formErrors.contact_person ? <div className="field-error mt-1">{formErrors.contact_person}</div> : null}</div>
              <div className="col-md-6"><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setFormErrors((prev) => ({ ...prev, email: "" })); }} />{formErrors.email ? <div className="field-error mt-1">{formErrors.email}</div> : null}</div>
              <div className="col-md-6"><label className="form-label">Mobile</label><input className="form-control" value={form.mobile} onChange={(e) => { setForm((p) => ({ ...p, mobile: e.target.value.replace(/[^\d]/g, "") })); setFormErrors((prev) => ({ ...prev, mobile: "" })); }} />{formErrors.mobile ? <div className="field-error mt-1">{formErrors.mobile}</div> : null}</div>
              <div className="col-md-6"><label className="form-label">Address</label><input className="form-control" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label">State</label><input className="form-control" value={form.state} onChange={(e) => { setForm((p) => ({ ...p, state: e.target.value })); setFormErrors((prev) => ({ ...prev, state: "" })); }} />{formErrors.state ? <div className="field-error mt-1">{formErrors.state}</div> : null}</div>
              <div className="col-md-6"><label className="form-label">Website</label><input className="form-control" value={form.website} onChange={(e) => { setForm((p) => ({ ...p, website: e.target.value })); setFormErrors((prev) => ({ ...prev, website: "" })); }} />{formErrors.website ? <div className="field-error mt-1">{formErrors.website}</div> : null}</div>
              <div className="col-md-6">
                <label className="form-label">Country</label>
                <select className="form-select" value={form.country} onChange={(e) => { setForm((p) => ({ ...p, country: Number(e.target.value) })); setFormErrors((prev) => ({ ...prev, country: "" })); }}>
                  <option value={0}>Select country</option>
                  {countries.map((country) => <option key={country.id} value={country.id}>{country.country_name}</option>)}
                </select>
                {formErrors.country ? <div className="field-error mt-1">{formErrors.country}</div> : null}
              </div>
              <div className="col-md-6">
                <label className="form-label">Created By</label>
                <select className="form-select" value={form.created_by} onChange={(e) => setForm((p) => ({ ...p, created_by: Number(e.target.value) }))}>
                  <option value={0}>Select staff</option>
                  {staff.map((item) => <option key={item.id} value={item.id}>{item.username || item.email || `Staff #${item.id}`}</option>)}
                </select>
              </div>
            </div>
            {formErrors.submit ? <div className="field-error mt-2">{formErrors.submit}</div> : null}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={submitting} onClick={submitForm}>
                {submitting ? "Please wait..." : form.id ? "Update Company" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageCompanyPage;
