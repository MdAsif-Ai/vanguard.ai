import { apiClient } from "./client";
import {
  DocumentChunkListResponse,
  DocumentListResponse,
  DocumentResponse,
  DocumentVersionListResponse,
  MessageResponse,
} from "@/types";

export interface UploadDocumentParams {
  file: File;
  name?: string;
  company?: string;
  document_type?: string;
  fiscal_year?: number;
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void;
}

export const documentsApi = {
  async upload(params: UploadDocumentParams): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append("file", params.file);
    if (params.name) formData.append("name", params.name);
    if (params.company) formData.append("company", params.company);
    if (params.document_type) formData.append("document_type", params.document_type);
    if (params.fiscal_year !== undefined && params.fiscal_year !== null && !isNaN(params.fiscal_year)) {
      formData.append("fiscal_year", params.fiscal_year.toString());
    }

    const { data } = await apiClient.post<DocumentResponse>("/api/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (e) => {
        if (params.onUploadProgress) {
          params.onUploadProgress({ loaded: e.loaded, total: e.total });
        }
      },
    });
    return data;
  },

  async list(skip = 0, limit = 20): Promise<DocumentListResponse> {
    const { data } = await apiClient.get<DocumentListResponse>("/api/documents", {
      params: { skip, limit },
    });
    return data;
  },

  async get(id: string): Promise<DocumentResponse> {
    const { data } = await apiClient.get<DocumentResponse>(`/api/documents/${id}`);
    return data;
  },

  async delete(id: string): Promise<MessageResponse> {
    const { data } = await apiClient.delete<MessageResponse>(`/api/documents/${id}`);
    return data;
  },

  async reindex(id: string): Promise<MessageResponse> {
    const { data } = await apiClient.post<MessageResponse>(`/api/documents/${id}/reindex`);
    return data;
  },

  async getVersions(id: string): Promise<DocumentVersionListResponse> {
    const { data } = await apiClient.get<DocumentVersionListResponse>(`/api/documents/${id}/versions`);
    return data;
  },

  async getChunks(id: string): Promise<DocumentChunkListResponse> {
    const { data } = await apiClient.get<DocumentChunkListResponse>(`/api/documents/${id}/chunks`);
    return data;
  },
};
