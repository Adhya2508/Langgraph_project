// src/types/api.ts
// TypeScript interfaces that mirror the backend Pydantic schemas exactly.

export interface StatusResponse {
  status: string;
  service: string;
}

export interface UploadResponse {
  filename: string;
  rows: number;
  columns: number;
  column_names: string[];
  file_size: string;
  uploaded_at: string;
}

export interface CleaningReport {
  original_rows: number;
  clean_rows: number;
  duplicates_removed: number;
  missing_values_filled: number;
  invalid_rows: number;
  columns_dropped: number;
  outliers_detected: Record<string, number>;
  execution_time: string;
}

export interface CleanResponse {
  status: string;
  report: CleaningReport;
  cleaned_dataset: string;
}

export interface EDAResponse {
  status: string;
  summary: Record<string, unknown>;
  generated_reports: string[];
  visualizations: string[];
}

export interface FeatureReport {
  number_of_customers: number;
  number_of_features: number;
  generated_features: string[];
  skipped_features: string[];
  execution_time: string;
}

export interface FeatureResponse {
  status: string;
  report: FeatureReport;
  customer_features: string;
}

export interface SegmentResponse {
  status: string;
  algorithm_used: string;
  number_of_clusters: number;
  best_silhouette_score: number;
  generated_artifacts: Record<string, string>;
}

export interface ExplainResponse {
  status: string;
  clusters_explained: number;
  generated_artifacts: string[];
  business_summary: string;
}

export interface RecommendResponse {
  status: string;
  customers_processed: number;
  recommendations_generated: number;
  high_priority_customers: number;
  generated_artifacts: Record<string, string>;
}

export interface AgentRequest {
  query: string;
}

export interface AgentResponse {
  status: string;
  plan_id: string;
  detected_intent: string;
  steps_executed: string[];
  artifacts_used: string[];
  generated_outputs: string[];
  execution_time: string;
  errors?: string | null;
  final_response: string;
}

// ── Chat Message (frontend-only) ─────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  agentResponse?: AgentResponse;
  isLoading?: boolean;
}

// ── Pipeline run entry (frontend state) ──────────────────────────────────────
export interface PipelineEntry {
  id: string;
  step: string;
  label: string;
  status: 'success' | 'error' | 'running';
  timestamp: Date;
  executionTime?: string;
  artifacts?: string[];
  response?: unknown;
}
