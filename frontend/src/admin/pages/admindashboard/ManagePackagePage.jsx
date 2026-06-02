import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Select from "react-select";
import { adminDashboardApi } from "../../services/adminDashboardApi";

const PAGE_SIZES = [10, 25, 50, 100];
const SCOPE_LABEL = {
  all: "Manage Package",
  online: "Online Package",
  offline: "Offline Package",
  reseller: "Reseller Package",
  crypto: "Crypto Package",
  indian: "Indian PR Package",
  white_label: "White Label PR Package"
};

const INITIAL_FORM = {
  id: null,
  pname: "",
  price: "",
  n_press_rel: "",
  package_type: 1,
  package_validity: "",
  badge: 0,
  reseller_normal: 0,
  package_image: "",
  dis_id: [],
  descriptions: []
};

function parseDisIds(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

function packageTypeLabel(type) {
  return Number(type) === 1 ? "Online Package" : "Offline Package";
}

function resellerLabel(value) {
  if (Number(value) === 1) return "Reseller Package";
  if (Number(value) === 2) return "Crypto Package";
  if (Number(value) === 3) return "Indian PR Package";
  if (Number(value) === 4) return "White Label PR";
  return "Normal Package";
}

function ManagePackagePage() {
  const [searchParams] = useSearchParams();
  const scope = searchParams.get("scope") || "all";
  const title = SCOPE_LABEL[scope] || "Manage Package";

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

  const [distributions, setDistributions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [packageImageFile, setPackageImageFile] = useState(null);
  const [packageImagePreview, setPackageImagePreview] = useState("");
  const [removePackageImage, setRemovePackageImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentPage = Math.floor(query.start / query.length) + 1;
  const totalPages = Math.max(Math.ceil((meta.recordsFiltered || 0) / query.length), 1);
  const filteredCount = meta.recordsFiltered || 0;
  const canGoPrevious = query.start > 0;
  const canGoNext = query.start + query.length < filteredCount;

  useEffect(() => {
    adminDashboardApi.getPackageMeta().then((res) => {
      setDistributions(res.data?.data?.distributions || []);
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

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminDashboardApi.getPackages({ ...query, scope });
      setRows(res.data?.data || []);
      setMeta(res.data?.meta || { recordsTotal: 0, recordsFiltered: 0 });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load packages");
      setRows([]);
      setMeta({ recordsTotal: 0, recordsFiltered: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [scope, query]);

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

  const openAdd = () => {
    setForm(INITIAL_FORM);
    setPackageImageFile(null);
    setPackageImagePreview("");
    setRemovePackageImage(false);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      pname: row.pname || "",
      price: row.price || "",
      n_press_rel: row.n_press_rel || "",
      package_type: Number(row.package_type) || 1,
      package_validity: row.package_validity || "",
      badge: Number(row.badge) || 0,
      reseller_normal: Number(row.reseller_normal) || 0,
      package_image: row.package_image || "",
      dis_id: parseDisIds(row.dis_id),
      descriptions: (row.descriptions || []).map((item) => ({ des_option: item.des_option, des: item.des }))
    });
    setPackageImageFile(null);
    setPackageImagePreview(row.package_image ? `http://localhost:5000${row.package_image}` : "");
    setRemovePackageImage(false);
    setModalOpen(true);
  };

  const validate = () => {
    if (!String(form.pname).trim()) return "Package name is required";
    if (form.price === "" || Number.isNaN(Number(form.price))) return "Price is required";
    if (form.n_press_rel === "" || Number.isNaN(Number(form.n_press_rel))) return "Number Press Release / Credits is required";
    if (!form.dis_id.length) return "Please select distribution";
    return "";
  };

  const submit = async () => {
    const err = validate();
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("pname", String(form.pname).trim());
      payload.append("price", String(Number(form.price)));
      payload.append("n_press_rel", String(Number(form.n_press_rel)));
      payload.append("package_type", String(Number(form.package_type)));
      payload.append("package_validity", String(Number(form.package_validity || 0)));
      payload.append("badge", String(Number(form.badge)));
      payload.append("reseller_normal", String(Number(form.reseller_normal)));
      payload.append("dis_id", JSON.stringify(form.dis_id.map((v) => Number(v))));
      payload.append("descriptions", JSON.stringify(form.descriptions));
      payload.append("remove_package_image", removePackageImage ? "1" : "0");
      if (packageImageFile) payload.append("package_image", packageImageFile);
      if (form.id) {
        await adminDashboardApi.updatePackage(form.id, payload);
        toast.success("Package updated successfully");
      } else {
        await adminDashboardApi.createPackage(payload);
        toast.success("Package added successfully");
      }
      setModalOpen(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save package");
    } finally {
      setSaving(false);
    }
  };

  const onPackageImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Unsupported file type. Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size exceeds 2MB. Please upload a smaller image.");
      return;
    }
    setPackageImageFile(file);
    setPackageImagePreview(URL.createObjectURL(file));
    setRemovePackageImage(false);
  };

  const clearPackageImage = () => {
    setPackageImageFile(null);
    setPackageImagePreview("");
    setRemovePackageImage(true);
  };

  const toggleStatus = async (row) => {
    try {
      await adminDashboardApi.updatePackageStatus(row.id, { active: row.active ? 0 : 1 });
      toast.success(row.active ? "Package deactivated successfully" : "Package activated successfully");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update package status");
    }
  };

  const addDescriptionRow = () => {
    setForm((prev) => ({
      ...prev,
      descriptions: [...prev.descriptions, { des_option: 1, des: "" }]
    }));
  };

  const headingButtons = useMemo(() => {
    const sequencerScope = scope === "all" ? "global" : scope;
    return [{ label: "Pricing Page Sequencer", to: `/admindashboard/pricing-page-sequencer?scope=${sequencerScope}` }];
  }, [scope]);

  const distributionOptions = useMemo(
    () => distributions.map((item) => ({ value: item.id, label: item.dname })),
    [distributions]
  );

  return (
    <div className="container-fluid manage-package-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4 className="mt-2 mb-2">{title}</h4>
        <div className="d-flex gap-2">
          <button type="button" className="btn refresh-icon-btn" onClick={() => window.location.reload()} aria-label="Refresh page" title="Refresh">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
            </svg>
          </button>
          {headingButtons.map((btn) => (
            <a key={btn.label} className="btn add-vendor-btn" href={btn.to}>{btn.label}</a>
          ))}
          <button type="button" className="btn add-vendor-btn" onClick={openAdd}>Add New Package</button>
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
                    <button type="button" className="login-log-sort" onClick={() => onSort("id")}>
                      Sl.No. <span className="login-log-sort-arrow">{sortArrow("id")}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("pname")}>
                      Package Name <span className="login-log-sort-arrow">{sortArrow("pname")}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("price")}>
                      Package Price <span className="login-log-sort-arrow">{sortArrow("price")}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("n_press_rel")}>
                      Press Release Limit <span className="login-log-sort-arrow">{sortArrow("n_press_rel")}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("package_type")}>
                      Package Type <span className="login-log-sort-arrow">{sortArrow("package_type")}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("package_validity")}>
                      Package Validity <span className="login-log-sort-arrow">{sortArrow("package_validity")}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="login-log-sort" onClick={() => onSort("reseller_normal")}>
                      Normal/Reseller/Crypto/Indian PR/White Label{" "}
                      <span className="login-log-sort-arrow">{sortArrow("reseller_normal")}</span>
                    </button>
                  </th>
                  <th>Edit</th>
                  <th>Active / Deactive</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-muted py-4">No packages found.</td></tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{query.start + index + 1}</td>
                    <td>{row.pname}</td>
                    <td>$ {row.price}</td>
                    <td>{row.n_press_rel}</td>
                    <td>{packageTypeLabel(row.package_type)}</td>
                    <td>{row.package_validity} Days</td>
                    <td>{resellerLabel(row.reseller_normal)}</td>
                    <td><button type="button" className="edit-icon-btn" onClick={() => openEdit(row)}>✎</button></td>
                    <td>
                      <button type="button" className={`status-toggle ${row.active ? "on" : "off"}`} onClick={() => toggleStatus(row)}>
                        <span className="status-toggle-knob" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="login-log-pagination-wrap">
              <div className="small text-muted">
                Showing {meta.recordsFiltered ? query.start + 1 : 0} to {Math.min(query.start + query.length, meta.recordsFiltered)} of {meta.recordsFiltered} entries
              </div>
              <div className="login-log-pagination">
                <button type="button" className="login-log-page-btn" disabled={!canGoPrevious} onClick={() => setQuery((p) => ({ ...p, start: Math.max(p.start - p.length, 0) }))}>Previous</button>
                <button type="button" className="login-log-page-btn active">{currentPage}</button>
                <button type="button" className="login-log-page-btn" disabled={!canGoNext} onClick={() => setQuery((p) => ({ ...p, start: Math.min(p.start + p.length, Math.max(meta.recordsFiltered - p.length, 0)) }))}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop-lite">
          <div className="modal-card-lite distribution-modal">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{form.id ? "Edit Package" : "Add New Package"}</h5>
              <button type="button" className="btn-close" onClick={() => setModalOpen(false)} />
            </div>
            <div className="mb-2"><label className="form-label">Package Name</label><input className="form-control" value={form.pname} onChange={(e) => setForm((p) => ({ ...p, pname: e.target.value }))} /></div>
            <div className="mb-2 d-flex gap-2">
              <div className="w-50"><label className="form-label">Price</label><input className="form-control" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} /></div>
              <div className="w-50"><label className="form-label">Number Press Release / Credits</label><input className="form-control" value={form.n_press_rel} onChange={(e) => setForm((p) => ({ ...p, n_press_rel: e.target.value }))} /></div>
            </div>
            <div className="mb-2 d-flex gap-2">
              <div className="w-50"><label className="form-label">Package Type</label><select className="form-control" value={form.package_type} onChange={(e) => setForm((p) => ({ ...p, package_type: Number(e.target.value) }))}><option value={1}>Online Package</option><option value={2}>Offline Package</option></select></div>
              <div className="w-50"><label className="form-label">Package Validity (Days)</label><input className="form-control" value={form.package_validity} onChange={(e) => setForm((p) => ({ ...p, package_validity: e.target.value }))} /></div>
            </div>
            <div className="mb-2 d-flex gap-2">
              <div className="w-50"><label className="form-label">Badge</label><select className="form-control" value={form.badge} onChange={(e) => setForm((p) => ({ ...p, badge: Number(e.target.value) }))}><option value={0}>None</option><option value={1}>Most Popular</option><option value={2}>Best Value</option><option value={3}>New</option></select></div>
              <div className="w-50"><label className="form-label">Reseller/Normal Package</label><select className="form-control" value={form.reseller_normal} onChange={(e) => setForm((p) => ({ ...p, reseller_normal: Number(e.target.value) }))}><option value={0}>Normal Package</option><option value={1}>Reseller Package</option><option value={2}>Crypto Package</option><option value={3}>Indian PR Package</option><option value={4}>White Label PR Package</option></select></div>
            </div>
            <div className="mb-2">
              <label className="form-label">Package Image</label>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="form-control mb-2" onChange={onPackageImageChange} />
              <small className="text-muted d-block mb-2">Accepted formats: JPG, PNG, WebP. Max size: 2MB.</small>
              <div className="package-image-preview-box">
                {packageImagePreview ? (
                  <img src={packageImagePreview} alt="Package preview" className="package-image-preview" />
                ) : (
                  <div className="package-image-placeholder">No image selected</div>
                )}
              </div>
              {packageImagePreview && (
                <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={clearPackageImage}>Clear Image</button>
              )}
            </div>
            <div className="mb-2">
              <label className="form-label">Select Distribution</label>
              <Select
                isMulti
                isSearchable
                options={distributionOptions}
                classNamePrefix="package-distribution-select"
                placeholder="Please Select Distribution"
                value={distributionOptions.filter((option) => form.dis_id.includes(String(option.value)))}
                onChange={(selected) => {
                  const nextIds = (selected || []).map((item) => String(item.value));
                  setForm((p) => ({ ...p, dis_id: nextIds }));
                }}
              />
            </div>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <label className="form-label m-0">Package Descriptions</label>
                <button type="button" className="btn btn-sm btn-primary" onClick={addDescriptionRow}>Add Description</button>
              </div>
              {form.descriptions.map((row, index) => (
                <div key={`des-${index}`} className="d-flex gap-2 mt-2">
                  <select className="form-control w-25" value={row.des_option} onChange={(e) => {
                    const list = [...form.descriptions];
                    list[index] = { ...list[index], des_option: Number(e.target.value) };
                    setForm((p) => ({ ...p, descriptions: list }));
                  }}>
                    <option value={1}>check option</option>
                    <option value={2}>remove option</option>
                  </select>
                  <input className="form-control" value={row.des} onChange={(e) => {
                    const list = [...form.descriptions];
                    list[index] = { ...list[index], des: e.target.value };
                    setForm((p) => ({ ...p, descriptions: list }));
                  }} />
                  <button type="button" className="btn btn-danger" onClick={() => {
                    const list = form.descriptions.filter((_, i) => i !== index);
                    setForm((p) => ({ ...p, descriptions: list }));
                  }}>Delete</button>
                </div>
              ))}
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? "Please wait..." : form.id ? "Update Package" : "Submit"}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManagePackagePage;
