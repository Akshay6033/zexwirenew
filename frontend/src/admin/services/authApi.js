import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
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
