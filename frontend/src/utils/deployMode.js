/**
 * Test server mode (set VITE_TEST_DEPLOY=true on Vercel only).
 * - Hides public site, user auth, and user dashboard
 * - Hides admin Coupon + Redemption features
 * Local dev: leave unset — everything works as normal.
 */
export function isTestDeploy() {
  return import.meta.env.VITE_TEST_DEPLOY === "true";
}

export function showPublicSite() {
  return !isTestDeploy();
}

export function showMarketingAdmin() {
  return !isTestDeploy();
}
