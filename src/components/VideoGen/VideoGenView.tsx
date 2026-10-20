import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { 
  Video, 
  Upload, 
  Sparkles, 
  Trash2, 
  RefreshCw, 
  Download, 
  Play, 
  Film, 
  Layers, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

export const VideoGenView: React.FC = () => {
  const { refreshData, addToast, tasks, t } = useApp();

  const [mode, setMode] = useState<'text2video' | 'image2video'>('text2video');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'mock'>('mock');
  const [selectedModel, setSelectedModel] = useState('mock-veo-ultra');
  const [startImage, setStartImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Check for image forwarded from Image Generator
  useEffect(() => {
    const forwardedImg = sessionStorage.getItem('dgt_video_ref_image');
    const forwardedPrompt = sessionStorage.getItem('dgt_video_prompt');
    if (forwardedImg) {
      setStartImage(forwardedImg);
      setMode('image2video');
      sessionStorage.removeItem('dgt_video_ref_image');
    }
    if (forwardedPrompt) {
      setPrompt(forwardedPrompt);
      sessionStorage.removeItem('dgt_video_prompt');
    }
  }, []);

  // Track the submitted video task in real-time
  const activeTask = tasks.find((t) => t.id === activeTaskId);

  const handleStartImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setStartImage(reader.result as string);
      setMode('image2video');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !startImage) {
      addToast('warn', 'Please specify a prompt or starting image');
      return;
    }

    setIsSubmitting(true);
    try {
      const task = await api.createTask({
        type: 'video_gen',
        prompt,
        reference_image: mode === 'image2video' ? (startImage || undefined) : undefined,
        provider: selectedProvider,
        model: selectedModel,
        aspect_ratio: aspectRatio,
        resolution
      });

      setActiveTaskId(task.id);
      addToast('success', `Veo video task started: ${task.id}`);
      await refreshData();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to start video generation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800/80 pb-4">
        <div className="text-xs font-mono text-indigo-400 uppercase tracking-wider">
          Module C · Veo Video Engine
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">
          {t('nav.videoGen')}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Generate cinematic AI videos from text or animate starting reference frames with Veo motion synthesis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('text2video')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                mode === 'text2video'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Text-to-Video (Tạo video từ prompt)
            </button>
            <button
              type="button"
              onClick={() => setMode('image2video')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                mode === 'image2video'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Image-to-Video (Tạo video từ ảnh tham chiếu)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-200">Motion Description Prompt</label>
                <span className="text-slate-500 font-mono text-[11px]">{prompt.length} chars</span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe cinematic camera movement, subject action, lighting transitions, e.g. 'Slow drone fly-through over misty alpine mountains at dawn, 4k 24fps cinema look'..."
                rows={4}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
              />
            </div>

            {/* Starting Image Upload for image2video */}
            {mode === 'image2video' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Start Frame (Ảnh khởi đầu)</label>
                {startImage ? (
                  <div className="relative rounded-lg border border-indigo-500/40 bg-slate-950 p-2 flex items-center gap-3">
                    <img
                      src={startImage}
                      alt="Start Frame"
                      referrerPolicy="no-referrer"
                      className="w-20 h-14 rounded object-cover border border-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 font-medium truncate">First frame loaded</p>
                      <p className="text-[11px] text-indigo-400">Veo will simulate motion beginning from this image</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStartImage(null)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-900/50">
                    <input
                      type="file"
                      id="video-img-upload"
                      accept="image/*"
                      onChange={handleStartImageUpload}
                      className="hidden"
                    />
                    <label htmlFor="video-img-upload" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-6 h-6 text-indigo-400 mb-2" />
                      <span className="text-xs font-medium text-slate-200">
                        Upload starting reference image
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        PNG or JPG (Will be converted to first frame)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Aspect Ratio & Resolution Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      aspectRatio === '16:9'
                        ? 'border-indigo-500 bg-indigo-950/30 text-indigo-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-semibold block">16:9</span>
                    <span className="text-[10px] text-slate-500">Landscape (YouTube)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      aspectRatio === '9:16'
                        ? 'border-indigo-500 bg-indigo-950/30 text-indigo-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-semibold block">9:16</span>
                    <span className="text-[10px] text-slate-500">Vertical (TikTok/Reels)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Resolution (Độ phân giải)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolution('720p')}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      resolution === '720p'
                        ? 'border-indigo-500 bg-indigo-950/30 text-indigo-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-semibold block">720p HD</span>
                    <span className="text-[10px] text-slate-500">Fast Render</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolution('1080p')}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      resolution === '1080p'
                        ? 'border-indigo-500 bg-indigo-950/30 text-indigo-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span className="text-xs font-semibold block">1080p FHD</span>
                    <span className="text-[10px] text-slate-500">Full Quality</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Provider & Model Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Video Engine</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    const p = e.target.value as any;
                    setSelectedProvider(p);
                    if (p === 'gemini') setSelectedModel('veo-3.1-lite-generate-preview');
                    else setSelectedModel('mock-veo-ultra');
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="mock">Local Studio Engine (Mock Simulation)</option>
                  <option value="gemini">Google DeepMind Veo (Official)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Veo Model Specification</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {selectedProvider === 'gemini' ? (
                    <>
                      <option value="veo_3_1_fast">veo_3_1_fast (Veo 3.1 Fast - Tool Gốc)</option>
                      <option value="veo_3_1_lite">veo_3_1_lite (Veo 3.1 Lite - Tool Gốc)</option>
                      <option value="veo_3_1_lite_low_priority">veo_3_1_lite_low_priority (Veo 3.1 Hàng đợi tiết kiệm)</option>
                      <option value="veo-3.1-generate-preview">veo-3.1-generate-preview (Veo 3.1 Pro Cinematic)</option>
                    </>
                  ) : (
                    <option value="mock-veo-ultra">mock-veo-ultra (Local 24fps motion simulation)</option>
                  )}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Veo Sequence...</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Start Veo Video Generation</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Video Playback & Render Status (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-xl border border-slate-800 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-200">Video Player & Render Monitor</span>
              <span className="text-[11px] font-mono text-slate-500">
                {activeTask?.status === 'running' ? 'Rendering' : 'Idle'}
              </span>
            </div>

            {/* Player Container */}
            <div className="aspect-video bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden relative">
              {activeTask?.status === 'running' ? (
                <div className="text-center p-6 space-y-3">
                  <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-medium text-indigo-300">Veo Spatio-Temporal Synthesis</p>
                  <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(10, activeTask.progress)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">Progress: {activeTask.progress}%</p>
                </div>
              ) : activeTask?.output_url ? (
                activeTask.output_url.endsWith('.mp4') ? (
                  <video
                    src={activeTask.output_url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={activeTask.output_url}
                    alt="Video Simulation"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Film className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-xs text-slate-400">No active video render</p>
                  <p className="text-[11px] text-slate-600 max-w-xs">
                    Configure motion prompt and aspect ratio on the left to initiate video generation.
                  </p>
                </div>
              )}
            </div>

            {/* Active Task Info */}
            {activeTask && (
              <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                  <span>ID: {activeTask.id}</span>
                  <span className={`font-semibold uppercase ${
                    activeTask.status === 'succeeded' ? 'text-emerald-400' :
                    activeTask.status === 'failed' ? 'text-rose-400' : 'text-indigo-400'
                  }`}>
                    {activeTask.status}
                  </span>
                </div>
                <p className="text-slate-300 truncate">{activeTask.prompt}</p>
                {activeTask.error_message && (
                  <div className="flex items-start gap-1.5 text-rose-400 font-mono text-[10px] pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{activeTask.error_message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {activeTask?.output_url && activeTask.status === 'succeeded' && (
            <div className="pt-2 border-t border-slate-800">
              <a
                href={activeTask.output_url}
                download
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Video File</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
