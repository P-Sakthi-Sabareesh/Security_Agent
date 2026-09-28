export interface AlertSummary {
  id: string;
  timestamp: string;
  title: string;
  severity: string;
  host: string;
  user: string;
  cached_state?: string | null;
  is_learning_pair?: boolean;
  is_decided?: boolean;
  is_escalated?: boolean;
}

export interface AlertDetail {
  alert_id: string;
  timestamp: string;
  title: string;
  category: string;
  mitre_technique?: string;
  severity: string;
  detector_id?: string;
  user: string;
  host: string;
  src_ip?: string;
  dst?: string;
  details?: Record<string, any>;
  context?: Record<string, any>;
  status?: string;
}

export interface DifferenceItem {
  signal: string;
  past: any;
  current: any;
  is_key_signal?: boolean;
}

export interface ComparedCase {
  alert_id: string;
  title: string;
  category: string;
  severity: string;
  host: string;
  user: string;
  verdict: string;
  outcome: string;
  investigation_note: string;
  analyst: string;
  timestamp?: string;
  day?: string;
  mitre_technique?: string;
  matches: string[];
  differences: DifferenceItem[];
  key_difference_count: number;
  total_difference_count: number;
}

export interface LLMAnalysis {
  state: 'green' | 'yellow' | 'red';
  reasons: string[];
  recalled_case_ids: string[];
  recommended_action: string;
  explanation: string;
  model_used?: string;
  models_tried?: string[];
}

export interface AnalysisResult {
  alert_id: string;
  memory_used: boolean;
  recalled_cases: ComparedCase[];
  best_match_id: string | null;
  best_match: ComparedCase | null;
  llm_result: LLMAnalysis;
  models_tried: string[];
  state: 'green' | 'yellow' | 'red';
  recommended_action: string;
  reasons: string[];
  explanation: string;
  safety_overrides: string[];
  elapsed_seconds?: number;
  cached?: boolean;
}

export interface HealthStatus {
  status: string;
  memory_core_online: boolean;
  reasoning_engine_online: boolean;
  bank_id: string;
  agent: string;
}

export interface SuggestedChecksResponse {
  alert_id: string;
  suggested_checks: string[];
  note: string;
  cached?: boolean;
}

export interface DecisionResponse {
  success: boolean;
  message: string;
  live_alert_id: string;
  summary: string;
  record: any;
}

export interface DemoPair {
  first_alert_id: string;
  second_alert_id: string;
  title: string;
  category: string;
  user: string;
  host: string;
  description: string;
}
