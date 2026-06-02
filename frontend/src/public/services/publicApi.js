import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000
});

export const publicApi = {
  getNewsroomFeed: (params, config) => api.get("/public/newsroom", { params, ...(config || {}) }),
  getNewsroomArticle: (slug, config) =>
    api.get(`/public/newsroom/${encodeURIComponent(slug)}`, config || {}),
  getPricing: (params, config) => api.get("/public/pricing", { params, ...(config || {}) }),
  subscribeNewsletter: (payload) => {
    const body =
      typeof payload === "string"
        ? { email: payload }
        : {
            email: payload.email,
            company: payload.company || "",
            _ts: payload._ts,
            turnstileToken: payload.turnstileToken
          };
    return api.post("/public/newsletter", body);
  }
};

export default api;
