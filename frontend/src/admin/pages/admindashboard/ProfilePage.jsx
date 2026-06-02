import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageBackHead from "../../components/AdminPageBackHead";

const PASSWORD_REGEX =
  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

function ProfilePage() {
  const navigate = useNavigate();
  const adminUser = useMemo(() => JSON.parse(localStorage.getItem("adminUser") || "{}"), []);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    user_id: adminUser.id || "",
    username: adminUser.username || "",
    password: "",
    password2: ""
  });
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = "User Name is required";
    if (!form.password) nextErrors.password = "Password is required";
    if (!PASSWORD_REGEX.test(form.password)) {
      nextErrors.password =
        "Please set password 8 to 15 characters with uppercase, lowercase, number and special character";
    }
    if (!form.password2) nextErrors.password2 = "Confirm Password is required";
    if (form.password && form.password2 && form.password !== form.password2) {
      nextErrors.password2 = "Both passwords do not match";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await adminDashboardApi.updateProfile({
        user_id: form.user_id,
        username: form.username.trim(),
        password: form.password
      });
      if (!res.data.status) {
        toast.error(res.data.message || "Profile update failed");
        return;
      }

      const updatedUser = { ...adminUser, username: res.data.data?.username || form.username.trim() };
      localStorage.setItem("adminUser", JSON.stringify(updatedUser));
      toast.success(res.data.message || "Profile updated successfully");
      setTimeout(() => navigate("/users"), 900);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/admindashboard/manage_editorial");
  };

  return (
    <div className="container-fluid profile-page">
      <AdminPageBackHead title="Update Profile" onBack={handleBack} />
      <div className="row">
        <div className="col-lg-12 col-sm-12">
          <div className="card m-b-30 form-body-border profile-card">
            <div className="card-body form-body profile-form-body">
              <form action="javascript:;">
                <div className="form-group-flex profile-field-row">
                  <div className="form-group fg1">
                    <label className="control-label">User Name</label>
                    <input
                      type="text"
                      className="form-control username"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                    />
                    {errors.username && <h6 className="field-error">{errors.username}</h6>}
                  </div>
                </div>
                <div className="form-group-flex profile-field-row">
                  <div className="form-group fg1">
                    <label className="control-label">Password</label>
                    <div className="position-relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        className="form-control password pe-5"
                        placeholder="e.g ******"
                        value={form.password}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none password-toggle-btn"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {!showPassword ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path
                              fill="currentColor"
                              d="M2.1 3.51L3.5 2.1l18.4 18.39-1.41 1.41-3.11-3.11A11.8 11.8 0 0 1 12 20C6.5 20 2 16 1 12c.48-1.9 1.58-3.65 3.11-5.08L2.1 3.5Zm5.05 5.04A4.97 4.97 0 0 0 7 10a5 5 0 0 0 7.45 4.33l-1.62-1.62A2.5 2.5 0 0 1 9.3 9.17L7.15 8.55Zm13.74 3.45a11.84 11.84 0 0 1-2.7 4.3l-1.42-1.42A9.92 9.92 0 0 0 19 12a10.14 10.14 0 0 0-7-4c-.8 0-1.6.1-2.34.3L7.95 6.6A12.3 12.3 0 0 1 12 6c5.5 0 10 4 11 8ZM12 9a3 3 0 0 1 3 3v.2l-3.2-3.2H12Z"
                            />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path
                              fill="currentColor"
                              d="M12 5c5.5 0 10 4 11 7-1 3-5.5 7-11 7S2 15 1 12c1-3 5.5-7 11-7Zm0 2C8 7 4.7 9.5 3.2 12 4.7 14.5 8 17 12 17s7.3-2.5 8.8-5C19.3 9.5 16 7 12 7Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && <h6 className="field-error">{errors.password}</h6>}
                  </div>
                </div>
                <div className="form-group-flex profile-field-row">
                  <div className="form-group fg1">
                    <label className="control-label">Confirm-Password</label>
                    <div className="position-relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="password2"
                        className="form-control password2 pe-5"
                        placeholder="e.g ******"
                        value={form.password2}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none password-toggle-btn"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {!showConfirmPassword ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path
                              fill="currentColor"
                              d="M2.1 3.51L3.5 2.1l18.4 18.39-1.41 1.41-3.11-3.11A11.8 11.8 0 0 1 12 20C6.5 20 2 16 1 12c.48-1.9 1.58-3.65 3.11-5.08L2.1 3.5Zm5.05 5.04A4.97 4.97 0 0 0 7 10a5 5 0 0 0 7.45 4.33l-1.62-1.62A2.5 2.5 0 0 1 9.3 9.17L7.15 8.55Zm13.74 3.45a11.84 11.84 0 0 1-2.7 4.3l-1.42-1.42A9.92 9.92 0 0 0 19 12a10.14 10.14 0 0 0-7-4c-.8 0-1.6.1-2.34.3L7.95 6.6A12.3 12.3 0 0 1 12 6c5.5 0 10 4 11 8ZM12 9a3 3 0 0 1 3 3v.2l-3.2-3.2H12Z"
                            />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path
                              fill="currentColor"
                              d="M12 5c5.5 0 10 4 11 7-1 3-5.5 7-11 7S2 15 1 12c1-3 5.5-7 11-7Zm0 2C8 7 4.7 9.5 3.2 12 4.7 14.5 8 17 12 17s7.3-2.5 8.8-5C19.3 9.5 16 7 12 7Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password2 && <h6 className="field-error">{errors.password2}</h6>}
                  </div>
                </div>
                <div className="submit-btn">
                  <button type="button" className="btn btn-primary px-4" id="submitbtn" onClick={handleUpdate} disabled={loading}>
                    {loading ? "Please wait..." : "Update Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
