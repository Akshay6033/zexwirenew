import { Link } from "react-router-dom";
import { userCanSubmitPr } from "../../../public/services/publicAuthApi";
import { useUserDashboard } from "../../context/UserDashboardContext";
import iconNotifications from "../../assets/icons/Notifications.svg";
import iconProfile from "../../assets/icons/profile.svg";
import iconSettings from "../../assets/icons/Settings.svg";
import iconLogout from "../../assets/icons/Log-Out.svg";

const uploadsBase = import.meta.env.VITE_UPLOADS_URL || "/uploads";

export default function UserDashboardHeader({ title, onLogout }) {
  const { headerUser } = useUserDashboard();
  const canSubmit = userCanSubmitPr();

  const profileSrc = headerUser.avatarPreview
    ? headerUser.avatarPreview
    : headerUser.profileImage
      ? `${uploadsBase}/profile_image/${headerUser.profileImage}`
      : iconProfile;

  return (
    <header id="header">
      <nav className="navbar navbar-expand-lg fixed-top" id="mainNav">
        <ul className="navbar-nav float-left">
          <li className="nav-item">
            <h2>{title}</h2>
          </li>
        </ul>
        <ul className="navbar-nav float-right">
          <li className="nav-item">
            <Link to="/pricing">
              <button type="button" className="credit">
                Buy Credits
              </button>
            </Link>
          </li>
          <li className="nav-item">
            {canSubmit ? (
              <Link to="/Userdashboard/submit_pr">
                <button type="button" className="pr">
                  Submit PR
                </button>
              </Link>
            ) : (
              <Link to="/pricing">
                <button type="button" className="pr">
                  Submit PR
                </button>
              </Link>
            )}
          </li>
          <li className="nav-item">
            <div className="dropdown">
              <button type="button" className="dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                <img src={iconNotifications} alt="Notifications" />
                <span className="ShowCountSupport">0</span>
              </button>
              <ul className="dropdown-menu AppendSupportNotification" />
            </div>
          </li>
          <li className="nav-item user-header-profile">
            <div className="dropdown user-header-profile__menu">
              <button type="button" className="dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                <img
                  className="profile-img"
                  src={profileSrc}
                  alt="Profile"
                  key={profileSrc}
                  onError={(e) => {
                    e.currentTarget.src = iconProfile;
                  }}
                />
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li className="item1">
                  <Link className="dropdown-item" to="/Userdashboard/profile">
                    <img src={iconSettings} alt="" />
                    Settings
                  </Link>
                </li>
                <li className="item2">
                  <button type="button" className="dropdown-item border-0 bg-transparent w-100 text-start" onClick={onLogout}>
                    <img src={iconLogout} alt="" />
                    Log Out
                  </button>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </nav>
    </header>
  );
}
