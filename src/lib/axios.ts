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

    // Tenant management is a global System Admin API and must not inherit tenant context.
    const isGlobalTenantAdminRequest = config.url?.startsWith("/v1/tenants");
    if (tenantId && !isGlobalTenantAdminRequest) {
      config.headers["X-Tenant-ID"] = tenantId;
    } else if (isGlobalTenantAdminRequest) {
      delete config.headers["X-Tenant-ID"];
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
