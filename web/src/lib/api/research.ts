import { apiClient } from "./client";
import {
  AskQuestion,
  EvidenceListResponse,
  ResearchJobResponse,
  ResearchStatusResponse,
} from "@/types";

export const researchApi = {
  async ask(params: AskQuestion): Promise<ResearchJobResponse> {
    const { data } = await apiClient.post<ResearchJobResponse>("/api/research/ask", params);
    return data;
  },

  async getJob(id: string): Promise<ResearchJobResponse> {
    const { data } = await apiClient.get<ResearchJobResponse>(`/api/research/${id}`);
    return data;
  },

  async getStatus(id: string): Promise<ResearchStatusResponse> {
    const { data } = await apiClient.get<ResearchStatusResponse>(`/api/research/${id}/status`);
    return data;
  },

  async getEvidence(id: string): Promise<EvidenceListResponse> {
    const { data } = await apiClient.get<EvidenceListResponse>(`/api/research/${id}/evidence`);
    return data;
  },
};
