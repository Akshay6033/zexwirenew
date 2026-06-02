import { useEffect, useMemo, useRef, useState } from "react";
import Select, { components } from "react-select";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";

const PAGE_SIZES = [10, 25, 50, 100];
const COINBASE_USER_PAGE_SIZE = 25;
const COINBASE_SEARCH_MIN = 2;
const COINBASE_MAX_VISIBLE_TAGS = 4;

const COINBASE_MENU_PORTAL_STYLES = {
  menuPortal: (base) => ({ ...base, zIndex: 12050 })
};

function CoinbaseMultiValue(props) {
  const selected = props.getValue();
  if (selected.length <= COINBASE_MAX_VISIBLE_TAGS) {
    return <components.MultiValue {...props} />;
  }
  if (props.index > 0) return null;
  return (
    <div className="package-distribution-select__multi-value coinbase-select-summary-tag">
      <div className="package-distribution-select__multi-value__label">
        {selected.length} users selected
      </div>
    </div>
  );
}

function CoinbaseValueContainer({ children, ...props }) {
  const selectedCount = Number(props.selectProps.selectedCount || 0);
  if (selectedCount > COINBASE_MAX_VISIBLE_TAGS) {
    return (
      <components.ValueContainer {...props}>
        <div className="coinbase-select-summary-inline">{selectedCount} users selected</div>
        {props.selectProps.inputValue ? children : null}
      </components.ValueContainer>
    );
  }
  return <components.ValueContainer {...props}>{children}</components.ValueContainer>;
}

function formatCoinbaseUserLabel(user) {
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const email = String(user?.email || "").trim();
  if (name && email) return `${name} (${email})`;
  if (name) return name;
  if (email) return email;
  return `User #${user?.id}`;
}

function parseAuthUserIds(raw) {
  return String(raw || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function mergeCoinbaseUsers(prev, incoming) {
  const merged = [...prev, ...incoming];
  const seen = new Set();
  return merged.filter((item) => {
    const key = Number(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ManagePaymentMethodPage() {
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
    sortOrder: "asc"
  });
  const [coinbaseModalOpen, setCoinbaseModalOpen] = useState(false);
  const [coinbaseLoading, setCoinbaseLoading] = useState(false);
  const [coinbaseMethod, setCoinbaseMethod] = useState(null);
  const [coinbaseUsers, setCoinbaseUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [savingUsers, setSavingUsers] = useState(false);
  const [coinbaseSearch, setCoinbaseSearch] = useState("");
  const [coinbaseMeta, setCoinbaseMeta] = useState({ recordsFiltered: 0, start: 0, length: 25 });
  const [coinbaseLoadingMore, setCoinbaseLoadingMore] = useState(false);
  const [selectingAllUsers, setSelectingAllUsers] = useState(false);
  const [coinbaseMenuOpen, setCoinbaseMenuOpen] = useState(false);
  const [coinbaseActiveTotal, setCoinbaseActiveTotal] = useState(0);
  const skipNextCoinbaseSearchFetchRef = useRef(false);
  const coinbaseBulkSelected = selectedUserIds.length > COINBASE_MAX_VISIBLE_TAGS;

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
      const res = await adminDashboardApi.getPaymentMethods(query);
      setRows(res.data?.data || []);
      setTotal(res.data?.meta?.recordsTotal || 0);
      setFilteredTotal(res.data?.meta?.recordsFiltered || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setFilteredTotal(0);
      toast.error(error.response?.data?.message || "Could not load payment methods");
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

  const toggleStatus = async (row) => {
    try {
      await adminDashboardApi.updatePaymentMethodStatus(row.id, { active: row.active ? 0 : 1 });
      toast.success(row.active ? "Payment method Deactived Successfully" : "Payment method activated Successfully");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update payment method");
    }
  };

  const openCoinbaseUsers = async (row) => {
    setCoinbaseModalOpen(true);
    setCoinbaseLoading(true);
    setCoinbaseMenuOpen(false);
    skipNextCoinbaseSearchFetchRef.current = true;
    setCoinbaseSearch("");
    setCoinbaseUsers([]);
    setCoinbaseMeta({ recordsFiltered: 0, start: 0, length: COINBASE_USER_PAGE_SIZE });
    const preselected = parseAuthUserIds(row.auth_user_ids);
    setSelectedUserIds(preselected);
    setCoinbaseMethod({
      id: row.id,
      PaymentMethod: row.PaymentMethod,
      selected_user: row.selected_user,
      auth_user_ids: row.auth_user_ids
    });
    try {
      const res = await adminDashboardApi.getCoinbaseUsers(row.id, {
        start: 0,
        length: COINBASE_USER_PAGE_SIZE,
        search: ""
      });
      const users = res.data?.data?.users || [];
      const meta = res.data?.data?.meta || { recordsFiltered: users.length, start: 0, length: COINBASE_USER_PAGE_SIZE };
      setCoinbaseUsers(users);
      setCoinbaseMeta(meta);
      setCoinbaseActiveTotal(Number(meta.recordsTotal || 0));
    } catch (error) {
      setCoinbaseMethod(null);
      setCoinbaseUsers([]);
      setCoinbaseMeta({ recordsFiltered: 0, start: 0, length: COINBASE_USER_PAGE_SIZE });
      setSelectedUserIds([]);
      setCoinbaseActiveTotal(0);
      toast.error(error.response?.data?.message || "Could not load Coinbase users");
    } finally {
      setCoinbaseLoading(false);
    }
  };

  const loadCoinbaseUsers = async ({ append = false, search = "", start = 0 } = {}) => {
    if (!coinbaseMethod?.id) return;
    if (append) setCoinbaseLoadingMore(true);
    else setCoinbaseLoading(true);
    try {
      const res = await adminDashboardApi.getCoinbaseUsers(coinbaseMethod.id, {
        start,
        length: COINBASE_USER_PAGE_SIZE,
        search
      });
      const users = res.data?.data?.users || [];
      const meta = res.data?.data?.meta || { recordsFiltered: users.length, start, length: COINBASE_USER_PAGE_SIZE };
      setCoinbaseUsers((prev) => (append ? mergeCoinbaseUsers(prev, users) : users));
      setCoinbaseMeta(meta);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load Coinbase users");
    } finally {
      if (append) setCoinbaseLoadingMore(false);
      else setCoinbaseLoading(false);
    }
  };

  useEffect(() => {
    if (!coinbaseModalOpen || !coinbaseMethod?.id) return;
    const timer = setTimeout(() => {
      if (skipNextCoinbaseSearchFetchRef.current) {
        skipNextCoinbaseSearchFetchRef.current = false;
        return;
      }
      const typed = String(coinbaseSearch || "").trim();
      if (typed.length > 0 && typed.length < COINBASE_SEARCH_MIN) return;
      const nextSearch = typed.length >= COINBASE_SEARCH_MIN ? typed : "";
      loadCoinbaseUsers({ append: false, search: nextSearch, start: 0 });
    }, 300);
    return () => clearTimeout(timer);
  }, [coinbaseSearch, coinbaseModalOpen, coinbaseMethod?.id]);

  const coinbaseSearchTerm = useMemo(() => {
    const typed = String(coinbaseSearch || "").trim();
    return typed.length >= COINBASE_SEARCH_MIN ? typed : "";
  }, [coinbaseSearch]);

  const userOptions = useMemo(
    () =>
      coinbaseUsers.map((user) => ({
        value: user.id,
        label: formatCoinbaseUserLabel(user),
        user
      })),
    [coinbaseUsers]
  );

  const selectedOptions = useMemo(() => {
    if (selectedUserIds.length > COINBASE_MAX_VISIBLE_TAGS) return [];
    const optionMap = new Map(userOptions.map((option) => [Number(option.value), option]));
    return selectedUserIds.map((id) => {
      const existing = optionMap.get(Number(id));
      if (existing) return existing;
      return { value: id, label: `User #${id}` };
    });
  }, [selectedUserIds, userOptions]);

  const selectValue = useMemo(() => {
    if (selectedUserIds.length > COINBASE_MAX_VISIBLE_TAGS) return [];
    return selectedOptions;
  }, [selectedUserIds.length, selectedOptions]);

  const selectAllCoinbaseUsers = async () => {
    if (!coinbaseMethod?.id) return;
    setSelectingAllUsers(true);
    try {
      const res = await adminDashboardApi.getCoinbaseUserIds(coinbaseMethod.id, {
        search: coinbaseSearchTerm
      });
      const ids = res.data?.data?.ids || [];
      setSelectedUserIds(ids);
      setCoinbaseMenuOpen(false);
      toast.success(
        ids.length
          ? `${ids.length} active user${ids.length === 1 ? "" : "s"} selected. Click Submit to save.`
          : "No active users found."
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not select all users");
    } finally {
      setSelectingAllUsers(false);
    }
  };

  const deselectAllCoinbaseUsers = () => {
    setSelectedUserIds([]);
  };

  const coinbaseSelectComponents = useMemo(
    () => ({
      MultiValue: CoinbaseMultiValue,
      ValueContainer: CoinbaseValueContainer
    }),
    []
  );

  const coinbaseSelectClassNames = useMemo(
    () => ({
      control: () =>
        selectedUserIds.length > COINBASE_MAX_VISIBLE_TAGS ? "coinbase-select-control--compact" : ""
    }),
    [selectedUserIds.length]
  );

  const saveCoinbaseUsers = async () => {
    if (!coinbaseMethod?.id) return;
    setSavingUsers(true);
    try {
      await adminDashboardApi.updateCoinbaseUsers(coinbaseMethod.id, { auth_user_ids: selectedUserIds });
      toast.success("User added successfully");
      setCoinbaseModalOpen(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save Coinbase users");
    } finally {
      setSavingUsers(false);
    }
  };

  return (
    <div className="container-fluid manage-payment-method-page">
      <div className="page-head manage-user1 d-flex justify-content-between align-items-center">
        <h4 className="mt-2 mb-2">Manage Payment Method</h4>
        <button type="button" className="btn refresh-icon-btn" onClick={() => window.location.reload()} aria-label="Refresh page" title="Refresh">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
          </svg>
        </button>
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
                <input className="form-control form-control-sm d-inline-block login-log-search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
              </label>
            </div>

            <table className="table table-bordered table-bg1 mb-0">
              <thead>
                <tr>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("id")}>Sl.No. <span>{sortArrow("id")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("PaymentMethod")}>Payment Method <span>{sortArrow("PaymentMethod")}</span></button></th>
                  <th><button type="button" className="login-log-sort" onClick={() => onSort("active")}>Status <span>{sortArrow("active")}</span></button></th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted py-4">No payment methods found.</td></tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{query.start + index + 1}</td>
                    <td>{row.PaymentMethod}</td>
                    <td>{row.active ? "Active" : "Deactive"}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className={`status-toggle ${row.active ? "on" : "off"}`}
                          onClick={() => toggleStatus(row)}
                          aria-label={row.active ? "Deactivate payment method" : "Activate payment method"}
                        >
                          <span className="status-toggle-knob" />
                        </button>
                        {row.active && (row.selected_user === 1 || String(row.PaymentMethod || "").toLowerCase() === "coinbase") ? (
                          <button type="button" className="btn selected-user-btn" onClick={() => openCoinbaseUsers(row)}>
                            Add User
                          </button>
                        ) : null}
                      </div>
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

      {coinbaseModalOpen && (
        <div className="modal-backdrop-lite">
          <div className="modal-card-lite distribution-modal coinbase-users-modal">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Add user coinbase</h5>
              <button type="button" className="btn-close" onClick={() => setCoinbaseModalOpen(false)} />
            </div>
            {coinbaseLoading ? (
              <div className="text-muted">Loading...</div>
            ) : (
              <div className="coinbase-modal-body">
                {selectingAllUsers && (
                  <div className="coinbase-modal-busy" aria-live="polite">
                    <span className="coinbase-modal-busy__spinner" />
                    Selecting users…
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                  <label className="form-label mb-0">Select Users</label>
                  <div className="coinbase-user-bulk-actions d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={selectAllCoinbaseUsers}
                      disabled={coinbaseLoading || coinbaseLoadingMore || selectingAllUsers}
                    >
                      {selectingAllUsers ? "Selecting…" : "Select all"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={deselectAllCoinbaseUsers}
                      disabled={!selectedUserIds.length || selectingAllUsers}
                    >
                      Deselect all
                    </button>
                  </div>
                </div>
                <p className="small text-muted mb-2">
                  Search by name or email (min {COINBASE_SEARCH_MIN} characters). Selected: {selectedUserIds.length}
                  {coinbaseActiveTotal > 0 ? ` · ${coinbaseActiveTotal} active users total` : ""}
                  {coinbaseBulkSelected ? " · Summary view for speed" : ""}
                </p>
                <div className="coinbase-user-select-wrap">
                  <Select
                    isMulti
                    options={userOptions}
                    className="coinbase-user-select"
                    classNamePrefix="package-distribution-select"
                    classNames={coinbaseSelectClassNames}
                    components={coinbaseSelectComponents}
                    value={selectValue}
                    selectedCount={selectedUserIds.length}
                    placeholder="Search by name or email…"
                    isLoading={coinbaseLoading || coinbaseLoadingMore || selectingAllUsers}
                    isDisabled={selectingAllUsers}
                    filterOption={() => true}
                    closeMenuOnSelect={false}
                    hideSelectedOptions={!coinbaseBulkSelected}
                    menuIsOpen={coinbaseMenuOpen}
                    onMenuOpen={() => setCoinbaseMenuOpen(true)}
                    onMenuClose={() => setCoinbaseMenuOpen(false)}
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    styles={COINBASE_MENU_PORTAL_STYLES}
                    maxMenuHeight={220}
                    menuPlacement="auto"
                    onInputChange={(value, meta) => {
                      if (meta.action === "input-change") setCoinbaseSearch(value);
                    }}
                    onMenuScrollToBottom={() => {
                      const nextStart = coinbaseUsers.length;
                      const hasMore = nextStart < Number(coinbaseMeta.recordsFiltered || 0);
                      if (!hasMore || coinbaseLoadingMore || coinbaseLoading || selectingAllUsers) return;
                      loadCoinbaseUsers({ append: true, search: coinbaseSearchTerm, start: nextStart });
                    }}
                    onChange={(selected) => {
                      const items = selected || [];
                      if (selectedUserIds.length > COINBASE_MAX_VISIBLE_TAGS) {
                        if (!items.length) {
                          setSelectedUserIds([]);
                          return;
                        }
                        setSelectedUserIds(items.map((item) => Number(item.value)).filter((id) => id > 0));
                        return;
                      }
                      setSelectedUserIds(items.map((item) => Number(item.value)).filter((id) => id > 0));
                    }}
                  />
                </div>
                <div className="d-flex justify-content-end gap-2 mt-3">
                  <button type="button" className="btn btn-secondary" onClick={() => setCoinbaseModalOpen(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={saveCoinbaseUsers} disabled={savingUsers || selectingAllUsers}>
                    {savingUsers ? "Please wait..." : "Submit"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagePaymentMethodPage;
