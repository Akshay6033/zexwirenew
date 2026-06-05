import axios from "axios";
import { getApiBaseUrl } from "../../utils/apiBase";

const api = axios.create({
  baseURL: getApiBaseUrl()
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (payload) => api.post("/auth/login", payload),
  sendOtp: (payload) => api.post("/auth/forgot-password/send-otp", payload),
  updatePassword: (payload) => api.post("/auth/forgot-password/update", payload)
};

export default api;
