import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthFeaturePanel from "../components/AuthFeaturePanel";
import PasswordField from "../components/PasswordField";
import { isUserLoggedIn, publicAuthApi } from "../services/publicAuthApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{7,14}$/;
const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

export default function SignUpPage() {
  const navigate = useNavigate();
  const [countryCodes, setCountryCodes] = useState([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    countrycodeid: "",
    mobile: "",
    location: "",
    email: "",
    password: "",
    cpassword: ""
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    publicAuthApi
      .getCountryCodes()
      .then((res) => setCountryCodes(res.data?.data || []))
      .catch(() => setCountryCodes([]));
  }, []);

  if (isUserLoggedIn()) {
    return <Navigate to="/pricing" replace />;
  }

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.first_name.trim()) next.first_name = "This field is required.";
    if (!form.last_name.trim()) next.last_name = "This field is required.";
    if (!form.countrycodeid) next.countrycodeid = "This field is required.";
    if (!form.mobile.trim()) next.mobile = "This field is required.";
    else if (!PHONE_REGEX.test(form.mobile.trim())) next.mobile = "Please enter valid phone number";
    if (!form.location.trim()) next.location = "This field is required.";
    if (!form.email.trim()) next.email = "This field is required.";
    else if (!EMAIL_REGEX.test(form.email.trim())) next.email = "Please enter valid email";
    if (!form.password) next.password = "This field is required.";
    else if (!PASSWORD_REGEX.test(form.password)) {
      next.password =
        "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character";
    }
    if (!form.cpassword) next.cpassword = "This field is required.";
    else if (form.password !== form.cpassword) next.cpassword = "Password doesn't match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await publicAuthApi.signUp(form);
      const data = res.data || {};

      if (data.code === 1) {
        toast.success(data.message || "Registration successfully completed !");
        setTimeout(() => navigate("/sign_in"), 700);
        return;
      }
      if (data.code === 3) {
        toast.error(data.message || "Email id already exists!");
        return;
      }
      if (data.code === 4) {
        toast.error(data.message || "Mobile number already exists!");
        return;
      }
      toast.error(data.message || "Something went wrong please try again!");
    } catch {
      toast.error("Something went wrong please try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-banner">
      <div className="container">
        <div className="row g-4 align-items-start">
          <div className="col-lg-6">
            <div className="auth-card">
              <h1>Sign Up</h1>
              <form onSubmit={handleSubmit} noValidate>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="auth-form-group">
                      <input
                        type="text"
                        name="first_name"
                        className={`form-control ${errors.first_name ? "is-invalid" : ""}`}
                        placeholder="First Name"
                        value={form.first_name}
                        onChange={onChange}
                      />
                      {errors.first_name && <div className="auth-field-error">{errors.first_name}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="auth-form-group">
                      <input
                        type="text"
                        name="last_name"
                        className={`form-control ${errors.last_name ? "is-invalid" : ""}`}
                        placeholder="Last Name"
                        value={form.last_name}
                        onChange={onChange}
                      />
                      {errors.last_name && <div className="auth-field-error">{errors.last_name}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="auth-form-group">
                      <select
                        name="countrycodeid"
                        className={`form-control ${errors.countrycodeid ? "is-invalid" : ""}`}
                        value={form.countrycodeid}
                        onChange={onChange}
                      >
                        <option value="">Select Any Country</option>
                        {countryCodes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      {errors.countrycodeid && <div className="auth-field-error">{errors.countrycodeid}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="auth-form-group">
                      <input
                        type="text"
                        name="mobile"
                        className={`form-control ${errors.mobile ? "is-invalid" : ""}`}
                        placeholder="Phone Number"
                        value={form.mobile}
                        onChange={onChange}
                      />
                      {errors.mobile && <div className="auth-field-error">{errors.mobile}</div>}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="auth-form-group">
                      <input
                        type="text"
                        name="location"
                        className={`form-control ${errors.location ? "is-invalid" : ""}`}
                        placeholder="Address"
                        value={form.location}
                        onChange={onChange}
                      />
                      {errors.location && <div className="auth-field-error">{errors.location}</div>}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="auth-form-group">
                      <input
                        type="email"
                        name="email"
                        className={`form-control ${errors.email ? "is-invalid" : ""}`}
                        placeholder="Email Id"
                        value={form.email}
                        onChange={onChange}
                        autoComplete="email"
                      />
                      {errors.email && <div className="auth-field-error">{errors.email}</div>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <PasswordField
                      id="password"
                      name="password"
                      placeholder="Password"
                      value={form.password}
                      onChange={onChange}
                      error={errors.password}
                    />
                  </div>
                  <div className="col-md-6">
                    <PasswordField
                      id="cpassword"
                      name="cpassword"
                      placeholder="Confirm Password"
                      value={form.cpassword}
                      onChange={onChange}
                      error={errors.cpassword}
                    />
                  </div>
                </div>
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Creating account…" : "Sign Up"}
                </button>
                <p className="auth-switch">
                  Already have account? <Link to="/sign_in">Sign in</Link>
                </p>
              </form>
            </div>
          </div>
          <div className="col-lg-6">
            <AuthFeaturePanel />
          </div>
        </div>
      </div>
    </section>
  );
}
