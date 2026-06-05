import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { adminDashboardApi } from "../services/adminDashboardApi";

const DISCOUNT_OPTIONS = [
  { value: 1, label: "%" },
  { value: 2, label: "Flat" }
];

const USER_HYDRATE_LIMIT = 40;
const USER_SEARCH_DEBOUNCE_MS = 300;

const selectStyles = {
  control: (base) => ({ ...base, minHeight: 42 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 })
};

function toMultiOptions(items) {
  return (items || []).map((item) => ({ value: Number(item.id), label: item.label }));
}

export default function CouponForm({
  initial,
  packages = [],
  submitting = false,
  submitLabel = "Submit",
  onSubmit
}) {
  const packageOptions = useMemo(() => toMultiOptions(packages), [packages]);
  const userSearchTimer = useRef(null);

  const [form, setForm] = useState({
    c_name: "",
    c_code: "",
    c_discount: 1,
    c_value: "",
    c_limit: "",
    c_limit_pending: 0,
    start_date: "",
    end_date: "",
    package_ids: [],
    user_ids: []
  });
  const [errors, setErrors] = useState({});
  const [selectAllPackages, setSelectAllPackages] = useState(false);
  const [allUsersSelected, setAllUsersSelected] = useState(false);
  const [selectedUserOptions, setSelectedUserOptions] = useState([]);
  const [usersSummaryCount, setUsersSummaryCount] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!initial) return;
    const userIds = initial.user_ids || [];
    setForm({
      c_name: initial.c_name || "",
      c_code: initial.c_code || "",
      c_discount: Number(initial.c_discount) === 2 ? 2 : 1,
      c_value: initial.c_value != null ? String(initial.c_value) : "",
      c_limit: initial.c_limit != null ? String(initial.c_limit) : "",
      c_limit_pending: Number(initial.c_limit_pending) || 0,
      start_date: initial.start_date || "",
      end_date: initial.end_date || "",
      package_ids: initial.package_ids || [],
      user_ids: userIds
    });
    setSelectAllPackages(
      (initial.package_ids || []).length === packageOptions.length && packageOptions.length > 0
    );
    setAllUsersSelected(false);
    setSelectedUserOptions([]);
    setUsersSummaryCount(0);

    if (userIds.length > USER_HYDRATE_LIMIT) {
      setUsersSummaryCount(userIds.length);
      return;
    }

    if (!userIds.length) return;

    let cancelled = false;
    (async () => {
      setLoadingUsers(true);
      try {
        const res = await adminDashboardApi.getCouponMetaUsers({ ids: userIds.join(",") });
        if (cancelled) return;
        const opts = toMultiOptions(res.data?.data || []);
        setSelectedUserOptions(opts);
        setForm((prev) => ({ ...prev, user_ids: opts.map((o) => o.value) }));
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initial, packageOptions.length]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const selectedPackages = packageOptions.filter((opt) => form.package_ids.includes(opt.value));

  const loadUserOptions = useCallback((inputValue) => {
    return new Promise((resolve) => {
      if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
      userSearchTimer.current = setTimeout(async () => {
        try {
          const res = await adminDashboardApi.getCouponMetaUsers({
            search: inputValue || "",
            limit: 40
          });
          resolve(toMultiOptions(res.data?.data || []));
        } catch {
          resolve([]);
        }
      }, USER_SEARCH_DEBOUNCE_MS);
    });
  }, []);

  const onUsersChange = (selected) => {
    const opts = selected || [];
    setAllUsersSelected(false);
    setUsersSummaryCount(0);
    setSelectedUserOptions(opts);
    setField(
      "user_ids",
      opts.map((o) => o.value)
    );
  };

  const onSelectAllUsers = async (checked) => {
    setAllUsersSelected(checked);
    if (checked) {
      setSelectedUserOptions([]);
      setUsersSummaryCount(0);
      setField("user_ids", []);
      return;
    }
    setField("user_ids", []);
    setSelectedUserOptions([]);
  };

  const validate = () => {
    const next = {};
    if (!String(form.c_name).trim()) next.c_name = "* Enter coupon name";
    if (!String(form.c_code).trim()) next.c_code = "* Enter coupon code";
    if (![1, 2].includes(Number(form.c_discount))) next.c_discount = "* Select discount (% or Flat USD)";
    if (!String(form.c_value).trim()) next.c_value = "* Enter value";
    if (!String(form.c_limit).trim()) next.c_limit = "* Enter number of times the coupon can be used";
    if (!String(form.start_date).trim()) next.start_date = "* Enter start date";
    if (!String(form.end_date).trim()) next.end_date = "* Enter end date";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      c_name: String(form.c_name).trim(),
      c_code: String(form.c_code).trim(),
      c_discount: Number(form.c_discount),
      c_value: String(form.c_value).trim(),
      c_limit: Number(form.c_limit),
      c_limit_pending: Number(form.c_limit_pending) || 0,
      start_date: String(form.start_date).trim(),
      end_date: String(form.end_date).trim(),
      package: form.package_ids,
      user: allUsersSelected ? [] : form.user_ids
    });
  };

  const onAlphaName = (e) => {
    const key = e.key;
    if (!/^[a-zA-Z\s]$/.test(key) && key.length === 1) e.preventDefault();
  };

  const onDigitsOnly = (e, maxLen) => {
    if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
    if (maxLen && String(e.target.value).length >= maxLen && e.key.length === 1) e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit} className="coupon-form">
      <div className="form-group-flex">
        <div className="form-group fg1">
          <label className="control-label">Coupon Name</label>
          <input
            className="form-control"
            value={form.c_name}
            onChange={(e) => setField("c_name", e.target.value)}
            onKeyDown={onAlphaName}
          />
          {errors.c_name ? <h6 className="field-error">{errors.c_name}</h6> : null}
        </div>
        <div className="form-group fg1">
          <label className="control-label">Coupon Code</label>
          <input className="form-control" value={form.c_code} onChange={(e) => setField("c_code", e.target.value)} />
          {errors.c_code ? <div className="field-error mt-1">{errors.c_code}</div> : null}
        </div>
      </div>

      <div className="form-group-flex">
        <div className="form-group fg1">
          <label className="control-label">Discount Type</label>
          <select
            className="form-control"
            value={form.c_discount}
            onChange={(e) => setField("c_discount", Number(e.target.value))}
          >
            {DISCOUNT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.c_discount ? <h6 className="field-error">{errors.c_discount}</h6> : null}
        </div>
        <div className="form-group fg1">
          <label className="control-label">Discount Value</label>
          <input
            className="form-control"
            value={form.c_value}
            maxLength={3}
            onChange={(e) => setField("c_value", e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => onDigitsOnly(e, 3)}
          />
          {errors.c_value ? <h6 className="field-error">{errors.c_value}</h6> : null}
        </div>
      </div>

      <div className="form-group-flex">
        <div className="form-group fg1">
          <label className="control-label">Number of times the coupon can be used</label>
          <input
            className="form-control"
            value={form.c_limit}
            maxLength={5}
            onChange={(e) => setField("c_limit", e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => onDigitsOnly(e, 5)}
          />
          {errors.c_limit ? <div className="field-error mt-1">{errors.c_limit}</div> : null}
        </div>
        <div className="form-group fg3">
          <label className="control-label">Start Date</label>
          <input
            className="form-control"
            placeholder="MM/DD/YYYY"
            autoComplete="off"
            value={form.start_date}
            onChange={(e) => setField("start_date", e.target.value)}
          />
          {errors.start_date ? <h6 className="field-error">{errors.start_date}</h6> : null}
        </div>
        <div className="form-group fg3">
          <label className="control-label">End Date</label>
          <input
            className="form-control"
            placeholder="MM/DD/YYYY"
            autoComplete="off"
            value={form.end_date}
            onChange={(e) => setField("end_date", e.target.value)}
          />
          {errors.end_date ? <h6 className="field-error">{errors.end_date}</h6> : null}
        </div>
      </div>

      <div className="form-group-flex">
        <div className="form-group fg1">
          <label className="control-label">Select Package</label>
          <Select
            isMulti
            classNamePrefix="coupon-multi-select"
            options={packageOptions}
            value={selectedPackages}
            onChange={(selected) => {
              const ids = (selected || []).map((s) => s.value);
              setField("package_ids", ids);
              setSelectAllPackages(ids.length === packageOptions.length && packageOptions.length > 0);
            }}
            placeholder="Please Select Applicable Package"
            styles={selectStyles}
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
          />
          <label className="coupon-select-all mt-2">
            <input
              type="checkbox"
              checked={selectAllPackages}
              onChange={(e) => {
                const checked = e.target.checked;
                setSelectAllPackages(checked);
                setField("package_ids", checked ? packageOptions.map((o) => o.value) : []);
              }}
            />
            <span>Select All Packages</span>
          </label>
        </div>
        <div className="form-group fg1">
          <label className="control-label">Select User</label>
          {allUsersSelected ? (
            <p className="coupon-users-summary text-muted small mb-2">All active users selected.</p>
          ) : usersSummaryCount > 0 ? (
            <p className="coupon-users-summary text-muted small mb-2">
              {usersSummaryCount} users selected. Type below to search and adjust, or use Select All Users.
            </p>
          ) : null}
          {loadingUsers ? <p className="small text-muted mb-2">Loading selected users…</p> : null}
          <AsyncSelect
            key={allUsersSelected ? "users-all" : `users-${usersSummaryCount}`}
            isMulti
            isDisabled={allUsersSelected}
            classNamePrefix="coupon-multi-select"
            cacheOptions
            defaultOptions
            loadOptions={loadUserOptions}
            value={allUsersSelected ? [] : selectedUserOptions}
            onChange={onUsersChange}
            placeholder="Search users by name…"
            styles={selectStyles}
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
          />
          <label className="coupon-select-all coupon-select-all-users mt-2">
            <input
              type="checkbox"
              checked={allUsersSelected}
              onChange={(e) => onSelectAllUsers(e.target.checked)}
            />
            <span>Select All Users</span>
          </label>
        </div>
      </div>

      <div className="submit-btn1 text-center">
        <button type="submit" className="btn btn-primary press-btn1 px-5" disabled={submitting}>
          {submitting ? "Please wait..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
