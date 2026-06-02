import api from "./publicApi";

export const publicAuthApi = {
  getCountryCodes: () => api.get("/public/auth/country-codes"),
  signUp: (payload) => api.post("/public/auth/sign-up", payload),
  signIn: (payload) => api.post("/public/auth/sign-in", payload),
  verifyEmailOtp: (payload) => api.post("/public/auth/verify-email-otp", payload),
  resendEmailOtp: (payload) => api.post("/public/auth/resend-email-otp", payload),
  forgotPassword: (payload) => api.post("/public/auth/forgot-password", payload),
  resetPassword: (id, payload) => api.post(`/public/auth/reset-password/${id}`, payload)
};

export function saveUserSession({ token, user }) {
  if (token) localStorage.setItem("userToken", token);
  if (user?.id) localStorage.setItem("userId", String(user.id));
  if (user?.email) localStorage.setItem("userEmail", user.email);
  if (user?.first_name) localStorage.setItem("userFirstName", user.first_name);
  if (user?.last_name) localStorage.setItem("userLastName", user.last_name);
  if (user?.plan_id != null) localStorage.setItem("userPlanId", String(user.plan_id));
  if (user?.pr != null) localStorage.setItem("userPr", String(user.pr));
  if (user?.profile_image != null) localStorage.setItem("userProfileImage", user.profile_image || "");
}

export function clearUserSession() {
  localStorage.removeItem("userToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userFirstName");
  localStorage.removeItem("userLastName");
  localStorage.removeItem("userPlanId");
  localStorage.removeItem("userPr");
  localStorage.removeItem("userProfileImage");
}

export function userCanSubmitPr() {
  const planId = Number(localStorage.getItem("userPlanId") || 0);
  const pr = Number(localStorage.getItem("userPr") || 0);
  return planId !== 0 && pr !== 0;
}

export function isUserLoggedIn() {
  return Boolean(localStorage.getItem("userToken"));
}
