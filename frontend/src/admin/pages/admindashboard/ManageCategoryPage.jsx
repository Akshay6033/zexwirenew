import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { useConfirm } from "../../context/ConfirmContext";

const PAGE_SIZES = [10, 25, 50, 100];
const INITIAL_FORM = { id: null, category_name: "" };

function ManageCategoryPage() {
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
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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
      const res = await adminDashboardApi.getCategories(query);
      setRows(res.data?.data || []);
      setTotal(res.data?.meta?.recordsTotal || 0);
      setFilteredTotal(res.data?.meta?.recordsFiltered || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setFilteredTotal(0);
      toast.error(error.response?.data?.message || "Could not load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [query]);

  const openAddModal = () => {
    setForm(INITIAL_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setForm({ id: row.id, category_name: row.category_name || "" });
    setFormError("");
    setModalOpen(true);
  };

  const onCategoryNameChange = (value) => {
    const cleaned = String(value || "").replace(/[^A-Za-z\s]/g, "");
    setForm((prev) => ({ ...prev, category_name: cleaned }));
    setFormError("");
  };

  const onSubmit = async () => {
    const categoryName = String(form.category_name || "").trim();
    if (!categoryName) {
      setFormError("Enter category name");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(categoryName)) {
      setFormError("Category name must contain only letters and spaces");
      return;
    }

    setSubmitting(true);
    try {
      const duplicateRes = await adminDashboardApi.checkCategoryAvailability({
        name: categoryName,
        exclude_id: form.id || 0
      });
      if (duplicateRes.data?.exists) {
        setFormError("Category already exist");
        return;
      }

      if (form.id) {
        await adminDashboardApi.updateCategory(form.id, { category_name: categoryName });
        toast.success("Category updated successfully");
      } else {
        await adminDashboardApi.createCategory({ category_name: categoryName });
        toast.success("Category added successfully");
      }

      setModalOpen(false);
      setForm(INITIAL_FORM);
      setFormError("");
      load();
    } catch (error) {
      const message = error.response?.data?.message || "Could not save category";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (row) => {
    const ok = await confirm(row.active ? "Are you sure Deactive Category ?" : "Are you sure Active Category ?");
    if (!ok) return;
    try {
      await adminDashboardApi.updateCategoryStatus(row.id, { active: row.active ? 0 : 1 });
      toast.success(row.active ? "Category deactivated successfully" : "Category activated successfully");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update category status");
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
    <div className="container-fluid manage-category-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4 className="mt-2 mb-2">Manage Category</h4>
        <div className="d-flex gap-2">
          <button type="button" className="btn refresh-icon-btn" onClick={() => window.location.reload()} aria-label="Refresh page" title="Refresh">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
            </svg>
          </button>
          <button type="button" className="btn add-vendor-btn" onClick={openAddModal}>Add New Category</button>
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
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("category_name")}>Category Name <span>{sortArrow("category_name")}</span></button></th>
                  <th>Edit Category</th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("active")}>Active / Deactive <span>{sortArrow("active")}</span></button></th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted py-4">No categories found.</td></tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{query.start + index + 1}</td>
                    <td>{row.category_name}</td>
                    <td>
                      <button type="button" className="edit-icon-btn" onClick={() => openEditModal(row)} aria-label="Edit category">✎</button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`status-toggle ${row.active ? "on" : "off"}`}
                        onClick={() => toggleStatus(row)}
                        aria-label={row.active ? "Deactivate category" : "Activate category"}
                      >
                        <span className="status-toggle-knob" />
                      </button>
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

      {modalOpen && (
        <div className="modal-backdrop-lite">
          <div className="modal-card-lite distribution-modal">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{form.id ? "Edit Category" : "Add New Category"}</h5>
              <button type="button" className="btn-close" onClick={() => setModalOpen(false)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Category Name</label>
              <input className="form-control" value={form.category_name} onChange={(e) => onCategoryNameChange(e.target.value)} />
              {formError ? <div className="field-error mt-1">{formError}</div> : null}
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={submitting}>{submitting ? "Please wait..." : form.id ? "Update Category" : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageCategoryPage;
