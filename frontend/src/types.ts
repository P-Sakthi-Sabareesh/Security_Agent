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

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: string;
  level: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: UserProfile;
  message?: string;
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

export interface ReplayEntry {
  alert_id: string;
  timestamp: string;
  title: string;
  state: 'green' | 'yellow' | 'red';
  recalled_case_ids: string[];
  best_match_id: string | null;
  matches_count: number;
  differences_count: number;
  model_used?: string | null;
  git_commit?: string | null;
  host?: string;
  user?: string;
  severity?: string;
  category?: string;
  detector_id?: string;
  mitre_technique?: string;
  details?: Record<string, any>;
  context?: Record<string, any>;
  analysis: AnalysisResult;
}

export interface ReplayCache {
  total_replay_alerts: number;
  recorded_count: number;
  entries: ReplayEntry[];
  uncached_alert_ids: string[];
  not_run: Array<{ alert_id: string; status: string; reason: string }>;
}

export interface WhoKnowsResponse {
  alert_id: string;
  analysts: Array<{ analyst: string; count: number; last_case_date: string }>;
}

export interface IncidentSummaryResponse {
  alert_id: string;
  state: 'yellow' | 'red';
  summary: string;
}

export interface EvaluationSummary {
  evaluation_timestamp: string;
  note: string;
  sample_definition: Record<string, unknown>;
  metrics: Record<string, EvaluationMetrics>;
}

export interface EvaluationMetrics {
  sample_size: number;
  failed_or_fallback_count?: number;
  failures_count?: number;
  fallback_rule_count?: number;
  false_greens_count: number;
  attacks_caught: number;
  attacks_total?: number;
  attacks_caught_pct?: number;
  unnecessary_escalations: number;
  unnecessary_escalations_pct?: number;
  recurring_benign_total?: number;
  human_review_count: number;
  human_review_load_pct?: number;
  average_time_seconds: number;
  scenario_breakdown: Record<string, Record<string, number>>;
  false_greens?: Array<{
    alert_id: string;
    scenario: string;
    variant: string;
    title: string;
    explanation: string;
  }>;
}

export interface EvaluationAlertSide {
  state?: 'green' | 'yellow' | 'red' | string;
  elapsed_seconds?: number;
  recalled_cases?: ComparedCase[];
  best_match?: ComparedCase | null;
  explanation?: string;
  reasons?: string[];
  recommended_action?: string;
}

export interface EvaluationAlertItem {
  alert_id: string;
  title: string;
  category: string;
  scenario: string;
  severity: string;
  host: string;
  user: string;
  timestamp?: string;
  details?: Record<string, any>;
  context?: Record<string, any>;
  with_memory: EvaluationAlertSide;
  without_memory: EvaluationAlertSide;
  impact_category: 'changed_decision' | 'context_enriched' | 'no_change' | string;
  impact_label: string;
}

export interface MemoryCategoryCount {
  category: string;
  count: number;
}

export interface MemoryStats {
  total_memories: number;
  attack_count: number;
  benign_count: number;
  live_count: number;
  categories: MemoryCategoryCount[];
}

export interface MemoryItem {
  id: string;
  timestamp?: string;
  day?: number | null;
  title: string;
  category: string;
  severity: string;
  mitre_technique?: string | null;
  detector_id?: string | null;
  user?: string;
  host?: string;
  src_ip?: string | null;
  dst?: string | null;
  details?: Record<string, any>;
  context?: Record<string, any>;
  analyst: string;
  investigation_note: string;
  verdict: string;
  outcome: string;
  is_live: boolean;
  related_investigations: string[];
}

export interface MemoryResponse {
  stats: MemoryStats;
  memories: MemoryItem[];
}

