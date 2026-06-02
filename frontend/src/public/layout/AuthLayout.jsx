import { Outlet, useLocation } from "react-router-dom";
import AuthHeader from "./AuthHeader";
import AuthAboutSection from "../components/AuthAboutSection";
import AuthSiteFooter from "./AuthSiteFooter";
import "../styles/auth-site.css";

export default function AuthLayout() {
  const { pathname } = useLocation();
  const showAboutSection = pathname === "/sign_in" || pathname === "/sign_up";

  return (
    <div className="auth-site">
      <AuthHeader />
      <Outlet />
      {showAboutSection && <AuthAboutSection />}
      <AuthSiteFooter />
    </div>
  );
}
