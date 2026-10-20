import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { 
  Sparkles, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Download, 
  Video, 
  Layers, 
  Maximize2,
  Sliders,
  Check
} from 'lucide-react';

export const ImageGenView: React.FC = () => {
  const { providers, refreshData, addToast, setActiveTab, t } = useApp();

  const [mode, setMode] = useState<'txt2img' | 'img2img'>('txt2img');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'mock' | 'grok'>('mock');
  const [selectedModel, setSelectedModel] = useState('mock-flux-schnell');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastGeneratedTask, setLastGeneratedTask] = useState<any | null>(null);

  const ratios: { id: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'; label: string; desc: string; iconW: string; iconH: string }[] = [
    { id: '1:1', label: '1:1', desc: 'Square', iconW: 'w-5', iconH: 'h-5' },
    { id: '16:9', label: '16:9', desc: 'Landscape', iconW: 'w-7', iconH: 'h-4' },
    { id: '9:16', label: '9:16', desc: 'Portrait', iconW: 'w-4', iconH: 'h-7' },
    { id: '4:3', label: '4:3', desc: 'Classic', iconW: 'w-6', iconH: 'h-4.5' },
    { id: '3:4', label: '3:4', desc: 'Editorial', iconW: 'w-4.5', iconH: 'h-6' },
  ];

  const presetPrompts = [
    'A cinematic photorealistic portrait of an astronaut on Mars, golden hour sunset, atmospheric dust, Hasselblad 80mm lens',
    'Modern cybernetic sports car speeding through a rain-slicked Tokyo boulevard, neon reflections, anamorphic flares',
    'Studio product photography of an artisanal espresso machine on matte dark slate surface, dramatic soft rim lighting',
    'A fantasy ancient library carved inside an emerald crystal cavern, floating glowing parchment, hyper-detailed'
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      addToast('error', 'Image file is too large (max 15MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
      setMode('img2img');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setReferenceImage(reader.result as string);
        setMode('img2img');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !referenceImage) {
      addToast('warn', 'Please enter a prompt or upload a reference image');
      return;
    }

    setIsSubmitting(true);
    try {
      const task = await api.createTask({
        type: mode === 'img2img' && referenceImage ? 'image_edit' : 'image_gen',
        prompt,
        negative_prompt: negativePrompt,
        reference_image: mode === 'img2img' ? (referenceImage || undefined) : undefined,
        provider: selectedProvider,
        model: selectedModel,
        aspect_ratio: aspectRatio
      });

      setLastGeneratedTask(task);
      addToast('success', `Task queued: ${task.id}`);
      await refreshData();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to submit generation task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToVideo = () => {
    if (lastGeneratedTask?.output_url) {
      sessionStorage.setItem('dgt_video_ref_image', lastGeneratedTask.output_url);
      sessionStorage.setItem('dgt_video_prompt', prompt);
      setActiveTab('video_gen');
      addToast('info', 'Loaded image into Veo Video Generator');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800/80 pb-4">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
          Module B · Image Synthesis
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">
          {t('nav.imageGen')}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Generate production-grade imagery from natural language or edit existing reference pictures with diffusion models.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('txt2img')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                mode === 'txt2img'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Text-to-Image (Tạo từ prompt)
            </button>
            <button
              type="button"
              onClick={() => setMode('img2img')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                mode === 'img2img'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Image-to-Image (Chỉnh sửa từ ảnh tham chiếu)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Prompt Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-200">Prompt Description</label>
                <span className="text-slate-500 font-mono text-[11px]">{prompt.length} chars</span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the scene, subject, lighting, camera angle, and rendering style..."
                rows={4}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors leading-relaxed"
              />

              {/* Preset Prompts Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presetPrompts.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(preset)}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors text-left truncate max-w-xs"
                    title={preset}
                  >
                    Preset {idx + 1}: {preset.slice(0, 30)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Image Drag & Drop (Only for img2img or optional reference) */}
            {mode === 'img2img' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Reference Image (Ảnh gốc)</label>
                {referenceImage ? (
                  <div className="relative rounded-lg border border-cyan-500/40 bg-slate-950 p-2 flex items-center gap-3">
                    <img
                      src={referenceImage}
                      alt="Reference"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded object-cover border border-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 font-medium truncate">Reference photo attached</p>
                      <p className="text-[11px] text-cyan-400">Ready for AI contour blending & modification</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReferenceImage(null)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-900/50"
                  >
                    <input
                      type="file"
                      id="img-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label htmlFor="img-upload" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-7 h-7 text-cyan-400 mb-2" />
                      <span className="text-xs font-medium text-slate-200">
                        Click to upload or drag & drop reference image
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        PNG, JPG, WEBP up to 15MB
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Aspect Ratio (Tỷ lệ khung hình)</label>
              <div className="grid grid-cols-5 gap-2">
                {ratios.map((r) => {
                  const isSel = aspectRatio === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAspectRatio(r.id)}
                      className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                        isSel
                          ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className={`border border-current rounded-sm ${r.iconW} ${r.iconH} flex items-center justify-center`} />
                      <span className="text-xs font-semibold">{r.label}</span>
                      <span className="text-[10px] text-slate-500">{r.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider & Model Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">AI Engine Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    const p = e.target.value as any;
                    setSelectedProvider(p);
                    if (p === 'gemini') setSelectedModel('gemini-3.1-flash-lite-image');
                    else if (p === 'mock') setSelectedModel('mock-flux-schnell');
                    else setSelectedModel('grok-imagine-1.0');
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="mock">Local Studio Engine (Offline / Mock)</option>
                  <option value="gemini">Google DeepMind (Gemini / Imagen)</option>
                  <option value="grok">xAI Grok Imagine (Adapter)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Target Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {selectedProvider === 'gemini' ? (
                    <>
                      <option value="imagen-3-fast">Imagen 3 Fast (Google Flow / Imagegen)</option>
                      <option value="gemini-3.1-flash-lite-image">gemini-3.1-flash-lite-image (Official Fast)</option>
                      <option value="gemini-nano-banana-2.1">Imagen 3 Ultra Photoreal (4K Banana)</option>
                      <option value="mi-gan-inpainter">MI-GAN Neural Inpainter (Chỉnh sửa ảnh gốc)</option>
                    </>
                  ) : selectedProvider === 'mock' ? (
                    <>
                      <option value="mock-flux-schnell">mock-flux-schnell (Local Fast Diffusion)</option>
                      <option value="mock-mi-gan">mock-mi-gan (Mô phỏng phục chế ảnh MI-GAN)</option>
                    </>
                  ) : (
                    <>
                      <option value="grok-imagine-1.0">Grok Imagine 1.0 (xAI Imagine Engine)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Negative Prompt (Collapsible or input) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Negative Prompt (Tùy chọn)</label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, distorted, extra limbs, low quality artifacts..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enqueuing Task...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('action.generate')} ({mode === 'txt2img' ? 'Text to Image' : 'Edit Image'})</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Live Result & Preview Area (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-xl border border-slate-800 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-200">Generated Output Preview</span>
              <span className="text-[11px] font-mono text-slate-500">Live Frame</span>
            </div>

            <div className="aspect-square bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-center overflow-hidden relative group">
              {lastGeneratedTask?.output_url ? (
                <img
                  src={lastGeneratedTask.output_url}
                  alt={lastGeneratedTask.prompt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-xs text-slate-400">No image generated in this session yet</p>
                  <p className="text-[11px] text-slate-600 max-w-xs">
                    Configure your prompt on the left and click "Start Generation". Output will render here.
                  </p>
                </div>
              )}
            </div>

            {lastGeneratedTask && (
              <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                  <span>Task: {lastGeneratedTask.id}</span>
                  <span className="text-cyan-400 font-semibold">{lastGeneratedTask.status}</span>
                </div>
                <p className="text-slate-300 truncate">{lastGeneratedTask.prompt}</p>
              </div>
            )}
          </div>

          {/* Quick Actions for Generated Result */}
          {lastGeneratedTask?.output_url && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={lastGeneratedTask.output_url}
                  download
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <button
                  onClick={handleSendToVideo}
                  className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Send to Video AI</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
