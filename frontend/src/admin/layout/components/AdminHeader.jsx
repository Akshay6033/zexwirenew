import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.svg";
import { useEditorialCounts } from "../../context/EditorialCountsContext";
import { useSupportCounts } from "../../context/SupportCountsContext";

function AdminHeader({ username, onLogout, onProfile, onToggleRightBar }) {
  const { badges } = useEditorialCounts();
  const { totalUnread: supportUnread } = useSupportCounts();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="header-section">
      <div className="logo">
        <Link to="/admindashboard/manage_editorial">
          <img src={logo} alt="Zexprwire" className="header-logo-img" />
        </Link>
      </div>

      <div className="right-notification">
        <ul className="notification-menu">
          <li className="notification2">
            <button
              type="button"
              className="link-btn"
              onClick={() => navigate("/admindashboard/manage_support")}
            >
              Support
            </button>
          </li>
          <li className="notification2">
            <button
              type="button"
              className="icon-circle-btn"
              onClick={() => navigate("/admindashboard/manage_support")}
              aria-label="Support notifications"
            >
              <span className="bell-icon">🔔</span>
              {supportUnread > 0 ? (
                <span className="bell-badge">{supportUnread > 99 ? "99+" : supportUnread}</span>
              ) : null}
            </button>
          </li>
          <li className="notification2">
            <button type="button" className="icon-circle-btn" onClick={onToggleRightBar} aria-label="Open notifications panel">
              <span className="bell-icon">📋</span>
              {badges.newTotal > 0 ? (
                <span className="bell-badge">{badges.newTotal > 99 ? "99+" : badges.newTotal}</span>
              ) : null}
            </button>
          </li>
          <li className="notification2">
            <button type="button" className="icon-circle-btn" onClick={onLogout} aria-label="Sign out">
              <svg className="logout-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M10 3h4a2 2 0 0 1 2 2v3h-2V5h-4v14h4v-3h2v3a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6.59 5.59L21 13l-4.41 4.41L15.17 16l2-2H12v-2h5.17l-2-2 1.42-1.41Z"
                />
              </svg>
            </button>
          </li>
          <li className="notification2 user-menu-wrap" ref={menuRef}>
            <button type="button" className="link-btn user-name-btn" onClick={() => setMenuOpen((p) => !p)}>
              {username || "admin"}
            </button>
            {menuOpen && (
              <div className="user-dropdown-menu">
                <button
                  type="button"
                  className="dropdown-row-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onProfile?.();
                  }}
                >
                  <span className="dropdown-icon">👤</span>
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  className="dropdown-row-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout?.();
                  }}
                >
                  <span className="dropdown-icon">↪</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </li>
          <li className="avtar-img">
            <p className="admin">admin</p>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default AdminHeader;
