import axios from 'axios';

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

        const token = window.localStorage.getItem("access_token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
                window.localStorage.removeItem("access_token");
                window.dispatchEvent(new Event("auth-change"));
            }
        }

        return Promise.reject(error);
    }
);

export default api;
