import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearUserSession, isUserLoggedIn } from "../../public/services/publicAuthApi";
import UserDashboardHeader from "./components/UserDashboardHeader";
import UserDashboardSidebar from "./components/UserDashboardSidebar";
import { UserDashboardProvider } from "../context/UserDashboardContext";
import "../styles/user-dashboard.css";

const PAGE_TITLES = {
  "/Userdashboard": "Dashboard",
  "/Userdashboard/pr": "MY PRESS RELEASES",
  "/Userdashboard/sub_accounts": "Sub-Accounts",
  "/Userdashboard/gallery": "Gallery",
  "/Userdashboard/payment_history": "Payment History",
  "/Userdashboard/support": "Support",
  "/Userdashboard/contact_us": "Contact-us",
  "/Userdashboard/profile": "Profile"
};

function UserDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || "Dashboard";
  const isProfilePage = location.pathname === "/Userdashboard/profile";

  useEffect(() => {
    if (!isUserLoggedIn()) {
      navigate("/sign_in", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    clearUserSession();
    navigate("/sign_in", { replace: true });
  };

  return (
    <UserDashboardProvider>
      <section className="user-dash-shell">
        <UserDashboardSidebar />
        <div id="main-content">
          <UserDashboardHeader title={title} onLogout={handleLogout} />
          <div id="page-container" className={isProfilePage ? "profile" : ""}>
            <Outlet />
          </div>
        </div>
      </section>
    </UserDashboardProvider>
  );
}

export default UserDashboardLayout;
