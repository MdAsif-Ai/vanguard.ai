import { apiClient } from "./client";
import { EvidenceResponse } from "@/types";

export const evidenceApi = {
  async get(evidenceId: string): Promise<EvidenceResponse> {
    const { data } = await apiClient.get<EvidenceResponse>(`/api/evidence/${evidenceId}`);
    return data;
  },
};
