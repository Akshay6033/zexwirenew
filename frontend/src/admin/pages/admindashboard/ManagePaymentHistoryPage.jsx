import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import AdminDateTimeCell from "../../components/AdminDateTimeCell";
import { adminDashboardApi } from "../../services/adminDashboardApi";

const PAGE_SIZES = [10, 25, 50, 100];

function InvoiceDownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" className="payment-invoice-download-icon">
      <path
        fill="currentColor"
        d="M12 3.5a.75.75 0 0 1 .75.75v7.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V4.25A.75.75 0 0 1 12 3.5Z"
      />
      <path
        fill="currentColor"
        d="M5.25 16.5a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 .75.75v1.75A2.75 2.75 0 0 1 16 21H8a2.75 2.75 0 0 1-2.75-2.75V16.5Zm1.5.75v1A1.25 1.25 0 0 0 8 19.5h8a1.25 1.25 0 0 0 1.25-1.25v-1H6.75Z"
      />
      <circle fill="#fff" cx="9.25" cy="18.25" r="0.85" />
      <circle fill="#fff" cx="14.75" cy="18.25" r="0.85" />
    </svg>
  );
}

function ManagePaymentHistoryPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({
    start: 0,
    length: 10,
    search: "",
    sortBy: "pay_id",
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
      const res = await adminDashboardApi.getPaymentHistory(query);
      setRows(res.data?.data || []);
      setTotal(res.data?.meta?.recordsTotal || 0);
      setFilteredTotal(res.data?.meta?.recordsFiltered || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setFilteredTotal(0);
      toast.error(error.response?.data?.message || "Could not load payment history");
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

  const downloadCsv = () => {
    window.open(adminDashboardApi.exportPaymentHistoryCsvUrl(), "_blank");
  };

  const downloadInvoice = async (invId) => {
    try {
      const res = await adminDashboardApi.downloadInvoice(invId);
      const disposition = res.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || `invoice-${invId}`;
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

  return (
    <div className="container-fluid manage-payment-history-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h4 className="mt-2 mb-2">Manage Payment History</h4>
        <button type="button" className="btn payment-history-download-btn" onClick={downloadCsv} title="Download Report">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3 1.4 1.42-4.7 4.7-4.7-4.7 1.4-1.42 2.3 2.3V4a1 1 0 0 1 1-1Zm-7 14h14v3H5v-3Z" />
          </svg>
        </button>
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
                          <button type="button" className="login-log-sort" onClick={() => onSort("pay_id")}>
                            Sl.No. <span>{sortArrow("pay_id")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("payment_method")}>
                            Payment Method <span>{sortArrow("payment_method")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("payment_id")}>
                            Payment Id <span>{sortArrow("payment_id")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("user_name")}>
                            User <span>{sortArrow("user_name")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("package_name")}>
                            Package <span>{sortArrow("package_name")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("usd_amount")}>
                            USD <span>{sortArrow("usd_amount")}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="login-log-sort" onClick={() => onSort("date_current")}>
                            DateTime <span>{sortArrow("date_current")}</span>
                          </button>
                        </th>
                        <th>Discount</th>
                        <th>Status</th>
                        <th>Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={10} className="text-center text-muted py-4">
                            Loading…
                          </td>
                        </tr>
                      )}
                      {!loading && rows.length === 0 && (
                        <tr>
                          <td colSpan={10} className="text-center text-muted py-4">
                            No payment records found.
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        rows.map((row, index) => (
                          <tr key={row.pay_id}>
                            <td>{query.start + index + 1}</td>
                            <td>
                              <Link
                                to={`/admindashboard/view_payment_history/${row.pay_id}`}
                                className="vendor-url-link"
                              >
                                {row.payment_method}
                              </Link>
                            </td>
                            <td className="small">{row.payment_id_display}</td>
                            <td>{row.user_name}</td>
                            <td>{row.package_name}</td>
                            <td>$ {row.usd_amount ?? 0}</td>
                            <td>
                              <AdminDateTimeCell value={row.date_current} />
                            </td>
                            <td className="small">{row.discount_display}</td>
                            <td>{row.status}</td>
                            <td>
                              {row.invoice_id ? (
                                <button
                                  type="button"
                                  className="payment-invoice-download"
                                  title="Download invoice"
                                  aria-label="Download invoice"
                                  onClick={() => downloadInvoice(row.invoice_id)}
                                >
                                  <InvoiceDownloadIcon />
                                </button>
                              ) : (
                                "—"
                              )}
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
    </div>
  );
}

export default ManagePaymentHistoryPage;
