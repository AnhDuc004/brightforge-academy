import axios from 'axios';

import { clearAccessToken, getAccessToken, getTenantId } from "@/lib/auth";

const TENANT_WARNING_SKIP_PATHS = ["/v1/auth/login", "/v1/auth/register"];

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
        } else {
            const requestUrl = config.url ?? "";
            const shouldSkipWarning = TENANT_WARNING_SKIP_PATHS.some((path) => requestUrl.includes(path));

            if (!shouldSkipWarning) {
                console.warn(
                    `[tenant] Missing tenant_id; X-Tenant-ID header was not attached to ${requestUrl || "API request"}.`,
                );
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
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
    }
);

export default api;
