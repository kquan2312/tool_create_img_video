import { TaskRecord } from '../db/sqlite';

export type TaskType = 'image_gen' | 'image_edit' | 'video_gen';
export type TaskStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface TaskInput {
  type: TaskType;
  prompt: string;
  negative_prompt?: string;
  reference_image?: string; // base64 or file path
  last_frame_image?: string;
  provider: 'gemini' | 'grok' | 'mock';
  model: string;
  aspect_ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution?: '720p' | '1080p' | '1K' | '2K';
  batch_id?: string;
  max_retries?: number;
  metadata?: Record<string, any>;
}

export interface TaskResult {
  outputPath: string;
  outputUrl: string;
  thumbnailUrl?: string;
  durationMs?: number;
  providerMetadata?: Record<string, any>;
}

export interface QueueStatus {
  isPaused: boolean;
  activeCount: number;
  pendingCount: number;
  succeededCount: number;
  failedCount: number;
  concurrencyLimit: number;
}

export interface AppSettingsConfig {
  outputDirectory: string;
  concurrencyLimit: number;
  maxRetries: number;
  requestTimeoutSeconds: number;
  proxyUrl?: string;
  activeProvider: 'gemini' | 'grok' | 'mock';
  geminiModelImage: string;
  geminiModelVideo: string;
  grokApiKey?: string;
  language: 'vi' | 'en';
  autoSaveToDisk: boolean;
  namingConvention: string;
}
