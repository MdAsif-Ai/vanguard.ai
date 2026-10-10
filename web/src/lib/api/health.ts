import { apiClient } from "./client";
import { HealthMetrics, HealthResponse, ReadinessResponse } from "@/types";

export const healthApi = {
  async getHealth(): Promise<HealthResponse> {
    const { data } = await apiClient.get<HealthResponse>("/api/health");
    return data;
  },

  async getReadiness(): Promise<ReadinessResponse> {
    const { data } = await apiClient.get<ReadinessResponse>("/api/health/ready");
    return data;
  },

  async getMetrics(): Promise<HealthMetrics> {
    const { data } = await apiClient.get<HealthMetrics>("/api/health/metrics");
    return data;
  },
};
