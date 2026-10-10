"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserResponse, LoginRequest } from "@/types";
import { authApi } from "@/lib/api/auth";
import { subscribeToApiMeta } from "@/lib/api/client";
import { getStoredToken, setStoredToken, removeStoredToken } from "@/lib/utils";

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  rateLimitRemaining: number | null;
  lastRequestId: string | null;
  isRateLimited: boolean;
  clearRateLimitWarning: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Meta state from headers
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Subscribe to API meta events (rate limits, request IDs)
  useEffect(() => {
    const unsubscribe = subscribeToApiMeta((meta) => {
      if (meta.rateLimitRemaining !== undefined) {
        setRateLimitRemaining(meta.rateLimitRemaining);
      }
      if (meta.requestId) {
        setLastRequestId(meta.requestId);
      }
      if (meta.isRateLimited) {
        setIsRateLimited(true);
      }
    });
    return unsubscribe;
  }, []);

  const clearRateLimitWarning = useCallback(() => {
    setIsRateLimited(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      return;
    }

    try {
      const userData = await authApi.me();
      setUser(userData);
      setToken(currentToken);
    } catch (err: any) {
      console.warn("Failed to load user profile:", err);
      // If 401 or network error occurred, client interceptor already handles removeStoredToken
      if (err.response?.status === 401) {
        removeStoredToken();
        setUser(null);
        setToken(null);
      }
    }
  }, []);

  // Initial load check
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const stored = getStoredToken();
      if (stored) {
        setToken(stored);
        await refreshUser();
      }
      setIsLoading(false);
    };
    init();
  }, [refreshUser]);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    const hasAuth = !!getStoredToken();

    if (!hasAuth && !isPublic) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (hasAuth && pathname === "/login") {
      router.push("/dashboard");
    }
  }, [pathname, isLoading, router]);

  const login = async (credentials: LoginRequest) => {
    const res = await authApi.login(credentials);
    setStoredToken(res.access_token);
    setToken(res.access_token);
    const userData = await authApi.me();
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Stateless logout: proceed anyway
    } finally {
      removeStoredToken();
      setToken(null);
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        rateLimitRemaining,
        lastRequestId,
        isRateLimited,
        clearRateLimitWarning,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
