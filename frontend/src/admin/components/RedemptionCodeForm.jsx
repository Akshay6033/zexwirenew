import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";

const selectStyles = {
  control: (base) => ({ ...base, minHeight: 42 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 })
};

function toMultiOptions(items) {
  return (items || []).map((item) => ({ value: Number(item.id), label: item.label }));
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isPastDate(ymd) {
  if (!ymd) return false;
  return ymd < todayYmd();
}

export default function RedemptionCodeForm({
  initial,
  packages = [],
  submitting = false,
  submitLabel = "Submit",
  onSubmit
}) {
  const packageOptions = useMemo(() => toMultiOptions(packages), [packages]);

  const [form, setForm] = useState({
    code_name: "",
    package_ids: [],
    usage_limit: "",
    expiry_date: "",
    target_audience: "all_users",
    active: true
  });
  const [errors, setErrors] = useState({});
  const [selectAllPackages, setSelectAllPackages] = useState(false);
  const initialExpiryRef = useRef("");

  useEffect(() => {
    if (!initial) return;
    const expiry = initial.expiry_date ? String(initial.expiry_date).slice(0, 10) : "";
    initialExpiryRef.current = expiry;
    setForm({
      code_name: initial.code_name || "",
      package_ids: initial.package_ids || [],
      usage_limit: initial.usage_limit != null ? String(initial.usage_limit) : "",
      expiry_date: expiry,
      target_audience: initial.target_audience === "new_users" ? "new_users" : "all_users",
      active: initial.active !== 0 && initial.active !== false
    });
    setSelectAllPackages(
      (initial.package_ids || []).length === packageOptions.length && packageOptions.length > 0
    );
  }, [initial, packageOptions.length]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const selectedPackages = packageOptions.filter((opt) => form.package_ids.includes(opt.value));

  const validate = () => {
    const next = {};
    if (!String(form.code_name).trim()) next.code_name = "* Enter code name";
    if (!form.package_ids.length) next.package_ids = "Please select at least one package to assign.";
    const limit = Number(form.usage_limit);
    if (!String(form.usage_limit).trim() || !Number.isFinite(limit) || limit < 1) {
      next.usage_limit = "Usage limit must be at least 1.";
    }
    if (
      form.expiry_date &&
      isPastDate(form.expiry_date) &&
      form.expiry_date !== initialExpiryRef.current
    ) {
      next.expiry_date = "Expiry date cannot be in the past.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      code_name: String(form.code_name).trim().toUpperCase(),
      package_ids: form.package_ids,
      usage_limit: Number(form.usage_limit),
      expiry_date: form.expiry_date || null,
      target_audience: form.target_audience,
      active: form.active ? 1 : 0
    });
  };

  const onDigitsOnly = (e, maxLen) => {
    if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
    if (maxLen && String(e.target.value).length >= maxLen && e.key.length === 1) e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit} className="redemption-form">
      <div className="form-group-flex">
        <div className="form-group fg1">
          <label className="control-label">Code Name</label>
          <input
            className="form-control"
            value={form.code_name}
            onChange={(e) => setField("code_name", e.target.value.toUpperCase())}
            placeholder="e.g. PARTNER2024"
          />
          {errors.code_name ? <h6 className="field-error">{errors.code_name}</h6> : null}
        </div>
        <div className="form-group fg1">
          <label className="control-label">Usage Limit</label>
          <input
            className="form-control"
            value={form.usage_limit}
            maxLength={6}
            onChange={(e) => setField("usage_limit", e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => onDigitsOnly(e, 6)}
          />
          {errors.usage_limit ? <div className="field-error mt-1">{errors.usage_limit}</div> : null}
        </div>
      </div>

      <div className="form-group-flex">
        <div className="form-group fg1">
          <label className="control-label">Assigned Packages</label>
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
            placeholder="Select packages to grant on redemption"
            styles={selectStyles}
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
          />
          {errors.package_ids ? <div className="field-error mt-1">{errors.package_ids}</div> : null}
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
          <label className="control-label">Expiry Date (optional)</label>
          <input
            type="date"
            className="form-control"
            value={form.expiry_date}
            min={todayYmd()}
            onChange={(e) => {
              const value = e.target.value;
              if (value && isPastDate(value) && value !== initialExpiryRef.current) {
                setErrors((prev) => ({
                  ...prev,
                  expiry_date: "Expiry date cannot be in the past."
                }));
                return;
              }
              setField("expiry_date", value);
            }}
          />
          {errors.expiry_date ? <div className="field-error mt-1">{errors.expiry_date}</div> : null}
          <p className="small text-muted mt-1 mb-0">Leave blank for no expiry. Must be today or later.</p>
        </div>
      </div>

      <div className="form-group-flex">
        <div className="form-group fg1">
          <label className="control-label d-block mb-2">Target Audience</label>
          <label className="redemption-radio-label">
            <input
              type="radio"
              name="target_audience"
              value="new_users"
              checked={form.target_audience === "new_users"}
              onChange={() => setField("target_audience", "new_users")}
            />
            <span>New Users Only</span>
            <span className="small text-muted d-block ms-4">Account created within the last 30 days</span>
          </label>
          <label className="redemption-radio-label mt-2">
            <input
              type="radio"
              name="target_audience"
              value="all_users"
              checked={form.target_audience === "all_users"}
              onChange={() => setField("target_audience", "all_users")}
            />
            <span>All Users</span>
          </label>
        </div>
        <div className="form-group fg1">
          <label className="control-label d-block mb-2">Status</label>
          <button
            type="button"
            className={`status-toggle ${form.active ? "on" : "off"}`}
            onClick={() => setField("active", !form.active)}
            aria-label={form.active ? "Set inactive" : "Set active"}
          >
            <span className="status-toggle-knob" />
          </button>
          <span className="ms-2 small">{form.active ? "Active" : "Inactive"}</span>
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
