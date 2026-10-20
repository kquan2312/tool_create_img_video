export type TaskType = 'image_gen' | 'image_edit' | 'video_gen';
export type TaskStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  type: TaskType;
  prompt: string;
  negative_prompt?: string;
  reference_image?: string;
  last_frame_image?: string;
  provider: string;
  model: string;
  aspect_ratio: string;
  resolution?: string;
  status: TaskStatus;
  progress: number;
  output_path?: string;
  output_url?: string;
  thumbnail_url?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  batch_id?: string;
  metadata?: string;
}

export interface BatchJob {
  id: string;
  name: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  running: number;
  succeeded: number;
  failed: number;
  concurrencyLimit: number;
  isPaused: boolean;
}

export interface ActivityLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  task_id?: string;
  source: string;
  created_at: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  type: 'image' | 'video';
  description?: string;
}

export interface ProviderInfo {
  providerId: string;
  name: string;
  isAvailable: boolean;
  statusMessage: string;
  supportedTypes: ('image_gen' | 'image_edit' | 'video_gen')[];
  supportedModels: ProviderModel[];
}

export interface AppSettings {
  outputDirectory: string;
  concurrencyLimit: string;
  maxRetries: string;
  requestTimeoutSeconds: string;
  proxyUrl?: string;
  activeProvider: string;
  geminiModelImage: string;
  geminiModelVideo: string;
  language: 'vi' | 'en';
  autoSaveToDisk: string;
  namingConvention: string;
}

export interface AccountRecord {
  id: string;
  name: string;
  provider: 'google_flow' | 'veo' | 'grok' | 'gemini_api';
  auth_type: 'cookie_session' | 'bearer_token' | 'api_key';
  credentials?: string;
  masked_credentials?: string;
  proxy_id?: string;
  status: 'active' | 'expired' | 'relogin_needed' | 'rate_limited';
  quota_remaining?: string;
  last_checked_at?: string;
  notes?: string;
  created_at: string;
}

export interface ProxyRecord {
  id: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks5';
  status: 'active' | 'dead' | 'testing';
  latency_ms?: number;
  last_checked_at?: string;
  created_at: string;
}
