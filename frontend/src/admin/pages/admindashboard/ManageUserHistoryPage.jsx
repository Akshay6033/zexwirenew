import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminDateTimeCell from "../../components/AdminDateTimeCell";
import { formatAdminDate, formatAdminDateTime } from "../../utils/adminDateFormat";

const PAGE_SIZE = 10;

function PagedSearchToolbar({
  searchId,
  label,
  placeholder,
  qInput,
  onQChange,
  loading,
  total,
  from,
  to,
  page,
  totalPages,
  onPrev,
  onNext
}) {
  return (
    <>
      <div className="d-flex flex-column flex-md-row gap-2 align-items-stretch align-items-md-end justify-content-between mb-2 user-history-paged-toolbar">
        <div className="flex-grow-1" style={{ maxWidth: 420 }}>
          <label className="form-label small mb-1" htmlFor={searchId}>
            {label}
          </label>
          <input
            id={searchId}
            type="search"
            className="form-control form-control-sm"
            placeholder={placeholder}
            value={qInput}
            onChange={(e) => onQChange(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="small text-muted pb-1">
          {loading
            ? "Loading…"
            : total === 0
              ? "No matching records"
              : `Showing ${from}–${to} of ${total}`}
        </div>
      </div>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={page <= 1 || loading}
          onClick={onPrev}
        >
          Previous
        </button>
        <span className="small text-muted">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={loading || page >= totalPages || total === 0}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </>
  );
}

function ManageUserHistoryPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [payPage, setPayPage] = useState(1);
  const [payQInput, setPayQInput] = useState("");
  const [payQ, setPayQ] = useState("");
  const [payRows, setPayRows] = useState([]);
  const [payTotal, setPayTotal] = useState(0);
  const [payLoading, setPayLoading] = useState(false);

  const [prPage, setPrPage] = useState(1);
  const [prQInput, setPrQInput] = useState("");
  const [prQ, setPrQ] = useState("");
  const [prRows, setPrRows] = useState([]);
  const [prTotal, setPrTotal] = useState(0);
  const [prLoading, setPrLoading] = useState(false);

  const [pressPage, setPressPage] = useState(1);
  const [pressQInput, setPressQInput] = useState("");
  const [pressQ, setPressQ] = useState("");
  const [pressRows, setPressRows] = useState([]);
  const [pressTotal, setPressTotal] = useState(0);
  const [pressLoading, setPressLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setData(null);
      setPayPage(1);
      setPayQInput("");
      setPayQ("");
      setPayRows([]);
      setPayTotal(0);
      setPrPage(1);
      setPrQInput("");
      setPrQ("");
      setPrRows([]);
      setPrTotal(0);
      setPressPage(1);
      setPressQInput("");
      setPressQ("");
      setPressRows([]);
      setPressTotal(0);
      try {
        const res = await adminDashboardApi.getUserFullHistory(userId);
        if (!cancelled) setData(res.data?.data || null);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          toast.error(e.response?.data?.message || "Could not load history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPayQ(payQInput.trim());
      setPayPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [payQInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPrQ(prQInput.trim());
      setPrPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [prQInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPressQ(pressQInput.trim());
      setPressPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [pressQInput]);

  useEffect(() => {
    if (!userId || loading || !data?.user) return undefined;
    let cancelled = false;
    (async () => {
      setPayLoading(true);
      try {
        const res = await adminDashboardApi.getUserHistoryPaymentsPaged(userId, {
          page: payPage,
          limit: PAGE_SIZE,
          ...(payQ ? { q: payQ } : {})
        });
        if (cancelled) return;
        const d = res.data?.data;
        const total = Number(d?.total ?? 0);
        const lim = Number(d?.limit ?? PAGE_SIZE);
        const totalPages = Math.max(1, Math.ceil(total / lim) || 1);
        const nextPage = payPage > totalPages ? totalPages : payPage;
        setPayRows(d?.rows || []);
        setPayTotal(total);
        if (nextPage !== payPage) setPayPage(nextPage);
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || "Could not load payment history");
      } finally {
        if (!cancelled) setPayLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, loading, data?.user, payPage, payQ]);

  useEffect(() => {
    if (!userId || loading || !data?.user) return undefined;
    let cancelled = false;
    (async () => {
      setPrLoading(true);
      try {
        const res = await adminDashboardApi.getUserHistoryPrRecordsPaged(userId, {
          page: prPage,
          limit: PAGE_SIZE,
          ...(prQ ? { q: prQ } : {})
        });
        if (cancelled) return;
        const d = res.data?.data;
        const total = Number(d?.total ?? 0);
        const lim = Number(d?.limit ?? PAGE_SIZE);
        const totalPages = Math.max(1, Math.ceil(total / lim) || 1);
        const nextPage = prPage > totalPages ? totalPages : prPage;
        setPrRows(d?.rows || []);
        setPrTotal(total);
        if (nextPage !== prPage) setPrPage(nextPage);
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || "Could not load PR records");
      } finally {
        if (!cancelled) setPrLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, loading, data?.user, prPage, prQ]);

  useEffect(() => {
    if (!userId || loading || !data?.user) return undefined;
    let cancelled = false;
    (async () => {
      setPressLoading(true);
      try {
        const res = await adminDashboardApi.getUserHistoryPressReleasesPaged(userId, {
          page: pressPage,
          limit: PAGE_SIZE,
          ...(pressQ ? { q: pressQ } : {})
        });
        if (cancelled) return;
        const d = res.data?.data;
        const total = Number(d?.total ?? 0);
        const lim = Number(d?.limit ?? PAGE_SIZE);
        const totalPages = Math.max(1, Math.ceil(total / lim) || 1);
        const nextPage = pressPage > totalPages ? totalPages : pressPage;
        setPressRows(d?.rows || []);
        setPressTotal(total);
        if (nextPage !== pressPage) setPressPage(nextPage);
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || "Could not load press releases");
      } finally {
        if (!cancelled) setPressLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, loading, data?.user, pressPage, pressQ]);

  const user = data?.user;

  const payTotalPages = Math.max(1, Math.ceil(payTotal / PAGE_SIZE) || 1);
  const payFrom = payTotal === 0 ? 0 : (payPage - 1) * PAGE_SIZE + 1;
  const payTo = Math.min(payPage * PAGE_SIZE, payTotal);

  const prTotalPages = Math.max(1, Math.ceil(prTotal / PAGE_SIZE) || 1);
  const prFrom = prTotal === 0 ? 0 : (prPage - 1) * PAGE_SIZE + 1;
  const prTo = Math.min(prPage * PAGE_SIZE, prTotal);

  const pressTotalPages = Math.max(1, Math.ceil(pressTotal / PAGE_SIZE) || 1);
  const pressFrom = pressTotal === 0 ? 0 : (pressPage - 1) * PAGE_SIZE + 1;
  const pressTo = Math.min(pressPage * PAGE_SIZE, pressTotal);

  return (
    <div className="container-fluid manage-user-history-page">
      <AdminPageBackHead title="View User History" onBack={() => navigate(-1)} />

      {loading && <AdminPageLoader label="Loading user history…" />}
      {!loading && !user && <div className="text-muted py-4">No data.</div>}

      {!loading && user && (
        <div className="user-history-stack">
          <section className="user-history-panel user-history-panel--user" aria-labelledby="uh-sec-user-title">
            <header className="user-history-panel__head">
              <h2 id="uh-sec-user-title" className="user-history-panel__title">
                User History
              </h2>
              <p className="user-history-panel__hint">Account profile and total spend</p>
            </header>
            <div className="user-history-panel__body">
              <div className="table-responsive">
                <table className="table table-bordered table-bg1 mb-0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Date of Signup (DOJ)</th>
                      <th>Last Login</th>
                      <th>Spending Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{user.first_name}</td>
                      <td>{user.email}</td>
                      <td>{user.mobile}</td>
                      <td>{formatAdminDate(user.created_date)}</td>
                      <td>{formatAdminDateTime(user.last_login)}</td>
                      <td>$ {data.spending ?? 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="user-history-panel user-history-panel--payments" aria-labelledby="uh-sec-pay-title">
            <header className="user-history-panel__head">
              <h2 id="uh-sec-pay-title" className="user-history-panel__title">
                Payment History
              </h2>
              <p className="user-history-panel__hint">Offline and payment log (paged)</p>
            </header>
            <div className="user-history-panel__body">
            <PagedSearchToolbar
              searchId="user-history-pay-search"
              label="Search payment history"
              placeholder="Package, price, PR limit, reason, date…"
              qInput={payQInput}
              onQChange={setPayQInput}
              loading={payLoading}
              total={payTotal}
              from={payFrom}
              to={payTo}
              page={payPage}
              totalPages={payTotalPages}
              onPrev={() => setPayPage((p) => Math.max(1, p - 1))}
              onNext={() => setPayPage((p) => p + 1)}
            />
            <div className="table-responsive">
            <table className="table table-bordered table-bg1 mb-0">
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Price</th>
                  <th>PR limit</th>
                  <th>How paid [reason]</th>
                  <th>Date Time</th>
                  <th>Remaining Credits</th>
                  <th>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {!payLoading && payRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted">
                      {payQ ? "No rows match your search" : "No payment history"}
                    </td>
                  </tr>
                )}
                {payLoading && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-3">
                      Loading…
                    </td>
                  </tr>
                )}
                {!payLoading &&
                  payRows.map((row) => (
                    <tr key={row.id != null ? `pay-${row.id}` : `pay-${row.timestamp}-${row.plan_id}`}>
                      <td>{row.pname}</td>
                      <td>$ {row.price}</td>
                      <td>{row.og_pr}</td>
                      <td>{row.reason}</td>
                      <td>
                        <AdminDateTimeCell value={row.timestamp} />
                      </td>
                      <td>{row.remainingCredits ?? "—"}</td>
                      <td>{formatAdminDate(row.expiryDate)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
            </div>
          </section>

          <section className="user-history-panel user-history-panel--decrease" aria-labelledby="uh-sec-pr-title">
            <header className="user-history-panel__head">
              <h2 id="uh-sec-pr-title" className="user-history-panel__title">
                Decrease PR
              </h2>
              <p className="user-history-panel__hint">PR packages and decrease actions (paged)</p>
            </header>
            <div className="user-history-panel__body">
            <PagedSearchToolbar
              searchId="user-history-pr-search"
              label="Search PR packages"
              placeholder="Package, price, limits, date…"
              qInput={prQInput}
              onQChange={setPrQInput}
              loading={prLoading}
              total={prTotal}
              from={prFrom}
              to={prTo}
              page={prPage}
              totalPages={prTotalPages}
              onPrev={() => setPrPage((p) => Math.max(1, p - 1))}
              onNext={() => setPrPage((p) => p + 1)}
            />
            <div className="table-responsive">
            <table className="table table-bordered table-bg1 mb-0">
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Price</th>
                  <th>PR limit</th>
                  <th>Date Time</th>
                  <th>Remaining Credits</th>
                  <th>Decrease PR</th>
                  <th>Decrease History</th>
                </tr>
              </thead>
              <tbody>
                {!prLoading && prRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted">
                      {prQ ? "No rows match your search" : "No PR packages"}
                    </td>
                  </tr>
                )}
                {prLoading && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-3">
                      Loading…
                    </td>
                  </tr>
                )}
                {!prLoading &&
                  prRows.map((row) => (
                    <tr key={row.pr_record_id}>
                      <td>{row.pname}</td>
                      <td>$ {row.price_usd}</td>
                      <td>{row.pr_limit}</td>
                      <td>
                        <AdminDateTimeCell value={row.timestamp} />
                      </td>
                      <td>{row.usepr_limit}</td>
                      <td>
                        <Link
                          to={`/users/${userId}/decrease-pr/${row.pr_record_id}`}
                          className="btn btn-sm btn-danger user-pr-sq-btn"
                          title="Decrease PR"
                        >
                          −
                        </Link>
                      </td>
                      <td>
                        {row.decreaseHistoryCount > 0 ? (
                          <Link to={`/users/pr-decrease-history/${row.pr_record_id}`}>See History</Link>
                        ) : (
                          "N/A"
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
            </div>
          </section>

          <section className="user-history-panel user-history-panel--press" aria-labelledby="uh-sec-press-title">
            <header className="user-history-panel__head">
              <h2 id="uh-sec-press-title" className="user-history-panel__title">
                Press Release History
              </h2>
              <p className="user-history-panel__hint">Submitted releases (paged)</p>
            </header>
            <div className="user-history-panel__body">
            <PagedSearchToolbar
              searchId="user-history-press-search"
              label="Search press releases"
              placeholder="Release ID, title, package, date…"
              qInput={pressQInput}
              onQChange={setPressQInput}
              loading={pressLoading}
              total={pressTotal}
              from={pressFrom}
              to={pressTo}
              page={pressPage}
              totalPages={pressTotalPages}
              onPrev={() => setPressPage((p) => Math.max(1, p - 1))}
              onNext={() => setPressPage((p) => p + 1)}
            />
            <div className="table-responsive">
            <table className="table table-bordered table-bg1 mb-0">
              <thead>
                <tr>
                  <th>Release ID</th>
                  <th>PR Status</th>
                  <th>Name of the release</th>
                  <th>Package</th>
                  <th>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {!pressLoading && pressRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted">
                      {pressQ ? "No rows match your search" : "No press releases"}
                    </td>
                  </tr>
                )}
                {pressLoading && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      Loading…
                    </td>
                  </tr>
                )}
                {!pressLoading &&
                  pressRows.map((row) => (
                    <tr key={row.release_no}>
                      <td>{row.release_no}</td>
                      <td>
                        {Number(row.active) === 2 ? (
                          <strong className="text-danger">Deleted</strong>
                        ) : (
                          <strong className="text-success">Active</strong>
                        )}
                      </td>
                      <td>{row.title}</td>
                      <td>{row.package_name || row.p_id}</td>
                      <td>
                        <AdminDateTimeCell value={row.date_current} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ManageUserHistoryPage;
