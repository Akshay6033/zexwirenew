import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminDateTimeCell from "../../components/AdminDateTimeCell";

const HISTORY_PAGE_SIZE = 10;

function UserIncreasePrPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [packages, setPackages] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyQInput, setHistoryQInput] = useState("");
  const [historyQ, setHistoryQ] = useState("");
  const [historyRows, setHistoryRows] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [lines, setLines] = useState({});

  useEffect(() => {
    setHistoryQInput("");
    setHistoryQ("");
    setHistoryPage(1);
    setHistoryRows([]);
    setHistoryTotal(0);
    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboardApi.getIncreasePrFormData(userId);
        const d = res.data?.data;
        setUser(d?.user || null);
        setPackages(d?.packages || []);
      } catch (e) {
        toast.error(e.response?.data?.message || "Could not load page");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = historyQInput.trim();
      setHistoryQ(next);
      setHistoryPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [historyQInput]);

  useEffect(() => {
    if (!userId || loading || !user) return undefined;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const res = await adminDashboardApi.getUserPrStatusPaged(userId, {
          page: historyPage,
          limit: HISTORY_PAGE_SIZE,
          ...(historyQ ? { q: historyQ } : {})
        });
        if (cancelled) return;
        const d = res.data?.data;
        const total = Number(d?.total ?? 0);
        const limit = Number(d?.limit ?? HISTORY_PAGE_SIZE);
        const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
        const nextPage = historyPage > totalPages ? totalPages : historyPage;
        setHistoryRows(d?.rows || []);
        setHistoryTotal(total);
        if (nextPage !== historyPage) setHistoryPage(nextPage);
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || "Could not load PR history");
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, user, loading, historyPage, historyQ]);

  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE) || 1);
  const historyFrom = historyTotal === 0 ? 0 : (historyPage - 1) * HISTORY_PAGE_SIZE + 1;
  const historyTo = Math.min(historyPage * HISTORY_PAGE_SIZE, historyTotal);

  const pkgMap = useMemo(() => {
    const m = {};
    (packages || []).forEach((p) => {
      m[p.id] = p;
    });
    return m;
  }, [packages]);

  const packageOptions = useMemo(
    () =>
      (packages || []).map((p) => ({
        value: p.id,
        label: p.pname || `Package #${p.id}`
      })),
    [packages]
  );

  const selectedPackageValues = useMemo(
    () => selectedIds.map((id) => ({ value: id, label: pkgMap[id]?.pname || `Package #${id}` })),
    [selectedIds, pkgMap]
  );

  const onPackageSelectChange = (selectedOptions) => {
    const opts = selectedOptions || [];
    const nextIds = opts.map((o) => Number(o.value));
    setSelectedIds(nextIds);
    setLines((L) => {
      const next = {};
      for (const id of nextIds) {
        if (L[id]) next[id] = L[id];
      }
      return next;
    });
  };

  const removePackageSection = (pid) => {
    const num = Number(pid);
    setSelectedIds((prev) => prev.filter((x) => x !== num));
    setLines((L) => {
      const { [num]: _, ...rest } = L;
      return rest;
    });
  };

  const setLineField = (planId, field, value) => {
    setLines((L) => ({
      ...L,
      [planId]: { ...L[planId], [field]: value }
    }));
  };

  const submit = async () => {
    if (!selectedIds.length) {
      toast.error("Select at least one package");
      return;
    }
    const items = [];
    for (const pid of selectedIds) {
      const line = lines[pid] || {};
      const pr = Number(line.pr);
      const price = String(line.price ?? "").trim();
      const reason = String(line.reason ?? "").trim();
      const validityRaw = line.validity;
      const validity =
        validityRaw === "" || validityRaw === undefined ? "" : Number(validityRaw);
      if (!pr || pr <= 0 || !price || !reason) {
        toast.error("Fill PR, price and reason for each selected package");
        return;
      }
      items.push({
        plan_id: pid,
        pr,
        price,
        reason,
        validity: validity === "" || Number.isNaN(validity) ? null : validity
      });
    }
    setSaving(true);
    try {
      await adminDashboardApi.postIncreasePr(userId, { items });
      toast.success("PR updated successfully");
      navigate("/users");
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not update PR");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid user-increase-pr-page">
      <AdminPageBackHead title="Edit Increase PR" onBack={() => navigate("/users")} />

      {loading && <AdminPageLoader label="Loading increase PR…" />}
      {!loading && user && (
        <div className="increase-pr-stack">
          <section className="increase-pr-panel increase-pr-panel--workflow" aria-labelledby="ip-sec-workflow-title">
            <header className="increase-pr-panel__head">
              <h2 id="ip-sec-workflow-title" className="increase-pr-panel__title">
                Increase PR — select packages and details
              </h2>
              <p className="increase-pr-panel__hint">
                Choose packages, then fill each block. This whole card is one action — separate from PR history
                below.
              </p>
            </header>
            <div className="increase-pr-panel__body">
              <div className="increase-pr-subblock increase-pr-subblock--select">
                <h3 className="increase-pr-subblock__title">
                  <span className="increase-pr-step-badge" aria-hidden="true">
                    1
                  </span>
                  Select package(s)
                </h3>
                <p className="increase-pr-subblock__hint">
                  Search and add packages. Remove a tag here, or use <strong>Remove</strong> on a card in step 2, to
                  drop a package and clear its fields.
                </p>
                <div className="increase-pr-package-select-wrap">
                  <label className="form-label visually-hidden" htmlFor="increase-pr-package-select">
                    Package search
                  </label>
                  <Select
                    inputId="increase-pr-package-select"
                    instanceId="increase-pr-package-select"
                    isMulti
                    options={packageOptions}
                    value={selectedPackageValues}
                    onChange={onPackageSelectChange}
                    placeholder="Type to search packages…"
                    classNamePrefix="increase-pr-select"
                    menuPlacement="auto"
                    closeMenuOnSelect={false}
                    blurInputOnSelect={false}
                    maxMenuHeight={280}
                    noOptionsMessage={() => "No packages match"}
                  />
                </div>
              </div>

              <div className="increase-pr-workflow-divider" role="presentation" />

              <div className="increase-pr-subblock increase-pr-subblock--entries" aria-labelledby="ip-step-entries">
                <h3 className="increase-pr-subblock__title" id="ip-step-entries">
                  <span className="increase-pr-step-badge" aria-hidden="true">
                    2
                  </span>
                  Package entries
                </h3>
                <p className="increase-pr-subblock__hint">One card per selected package. Fill PR, price, and reason for each.</p>
                {selectedIds.length === 0 && (
                  <p className="text-muted small mb-0 py-2">No packages selected yet — complete step 1 first.</p>
                )}
                {selectedIds.map((pid) => {
                  const pkg = pkgMap[pid];
                  const line = lines[pid] || {};
                  return (
                    <div key={pid} className="increase-pr-package-block increase-pr-package-block--nested mb-3">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div className="fw-semibold text-primary">{pkg?.pname}</div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary flex-shrink-0"
                          onClick={() => removePackageSection(pid)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="small text-muted mb-2">
                        Package price $ {pkg?.price ?? "—"} — PR limit {pkg?.n_press_rel ?? "—"} — Default validity{" "}
                        {pkg?.package_validity ?? "—"} days
                      </div>
                      <div className="row g-2">
                        <div className="col-md-4">
                          <label className="form-label">Insert PR</label>
                          <input
                            type="number"
                            min={1}
                            className="form-control"
                            value={line.pr ?? ""}
                            onChange={(e) => setLineField(pid, "pr", e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Insert Price ($)</label>
                          <input
                            type="text"
                            className="form-control"
                            value={line.price ?? ""}
                            onChange={(e) => setLineField(pid, "price", e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Validity (days, optional)</label>
                          <input
                            type="number"
                            min={0}
                            className="form-control"
                            placeholder="Leave blank for package default"
                            value={line.validity ?? ""}
                            onChange={(e) => setLineField(pid, "validity", e.target.value)}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">Reason / Transaction ID</label>
                          <input
                            type="text"
                            className="form-control"
                            value={line.reason ?? ""}
                            onChange={(e) => setLineField(pid, "reason", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="increase-pr-panel__actions pt-1">
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={submit}>
                    {saving ? "Please wait…" : "Update PR"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="increase-pr-panel increase-pr-panel--history" aria-labelledby="ip-sec-history-title">
            <header className="increase-pr-panel__head">
              <h2 id="ip-sec-history-title" className="increase-pr-panel__title">
                PR history
              </h2>
              <p className="increase-pr-panel__hint">Past increases for this user (server-side search &amp; pages)</p>
            </header>
            <div className="increase-pr-panel__body">
              <div className="d-flex flex-column flex-md-row gap-2 align-items-stretch align-items-md-end justify-content-between mb-2 increase-pr-history-toolbar">
                <div className="flex-grow-1" style={{ maxWidth: 420 }}>
                  <label className="form-label small mb-1" htmlFor="pr-history-search">
                    Search history
                  </label>
                  <input
                    id="pr-history-search"
                    type="search"
                    className="form-control form-control-sm"
                    placeholder="Package name, reason, admin, amounts…"
                    value={historyQInput}
                    onChange={(e) => setHistoryQInput(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="small text-muted pb-1">
                  {historyLoading
                    ? "Loading…"
                    : historyTotal === 0
                      ? "No matching records"
                      : `Showing ${historyFrom}–${historyTo} of ${historyTotal}`}
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={historyPage <= 1 || historyLoading}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="small text-muted">
                  Page {historyPage} of {historyTotalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={historyLoading || historyPage >= historyTotalPages || historyTotal === 0}
                  onClick={() => setHistoryPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
              <div className="table-responsive increase-pr-history-table-wrap">
                <table className="table table-bordered table-bg1 mb-0">
                  <thead>
                    <tr>
                      <th>Package Name</th>
                      <th>Increase PR</th>
                      <th>Total PR</th>
                      <th>PR Price</th>
                      <th>Date &amp; Time</th>
                      <th>Original Validity</th>
                      <th>Admin Added Validity</th>
                      <th>Reason</th>
                      <th>Who increased PR?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!historyLoading && historyRows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-muted">
                          {historyQ ? "No rows match your search" : "No history yet"}
                        </td>
                      </tr>
                    )}
                    {historyLoading && (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-4">
                          Loading history…
                        </td>
                      </tr>
                    )}
                    {!historyLoading &&
                      historyRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.pname}</td>
                          <td>
                            {row.og_pr != null && row.og_pr !== "" ? (
                              <Link to={`/users/pr-increase-history/${row.id}`} className="text-primary">
                                {row.og_pr}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{row.pr}</td>
                          <td>$ {row.usd_amount}</td>
                          <td>
                            <AdminDateTimeCell value={row.timestamp} />
                          </td>
                          <td>{Number(row.admin_validity) !== 0 ? row.admin_validity : row.package_validity}</td>
                          <td>{row.package_validity}</td>
                          <td>{row.reason}</td>
                          <td>{row.admin_username || row.admin_id}</td>
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

export default UserIncreasePrPage;
