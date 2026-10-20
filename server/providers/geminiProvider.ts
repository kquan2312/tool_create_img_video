import fs from 'fs';
import path from 'path';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { AIProviderAdapter, ProgressCallback, ProviderStatus } from './providerAdapter';
import { TaskRecord } from '../db/sqlite';
import { TaskResult } from '../queue/types';

export class GeminiVeoProvider implements AIProviderAdapter {
  readonly id = 'gemini';
  readonly name = 'Google DeepMind (Gemini / Imagen / Veo)';
  private ai: GoogleGenAI | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.ai = null;
      return null;
    }
    this.ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    return this.ai;
  }

  private ensureOutputDir(type: 'images' | 'videos'): string {
    const dir = path.resolve(process.cwd(), 'outputs', type);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async getStatus(): Promise<ProviderStatus> {
    const hasKey = Boolean(process.env.GEMINI_API_KEY);
    return {
      providerId: this.id,
      name: this.name,
      isAvailable: hasKey,
      statusMessage: hasKey
        ? 'Connected to Google AI Studio API'
        : 'API Key not detected in environment. Configure GEMINI_API_KEY to enable real generation.',
      supportedTypes: ['image_gen', 'image_edit', 'video_gen'],
      supportedModels: [
        { id: 'gemini-3.1-flash-lite-image', name: 'Gemini 3.1 Flash Image', type: 'image', description: 'Fast, high efficiency general image generation & editing' },
        { id: 'gemini-nano-banana-2.1', name: 'Gemini Nano Banana 2.1 (Ultra)', type: 'image', description: 'High-res 1K/2K/4K photorealistic generation' },
        { id: 'veo-3.1-lite-generate-preview', name: 'Veo 3.1 Lite (720p / 1080p)', type: 'video', description: 'High fidelity fast video generator' },
        { id: 'veo-3.1-generate-preview', name: 'Veo 3.1 Pro (Cinematic)', type: 'video', description: 'Flagship multi-camera reference video generator' }
      ]
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const client = this.initClient();
    if (!client) {
      return {
        success: false,
        message: 'GEMINI_API_KEY environment variable is missing.'
      };
    }
    const start = Date.now();
    try {
      // Lightweight validation query
      const res = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'ping',
        config: { maxOutputTokens: 2 }
      });
      return {
        success: true,
        message: 'Google AI Studio connection verified successfully.',
        latencyMs: Date.now() - start
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection failed: ${err.message || 'Unknown network error'}`
      };
    }
  }

  private normalizeImageModel(model?: string): string {
    if (model === 'gemini-nano-banana-2.1') return 'gemini-nano-banana-2.1';
    return 'gemini-3.1-flash-lite-image';
  }

  private normalizeVideoModel(model?: string): 'veo-3.1-lite-generate-preview' | 'veo-3.1-generate-preview' {
    if (model === 'veo-3.1-generate-preview' || model === 'veo_3_1_pro') {
      return 'veo-3.1-generate-preview';
    }
    return 'veo-3.1-lite-generate-preview';
  }

  async executeImageGen(task: TaskRecord, onProgress: ProgressCallback): Promise<TaskResult> {
    const client = this.initClient();
    if (!client) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    onProgress(15, 'Sending prompt to Gemini image model...');
    const model = this.normalizeImageModel(task.model);

    const response = await client.models.generateContent({
      model,
      contents: {
        parts: [{ text: task.prompt || 'Generated visual' }]
      },
      config: {
        imageConfig: {
          aspectRatio: (task.aspect_ratio as any) || '1:1'
        }
      }
    });

    onProgress(70, 'Processing model output candidate...');
    const parts = response.candidates?.[0]?.content?.parts || [];
    let base64Image = '';
    let mimeType = 'image/png';

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        if (part.inlineData.mimeType) mimeType = part.inlineData.mimeType;
        break;
      }
    }

    if (!base64Image) {
      const textMsg = response.text || 'Model did not return image data.';
      throw new Error(`Failed to generate image: ${textMsg}`);
    }

    onProgress(90, 'Writing image to disk...');
    const outDir = this.ensureOutputDir('images');
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
    const filename = `gemini_${Date.now()}_${task.id.slice(0, 6)}.${ext}`;
    const fullPath = path.join(outDir, filename);

    const buffer = Buffer.from(base64Image, 'base64');
    fs.writeFileSync(fullPath, buffer);

    onProgress(100, 'Image generated successfully');

    return {
      outputPath: fullPath,
      outputUrl: `/outputs/images/${filename}`,
      thumbnailUrl: `/outputs/images/${filename}`
    };
  }

  async executeImageEdit(task: TaskRecord, onProgress: ProgressCallback): Promise<TaskResult> {
    const client = this.initClient();
    if (!client) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    if (!task.reference_image) {
      throw new Error('Reference image is required for image editing.');
    }

    onProgress(20, 'Encoding reference image for model...');
    let cleanBase64 = task.reference_image;
    let mimeType = 'image/png';

    if (cleanBase64.includes('base64,')) {
      const matches = cleanBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        cleanBase64 = matches[2];
      }
    }

    onProgress(45, 'Submitting transformation to Gemini model...');
    const model = task.model || 'gemini-3.1-flash-lite-image';

    const response = await client.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType
            }
          },
          {
            text: task.prompt || ''
          }
        ]
      }
    });

    onProgress(80, 'Extracting edited image result...');
    const parts = response.candidates?.[0]?.content?.parts || [];
    let base64Output = '';
    let outMime = 'image/png';

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        base64Output = part.inlineData.data;
        if (part.inlineData.mimeType) outMime = part.inlineData.mimeType;
        break;
      }
    }

    if (!base64Output) {
      throw new Error(`Image edit failed: ${response.text || 'No image output received'}`);
    }

    const outDir = this.ensureOutputDir('images');
    const ext = outMime.includes('jpeg') ? 'jpg' : 'png';
    const filename = `gemini_edit_${Date.now()}_${task.id.slice(0, 6)}.${ext}`;
    const fullPath = path.join(outDir, filename);

    fs.writeFileSync(fullPath, Buffer.from(base64Output, 'base64'));

    onProgress(100, 'Image editing complete');

    return {
      outputPath: fullPath,
      outputUrl: `/outputs/images/${filename}`,
      thumbnailUrl: `/outputs/images/${filename}`
    };
  }

  async executeVideoGen(task: TaskRecord, onProgress: ProgressCallback): Promise<TaskResult> {
    const client = this.initClient();
    if (!client) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    onProgress(10, 'Submitting Veo video generation request...');
    const model = this.normalizeVideoModel(task.model);
    const aspectRatio = (task.aspect_ratio === '9:16' ? '9:16' : '16:9') as '16:9' | '9:16';
    const resolution = (task.resolution === '1080p' ? '1080p' : '720p') as '720p' | '1080p';

    const videoConfig: any = {
      numberOfVideos: 1,
      resolution,
      aspectRatio
    };

    let startImgObj: any = undefined;
    if (task.reference_image) {
      let b64 = task.reference_image;
      let mType = 'image/png';
      if (b64.includes('base64,')) {
        const matches = b64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mType = matches[1];
          b64 = matches[2];
        }
      }
      startImgObj = {
        imageBytes: b64,
        mimeType: mType
      };
    }

    const operation = await client.models.generateVideos({
      model,
      prompt: task.prompt,
      image: startImgObj,
      config: videoConfig
    });

    onProgress(25, `Veo job submitted (Op: ${operation.name?.slice(-8)}). Polling progress...`);

    // Poll until completed
    const op = new GenerateVideosOperation();
    op.name = operation.name;

    let isDone = false;
    let pollCount = 0;
    const maxPolls = 60; // 5 mins max
    let downloadUri: string | undefined = undefined;

    while (!isDone && pollCount < maxPolls) {
      await new Promise((r) => setTimeout(r, 6000));
      pollCount++;

      const updated = await client.operations.getVideosOperation({ operation: op });
      const currentProgress = Math.min(25 + pollCount * 2, 85);
      onProgress(currentProgress, `Veo rendering in progress (elapsed ~${pollCount * 6}s)...`);

      if (updated.done) {
        isDone = true;
        downloadUri = updated.response?.generatedVideos?.[0]?.video?.uri;
      }
    }

    if (!downloadUri) {
      throw new Error('Video generation timed out or returned no download URI.');
    }

    onProgress(90, 'Downloading generated MP4 video stream...');
    const videoRes = await fetch(downloadUri, {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! }
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to download video file: HTTP ${videoRes.status}`);
    }

    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const outDir = this.ensureOutputDir('videos');
    const filename = `veo_${Date.now()}_${task.id.slice(0, 6)}.mp4`;
    const fullPath = path.join(outDir, filename);

    fs.writeFileSync(fullPath, videoBuffer);
    onProgress(100, 'Veo video rendered and saved to disk');

    return {
      outputPath: fullPath,
      outputUrl: `/outputs/videos/${filename}`,
      thumbnailUrl: `/outputs/videos/${filename}`
    };
  }
}
