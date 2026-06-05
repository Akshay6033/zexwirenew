import axios from "axios";
import { clearUserSession } from "../../public/services/publicAuthApi";

const userApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 45000
});

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("userToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

userApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearUserSession();
      error.sessionExpired = true;
    }
    return Promise.reject(error);
  }
);

export default userApi;
