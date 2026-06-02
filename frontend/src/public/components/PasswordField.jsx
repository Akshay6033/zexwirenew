import { useState } from "react";

function EyeOpenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.27 4.22 2 5.5l3.04 3.04C3.3 9.66 1.73 10.77 1 12c1.73 3.89 6 7 11 7 1.55 0 3.03-.3 4.38-.84l3.42 3.42 1.27-1.27L3.27 4.22ZM12 17a4.98 4.98 0 0 1-4.24-2.35l1.46-1.46a2 2 0 0 0 2.78 2.78l1.46-1.46A4.98 4.98 0 0 1 12 17Zm6.76-3.35-1.12-1.12a6.96 6.96 0 0 0 .59-1.53C17.27 8.11 14 5 12 5c-.74 0-1.47.1-2.17.3l-1.5-1.5A10.8 10.8 0 0 1 12 3c5 0 9.27 3.11 11 7-.55 1.24-1.38 2.36-2.41 3.25l-1.83-1.83Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function PasswordField({ id, name, placeholder, value, onChange, error }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-form-group">
      <div className={`auth-password-wrap ${error ? "has-error" : ""}`}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          name={name}
          className="form-control auth-password-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          aria-invalid={error ? "true" : "false"}
          autoComplete={name === "cpassword" ? "new-password" : name === "password" ? "current-password" : "off"}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeOpenIcon />}
        </button>
      </div>
      {error && <div className="auth-field-error">{error}</div>}
    </div>
  );
}
