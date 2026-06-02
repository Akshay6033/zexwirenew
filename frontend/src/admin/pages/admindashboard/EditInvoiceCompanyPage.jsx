import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminPageBackHead from "../../components/AdminPageBackHead";

function EditInvoiceCompanyPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", address: "", gst: "" });

  const goBack = () => navigate("/admindashboard/manage_invoice_company");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboardApi.getInvoiceCompanyById(id);
        const row = res.data?.data;
        setForm({
          name: row?.name || "",
          email: row?.email || "",
          address: row?.address || "",
          gst: row?.gst || ""
        });
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not load invoice company");
        goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminDashboardApi.updateInvoiceCompany(id, form);
      toast.success("Updated successfully");
      goBack();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminPageLoader label="Loading invoice company…" />;

  return (
    <div className="container-fluid manage-invoice-company-page create-pr-legacy-page">
      <AdminPageBackHead title="Edit Invoice company" onBack={goBack} />

      <div className="row">
        <div className="col-lg-12 col-sm-12">
          <div className="card m-b-30 form-body-border">
            <div className="card-body form-body">
              <form onSubmit={onSubmit}>
                <div className="form-group-flex">
                  <div className="form-group fg1">
                    <label className="control-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group fg1">
                    <label className="control-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      required
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group-flex">
                  <div className="form-group fg1">
                    <label className="control-label">Address</label>
                    <textarea
                      className="form-control"
                      rows={7}
                      required
                      value={form.address}
                      onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div className="form-group fg1">
                    <label className="control-label">GST</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={form.gst}
                      onChange={(e) => setForm((prev) => ({ ...prev, gst: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <div className="update-country">
                    <button type="submit" className="btn btn-primary press-btn1" disabled={saving}>
                      {saving ? "Please wait..." : "Update Company"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditInvoiceCompanyPage;
