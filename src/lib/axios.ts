import axios from "axios";

import { clearAccessToken, getAccessToken, getTenantId } from "@/lib/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window === "undefined") {
      return config;
    }

    const token = getAccessToken();
    const tenantId = getTenantId();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (tenantId) {
      config.headers["X-Tenant-ID"] = tenantId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        clearAccessToken();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
