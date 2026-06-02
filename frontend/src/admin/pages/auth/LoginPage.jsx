import { useState } from "react";
import { authApi } from "../../services/authApi";
import { useNavigate } from "react-router-dom";

const ACTIONS = {
  LOGIN: "login",
  SEND_OTP: "sendOtp",
  UPDATE_PASSWORD: "updatePassword"
};

function LoginPage() {
  const navigate = useNavigate();

  if (localStorage.getItem("token")) {
    return <Navigate to="/admindashboard/manage_editorial" replace />;
  }
  const [form, setForm] = useState({
    username: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState({
    login: false,
    sendOtp: false,
    updatePassword: false
  });
  const [showForgot, setShowForgot] = useState(false);
  const [forgotForm, setForgotForm] = useState({
    id: "",
    username: "",
    otp: "",
    password: ""
  });
  const [otpSent, setOtpSent] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const passwordRegex =
    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

  const isActionLoading = (actionName) => Boolean(loading[actionName]);

  const runWithLoader = async (actionName, actionFn) => {
    if (isActionLoading(actionName)) return;
    setLoading((prev) => ({ ...prev, [actionName]: true }));
    try {
      await actionFn();
    } finally {
      setLoading((prev) => ({ ...prev, [actionName]: false }));
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleForgotChange = (e) => {
    setForgotForm({ ...forgotForm, [e.target.name]: e.target.value });
  };

  const closeForgot = () => {
    setShowForgot(false);
    setOtpSent(false);
    setForgotError("");
    setForgotSuccess("");
    setForgotForm({ id: "", username: "", otp: "", password: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    await runWithLoader(ACTIONS.LOGIN, async () => {
      try {
        const res = await authApi.login(form);

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("adminUser", JSON.stringify(res.data.user));
        navigate("/admindashboard/manage_editorial", { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || "Login failed");
      }
    });
  };

  const handleSendOtp = async () => {
    setForgotError("");
    setForgotSuccess("");
    if (!forgotForm.username.trim()) {
      setForgotError("Username is required.");
      return;
    }

    await runWithLoader(ACTIONS.SEND_OTP, async () => {
      try {
        const res = await authApi.sendOtp({ username: forgotForm.username.trim() });
        if (!res.data.status) {
          setForgotError(res.data.message || "Unable to send OTP.");
          return;
        }
        setForgotForm((prev) => ({ ...prev, id: res.data.id }));
        setOtpSent(true);
        setForgotSuccess(res.data.message);
      } catch (err) {
        setForgotError(err.response?.data?.message || "Unable to send OTP.");
      }
    });
  };

  const handleUpdatePassword = async () => {
    setForgotError("");
    setForgotSuccess("");
    if (!forgotForm.otp || !forgotForm.password) {
      setForgotError("OTP and password are required.");
      return;
    }
    if (!passwordRegex.test(forgotForm.password)) {
      setForgotError(
        "Password must be 8-15 characters and include uppercase, lowercase, number and special character."
      );
      return;
    }

    await runWithLoader(ACTIONS.UPDATE_PASSWORD, async () => {
      try {
        const res = await authApi.updatePassword({
          id: forgotForm.id,
          otp: forgotForm.otp,
          password: forgotForm.password
        });

        if (!res.data.status) {
          setForgotError(res.data.message || "Password update failed.");
          return;
        }
        setForgotSuccess(res.data.message || "Password updated successfully.");
        setTimeout(() => {
          closeForgot();
        }, 800);
      } catch (err) {
        setForgotError(err.response?.data?.message || "Password update failed.");
      }
    });
  };

  return (
    <section className="bg-login">
      <div className="container">
        <div className="row">
          <div className="col-lg-12 col-sm-12">
            <div className="wrapper-page">
              <div className="account-pages">
                <div className="account-box">
                  <div className="card m-b-30">
                    <div className="card-body">
                      <h4 className="text-center mb-4"><b>Welcome to Zexprwire</b></h4>

                      {error && <div className="alert alert-danger">{error}</div>}
                      {success && <div className="alert alert-success">{success}</div>}

                      <form onSubmit={handleSubmit} className="form mt-4 contact-form">
                        <div className="form-group mb-3">
                          <input
                            type="text"
                            name="username"
                            className="form-control form-control-line"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                          />
                        </div>

                        <div className="form-group mb-3">
                          <div className="position-relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              name="password"
                              className="form-control form-control-line pe-5"
                              placeholder="Password"
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
                        </div>

                        <button
                          className="btn btn-primary w-100"
                          type="submit"
                          disabled={isActionLoading(ACTIONS.LOGIN)}
                        >
                          {isActionLoading(ACTIONS.LOGIN) ? (
                            <span className="d-inline-flex align-items-center justify-content-center gap-2">
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                              Logging in...
                            </span>
                          ) : (
                            "Log In"
                          )}
                        </button>
                      </form>

                      <div className="text-center mt-4">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none"
                          onClick={() => setShowForgot(true)}
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForgot && (
        <div className="forgot-modal-backdrop">
          <div className="forgot-modal card shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Change Password</h5>
                <button type="button" className="btn-close" onClick={closeForgot}></button>
              </div>

              {forgotError && <div className="alert alert-danger py-2">{forgotError}</div>}
              {forgotSuccess && <div className="alert alert-success py-2">{forgotSuccess}</div>}

              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  name="username"
                  className="form-control"
                  value={forgotForm.username}
                  onChange={handleForgotChange}
                  disabled={otpSent}
                />
              </div>

              {otpSent && (
                <>
                  <div className="mb-3">
                    <label className="form-label">OTP</label>
                    <input
                      type="number"
                      name="otp"
                      className="form-control"
                      value={forgotForm.otp}
                      onChange={handleForgotChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <div className="position-relative">
                      <input
                        type={showForgotPassword ? "text" : "password"}
                        name="password"
                        className="form-control pe-5"
                        value={forgotForm.password}
                        onChange={handleForgotChange}
                      />
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none password-toggle-btn"
                        onClick={() => setShowForgotPassword((prev) => !prev)}
                        aria-label={showForgotPassword ? "Hide password" : "Show password"}
                      >
                        {!showForgotPassword ? (
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
                  </div>
                </>
              )}

              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-secondary" onClick={closeForgot}>
                  Close
                </button>
                {!otpSent ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSendOtp}
                    disabled={isActionLoading(ACTIONS.SEND_OTP)}
                  >
                    {isActionLoading(ACTIONS.SEND_OTP) ? (
                      <span className="d-inline-flex align-items-center justify-content-center gap-2">
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Sending...
                      </span>
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleUpdatePassword}
                    disabled={isActionLoading(ACTIONS.UPDATE_PASSWORD)}
                  >
                    {isActionLoading(ACTIONS.UPDATE_PASSWORD) ? (
                      <span className="d-inline-flex align-items-center justify-content-center gap-2">
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Updating...
                      </span>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default LoginPage;
