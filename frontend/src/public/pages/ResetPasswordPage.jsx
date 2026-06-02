import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PasswordField from "../components/PasswordField";
import { publicAuthApi } from "../services/publicAuthApi";

const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

export default function ResetPasswordPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [cpassword, setCpassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next = {};
    if (!password) next.password = "This field is required.";
    else if (!PASSWORD_REGEX.test(password)) {
      next.password =
        "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character";
    }
    if (!cpassword) next.cpassword = "This field is required.";
    else if (password !== cpassword) next.cpassword = "Password doesn't match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await publicAuthApi.resetPassword(id, { password });
      const data = res.data || {};
      if (data.status) {
        toast.success(data.message || "Password Updated Successfully");
        setTimeout(() => navigate("/sign_in"), 700);
        return;
      }
      toast.error(data.message || "Oops! Something went wrong. Please try again");
    } catch {
      toast.error("Oops! Something went wrong. Please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-forgot-page">
      <div className="container">
        <div className="auth-forgot-card">
          <div className="auth-forgot-card__head">Reset Password</div>
          <div className="auth-forgot-card__body">
            <h2>Set New Password</h2>
            <form onSubmit={handleSubmit}>
              <PasswordField
                id="password"
                name="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: "" }));
                }}
                error={errors.password}
              />
              <PasswordField
                id="cpassword"
                name="cpassword"
                placeholder="Confirm Password"
                value={cpassword}
                onChange={(e) => {
                  setCpassword(e.target.value);
                  setErrors((prev) => ({ ...prev, cpassword: "" }));
                }}
                error={errors.cpassword}
              />
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Updating…" : "Update Password"}
              </button>
              <p className="auth-switch mt-3">
                <Link to="/sign_in">Back to Sign In</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
