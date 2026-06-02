import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthFeaturePanel from "../components/AuthFeaturePanel";
import PasswordField from "../components/PasswordField";
import { isUserLoggedIn, publicAuthApi, saveUserSession } from "../services/publicAuthApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [otpUserId, setOtpUserId] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  if (isUserLoggedIn()) {
    return <Navigate to="/pricing" replace />;
  }

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = "This field is required.";
    else if (!EMAIL_REGEX.test(form.email.trim())) next.email = "Please enter valid email";
    if (!form.password) next.password = "This field is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await publicAuthApi.signIn({
        email: form.email.trim(),
        password: form.password
      });
      const data = res.data || {};

      if (data.code === 1 && data.token) {
        saveUserSession({ token: data.token, user: data.user });
        toast.success(data.message || "Login successfully!");
        setTimeout(() => navigate("/Userdashboard"), 600);
        return;
      }
      if (data.code === 99 && data.userId) {
        setOtpUserId(data.userId);
        toast.info("Please verify your email with OTP.");
        return;
      }
      toast.error(data.message || "Please enter valid email and password !");
    } catch {
      toast.error("Something went wrong please try agian!");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Enter OTP to verify.");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await publicAuthApi.verifyEmailOtp({
        userid: otpUserId,
        email_verification_otp: otp.trim()
      });
      const data = res.data || {};
      if (data.code === 1 && data.token) {
        saveUserSession({ token: data.token, user: data.user });
        toast.success(data.message || "Email verified successfully");
        setTimeout(() => navigate("/Userdashboard"), 600);
        return;
      }
      toast.error(data.message || "Something went wrong please try agian!");
    } catch {
      toast.error("Something went wrong please try agian!");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpLoading(true);
    try {
      const res = await publicAuthApi.resendEmailOtp({ userid: otpUserId });
      const data = res.data || {};
      if (data.code === 100) {
        toast.error("OTP can't send over limit");
        return;
      }
      if (data.code === 99) {
        toast.success("OTP has been send please verify your account !");
        return;
      }
      toast.error(data.message || "Something went wrong please try agian!");
    } catch {
      toast.error("Something went wrong please try agian!");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <section className="auth-banner">
      <div className="container">
        <div className="row g-4 align-items-start">
          <div className="col-lg-6">
            <div className="auth-card">
              <h1>Sign In</h1>
              {!otpUserId ? (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="auth-form-group">
                    <input
                      type="email"
                      name="email"
                      className={`form-control ${errors.email ? "is-invalid" : ""}`}
                      placeholder="Username or Email Id"
                      value={form.email}
                      onChange={onChange}
                      autoComplete="username"
                    />
                    {errors.email && <div className="auth-field-error">{errors.email}</div>}
                  </div>
                  <PasswordField
                    id="password"
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={onChange}
                    error={errors.password}
                  />
                  <div className="auth-forgot">
                    <Link to="/forgot_password">Forgot Password?</Link>
                  </div>
                  <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? "Signing in…" : "Sign In"}
                  </button>
                  <p className="auth-switch">
                    Not Register Yet? <Link to="/sign_up">Create an account</Link>
                  </p>
                </form>
              ) : (
                <div className="auth-otp-panel">
                  <p className="auth-otp-panel__text">Enter the OTP sent to your registered email.</p>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <div className="auth-otp-actions">
                    <button type="button" className="auth-submit" onClick={handleVerifyOtp} disabled={otpLoading}>
                      Verify OTP
                    </button>
                    <button type="button" className="auth-submit auth-submit--ghost" onClick={handleResendOtp} disabled={otpLoading}>
                      Resend OTP
                    </button>
                  </div>
                </div>
              )}
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
