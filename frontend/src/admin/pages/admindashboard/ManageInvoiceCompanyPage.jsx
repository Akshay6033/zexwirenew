import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageLoader from "../../components/AdminPageLoader";

function ManageInvoiceCompanyPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminDashboardApi.getInvoiceCompanies();
      setRows(res.data?.data || []);
    } catch (error) {
      setRows([]);
      toast.error(error.response?.data?.message || "Could not load invoice company");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const haystack = [row.name, row.email, row.address, row.gst]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return haystack.includes(term);
    });
  }, [rows, searchInput]);

  return (
    <div className="container-fluid manage-invoice-company-page">
      <div className="page-head manage-user1">
        <h4 className="mt-2 mb-2">Invoice Management</h4>
      </div>

      <div className="data-table">
        <div className="row">
          <div className="col-lg-12 col-sm-12">
            <div className="card m-b-30 table-bg distribution-table-card">
              <div className="card-body table-responsive">
                <div className="login-log-controls">
                  <label className="small text-muted m-0">
                    Show{" "}
                    <select className="form-select form-select-sm d-inline-block login-log-length" defaultValue={10} disabled>
                      <option value={10}>10</option>
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

                {loading ? (
                  <AdminPageLoader label="Loading invoice company…" />
                ) : (
                  <div className="table-odd">
                    <table className="table table-bordered table-bg1 mb-0">
                      <thead>
                        <tr>
                          <th>Sl.No.</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Address</th>
                          <th>GST</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-muted py-4">
                              No invoice company found.
                            </td>
                          </tr>
                        )}
                        {filteredRows.map((row, index) => (
                          <tr key={row.id}>
                            <td>{index + 1}</td>
                            <td>{row.name}</td>
                            <td>{row.email}</td>
                            <td className="small">{row.address}</td>
                            <td>{row.gst}</td>
                            <td>
                              <Link
                                to={`/admindashboard/edit_invoice_details/${row.id}`}
                                className="edit-icon-btn"
                                title="Edit invoice company"
                                aria-label="Edit invoice company"
                              >
                                ✎
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!loading && (
                  <div className="login-log-pagination-wrap">
                    <div className="small text-muted">
                      Showing {filteredRows.length === 0 ? 0 : 1} to {filteredRows.length} of {filteredRows.length}{" "}
                      entries
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageInvoiceCompanyPage;
