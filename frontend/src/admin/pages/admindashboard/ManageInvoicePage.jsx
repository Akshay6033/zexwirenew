import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageLoader from "../../components/AdminPageLoader";

const PAGE_SIZES = [10, 25, 50, 100];

function InvoiceDownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="invoice-action-icon">
      <path
        fill="currentColor"
        d="M12 3.5a.75.75 0 0 1 .75.75v7.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V4.25A.75.75 0 0 1 12 3.5Z"
      />
      <path
        fill="currentColor"
        d="M5.25 16.5a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 .75.75v1.75A2.75 2.75 0 0 1 16 21H8a2.75 2.75 0 0 1-2.75-2.75V16.5Zm1.5.75v1A1.25 1.25 0 0 0 8 19.5h8a1.25 1.25 0 0 0 1.25-1.25v-1H6.75Z"
      />
    </svg>
  );
}

function InvoiceUploadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="invoice-action-icon">
      <path
        fill="currentColor"
        d="M12 4.5a.75.75 0 0 1 .75.75v7.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V5.25A.75.75 0 0 1 12 4.5Z"
      />
      <path
        fill="currentColor"
        d="M5.25 15.5a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 .75.75v1.75A2.75 2.75 0 0 1 16 20H8a2.75 2.75 0 0 1-2.75-2.75v-1.75h1.5v1A1.25 1.25 0 0 0 8 18.5h8a1.25 1.25 0 0 0 1.25-1.25v-1H6.75Z"
      />
    </svg>
  );
}

function ManageInvoicePage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [query, setQuery] = useState({
    start: 0,
    length: 10,
    search: "",
    sortBy: "inv_id",
    sortOrder: "desc"
  });

  const currentPage = Math.floor(query.start / query.length) + 1;
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
      const res = await adminDashboardApi.getInvoices(query);
      setRows(res.data?.data || []);
      setTotal(res.data?.meta?.recordsTotal || 0);
      setFilteredTotal(res.data?.meta?.recordsFiltered || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setFilteredTotal(0);
      toast.error(error.response?.data?.message || "Could not load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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

  const downloadInvoice = async (invId) => {
    try {
      const res = await adminDashboardApi.downloadInvoice(invId);
      const disposition = res.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || `invoice-${invId}.pdf`;
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          toast.error(parsed.message || "Could not download invoice");
          return;
        } catch {
          /* fall through */
        }
      }
      toast.error(error.response?.data?.message || "Could not download invoice");
    }
  };

  const openUploadModal = (row) => {
    setUploadTarget(row);
    setUploadFile(null);
    setFileError("");
    setUploadOpen(true);
  };

  const closeUploadModal = () => {
    setUploadOpen(false);
    setUploadTarget(null);
    setUploadFile(null);
    setFileError("");
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setUploadFile(file);
    setFileError("");
    if (file && !file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Only PDF files are allowed.");
      setUploadFile(null);
    }
  };

  const submitUpload = async () => {
    if (!uploadTarget?.inv_id) return;
    if (!uploadFile) {
      setFileError("Please select a file");
      return;
    }
    setUploading(true);
    try {
      await adminDashboardApi.uploadInvoice(uploadTarget.inv_id, uploadFile);
      toast.success("Invoice uploaded successfully");
      closeUploadModal();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not upload invoice");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container-fluid manage-invoice-page">
      <div className="page-head manage-user1">
        <h4 className="mt-2 mb-2">Manage Invoice</h4>
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
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("inv_id")}>
                            Sl.No. <span>{sortArrow("inv_id")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("invoice_id")}>
                            Invoice No <span>{sortArrow("invoice_id")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("user_name")}>
                            User <span>{sortArrow("user_name")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("timestamp")}>
                            Date <span>{sortArrow("timestamp")}</span>
                          </button>
                        </th>
                        <th>Download Invoice</th>
                        <th>Upload Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={6} className="p-0 border-0">
                            <AdminPageLoader label="Loading invoices…" />
                          </td>
                        </tr>
                      )}
                      {!loading && rows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            No invoices found.
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        rows.map((row, index) => (
                          <tr key={row.inv_id}>
                            <td>{query.start + index + 1}</td>
                            <td>{row.invoice_id}</td>
                            <td>{row.user_name}</td>
                            <td>{row.date}</td>
                            <td>
                              {row.has_file ? (
                                <button
                                  type="button"
                                  className="invoice-icon-btn invoice-icon-btn--download"
                                  title="Download invoice"
                                  aria-label="Download invoice"
                                  onClick={() => downloadInvoice(row.inv_id)}
                                >
                                  <InvoiceDownloadIcon />
                                </button>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="invoice-icon-btn invoice-icon-btn--upload"
                                title="Upload invoice"
                                aria-label="Upload invoice"
                                onClick={() => openUploadModal(row)}
                              >
                                <InvoiceUploadIcon />
                              </button>
                            </td>
                          </tr>
                        ))}
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
      </div>

      {uploadOpen && (
        <div className="modal-backdrop-lite" onClick={closeUploadModal}>
          <div
            className="modal-card-lite manage-invoice-upload-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-invoice-title"
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" id="upload-invoice-title">
                Upload Invoice
              </h5>
              <button type="button" className="btn-close" onClick={closeUploadModal} aria-label="Close" />
            </div>

            {uploadTarget && (
              <p className="small text-muted mb-3">
                Invoice #{uploadTarget.invoice_id} — {uploadTarget.user_name}
              </p>
            )}

            <div className="form-group mb-3">
              <label className="control-label" htmlFor="invoice-pdf-file">
                Upload Invoice
              </label>
              <input
                id="invoice-pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                className="form-control country-field"
                onChange={onFileChange}
              />
              {fileError && <div className="field-error mt-2">{fileError}</div>}
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={closeUploadModal} disabled={uploading}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success press-btn1"
                style={{ height: 38 }}
                onClick={submitUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Upload Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageInvoicePage;
