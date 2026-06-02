import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { publicAuthApi } from "../services/publicAuthApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("This field is required.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Please enter a valid registered email.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await publicAuthApi.forgotPassword({ email: email.trim(), fpass: email.trim() });
      const data = res.data || {};
      if (data.status) {
        toast.success(data.message || "Password reset link sent to your email. Please check email inbox.");
        return;
      }
      toast.error(data.message || "Email ID not registered. Sign Up now!");
    } catch {
      toast.error("Could not process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-forgot-page">
      <div className="container">
        <div className="auth-forgot-card">
          <div className="auth-forgot-card__head">Forgot Password</div>
          <div className="auth-forgot-card__body">
            <h2>Forgot Password</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                className={`form-control ${error ? "is-invalid" : ""}`}
                placeholder="user@domain.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
              />
              {error && <div className="auth-field-error">{error}</div>}
              <p className="auth-forgot-hint">* Enter registered email</p>
              <div className="auth-forgot-actions">
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Submitting…" : "Submit"}
                </button>
                <Link to="/sign_in" className="auth-forgot-link">
                  Already have an account?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
