import { router } from "@/plugins/1.router/index";
import axios from "axios";

const axiosInstance = axios.create({
  // baseURL: "https://api.mulhimiq.com/api",
  baseURL: "http://localhost:3000/api",
  timeout: 100000,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("accessToken");
    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response } = error;

    if (response) {
      // 🛑 403 - عدم الصلاحية
      if (
        response.status === 403 &&
        response.data?.message?.includes("not authorized to access this route")
      ) {
        localStorage.setItem(
          "unauthorized_message",
          response.data?.message || "ليس لديك صلاحية للوصول إلى هذه الصفحة"
        );

        router.replace("/errors/unauthorized");
        return;
      }

      // 🛑 401 - غير مصرح
      if (response.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("results");
        localStorage.setItem("reloaded", "false");

        router.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
