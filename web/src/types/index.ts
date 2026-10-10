export type UserRole = "admin" | "analyst" | "viewer" | string;

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  organization_id: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MessageResponse {
  message: string;
  detail?: string;
}

export interface LogoutResponse {
  message: string;
  detail?: string;
}

// Document Types
export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed" | string;

export interface DocumentResponse {
  id: string;
  organization_id: string;
  name: string;
  company?: string | null;
  document_type?: string | null;
  fiscal_year?: number | null;
  storage_key: string;
  status: DocumentStatus;
  checksum: string;
  page_count?: number | null;
  chunk_count?: number | null;
  error?: string | null;
  file_size?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentListResponse {
  items: DocumentResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface DocumentChunkResponse {
  id: string;
  chunk_index: number;
  page?: number | null;
  text: string;
}

export interface DocumentChunkListResponse {
  items: DocumentChunkResponse[];
  total: number;
}

export interface DocumentVersionResponse {
  id: string;
  document_id: string;
  version: number;
  checksum: string;
  storage_key: string;
  created_at: string;
}

export interface DocumentVersionListResponse {
  items: DocumentVersionResponse[];
  total: number;
}

// Research Types
export type ResearchJobStatus = "queued" | "running" | "completed" | "failed";

export interface AskQuestion {
  question: string;
}

export interface Citation {
  index: number;
  document_name?: string | null;
  page?: number | null;
  text_snippet: string;
  relevance_score?: number | null;
}

export interface ResearchResult {
  answer: string;
  citations: Citation[];
  status: string;
  evidence_count: number;
  question?: string;
  research_job_id?: string;
}

export interface ResearchJobResponse {
  id: string;
  organization_id: string;
  user_id: string;
  question: string;
  status: ResearchJobStatus;
  mode: "fast" | "deep" | string;
  result?: ResearchResult | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchStatusResponse {
  id: string;
  status: ResearchJobStatus;
}

export interface EvidenceResponse {
  id: string;
  claim_id: string;
  document_id?: string | null;
  chunk_id?: string | null;
  source_type: string;
  page?: number | null;
  passage: string;
  support_status: string;
  created_at: string;
}

export interface EvidenceListResponse {
  items: EvidenceResponse[];
}

// Financial Analysis & Calculator Types
export type CalculationOperation =
  | "margin"
  | "cagr"
  | "growth_rate"
  | "ratio"
  | "percentage_change"
  | "sum"
  | "subtract"
  | "multiply"
  | "divide";

export interface CalculationRequest {
  operation: CalculationOperation | string;
  inputs: Record<string, number>;
  organization_id: string;
}

export interface CalculationResult {
  operation: string;
  inputs: Record<string, number>;
  formula: string;
  result: number;
  verified: boolean;
}

// Health Types
export interface HealthResponse {
  status: "ok" | string;
  service: string;
}

export interface ReadinessResponse {
  status: "ready" | "not_ready";
  checks: {
    database: "ok" | "error" | string;
    redis: "ok" | "error" | string;
    qdrant: "ok" | "error" | string;
    [key: string]: string;
  };
  details?: Record<string, string> | null;
}

export interface HealthMetrics {
  uptime_seconds?: number;
  total_requests?: number;
  business_events?: Record<string, number>;
  status_codes?: Record<string, number>;
  requests_by_endpoint?: Record<string, number>;
  [key: string]: any;
}
