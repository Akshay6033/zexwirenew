import api from "./authApi";

export const adminDashboardApi = {
  getEditorialSummary: () => api.get("/admindashboard/editorial-summary"),
  /** Legacy notification_pr_* polling (view_flag=1 counts). */
  getEditorialNotifications: () => api.get("/admindashboard/editorial-notifications"),
  getGalleryImages: (params, config) => api.get("/admindashboard/gallery-images", { params, ...(config || {}) }),
  deleteGalleryImage: (id) => api.delete(`/admindashboard/gallery-images/${id}`),
  /** Mark PRs in this tab as seen (legacy view_flag clear). */
  postEditorialMarkViewed: (tab) => api.post("/admindashboard/editorial-mark-viewed", { tab }),
  getEditorialPressReleases: (params) => api.get("/admindashboard/editorial-press-releases", { params }),
  getPressReleaseCreateData: (userId) =>
    api.get("/admindashboard/press-release/create-data", { params: userId ? { user_id: userId } : {} }),
  getPressReleaseGalleryDetail: (id) => api.get(`/admindashboard/press-release/gallery-detail/${id}`),
  postPressReleaseAutofillCompany: (companyId) =>
    api.post("/admindashboard/press-release/autofill-company", { company_id: companyId }),
  getPressReleaseCheckTitle: (title, excludeId) =>
    api.get("/admindashboard/press-release/check-title", {
      params: { title, ...(excludeId ? { exclude_id: excludeId } : {}) }
    }),
  getPressReleaseEditData: (id) => api.get(`/admindashboard/press-release/${id}/edit-data`),
  getPressReleaseViewData: (id) => api.get(`/admindashboard/press-release/${id}/view-data`),
  getPressReleaseStatusHistory: (id) => api.get(`/admindashboard/press-release/${id}/status-history`),
  updatePressRelease: (id, payload) => api.put(`/admindashboard/press-release/${id}`, payload),
  updatePressReleaseAfterPublished: (id, payload) =>
    api.put(`/admindashboard/press-release/${id}/after-published`, payload),
  createPressRelease: (payload) => api.post("/admindashboard/press-release", payload),
  deletePressRelease: (id) => api.delete(`/admindashboard/press-release/${id}`),
  deletePressReleasePublished: (id) => api.delete(`/admindashboard/press-release/${id}/published`),
  exportEditorialPressReleasesCsvUrl: (params) => {
    const q = new URLSearchParams(params).toString();
    return `http://localhost:5000/api/admindashboard/editorial-press-releases/export.csv?${q}`;
  },
  getLoginLogs: (params) => api.get("/admindashboard/login-logs", { params }),
  getDistributions: (params) => api.get("/admindashboard/distributions", { params }),
  createDistribution: (payload) => api.post("/admindashboard/distributions", payload),
  updateDistribution: (id, payload) => api.put(`/admindashboard/distributions/${id}`, payload),
  updateDistributionStatus: (id, payload) => api.patch(`/admindashboard/distributions/${id}/status`, payload),
  getDistributionHistory: (id) => api.get(`/admindashboard/distributions/${id}/history`),
  getCategories: (params) => api.get("/admindashboard/categories", { params }),
  createCategory: (payload) => api.post("/admindashboard/categories", payload),
  updateCategory: (id, payload) => api.put(`/admindashboard/categories/${id}`, payload),
  updateCategoryStatus: (id, payload) => api.patch(`/admindashboard/categories/${id}/status`, payload),
  checkCategoryAvailability: (payload) => api.post("/admindashboard/categories/check-availability", payload),
  getCountries: (params) => api.get("/admindashboard/countries", { params }),
  createCountry: (payload) => api.post("/admindashboard/countries", payload),
  updateCountry: (id, payload) => api.put(`/admindashboard/countries/${id}`, payload),
  updateCountryStatus: (id, payload) => api.patch(`/admindashboard/countries/${id}/status`, payload),
  deleteCountryPermanently: (id) => api.delete(`/admindashboard/countries/${id}`),
  getNewsletters: (params) => api.get("/admindashboard/newsletters", { params }),
  getNewsletterById: (id) => api.get(`/admindashboard/newsletters/${id}`),
  deleteNewsletterPermanently: (id) => api.delete(`/admindashboard/newsletters/${id}`),
  deleteNewslettersBulk: (payload) => api.post("/admindashboard/newsletters/bulk-delete", payload),
  exportNewslettersCsv: (params) => api.get("/admindashboard/newsletters/export.csv", { params }),
  getPaymentHistory: (params) => api.get("/admindashboard/payment-history", { params }),
  getPaymentHistoryDetail: (id) => api.get(`/admindashboard/payment-history/${id}`),
  getAnalyticsOverview: (params, config) =>
    api.get("/admindashboard/analytics/overview", { params, ...(config || {}) }),
  getAnalyticsPr: (params, config) =>
    api.get("/admindashboard/analytics/pr", { params, ...(config || {}) }),
  getAnalyticsUsersSummary: (params, config) =>
    api.get("/admindashboard/analytics/users/summary", { params, ...(config || {}) }),
  getAnalyticsUsersList: (params) =>
    api.get("/admindashboard/analytics/users/list", { params }),
  getAnalyticsSalesSummary: (params, config) =>
    api.get("/admindashboard/analytics/sales/summary", { params, ...(config || {}) }),
  getAnalyticsSalesPackages: (params) =>
    api.get("/admindashboard/analytics/sales/packages", { params }),
  getAnalyticsSalesCustomers: (params) =>
    api.get("/admindashboard/analytics/sales/customers", { params }),
  getAnalyticsSalesPayments: (params) =>
    api.get("/admindashboard/analytics/sales/payments", { params }),
  getAnalyticsSalesPackageBuyers: (params) =>
    api.get("/admindashboard/analytics/sales/package-buyers", { params }),
  getInvoices: (params) => api.get("/admindashboard/invoices", { params }),
  uploadInvoice: (invId, file) => {
    const formData = new FormData();
    formData.append("inv_id", String(invId));
    formData.append("upload_excel", file);
    return api.post("/admindashboard/invoices/upload", formData);
  },
  downloadInvoice: (invId) =>
    api.get(`/admindashboard/invoices/${invId}/download`, { responseType: "blob" }),
  exportPaymentHistoryCsvUrl: () => "http://localhost:5000/api/admindashboard/payment-history/export.csv",
  getPaymentMethods: (params) => api.get("/admindashboard/payment-methods", { params }),
  updatePaymentMethodStatus: (id, payload) => api.patch(`/admindashboard/payment-methods/${id}/status`, payload),
  getCoinbaseUsers: (id, params) => api.get(`/admindashboard/payment-methods/${id}/coinbase-users`, { params }),
  getCoinbaseUserIds: (id, params) => api.get(`/admindashboard/payment-methods/${id}/coinbase-user-ids`, { params }),
  updateCoinbaseUsers: (id, payload) => api.post(`/admindashboard/payment-methods/${id}/coinbase-users`, payload),
  getPackages: (params) => api.get("/admindashboard/packages", { params }),
  getPackageMeta: () => api.get("/admindashboard/packages/meta"),
  createPackage: (payload) => api.post("/admindashboard/packages", payload),
  updatePackage: (id, payload) => api.put(`/admindashboard/packages/${id}`, payload),
  updatePackageStatus: (id, payload) => api.patch(`/admindashboard/packages/${id}/status`, payload),
  getPricingSequencer: (params) => api.get("/admindashboard/packages/pricing-sequencer", { params }),
  savePricingSequencer: (payload) => api.post("/admindashboard/packages/pricing-sequencer/save", payload),
  resetPricingSequencer: (payload) => api.post("/admindashboard/packages/pricing-sequencer/reset", payload),
  getPricingPreview: (params) => api.get("/admindashboard/packages/pricing-sequencer/preview", { params }),
  getPricingBanner: () => api.get("/admindashboard/packages/pricing-banner"),
  updatePricingBanner: (payload) => api.post("/admindashboard/packages/pricing-banner", payload),
  addCountryCode: (payload) => api.post("/admindashboard/country-code", payload),
  updateProfile: (payload) => api.post("/admindashboard/profile/update", payload),
  getInvoiceCompanies: () => api.get("/admindashboard/invoice-companies"),
  getInvoiceCompanyById: (id) => api.get(`/admindashboard/invoice-companies/${id}`),
  updateInvoiceCompany: (id, payload) => api.put(`/admindashboard/invoice-companies/${id}`, payload),
  getDeletedUsers: (params) => api.get("/users/deleted", { params }),
  getManageUserSummary: () => api.get("/users/summary"),
  getManageUsers: (params) => api.get("/users/list", { params }),
  getManageStaff: (params) => api.get("/users/staff/list", { params }),
  createManageStaff: (payload) => api.post("/users/staff", payload),
  updateManageStaff: (id, payload) => api.put(`/users/staff/${id}`, payload),
  updateManageStaffStatus: (id, payload) => api.patch(`/users/staff/${id}/status`, payload),
  deleteManageStaffPermanently: (id) => api.delete(`/users/staff/${id}`),
  getManageCompanyMeta: () => api.get("/users/company/meta"),
  getManageCompanies: (params) => api.get("/users/company/list", { params }),
  createManageCompany: (payload) => api.post("/users/company", payload),
  updateManageCompany: (id, payload) => api.put(`/users/company/${id}`, payload),
  updateManageCompanyStatus: (id, payload) => api.patch(`/users/company/${id}/status`, payload),
  deleteManageCompanyPermanently: (id) => api.delete(`/users/company/${id}`),
  getManageUserMeta: () => api.get("/users/meta"),
  createManageUser: (payload) => api.post("/users", payload),
  updateManageUser: (id, payload) => api.put(`/users/${id}`, payload),
  updateManageUserStatus: (id, payload) => api.patch(`/users/${id}/status`, payload),
  deleteManageUserPermanently: (id) => api.delete(`/users/${id}`),

  getUserFullHistory: (userId) => api.get(`/users/${userId}/history`),
  getUserHistoryPaymentsPaged: (userId, params) => api.get(`/users/${userId}/history/payments`, { params }),
  getUserHistoryPrRecordsPaged: (userId, params) => api.get(`/users/${userId}/history/pr-records`, { params }),
  getUserHistoryPressReleasesPaged: (userId, params) =>
    api.get(`/users/${userId}/history/press-releases`, { params }),
  getIncreasePrFormData: (userId) => api.get(`/users/${userId}/pr/increase-data`),
  getUserPrStatusPaged: (userId, params) => api.get(`/users/${userId}/pr/status-history`, { params }),
  postIncreasePr: (userId, payload) => api.post(`/users/${userId}/pr/increase`, payload),
  getUserPrHistoryView: (userId) => api.get(`/users/${userId}/pr/history`),
  getIncreasePrLineHistory: (userPrStatusId) => api.get(`/users/pr/increase-history/${userPrStatusId}`),
  getDecreasePrForm: (userId, prRecordId) => api.get(`/users/${userId}/pr/decrease/${prRecordId}`),
  postDecreasePr: (payload) => api.post("/users/pr/decrease", payload),
  getDecreasePrHistory: (prRecordId) => api.get(`/users/pr/decrease-history/${prRecordId}`),

  getSupportMeta: () => api.get("/admindashboard/support/meta"),
  getSupportNotifications: () => api.get("/admindashboard/support/notifications"),
  getSupportTickets: (params) => api.get("/admindashboard/support/tickets", { params }),
  getSupportTicket: (id) => api.get(`/admindashboard/support/tickets/${id}`),
  createSupportTicket: (payload) => api.post("/admindashboard/support/tickets", payload),
  sendSupportMessage: (id, formData) =>
    api.post(`/admindashboard/support/tickets/${id}/messages`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),
  resolveSupportTicket: (id, payload) => api.post(`/admindashboard/support/tickets/${id}/resolve`, payload),
  approveSupportTicket: (id) => api.post(`/admindashboard/support/tickets/${id}/approve`),
  declineSupportTicket: (id) => api.post(`/admindashboard/support/tickets/${id}/decline`),

  getCoupons: (params, config) => api.get("/admindashboard/coupons", { params, ...(config || {}) }),
  getCouponMeta: () => api.get("/admindashboard/coupons/meta"),
  getCouponMetaUsers: (params) => api.get("/admindashboard/coupons/meta/users", { params }),
  getCouponMetaAllUserIds: () => api.get("/admindashboard/coupons/meta/all-user-ids"),
  getCouponApplicable: (id) => api.get(`/admindashboard/coupons/${id}/applicable`),
  getCouponHistory: (id) => api.get(`/admindashboard/coupons/${id}/history`),
  getCouponHistoryUsers: (id, params, config) =>
    api.get(`/admindashboard/coupons/${id}/history/users`, { params, ...(config || {}) }),
  getCouponById: (id) => api.get(`/admindashboard/coupons/${id}`),
  createCoupon: (payload) => api.post("/admindashboard/coupons", payload),
  updateCoupon: (id, payload) => api.put(`/admindashboard/coupons/${id}`, payload),
  checkCouponAvailability: (payload) => api.post("/admindashboard/coupons/check-availability", payload),
  updateCouponStatus: (id, payload) => api.patch(`/admindashboard/coupons/${id}/status`, payload),
  deleteCouponPermanently: (id) => api.delete(`/admindashboard/coupons/${id}`),

  getRedemptionCodes: (params, config) =>
    api.get("/admindashboard/redemption-codes", { params, ...(config || {}) }),
  getRedemptionMeta: () => api.get("/admindashboard/redemption-codes/meta"),
  getRedemptionCodeById: (id) => api.get(`/admindashboard/redemption-codes/${id}`),
  getRedemptionLogs: (id, params) =>
    api.get(`/admindashboard/redemption-codes/${id}/redemptions`, { params }),
  createRedemptionCode: (payload) => api.post("/admindashboard/redemption-codes", payload),
  updateRedemptionCode: (id, payload) => api.put(`/admindashboard/redemption-codes/${id}`, payload),
  checkRedemptionCodeName: (payload) =>
    api.post("/admindashboard/redemption-codes/check-name", payload),
  deactivateRedemptionCode: (id) => api.patch(`/admindashboard/redemption-codes/${id}/deactivate`),
  activateRedemptionCode: (id) => api.patch(`/admindashboard/redemption-codes/${id}/activate`)
};
