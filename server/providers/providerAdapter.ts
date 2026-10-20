import { TaskRecord } from '../db/sqlite';
import { TaskResult } from '../queue/types';

export interface ProviderStatus {
  providerId: string;
  name: string;
  isAvailable: boolean;
  statusMessage: string;
  supportedTypes: ('image_gen' | 'image_edit' | 'video_gen')[];
  supportedModels: {
    id: string;
    name: string;
    type: 'image' | 'video';
    description?: string;
  }[];
}

export interface ProgressCallback {
  (progress: number, statusText?: string): void;
}

export interface AIProviderAdapter {
  readonly id: string;
  readonly name: string;
  
  getStatus(): Promise<ProviderStatus>;
  testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }>;
  
  executeImageGen(task: TaskRecord, onProgress: ProgressCallback): Promise<TaskResult>;
  executeImageEdit(task: TaskRecord, onProgress: ProgressCallback): Promise<TaskResult>;
  executeVideoGen(task: TaskRecord, onProgress: ProgressCallback): Promise<TaskResult>;
}
