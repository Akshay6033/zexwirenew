import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./admin/pages/auth/LoginPage";
import AdminLayout from "./admin/layout/AdminLayout";
import PublicLayout from "./public/layout/PublicLayout";
import HomePage from "./public/pages/HomePage";
import NewsroomArticlePage from "./public/pages/NewsroomArticlePage";
import PricingPage from "./public/pages/PricingPage";
import CheckoutBillingPage from "./public/pages/checkout/CheckoutBillingPage";
import CheckoutPaymentPage from "./public/pages/checkout/CheckoutPaymentPage";
import CheckoutPaypalReturnPage from "./public/pages/checkout/CheckoutPaypalReturnPage";
import CheckoutCoinbaseReturnPage from "./public/pages/checkout/CheckoutCoinbaseReturnPage";
import CheckoutSuccessPage from "./public/pages/checkout/CheckoutSuccessPage";
import CheckoutFailedPage from "./public/pages/checkout/CheckoutFailedPage";
import AuthLayout from "./public/layout/AuthLayout";
import SignInPage from "./public/pages/SignInPage";
import SignUpPage from "./public/pages/SignUpPage";
import ForgotPasswordPage from "./public/pages/ForgotPasswordPage";
import ResetPasswordPage from "./public/pages/ResetPasswordPage";
import ManageEditorialPage from "./admin/pages/admindashboard/ManageEditorialPage";
import ManageGalleryPage from "./admin/pages/admindashboard/ManageGalleryPage";
import CreatePressReleasePage from "./admin/pages/admindashboard/CreatePressReleasePage";
import EditPressReleasePage from "./admin/pages/admindashboard/EditPressReleasePage";
import ViewPressReleasePage from "./admin/pages/admindashboard/ViewPressReleasePage";
import PressReleaseStatusHistoryPage from "./admin/pages/admindashboard/PressReleaseStatusHistoryPage";
import PressReleasePreviewPage from "./admin/pages/admindashboard/PressReleasePreviewPage";
import ProfilePage from "./admin/pages/admindashboard/ProfilePage";
import ManageLoginLogPage from "./admin/pages/admindashboard/ManageLoginLogPage";
import ManageDistributionPage from "./admin/pages/admindashboard/ManageDistributionPage";
import ManagePackagePage from "./admin/pages/admindashboard/ManagePackagePage";
import PricingSequencerPage from "./admin/pages/admindashboard/PricingSequencerPage";
import ManageCountryPage from "./admin/pages/admindashboard/ManageCountryPage";
import ManageCouponsPage from "./admin/pages/admindashboard/ManageCouponsPage";
import AddCouponPage from "./admin/pages/admindashboard/AddCouponPage";
import EditCouponPage from "./admin/pages/admindashboard/EditCouponPage";
import CouponHistoryPage from "./admin/pages/admindashboard/CouponHistoryPage";
import ManageRedemptionCodesPage from "./admin/pages/admindashboard/ManageRedemptionCodesPage";
import AddRedemptionCodePage from "./admin/pages/admindashboard/AddRedemptionCodePage";
import EditRedemptionCodePage from "./admin/pages/admindashboard/EditRedemptionCodePage";
import RedemptionCodeLogsPage from "./admin/pages/admindashboard/RedemptionCodeLogsPage";
import ManageCategoryPage from "./admin/pages/admindashboard/ManageCategoryPage";
import ManageNewsletterPage from "./admin/pages/admindashboard/ManageNewsletterPage";
import ManagePaymentMethodPage from "./admin/pages/admindashboard/ManagePaymentMethodPage";
import ManagePaymentHistoryPage from "./admin/pages/admindashboard/ManagePaymentHistoryPage";
import ViewPaymentHistoryPage from "./admin/pages/admindashboard/ViewPaymentHistoryPage";
import ManageInvoiceCompanyPage from "./admin/pages/admindashboard/ManageInvoiceCompanyPage";
import EditInvoiceCompanyPage from "./admin/pages/admindashboard/EditInvoiceCompanyPage";
import ManageInvoicePage from "./admin/pages/admindashboard/ManageInvoicePage";
import AnalyticsOverviewPage from "./admin/pages/admindashboard/AnalyticsOverviewPage";
import AnalyticsPrPage from "./admin/pages/admindashboard/AnalyticsPrPage";
import AnalyticsSalesPage from "./admin/pages/admindashboard/AnalyticsSalesPage";
import AnalyticsUsersPage from "./admin/pages/admindashboard/AnalyticsUsersPage";
import AnalyticsPackageBuyersPage from "./admin/pages/admindashboard/AnalyticsPackageBuyersPage";
import ManageUsersPage from "./admin/pages/admindashboard/ManageUsersPage";
import ManageSupportPage from "./admin/pages/admindashboard/ManageSupportPage";
import ManageDeletedUsersPage from "./admin/pages/admindashboard/ManageDeletedUsersPage";
import ManageStaffPage from "./admin/pages/admindashboard/ManageStaffPage";
import ManageCompanyPage from "./admin/pages/admindashboard/ManageCompanyPage";
import ManageUserHistoryPage from "./admin/pages/admindashboard/ManageUserHistoryPage";
import UserIncreasePrPage from "./admin/pages/admindashboard/UserIncreasePrPage";
import UserPrHistoryPage from "./admin/pages/admindashboard/UserPrHistoryPage";
import UserDecreasePrPage from "./admin/pages/admindashboard/UserDecreasePrPage";
import UserIncreaseLineHistoryPage from "./admin/pages/admindashboard/UserIncreaseLineHistoryPage";
import UserDecreaseHistoryPage from "./admin/pages/admindashboard/UserDecreaseHistoryPage";
import { ToastContainer } from "react-toastify";
import UserDashboardLayout from "./user/layout/UserDashboardLayout";
import UserDashboardHomePage from "./user/pages/UserDashboardHomePage";
import UserDashboardPlaceholderPage from "./user/pages/UserDashboardPlaceholderPage";
import UserProfilePage from "./user/pages/UserProfilePage";
import { isUserLoggedIn } from "./public/services/publicAuthApi";
import {
  AnalyticsOverviewRedirect,
  AnalyticsPrRedirect,
  AnalyticsSalesRedirect,
  AnalyticsUsersRedirect,
  OverviewDashboardRedirect,
  PrDashboardRedirect,
  SaleDashboardRedirect,
  UserDashboardRedirect
} from "./admin/components/AnalyticsRouteRedirects";

function ExternalRedirect({ url }) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);
  return null;
}

function AdminLoginRoute() {
  if (localStorage.getItem("token")) {
    return <Navigate to="/admindashboard/manage_editorial" replace />;
  }
  return <LoginPage />;
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/core" replace />;
}

function UserPrivateRoute({ children }) {
  return isUserLoggedIn() ? children : <Navigate to="/sign_in" replace />;
}

function UserGuestRoute({ children }) {
  return isUserLoggedIn() ? <Navigate to="/Userdashboard" replace /> : children;
}

function AppCatchAll() {
  const token = localStorage.getItem("token");
  if (token) {
    return <Navigate to="/admindashboard/manage_editorial" replace />;
  }
  return <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/newsroom/:slug" element={<NewsroomArticlePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/pricing/:section" element={<PricingPage />} />
          <Route path="/reseller_pricing" element={<Navigate to="/pricing/reseller" replace />} />
          <Route path="/crypto_pricing" element={<Navigate to="/pricing/crypto" replace />} />
          <Route path="/indian_pricing" element={<Navigate to="/pricing/indian" replace />} />
          <Route path="/whitelable_pr_pricing" element={<Navigate to="/pricing/whitelabel" replace />} />
          <Route
            path="/checkout/:token"
            element={
              <UserPrivateRoute>
                <CheckoutBillingPage />
              </UserPrivateRoute>
            }
          />
          <Route
            path="/checkout/:token/pay"
            element={
              <UserPrivateRoute>
                <CheckoutPaymentPage />
              </UserPrivateRoute>
            }
          />
          <Route
            path="/checkout/:token/paypal/return"
            element={
              <UserPrivateRoute>
                <CheckoutPaypalReturnPage />
              </UserPrivateRoute>
            }
          />
          <Route
            path="/checkout/:token/coinbase/return"
            element={
              <UserPrivateRoute>
                <CheckoutCoinbaseReturnPage />
              </UserPrivateRoute>
            }
          />
          <Route path="/checkout/success/:paymentId" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/failed" element={<CheckoutFailedPage />} />
        </Route>

        <Route path="/core" element={<AdminLoginRoute />} />
        <Route path="/coreadmin" element={<Navigate to="/core" replace />} />
        <Route path="/core-admin" element={<Navigate to="/core" replace />} />
        <Route path="/login" element={<Navigate to="/core" replace />} />
        <Route element={<AuthLayout />}>
          <Route
            path="/sign_up"
            element={
              <UserGuestRoute>
                <SignUpPage />
              </UserGuestRoute>
            }
          />
          <Route
            path="/sign_in"
            element={
              <UserGuestRoute>
                <SignInPage />
              </UserGuestRoute>
            }
          />
          <Route path="/forgot_password" element={<ForgotPasswordPage />} />
          <Route path="/forg_password/:id" element={<ResetPasswordPage />} />
        </Route>

        <Route
          path="/Userdashboard"
          element={
            <UserPrivateRoute>
              <UserDashboardLayout />
            </UserPrivateRoute>
          }
        >
          <Route index element={<UserDashboardHomePage />} />
          <Route path="pr" element={<UserDashboardPlaceholderPage name="PR Manager" />} />
          <Route path="submit_pr" element={<UserDashboardPlaceholderPage name="Submit PR" />} />
          <Route path="sub_accounts" element={<UserDashboardPlaceholderPage name="Sub-Accounts" />} />
          <Route path="gallery" element={<UserDashboardPlaceholderPage name="Gallery" />} />
          <Route path="payment_history" element={<UserDashboardPlaceholderPage name="Payment History" />} />
          <Route path="support" element={<UserDashboardPlaceholderPage name="Support" />} />
          <Route path="contact_us" element={<UserDashboardPlaceholderPage name="Contact Us" />} />
          <Route path="profile" element={<UserProfilePage />} />
        </Route>

        <Route
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route path="/admindashboard/manage_editorial" element={<ManageEditorialPage />} />
          <Route path="/admindashboard/manage_gallery" element={<ManageGalleryPage />} />
          <Route path="/admindashboard/press-release/create" element={<CreatePressReleasePage />} />
          <Route path="/admindashboard/press-release/preview" element={<PressReleasePreviewPage />} />
          <Route path="/admindashboard/press-release/:id/edit" element={<EditPressReleasePage />} />
          <Route path="/admindashboard/press-release/:id/view" element={<ViewPressReleasePage />} />
          <Route path="/admindashboard/press-release/:id/history" element={<PressReleaseStatusHistoryPage />} />
          <Route path="/admindashboard/manage_login_log" element={<ManageLoginLogPage />} />
          <Route path="/admindashboard/manage_distribution" element={<ManageDistributionPage />} />
          <Route path="/admindashboard/manage_category" element={<ManageCategoryPage />} />
          <Route path="/admindashboard/manage_country" element={<ManageCountryPage />} />
          <Route path="/admindashboard/manage_coupon" element={<ManageCouponsPage />} />
          <Route path="/admindashboard/add_coupon" element={<AddCouponPage />} />
          <Route path="/admindashboard/edit_coupon/:id" element={<EditCouponPage />} />
          <Route path="/admindashboard/coupon_history/:id" element={<CouponHistoryPage />} />
          <Route path="/admindashboard/redemption_codes" element={<ManageRedemptionCodesPage />} />
          <Route path="/admindashboard/add_redemption_code" element={<AddRedemptionCodePage />} />
          <Route path="/admindashboard/edit_redemption_code/:id" element={<EditRedemptionCodePage />} />
          <Route path="/admindashboard/redemption_code_logs/:id" element={<RedemptionCodeLogsPage />} />
          <Route path="/admindashboard/manage_newsletter" element={<ManageNewsletterPage />} />
          <Route path="/admindashboard/manage_payment_method" element={<ManagePaymentMethodPage />} />
          <Route path="/admindashboard/manage_payment_history" element={<ManagePaymentHistoryPage />} />
          <Route path="/admindashboard/view_payment_history/:id" element={<ViewPaymentHistoryPage />} />
          <Route path="/admindashboard/manage_invoice_company" element={<ManageInvoiceCompanyPage />} />
          <Route path="/admindashboard/edit_invoice_details/:id" element={<EditInvoiceCompanyPage />} />
          <Route path="/admindashboard/manage_invoice" element={<ManageInvoicePage />} />
          <Route path="/admindashboard/overviewdashboard/:startDate/:endDate/:mode" element={<AnalyticsOverviewPage />} />
          <Route path="/admindashboard/overviewdashboard/:startDate/:endDate" element={<OverviewDashboardRedirect />} />
          <Route path="/admindashboard/overviewdashboard/:startDate" element={<OverviewDashboardRedirect />} />
          <Route path="/admindashboard/overviewdashboard" element={<OverviewDashboardRedirect />} />
          <Route path="/admindashboard/analytics/overview/:startDate/:endDate/:mode" element={<AnalyticsOverviewPage />} />
          <Route path="/admindashboard/analytics/overview/:startDate/:endDate" element={<AnalyticsOverviewRedirect />} />
          <Route path="/admindashboard/analytics/overview/:startDate" element={<AnalyticsOverviewRedirect />} />
          <Route path="/admindashboard/analytics/overview" element={<AnalyticsOverviewPage />} />
          <Route path="/admindashboard/prdashboard/:startDate/:endDate/:mode" element={<AnalyticsPrPage />} />
          <Route path="/admindashboard/prdashboard/:startDate/:endDate" element={<PrDashboardRedirect />} />
          <Route path="/admindashboard/prdashboard/:startDate" element={<PrDashboardRedirect />} />
          <Route path="/admindashboard/prdashboard" element={<PrDashboardRedirect />} />
          <Route path="/admindashboard/analytics/pr/:startDate/:endDate/:mode" element={<AnalyticsPrPage />} />
          <Route path="/admindashboard/analytics/pr/:startDate/:endDate" element={<AnalyticsPrRedirect />} />
          <Route path="/admindashboard/analytics/pr/:startDate" element={<AnalyticsPrRedirect />} />
          <Route path="/admindashboard/analytics/pr" element={<AnalyticsPrPage />} />
          <Route path="/admindashboard/PR" element={<AnalyticsPrPage />} />
          <Route
            path="/admindashboard/sale_dashboard/:startDate/:endDate/:filter/:tab"
            element={<AnalyticsSalesPage />}
          />
          <Route path="/admindashboard/sale_dashboard/:startDate/:endDate/:filter" element={<SaleDashboardRedirect />} />
          <Route path="/admindashboard/sale_dashboard/:startDate/:endDate" element={<SaleDashboardRedirect />} />
          <Route path="/admindashboard/sale_dashboard/:startDate" element={<SaleDashboardRedirect />} />
          <Route path="/admindashboard/sale_dashboard" element={<SaleDashboardRedirect />} />
          <Route
            path="/admindashboard/analytics/sales/:startDate/:endDate/:filter/:tab"
            element={<AnalyticsSalesPage />}
          />
          <Route path="/admindashboard/analytics/sales/:startDate/:endDate/:filter" element={<AnalyticsSalesRedirect />} />
          <Route path="/admindashboard/analytics/sales/:startDate/:endDate" element={<AnalyticsSalesRedirect />} />
          <Route path="/admindashboard/analytics/sales/:startDate" element={<AnalyticsSalesRedirect />} />
          <Route path="/admindashboard/analytics/sales" element={<AnalyticsSalesPage />} />
          <Route path="/admindashboard/sales" element={<AnalyticsSalesPage />} />
          <Route path="/admindashboard/userdashboard/:startDate/:endDate/:mode" element={<AnalyticsUsersPage />} />
          <Route path="/admindashboard/userdashboard/:startDate/:endDate" element={<UserDashboardRedirect />} />
          <Route path="/admindashboard/userdashboard/:startDate" element={<UserDashboardRedirect />} />
          <Route path="/admindashboard/userdashboard" element={<UserDashboardRedirect />} />
          <Route
            path="/admindashboard/analytics/users/:startDate/:endDate/:mode"
            element={<AnalyticsUsersPage />}
          />
          <Route path="/admindashboard/analytics/users/:startDate/:endDate" element={<AnalyticsUsersRedirect />} />
          <Route path="/admindashboard/analytics/users/:startDate" element={<AnalyticsUsersRedirect />} />
          <Route path="/admindashboard/analytics/users" element={<AnalyticsUsersPage />} />
          <Route path="/admindashboard/users" element={<AnalyticsUsersPage />} />
          <Route
            path="/admindashboard/view_total_package_details/:packageId/:startDate/:endDate"
            element={<AnalyticsPackageBuyersPage />}
          />
          <Route path="/admindashboard/manage_support" element={<ManageSupportPage />} />
          <Route path="/admindashboard/manage_package" element={<ManagePackagePage />} />
          <Route path="/admindashboard/pricing-page-sequencer" element={<PricingSequencerPage />} />
          <Route path="/admindashboard/profile" element={<ProfilePage />} />
          <Route path="/users/pr-increase-history/:userPrStatusId" element={<UserIncreaseLineHistoryPage />} />
          <Route path="/users/pr-decrease-history/:prRecordId" element={<UserDecreaseHistoryPage />} />
          <Route path="/users/deleted" element={<ManageDeletedUsersPage />} />
          <Route path="/users/staff" element={<ManageStaffPage />} />
          <Route path="/users/company" element={<ManageCompanyPage />} />
          <Route path="/users/:userId/decrease-pr/:prRecordId" element={<UserDecreasePrPage />} />
          <Route path="/users/:userId/increase-pr" element={<UserIncreasePrPage />} />
          <Route path="/users/:userId/pr-history" element={<UserPrHistoryPage />} />
          <Route path="/users/:userId/history" element={<ManageUserHistoryPage />} />
          <Route path="/users" element={<ManageUsersPage />} />
        </Route>
        <Route path="*" element={<AppCatchAll />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
