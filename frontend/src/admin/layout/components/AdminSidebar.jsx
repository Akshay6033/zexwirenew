import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import logo from "../../assets/images/logo.svg";
import { useEditorialCounts } from "../../context/EditorialCountsContext";
import { useSupportCounts } from "../../context/SupportCountsContext";
import { defaultSalesRange, defaultUsersRange, saleDashboardPath, userDashboardPath } from "../../utils/analyticsDateRoute";

function editorialTabActive(location, expectedTab) {
  if (expectedTab === "gallery") {
    return location.pathname === "/admindashboard/manage_gallery";
  }
  if (location.pathname !== "/admindashboard/manage_editorial") return false;
  const cur = (new URLSearchParams(location.search).get("tab") || "room").toLowerCase();
  return cur === expectedTab;
}

function AdminSidebar() {
  const location = useLocation();
  const salesNavTo = useMemo(() => {
    const { start, end } = defaultSalesRange();
    return saleDashboardPath(start, end, "All", 0);
  }, []);
  const usersNavTo = useMemo(() => {
    const { start, end } = defaultUsersRange();
    return userDashboardPath(start, end, "month");
  }, []);
  const { badges: ec, summary: editorialSummary, clearTabBadge } = useEditorialCounts();
  const { totalUnread: supportUnread } = useSupportCounts();

  const onEditorialStatusClick = (tab) => () => {
    clearTabBadge(tab);
  };
  const [openMenus, setOpenMenus] = useState({
    manageUsers: false,
    editorialRoom: false,
    managePackages: true,
    managePaymentHistory: true,
    invoiceManagement: false,
    analytics: false
  });

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (
      location.pathname.startsWith("/admindashboard/manage_editorial") ||
      location.pathname.startsWith("/admindashboard/manage_gallery") ||
      location.pathname.startsWith("/admindashboard/press-release")
    ) {
      setOpenMenus((prev) => ({ ...prev, editorialRoom: true }));
    }
    if (
      location.pathname.startsWith("/admindashboard/manage_invoice_company") ||
      location.pathname.startsWith("/admindashboard/edit_invoice_details") ||
      location.pathname.startsWith("/admindashboard/manage_invoice")
    ) {
      setOpenMenus((prev) => ({ ...prev, invoiceManagement: true }));
    }
    if (
      location.pathname.startsWith("/admindashboard/analytics") ||
      location.pathname.startsWith("/admindashboard/overviewdashboard") ||
      location.pathname.startsWith("/admindashboard/prdashboard") ||
      location.pathname === "/admindashboard/PR" ||
      location.pathname.startsWith("/admindashboard/sale_dashboard") ||
      location.pathname.startsWith("/admindashboard/userdashboard") ||
      location.pathname.startsWith("/admindashboard/view_total_package_details") ||
      location.pathname === "/admindashboard/sales" ||
      location.pathname === "/admindashboard/users"
    ) {
      setOpenMenus((prev) => ({ ...prev, analytics: true }));
    }
  }, [location.pathname]);

  const packageScope = new URLSearchParams(location.search).get("scope") || "all";
  const packageLinkClass = (expectedScope) => {
    const isPackagesPath = location.pathname === "/admindashboard/manage_package";
    const isActive = isPackagesPath && packageScope === expectedScope;
    return isActive ? "active" : "";
  };

  return (
    <div className="sidebar-left">
      <div className="sidebar-left-info">
        <div className="sidebar-logo-wrap">
          <Link to="/admindashboard/manage_editorial">
            <img src={logo} alt="Zexprwire" className="sidebar-logo-img" />
          </Link>
        </div>
        <ul className="side-navigation">
          <li className={`menu-list has-children ${openMenus.manageUsers ? "expanded" : ""}`}>
            <button type="button" className="menu-parent menu-parent-btn" onClick={() => toggleMenu("manageUsers")}>
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
                </svg>
              </span>
              <span>Manage Users</span>
              <span className="menu-arrow">{openMenus.manageUsers ? "⌄" : "›"}</span>
            </button>
            {openMenus.manageUsers && (
              <ul className="child-list">
                 <li><NavLink to="/users" end>Manage User</NavLink></li>
                <li><NavLink to="/users/deleted" end>Deleted User</NavLink></li>
              </ul>
            )}
          </li>
          <li className="menu-list">
            <NavLink to="/users/staff" className="menu-parent">
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M16 11a4 4 0 1 0-3.46-2H8a3 3 0 1 0 0 2h4.54A4 4 0 0 0 16 11Zm-8 1a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm8-2a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm-8 8h11a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2Zm0-4h11a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2Z" />
                </svg>
              </span>
              <span>Manage Staff</span>
              <span className="menu-arrow menu-arrow-empty">›</span>
            </NavLink>
          </li>
           <li className="menu-list">
            <NavLink to="/users/company" className="menu-parent">
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm6.5 3.5h5a.5.5 0 0 0 0-1h-5a.5.5 0 0 0 0 1Zm0 3h5a.5.5 0 0 0 0-1h-5a.5.5 0 0 0 0 1Z" />
                </svg>
              </span>
              <span>Manage Company</span>
              <span className="menu-arrow menu-arrow-empty">›</span>
            </NavLink>
          </li> 
          <li className="menu-list">
            <NavLink to="/admindashboard/manage_login_log" className="menu-parent">
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="currentColor"
                    d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2 .25v.22L12 11.8l7-4.58V7a.75.75 0 0 0-.75-.75H5.75A.75.75 0 0 0 5 7Zm14 2.6-6.45 4.22a1 1 0 0 1-1.1 0L5 9.6v7.65c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75V9.6Z"
                  />
                </svg>
              </span>
              <span>Login Log</span>
              <span className="menu-arrow menu-arrow-empty">›</span>
            </NavLink>
          </li>
           <li className={`menu-list has-children ${openMenus.editorialRoom ? "expanded" : ""}`}>
            <button
              type="button"
              className="menu-parent menu-parent-btn"
              onClick={() => toggleMenu("editorialRoom")}
            >
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M8.2 4C5.9 5.2 4 8 4 10.8 4 13 5.5 14.5 7.5 14.5c1.6 0 2.8-1.2 2.8-2.8S9.1 9 7.5 9c-.1 0-.2 0-.3 0 .3-1.3 1.2-2.8 2.5-3.8L8.2 4Zm8 0C13.9 5.2 12 8 12 10.8c0 2.2 1.5 3.7 3.5 3.7 1.6 0 2.8-1.2 2.8-2.8S17.1 9 15.5 9c-.1 0-.2 0-.3 0 .3-1.3 1.2-2.8 2.5-3.8L16.2 4Z" />
                </svg>
              </span>
              <span>Editorial Room</span>
              <span className="menu-arrow">{openMenus.editorialRoom ? "⌄" : "›"}</span>
            </button>
            {openMenus.editorialRoom && (
              <ul className="child-list">
                <li>
                  <Link to="/admindashboard/manage_editorial" className={editorialTabActive(location, "room") ? "active" : ""}>
                    Editorial Room
                  </Link>
                </li>
                <li>
                  <Link to="/admindashboard/manage_editorial?tab=all" className={editorialTabActive(location, "all") ? "active" : ""}>
                    All Release
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admindashboard/manage_editorial?tab=draft"
                    className={editorialTabActive(location, "draft") ? "active" : ""}
                    onClick={onEditorialStatusClick("draft")}
                  >
                    Draft <span className="dot-badge red">{ec.draft}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admindashboard/manage_editorial?tab=pending"
                    className={editorialTabActive(location, "pending") ? "active" : ""}
                    onClick={onEditorialStatusClick("pending")}
                  >
                    Pending <span className="dot-badge teal">{ec.pending}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admindashboard/manage_editorial?tab=action"
                    className={editorialTabActive(location, "action") ? "active" : ""}
                    onClick={onEditorialStatusClick("action")}
                  >
                    Action Required <span className="dot-badge red">{ec.actionRequired}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admindashboard/manage_editorial?tab=published"
                    className={editorialTabActive(location, "published") ? "active" : ""}
                    onClick={onEditorialStatusClick("published")}
                  >
                    Published <span className="dot-badge green">{ec.published}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admindashboard/manage_editorial?tab=rejected"
                    className={editorialTabActive(location, "rejected") ? "active" : ""}
                    onClick={onEditorialStatusClick("rejected")}
                  >
                    Rejected <span className="dot-badge magenta">{ec.rejected}</span>
                  </Link>
                </li>
                <li>
                  <Link to="/admindashboard/manage_editorial?tab=deleted" className={editorialTabActive(location, "deleted") ? "active" : ""}>
                    Deleted PR <span className="dot-badge muted">{editorialSummary.deleted}</span>
                  </Link>
                </li>
                <li><NavLink to="/admindashboard/manage_category">Manage Category</NavLink></li>
                <li>
                  <Link to="/admindashboard/manage_gallery" className={editorialTabActive(location, "gallery") ? "active" : ""}>
                    Manage Gallery
                  </Link>
                </li>
              </ul>
            )}
          </li> 
           {/* <li className="menu-list">
            <NavLink to="/admindashboard/manage_editorial" className="menu-parent">
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="m19.4 13-.2 1.1 1.5 1.2-1.5 2.6-1.9-.8a6.7 6.7 0 0 1-.9.5l-.3 2h-3l-.3-2a7 7 0 0 1-.9-.5l-1.9.8-1.5-2.6 1.5-1.2L4.6 13l-2-.3v-3l2-.3.2-1.1-1.5-1.2L4.8 4.5l1.9.8c.3-.2.6-.4.9-.5l.3-2h3l.3 2c.3.1.6.3.9.5l1.9-.8 1.5 2.6-1.5 1.2.2 1.1 2 .3v3l-2 .3ZM12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                </svg>
              </span>
              <span>Automatic Report System</span>
              <span className="menu-arrow">›</span>
            </NavLink>
          </li>  */}
          <li className={`menu-list has-children ${openMenus.managePackages ? "expanded" : ""}`}>
            <button type="button" className="menu-parent menu-parent-btn" onClick={() => toggleMenu("managePackages")}>
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Zm0 2.2 6.5 3.1L12 10.5 5.5 7.3 12 4.2Zm-7 5 6 3v7.4l-6-3V9.2Zm8 10.4v-7.4l6-3v7.4l-6 3Z" />
                </svg>
              </span>
              <span>Manage Packages</span>
              <span className="menu-arrow">{openMenus.managePackages ? "⌄" : "›"}</span>
            </button>
            {openMenus.managePackages && (
              <ul className="child-list">
                <li><NavLink to="/admindashboard/manage_package" className={() => packageLinkClass("all")}>Packages</NavLink></li>
                <li><NavLink to="/admindashboard/manage_package?scope=online" className={() => packageLinkClass("online")}>Online Package</NavLink></li>
                <li><NavLink to="/admindashboard/manage_package?scope=offline" className={() => packageLinkClass("offline")}>Offline Package</NavLink></li>
                <li><NavLink to="/admindashboard/manage_package?scope=reseller" className={() => packageLinkClass("reseller")}>Reseller Package</NavLink></li>
                <li><NavLink to="/admindashboard/manage_package?scope=crypto" className={() => packageLinkClass("crypto")}>Crypto Package</NavLink></li>
                <li><NavLink to="/admindashboard/manage_package?scope=indian" className={() => packageLinkClass("indian")}>Indian PR Package</NavLink></li>
                <li><NavLink to="/admindashboard/manage_package?scope=white_label" className={() => packageLinkClass("white_label")}>White Label PR Package</NavLink></li>
                <li><NavLink to="/admindashboard/pricing-page-sequencer">Pricing Page Sequencer</NavLink></li>
              </ul>
            )}
          </li>
           <li className="menu-list">
            <NavLink to="/admindashboard/manage_distribution" className="menu-parent">
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2 .25v.22L12 11.8l7-4.58V7a.75.75 0 0 0-.75-.75H5.75A.75.75 0 0 0 5 7Zm14 2.6-6.45 4.22a1 1 0 0 1-1.1 0L5 9.6v7.65c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75V9.6Z" />
                </svg>
              </span>
              <span>Vendor Management</span>
            </NavLink>
          </li>
          <li className="menu-list">
            <NavLink to="/admindashboard/manage_country" className="menu-parent">
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2c1.6 0 3 .45 4.2 1.22-.43.5-.98.9-1.64 1.18-1.38.58-3.74.58-5.12 0-.66-.28-1.21-.68-1.64-1.18A7.95 7.95 0 0 1 12 4Zm0 16a8 8 0 0 1-6.88-3.93c.64-.76 1.47-1.36 2.48-1.79 2.9-1.21 5.9-1.21 8.8 0 1.01.43 1.84 1.03 2.48 1.79A8 8 0 0 1 12 20Zm8-6.14c-.74-.67-1.62-1.22-2.63-1.64-3.4-1.43-6.94-1.43-10.34 0-1.01.42-1.89.97-2.63 1.64A8 8 0 0 1 4.02 12c0-1.57.45-3.03 1.22-4.27.67.82 1.56 1.48 2.67 1.95 1.87.78 4.31.78 6.18 0 1.11-.47 2-1.13 2.67-1.95A7.94 7.94 0 0 1 20 12c0 .65-.08 1.27-.24 1.86Z" />
                </svg>
              </span>
              <span>Manage Country</span>
            </NavLink>
          </li>
          <li className={`menu-list has-children ${openMenus.managePaymentHistory ? "expanded" : ""}`}>
            <button type="button" className="menu-parent menu-parent-btn" onClick={() => toggleMenu("managePaymentHistory")}>
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2 .25v.22L12 11.8l7-4.58V7a.75.75 0 0 0-.75-.75H5.75A.75.75 0 0 0 5 7Zm14 2.6-6.45 4.22a1 1 0 0 1-1.1 0L5 9.6v7.65c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75V9.6Z" />
                </svg>
              </span>
              <span>Manage Payment History</span>
              <span className="menu-arrow">{openMenus.managePaymentHistory ? "⌄" : "›"}</span>
            </button>
            {openMenus.managePaymentHistory && (
              <ul className="child-list">
                <li><NavLink to="/admindashboard/manage_payment_method">Manage Payment Method</NavLink></li>
                <li><NavLink to="/admindashboard/manage_payment_history">Manage Payment History</NavLink></li>
              </ul>
            )}
          </li>
          {/* <li className={`menu-list has-children ${openMenus.analytics ? "expanded" : ""}`}>
            <button type="button" className="menu-parent menu-parent-btn" onClick={() => toggleMenu("analytics")}>
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="currentColor"
                    d="M4 19h3v-7H4v7Zm5 0h3V5H9v14Zm5 0h3v-4h-3v4Zm5 0h3V9h-3v10Z"
                  />
                </svg>
              </span>
              <span>Analytics</span>
              <span className="menu-arrow">{openMenus.analytics ? "⌄" : "›"}</span>
            </button>
            {openMenus.analytics && (
              <ul className="child-list">
                <li>
                  <NavLink to="/admindashboard/analytics/overview">Overview</NavLink>
                </li>
                <li>
                  <NavLink to="/admindashboard/analytics/pr">PR</NavLink>
                </li>
                <li>
                  <NavLink to={salesNavTo}>Sales</NavLink>
                </li>
                <li>
                  <NavLink to={usersNavTo}>Users</NavLink>
                </li>
              </ul>
            )}
          </li> */}
          <li className={`menu-list has-children ${openMenus.invoiceManagement ? "expanded" : ""}`}>
            <button type="button" className="menu-parent menu-parent-btn" onClick={() => toggleMenu("invoiceManagement")}>
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="currentColor"
                    d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2 .25v.22L12 11.8l7-4.58V7a.75.75 0 0 0-.75-.75H5.75A.75.75 0 0 0 5 7Zm14 2.6-6.45 4.22a1 1 0 0 1-1.1 0L5 9.6v7.65c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75V9.6Z"
                  />
                </svg>
              </span>
              <span>Invoice Management</span>
              <span className="menu-arrow">{openMenus.invoiceManagement ? "⌄" : "›"}</span>
            </button>
            {openMenus.invoiceManagement && (
              <ul className="child-list">
                <li>
                  <NavLink to="/admindashboard/manage_invoice_company">Manage Invoice Address</NavLink>
                </li>
                <li>
                  <NavLink to="/admindashboard/manage_invoice">Manage Invoice</NavLink>
                </li>
              </ul>
            )}
          </li>
          <li className="menu-list">
            <NavLink to="/admindashboard/manage_newsletter" className="menu-parent">
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2 .25v.22L12 11.8l7-4.58V7a.75.75 0 0 0-.75-.75H5.75A.75.75 0 0 0 5 7Zm14 2.6-6.45 4.22a1 1 0 0 1-1.1 0L5 9.6v7.65c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75V9.6Z" />
                </svg>
              </span>
              <span>Manage Newsletter</span>
            </NavLink>
          </li> 
          <li className="menu-list">
            <NavLink to="/admindashboard/manage_support" className="menu-parent">
              <span className="menu-icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-5h-1V11a6 6 0 1 0-12 0v6H5v2h14v-2Z" />
                </svg>
              </span>
              <span>Support</span>
              {supportUnread > 0 ? (
                <span className="dot-badge green">{supportUnread > 99 ? "99+" : supportUnread}</span>
              ) : null}
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default AdminSidebar;
