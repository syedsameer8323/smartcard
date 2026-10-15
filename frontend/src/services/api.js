import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const KEYS = { access: "access_token", refresh: "refresh_token" };

export const tokenStorage = {
  get: (key) => localStorage.getItem(KEYS[key]) ?? sessionStorage.getItem(KEYS[key]),
  set(access, refresh, remember) {
    this.clear();
    const store = remember ? localStorage : sessionStorage;
    store.setItem(KEYS.access, access);
    store.setItem(KEYS.refresh, refresh);
  },
  setAccess(access, refresh) {
    const store = localStorage.getItem(KEYS.refresh) ? localStorage : sessionStorage;
    store.setItem(KEYS.access, access);
    if (refresh) store.setItem(KEYS.refresh, refresh);
  },
  clear() {
    Object.values(KEYS).forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },
};

const api = axios.create({ baseURL: API_URL, timeout: 15000 });
const bare = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = tokenStorage.get("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

export function refreshAccessToken() {
  const refresh = tokenStorage.get("refresh");
  if (!refresh) return Promise.reject(new Error("No refresh token"));
  if (!refreshing) {
    refreshing = bare.post("/auth/refresh/", { refresh })
      .then(({ data }) => {
        tokenStorage.setAccess(data.access, data.refresh);
        return data.access;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = ["/auth/login/", "/auth/login/verify-otp/", "/auth/login/resend-otp/", "/auth/refresh/"]
      .some((url) => original?.url?.includes(url));
    if (error.response?.status === 401 && !original?._retried && !isAuthCall) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        tokenStorage.clear();
        window.dispatchEvent(new Event("auth:expired"));
      }
    }
    return Promise.reject(error);
  },
);

export function parseApiError(error) {
  if (!error.response) {
    return { message: "Unable to connect to the server. Please try again.", fieldErrors: {} };
  }

  const { status, data } = error.response;
  const fieldErrors = {};
  Object.entries(data?.errors || {}).forEach(([key, value]) => {
    fieldErrors[key] = Array.isArray(value) ? value[0] : value;
  });

  let message = data?.message;
  if (status === 429) message = data?.message || "Too many attempts. Please wait a moment and try again.";
  if (status >= 500 || !message) {
    message = status === 503
      ? (data?.message || "Email delivery is temporarily unavailable. Please try again shortly.")
      : "Something went wrong on our side. Please try again.";
  }
  if (status === 409) message = data?.message || "An account with this email already exists.";
  if (status === 409 && !fieldErrors.email) fieldErrors.email = message;

  return { message, fieldErrors, status, data };
}

export const authApi = {
  register: (payload) => api.post("/auth/register/", payload),
  login: (payload) => api.post("/auth/login/", payload),
  verifyLoginOTP: (payload) => api.post("/auth/login/verify-otp/", payload),
  resendLoginOTP: (payload) => api.post("/auth/login/resend-otp/", payload),
  logout: (refresh) => api.post("/auth/logout/", { refresh }),
  me: () => api.get("/auth/me/"),
  forgotPassword: (email) => api.post("/auth/forgot-password/", { email }),
  resetPassword: (payload) => api.post("/auth/reset-password/", payload),
};

export default api;
