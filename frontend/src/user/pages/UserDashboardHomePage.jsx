import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearUserSession, saveUserSession } from "../../public/services/publicAuthApi";
import { useUserDashboard } from "../context/UserDashboardContext";
import { userDashboardApi } from "../services/userDashboardApi";
import {
  daysUntil,
  formatPackageExpiry,
  formatPrDate,
  hoursAgo,
  prStatusLabel
} from "../utils/formatters";
import iconNewspaper from "../assets/icons/Newspaper.svg";
import iconPackage from "../assets/icons/Package.svg";
import iconLastPr from "../assets/icons/last.svg";
import iconNotification from "../assets/icons/notification.svg";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function PackageDetailsTable() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    rangeStart: 0,
    rangeEnd: 0
  });
  const [tableSearch, setTableSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(tableSearch.trim()), 400);
    return () => clearTimeout(timer);
  }, [tableSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const loadPackages = useCallback(async () => {
    setTableLoading(true);
    setTableError("");
    try {
      const res = await userDashboardApi.getPackages({
        page,
        limit: pageSize,
        q: debouncedSearch
      });
      if (res.data?.status && res.data.data) {
        setRows(res.data.data.rows || []);
        setPagination(res.data.data.pagination || {});
      } else {
        setRows([]);
        setTableError(res.data?.message || "Could not load packages.");
      }
    } catch (err) {
      setRows([]);
      setTableError(err.response?.data?.message || "Could not load packages.");
    } finally {
      setTableLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const { totalPages = 1, rangeStart = 0, rangeEnd = 0, total = 0 } = pagination;

  return (
    <>
      <div className="heading">
        <div className="name">
          <h2>Package Details</h2>
        </div>
        <div className="link">
          <Link to="/Userdashboard/payment_history">View all</Link>
        </div>
      </div>

      <div className="package-table-toolbar">
        <label className="package-table-toolbar__entries">
          Show{" "}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            aria-label="Entries per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>{" "}
          entries
        </label>
        <label className="package-table-toolbar__search">
          Search:
          <input
            type="search"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search packages…"
          />
        </label>
      </div>

      <div className={`package-table-wrap${tableLoading ? " is-loading" : ""}`}>
        <table className="table package-table" id="example">
          <thead>
            <tr>
              <th>Name</th>
              <th>Credits Left</th>
              <th>Expiry</th>
              <th>Quick Link</th>
            </tr>
          </thead>
          <tbody>
            {tableLoading ? (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">
                  Loading…
                </td>
              </tr>
            ) : tableError ? (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">
                  {tableError}{" "}
                  <button type="button" className="btn btn-link btn-sm p-0" onClick={loadPackages}>
                    Retry
                  </button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">
                  No data available in table
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.pname}</td>
                  <td>{item.usepr_limit}</td>
                  <td>{formatPackageExpiry(item.package_end_date)}</td>
                  <td>
                    {Number(item.status) === 0 && Number(item.usepr_limit) === 0 && (
                      <Link to={`/pricing?package=${item.package_id}`} className="buy">
                        Buy Again
                      </Link>
                    )}
                    {Number(item.status) === 0 && Number(item.usepr_limit) !== 0 && (
                      <Link to={`/pricing?package=${item.package_id}`} className="buy">
                        Package Expired Buy
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="package-table-footer">
        <span>
          Showing {rangeStart} to {rangeEnd} of {total} entries
        </span>
        <div className="package-table-footer__pages">
          <button type="button" disabled={page <= 1 || tableLoading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || tableLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

export default function UserDashboardHomePage() {
  const navigate = useNavigate();
  const { setHeaderUser } = useUserDashboard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await userDashboardApi.getHome();
      if (res.data?.status && res.data.data) {
        const payload = res.data.data;
        if (payload.user) {
          saveUserSession({ user: payload.user });
          setHeaderUser({
            firstName: payload.user.first_name || "",
            lastName: payload.user.last_name || "",
            profileImage: payload.user.profile_image || "",
            avatarPreview: ""
          });
        }
        setData(payload);
      } else {
        setError(res.data?.message || "Could not load dashboard.");
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearUserSession();
        navigate("/sign_in", { replace: true });
        return;
      }
      setError(err.response?.data?.message || "Could not load dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard…</div>;
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button type="button" className="btn btn-primary btn-sm mt-2" onClick={loadDashboard}>
          Retry
        </button>
      </div>
    );
  }

  const {
    publishCount = 0,
    packageCount = 0,
    earlyPackages = [],
    lastFivePr = [],
    notifications = []
  } = data || {};

  return (
    <div className="row dashboard-home-row">
      <div className="col-lg-8 col-md-8 col-sm-8 dashboard-main-col">
        <div className="dashboard">
          <div className="row">
            <div className="col-lg-3 col-md-3 col-sm-3">
              <div className="card publish">
                <img src={iconNewspaper} alt="" />
                <h2>{publishCount}</h2>
                <p>Articles Published</p>
              </div>
            </div>
            <div className="col-lg-3 col-md-3 col-sm-3">
              <div className="card publish">
                <img src={iconPackage} alt="" />
                <h2>{packageCount}</h2>
                <p>Packages Owned</p>
              </div>
            </div>
            <div className="col-lg-6 col-md-6 col-sm-6">
              <div className="card2">
                <div className="status">
                  {earlyPackages.length === 0 ? (
                    <div className="card1">
                      <div className="expire">
                        <p>No active packages expiring soon.</p>
                      </div>
                    </div>
                  ) : (
                    earlyPackages.map((item, index) => (
                      <div className="card1" key={`${item.pname}-${index}`}>
                        <div className="expire">
                          <h6>{item.pname}</h6>
                          <p>Package expiring on</p>
                          <h6>{formatPackageExpiry(item.package_end_date)}</h6>
                          <span>About to expire in a {daysUntil(item.package_end_date)} days</span>
                        </div>
                        {index === 0 && <p>PR Status</p>}
                        {index === 1 && (
                          <div className="all-status">
                            <Link to="/Userdashboard/payment_history">View all</Link>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-12 col-md-12 col-sm-12">
              <PackageDetailsTable />
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-4 col-md-4 col-sm-4 dashboard-side-col">
        <div className="pr-area">
          <h5>My Last 5 PR</h5>
          {lastFivePr.length === 0 ? (
            <p className="text-muted small">No press releases yet.</p>
          ) : (
            lastFivePr.map((item) => (
              <Link key={item.id} to="/Userdashboard/pr" className="text-decoration-none">
                <div className="last-pr">
                  <div className="img-area">
                    <img src={iconLastPr} alt="" />
                  </div>
                  <div className="pr-title">
                    <p>{item.title}</p>
                    <span>{formatPrDate(item.date)}</span>
                  </div>
                </div>
              </Link>
            ))
          )}

          <div className="card notification">
            <div className="heading">
              <h5>Notifications</h5>
              <a href="#notifications">View all</a>
            </div>
            <div className="notification-list">
              {notifications.length === 0 ? (
                <p className="text-muted small mb-0 px-2">No notifications yet.</p>
              ) : (
                notifications.map((note) => (
                  <div className="notification-item" key={note.id}>
                    <div className="img-area">
                      <img src={iconNotification} alt="" />
                    </div>
                    <div className="title">
                      <div className="n-title">
                        <h6>{prStatusLabel(note.status)}</h6>
                        <p>{note.status_note}</p>
                      </div>
                      <span>{hoursAgo(note.status_datetime)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
