import userApi from "./userApi";

export const userDashboardApi = {
  getHome: () => userApi.get("/user/dashboard/home"),
  getPackages: (params) => userApi.get("/user/dashboard/packages", { params }),
  getProfile: () => userApi.get("/user/dashboard/profile"),
  updateProfile: (formData) =>
    userApi.post("/user/dashboard/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
};
