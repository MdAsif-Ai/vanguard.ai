import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getStoredToken, removeStoredToken } from "../utils";

// Event listener mechanism for rate limiting & request metadata updates
type MetaListener = (data: { rateLimitRemaining?: number; requestId?: string; isRateLimited?: boolean }) => void;
const metaListeners: Set<MetaListener> = new Set();

export function subscribeToApiMeta(listener: MetaListener) {
  metaListeners.add(listener);
  return () => {
    metaListeners.delete(listener);
  };
}

function notifyMeta(data: { rateLimitRemaining?: number; requestId?: string; isRateLimited?: boolean }) {
  metaListeners.forEach((fn) => fn(data));
}

// Generate a random client request ID prefix if needed
function generateRequestId(): string {
  return "web-" + Math.random().toString(36).substring(2, 10);
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45000,
});

// Request interceptor: attach token & X-Request-ID
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.headers && !config.headers["X-Request-ID"]) {
      config.headers["X-Request-ID"] = generateRequestId();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401, 429, extract headers
apiClient.interceptors.response.use(
  (response) => {
    const remaining = response.headers["x-ratelimit-remaining"];
    const requestId = response.headers["x-request-id"];

    notifyMeta({
      rateLimitRemaining: remaining !== undefined ? parseInt(remaining, 10) : undefined,
      requestId: requestId || undefined,
      isRateLimited: false,
    });

    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const remaining = error.response?.headers?.["x-ratelimit-remaining"];
    const requestId = error.response?.headers?.["x-request-id"];

    if (status === 401) {
      removeStoredToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    if (status === 429) {
      notifyMeta({
        rateLimitRemaining: 0,
        requestId: requestId || undefined,
        isRateLimited: true,
      });
    } else if (remaining !== undefined) {
      notifyMeta({
        rateLimitRemaining: parseInt(remaining, 10),
        requestId: requestId || undefined,
        isRateLimited: false,
      });
    }

    return Promise.reject(error);
  }
);
