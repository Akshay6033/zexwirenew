import axios from "axios";

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

export default userApi;
