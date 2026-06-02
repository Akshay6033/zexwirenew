import { useState } from "react";
import { adminDashboardApi } from "../../services/adminDashboardApi";

function AddCountryCodeModal({ open, onClose }) {
  const [form, setForm] = useState({ iso_code: "", country_code: "" });
  const [message, setMessage] = useState("");

  if (!open) return null;

  const handleSubmit = async () => {
    try {
      const res = await adminDashboardApi.addCountryCode(form);
      setMessage(res.data.message || "Added successfully.");
      setForm({ iso_code: "", country_code: "" });
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not add country code.");
    }
  };

  return (
    <div className="modal-backdrop-lite">
      <div className="modal-card-lite">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Add New Country Code</h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        {!!message && <p className="small mb-2">{message}</p>}
        <div className="mb-2">
          <label className="form-label">Country Name</label>
          <input
            className="form-control"
            value={form.iso_code}
            onChange={(e) => setForm((p) => ({ ...p, iso_code: e.target.value }))}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Country Code</label>
          <input
            type="number"
            className="form-control"
            value={form.country_code}
            onChange={(e) => setForm((p) => ({ ...p, country_code: e.target.value }))}
          />
        </div>
        <button type="button" className="btn btn-outline-success" onClick={handleSubmit}>
          Add New Country Code
        </button>
      </div>
    </div>
  );
}

export default AddCountryCodeModal;
