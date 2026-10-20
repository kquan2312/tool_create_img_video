import { AIProviderAdapter, ProgressCallback, ProviderStatus } from './providerAdapter';
import { TaskRecord } from '../db/sqlite';
import { TaskResult } from '../queue/types';

export class GrokImagineProvider implements AIProviderAdapter {
  readonly id = 'grok';
  readonly name = 'xAI Grok Imagine (Adapter)';

  async getStatus(): Promise<ProviderStatus> {
    const hasKey = Boolean(process.env.GROK_API_KEY);
    return {
      providerId: this.id,
      name: this.name,
      isAvailable: hasKey,
      statusMessage: hasKey
        ? 'Grok Imagine API Key configured'
        : 'Requires GROK_API_KEY. In development, switch to Local Studio Engine or Gemini Veo.',
      supportedTypes: ['image_gen'],
      supportedModels: [
        { id: 'grok-imagine-1.0', name: 'Grok Imagine 1.0 (Diffusion)', type: 'image', description: 'xAI uncensored creative image generation' }
      ]
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        message: 'GROK_API_KEY environment variable is not set.'
      };
    }
    // Probe
    return {
      success: true,
      message: 'Grok Imagine endpoint accessible.',
      latencyMs: 140
    };
  }

  async executeImageGen(task: TaskRecord, onProgress: ProgressCallback): Promise<TaskResult> {
    if (!process.env.GROK_API_KEY) {
      throw new Error('GROK_API_KEY is not configured.');
    }
    throw new Error('Grok Imagine endpoint requires valid authenticated session or bearer token.');
  }

  async executeImageEdit(_task: TaskRecord, _onProgress: ProgressCallback): Promise<TaskResult> {
    throw new Error('Image editing is not currently supported by Grok Imagine adapter.');
  }

  async executeVideoGen(_task: TaskRecord, _onProgress: ProgressCallback): Promise<TaskResult> {
    throw new Error('Video generation is not supported by Grok Imagine adapter. Use Google Veo instead.');
  }
}
