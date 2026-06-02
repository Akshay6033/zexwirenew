import { useLayoutEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AdminFooter from "./components/AdminFooter";
import AdminHeader from "./components/AdminHeader";
import AdminSidebar from "./components/AdminSidebar";
import RightSlidebar from "./components/RightSlidebar";
import { ConfirmProvider } from "../context/ConfirmContext";
import { EditorialCountsProvider } from "../context/EditorialCountsContext";
import { SupportCountsProvider } from "../context/SupportCountsContext";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rightBarOpen, setRightBarOpen] = useState(false);
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminUser");
    navigate("/core", { replace: true });
  };

  return (
    <ConfirmProvider>
      <EditorialCountsProvider>
      <SupportCountsProvider>
      <section className="admin-shell">
        <AdminSidebar />
        <div className="body-content">
          <AdminHeader
            username={adminUser.username}
            onLogout={handleLogout}
            onProfile={() => navigate("/admindashboard/profile")}
            onToggleRightBar={() => setRightBarOpen((p) => !p)}
          />
          <main className="admin-content">
            <Outlet key={location.pathname} />
          </main>
          <AdminFooter />
        </div>

        <RightSlidebar open={rightBarOpen} onClose={() => setRightBarOpen(false)} />
      </section>
      </SupportCountsProvider>
      </EditorialCountsProvider>
    </ConfirmProvider>
  );
}

export default AdminLayout;
