import { apiClient } from "./client";
import { LoginRequest, LogoutResponse, TokenResponse, UserResponse } from "@/types";

export const authApi = {
  async login(credentials: LoginRequest): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>("/api/auth/login", credentials);
    return data;
  },

  async me(): Promise<UserResponse> {
    const { data } = await apiClient.get<UserResponse>("/api/auth/me");
    return data;
  },

  async logout(): Promise<LogoutResponse> {
    const { data } = await apiClient.post<LogoutResponse>("/api/auth/logout");
    return data;
  },
};
