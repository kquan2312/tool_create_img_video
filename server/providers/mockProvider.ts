import fs from 'fs';
import path from 'path';
import { AIProviderAdapter, ProgressCallback, ProviderStatus } from './providerAdapter';
import { TaskRecord } from '../db/sqlite';
import { TaskResult } from '../queue/types';

export class MockLocalProvider implements AIProviderAdapter {
  readonly id = 'mock';
  readonly name = 'Local Studio Engine (Mock / Offline)';

  private ensureOutputDir(type: 'images' | 'videos'): string {
    const dir = path.resolve(process.cwd(), 'outputs', type);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async getStatus(): Promise<ProviderStatus> {
    return {
      providerId: this.id,
      name: this.name,
      isAvailable: true,
      statusMessage: 'Ready for offline and zero-cost pipeline validation',
      supportedTypes: ['image_gen', 'image_edit', 'video_gen'],
      supportedModels: [
        { id: 'mock-flux-schnell', name: 'Local Fast Diffusion 1.0', type: 'image', description: 'Fast offline synthetic generator' },
        { id: 'mock-veo-ultra', name: 'Veo Emulated Motion Engine', type: 'video', description: 'Simulated 24fps AI video renderer' }
      ]
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 120));
    return {
      success: true,
      message: 'Local Engine operational. Output directory verified and writable.',
      latencyMs: Date.now() - start
    };
  }

  private createSvgImage(prompt: string, aspectRatio: string, isEdit = false, refImg?: string): string {
    let width = 800;
    let height = 800;
    if (aspectRatio === '16:9') { width = 960; height = 540; }
    else if (aspectRatio === '9:16') { width = 540; height = 960; }
    else if (aspectRatio === '4:3') { width = 800; height = 600; }
    else if (aspectRatio === '3:4') { width = 600; height = 800; }

    const colors = [
      ['#0f172a', '#1e293b', '#0284c7'],
      ['#09090b', '#27272a', '#d97706'],
      ['#022c22', '#064e3b', '#10b981'],
      ['#1e1b4b', '#312e81', '#8b5cf6'],
      ['#1f2937', '#111827', '#ec4899']
    ];
    const pal = colors[Math.abs(prompt.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % colors.length];

    const safePrompt = prompt.replace(/[<&"]/g, ' ').substring(0, 70);

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${pal[0]}" />
            <stop offset="60%" stop-color="${pal[1]}" />
            <stop offset="100%" stop-color="${pal[2]}" />
          </linearGradient>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" />
            <feComposite in2="SourceGraphic" in="gl" operator="in" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <circle cx="${width * 0.7}" cy="${height * 0.3}" r="${Math.min(width, height) * 0.28}" fill="${pal[2]}" opacity="0.35" filter="blur(30px)" />
        <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="12" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" />
        
        <g transform="translate(48, ${height - 120})">
          <text x="0" y="0" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="20" font-weight="700">
            ${isEdit ? '⚡ AI Image Edit (Reference Blended)' : '✨ AI Generated Artwork'}
          </text>
          <text x="0" y="28" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">
            "${safePrompt}..."
          </text>
          <text x="0" y="52" fill="#38bdf8" font-family="monospace" font-size="12">
            RATIO: ${aspectRatio} · RES: ${width}x${height} · DGT STUDIO V1.5.4
          </text>
        </g>
      </svg>
    `.trim();
  }

  async executeImageGen(task: TaskRecord, onProgress: ProgressCallback): Promise<TaskResult> {
    onProgress(15, 'Preparing prompts and sampling latent seed...');
    await new Promise((r) => setTimeout(r, 600));

    onProgress(45, 'Synthesizing visual layers and textures...');
    await new Promise((r) => setTimeout(r, 800));

    onProgress(85, 'Denoising and exporting raster file...');
    await new Promise((r) => setTimeout(r, 600));

    const outDir = this.ensureOutputDir('images');
    const filename = `img_${Date.now()}_${task.id.slice(0, 6)}.svg`;
    const fullPath = path.join(outDir, filename);

    const svgContent = this.createSvgImage(task.prompt, task.aspect_ratio, false);
    fs.writeFileSync(fullPath, svgContent, 'utf-8');

    onProgress(100, 'Generation complete');

    return {
      outputPath: fullPath,
      outputUrl: `/outputs/images/${filename}`,
      thumbnailUrl: `/outputs/images/${filename}`,
      durationMs: 2000
    };
  }

  async executeImageEdit(task: TaskRecord, onProgress: ProgressCallback): Promise<TaskResult> {
    onProgress(20, 'Analyzing reference image input contours...');
    await new Promise((r) => setTimeout(r, 700));

    onProgress(60, 'Applying prompt transformations...');
    await new Promise((r) => setTimeout(r, 900));

    onProgress(90, 'Blending reference layers with generated elements...');
    await new Promise((r) => setTimeout(r, 500));

    const outDir = this.ensureOutputDir('images');
    const filename = `edit_${Date.now()}_${task.id.slice(0, 6)}.svg`;
    const fullPath = path.join(outDir, filename);

    const svgContent = this.createSvgImage(task.prompt, task.aspect_ratio, true, task.reference_image);
    fs.writeFileSync(fullPath, svgContent, 'utf-8');

    onProgress(100, 'Image edit completed');

    return {
      outputPath: fullPath,
      outputUrl: `/outputs/images/${filename}`,
      thumbnailUrl: `/outputs/images/${filename}`,
      durationMs: 2100
    };
  }

  async executeVideoGen(task: TaskRecord, onProgress: ProgressCallback): Promise<TaskResult> {
    onProgress(10, 'Initializing motion vector field and camera path...');
    await new Promise((r) => setTimeout(r, 1000));

    onProgress(35, 'Interpolating spatio-temporal frames (Veo sequence)...');
    await new Promise((r) => setTimeout(r, 1500));

    onProgress(70, 'Encoding video bitstream (H.264 / AAC audio)...');
    await new Promise((r) => setTimeout(r, 1200));

    onProgress(90, 'Packaging video container and generating poster thumbnail...');
    await new Promise((r) => setTimeout(r, 800));

    const outDir = this.ensureOutputDir('videos');
    const filename = `video_${Date.now()}_${task.id.slice(0, 6)}.svg`;
    const fullPath = path.join(outDir, filename);

    // Create an animated SVG simulating video motion preview
    const svgVideoSim = `
      <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
        <defs>
          <radialGradient id="vGrad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#020617" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#vGrad)" />
        
        <circle cx="480" cy="270" r="160" fill="none" stroke="#0ea5e9" stroke-width="2" opacity="0.6">
          <animate attributeName="r" values="80;220;80" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.2;0.8" dur="4s" repeatCount="indefinite" />
        </circle>
        
        <circle cx="480" cy="270" r="110" fill="none" stroke="#6366f1" stroke-width="3" stroke-dasharray="10 15">
          <animateTransform attributeName="transform" type="rotate" from="0 480 270" to="360 480 270" dur="8s" repeatCount="indefinite" />
        </circle>

        <!-- Video Player Overlay Badge -->
        <g transform="translate(480, 270)">
          <polygon points="-16,-24 24,0 -16,24" fill="#38bdf8" opacity="0.9" />
        </g>

        <rect x="30" y="470" width="900" height="40" rx="8" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255,255,255,0.1)" />
        <text x="50" y="495" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="14" font-weight="600">
          ▶ VEO AI MOTION SEQUENCE: "${task.prompt.slice(0, 60).replace(/[<&"]/g, ' ')}"
        </text>
        <text x="820" y="495" fill="#38bdf8" font-family="monospace" font-size="12">
          720P · 5.0S
        </text>
      </svg>
    `.trim();

    fs.writeFileSync(fullPath, svgVideoSim, 'utf-8');

    onProgress(100, 'Video generation complete');

    return {
      outputPath: fullPath,
      outputUrl: `/outputs/videos/${filename}`,
      thumbnailUrl: `/outputs/videos/${filename}`,
      durationMs: 4500
    };
  }
}
