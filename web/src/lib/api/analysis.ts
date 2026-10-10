import { apiClient } from "./client";
import { CalculationRequest, CalculationResult } from "@/types";

export const analysisApi = {
  async calculate(payload: CalculationRequest): Promise<CalculationResult> {
    const { data } = await apiClient.post<CalculationResult>("/api/analysis/financial/calculate", payload);
    return data;
  },
};
