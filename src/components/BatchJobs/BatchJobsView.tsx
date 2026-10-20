import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { BatchJob, Task } from '../../types';
import { 
  Layers, 
  Upload, 
  FileText, 
  Trash2, 
  Play, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Edit3, 
  RefreshCw 
} from 'lucide-react';

interface BatchDraftItem {
  id: string;
  prompt: string;
  referenceImage?: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  type: 'image_gen' | 'image_edit' | 'video_gen';
}

export const BatchJobsView: React.FC = () => {
  const { refreshData, addToast, setActiveTab, t } = useApp();

  const [rawPromptText, setRawPromptText] = useState('');
  const [draftItems, setDraftItems] = useState<BatchDraftItem[]>([]);
  const [batchName, setBatchName] = useState(`Batch_${new Date().toLocaleDateString().replace(/\//g, '-')}`);
  const [targetType, setTargetType] = useState<'image_gen' | 'video_gen'>('image_gen');
  const [selectedProvider, setSelectedProvider] = useState<'mock' | 'gemini'>('mock');
  const [selectedModel, setSelectedModel] = useState('mock-flux-schnell');
  const [commonAspectRatio, setCommonAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [pairingMethod, setPairingMethod] = useState<'one_to_one' | 'single_to_all' | 'prompts_only'>('prompts_only');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBatchJobs, setExistingBatchJobs] = useState<BatchJob[]>([]);
  const [activeTabSub, setActiveTabSub] = useState<'create' | 'history'>('create');

  // Load existing batch history
  useEffect(() => {
    loadBatchHistory();
  }, []);

  const loadBatchHistory = async () => {
    try {
      const jobs = await api.getBatchJobs();
      setExistingBatchJobs(jobs);
    } catch (e) {
      console.warn('Failed to load batch jobs:', e);
    }
  };

  const handleTxtFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setRawPromptText(text);
      parsePromptsToDraft(text, uploadedImages, pairingMethod, targetType, commonAspectRatio);
      addToast('info', `Imported prompts from ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleMultiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const loadedImages: string[] = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        loadedImages.push(reader.result as string);
        processed++;
        if (processed === files.length) {
          const all = [...uploadedImages, ...loadedImages];
          setUploadedImages(all);
          parsePromptsToDraft(rawPromptText, all, pairingMethod, targetType, commonAspectRatio);
          addToast('info', `Attached ${loadedImages.length} reference images`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const parsePromptsToDraft = (
    text: string,
    images: string[],
    pairing: 'one_to_one' | 'single_to_all' | 'prompts_only',
    type: 'image_gen' | 'video_gen',
    ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  ) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    const items: BatchDraftItem[] = lines.map((p, idx) => {
      let refImg: string | undefined = undefined;
      let itemType: any = type;

      if (pairing === 'one_to_one' && images[idx]) {
        refImg = images[idx];
        if (type === 'image_gen') itemType = 'image_edit';
      } else if (pairing === 'single_to_all' && images[0]) {
        refImg = images[0];
        if (type === 'image_gen') itemType = 'image_edit';
      }

      return {
        id: `draft_${idx + 1}`,
        prompt: p,
        referenceImage: refImg,
        aspectRatio: ratio,
        type: itemType
      };
    });

    setDraftItems(items);
  };

  const handleUpdateItemPrompt = (index: number, newPrompt: string) => {
    setDraftItems((prev) => {
      const updated = [...prev];
      updated[index].prompt = newPrompt;
      return updated;
    });
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddBlankItem = () => {
    setDraftItems((prev) => [
      ...prev,
      {
        id: `draft_${prev.length + 1}`,
        prompt: 'New custom prompt...',
        aspectRatio: commonAspectRatio,
        type: targetType
      }
    ]);
  };

  const handleEnqueueBatch = async () => {
    if (draftItems.length === 0) {
      addToast('warn', 'No draft items to enqueue. Add or import prompts first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Task>[] = draftItems.map((item) => ({
        type: item.type,
        prompt: item.prompt,
        reference_image: item.referenceImage,
        aspect_ratio: item.aspectRatio,
        provider: selectedProvider,
        model: selectedModel,
        resolution: '720p'
      }));

      const res = await api.enqueueBatch(payload, batchName);
      addToast('success', `Batch "${batchName}" queued with ${res.taskCount} tasks!`);
      await refreshData();
      await loadBatchHistory();
      setActiveTabSub('history');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to enqueue batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
            Module D · High-Throughput Batch Automation
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            {t('nav.batchJobs')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Process bulk prompts from .txt files, pair with local reference images, preview queue items, and execute concurrently.
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTabSub('create')}
            className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTabSub === 'create'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Draft & Builder
          </button>
          <button
            onClick={() => {
              setActiveTabSub('history');
              loadBatchHistory();
            }}
            className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTabSub === 'history'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Batch Job History ({existingBatchJobs.length})
          </button>
        </div>
      </div>

      {activeTabSub === 'create' ? (
        <div className="space-y-6">
          {/* Top Config Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Batch Job Name</label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Target Generation Type</label>
              <select
                value={targetType}
                onChange={(e) => {
                  const t = e.target.value as any;
                  setTargetType(t);
                  if (t === 'video_gen') {
                    setSelectedModel('mock-veo-ultra');
                  } else {
                    setSelectedModel('mock-flux-schnell');
                  }
                  parsePromptsToDraft(rawPromptText, uploadedImages, pairingMethod, t, commonAspectRatio);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="image_gen">AI Images (Image Synthesis)</option>
                <option value="video_gen">AI Videos (Veo Motion Sequences)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Provider & Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                {targetType === 'image_gen' ? (
                  <>
                    <option value="mock-flux-schnell">mock-flux-schnell (Local Fast)</option>
                    <option value="gemini-3.1-flash-lite-image">gemini-3.1-flash-lite-image (Official)</option>
                    <option value="gemini-nano-banana-2.1">gemini-nano-banana-2.1 (Ultra 4K)</option>
                  </>
                ) : (
                  <>
                    <option value="mock-veo-ultra">mock-veo-ultra (Local Fast)</option>
                    <option value="veo-3.1-lite-generate-preview">veo-3.1-lite-generate-preview</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Batch Aspect Ratio</label>
              <select
                value={commonAspectRatio}
                onChange={(e) => {
                  const r = e.target.value as any;
                  setCommonAspectRatio(r);
                  parsePromptsToDraft(rawPromptText, uploadedImages, pairingMethod, targetType, r);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="1:1">1:1 Square</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="9:16">9:16 Portrait</option>
                <option value="4:3">4:3 Standard</option>
                <option value="3:4">3:4 Editorial</option>
              </select>
            </div>
          </div>

          {/* Import Dropzones & Textarea */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Prompts Input & .txt import */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Prompt List (.txt or multiline)</span>
                </span>
                <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer transition-colors font-medium">
                  Load .txt file
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleTxtFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={rawPromptText}
                onChange={(e) => {
                  setRawPromptText(e.target.value);
                  parsePromptsToDraft(e.target.value, uploadedImages, pairingMethod, targetType, commonAspectRatio);
                }}
                rows={6}
                placeholder="Paste prompts here (one per line):&#10;Cyberpunk girl in neon alley holding an umbrella&#10;Majestic lion crowned with gold in savanna sunset&#10;Vintage 1960s café in Paris with rain outside..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
              />
              <div className="text-[11px] text-slate-500 font-mono">
                {draftItems.length} valid prompt lines identified
              </div>
            </div>

            {/* Reference Images Multi-Upload & Pairing Convention */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Reference Photos ({uploadedImages.length} loaded)</span>
                </span>
                <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer transition-colors font-medium">
                  Select Images
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMultiImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Pairing Logic Selector */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Pairing Convention (Quy ước ghép ảnh)</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPairingMethod('prompts_only');
                      parsePromptsToDraft(rawPromptText, uploadedImages, 'prompts_only', targetType, commonAspectRatio);
                    }}
                    className={`py-1.5 px-2 rounded border text-center transition-colors ${
                      pairingMethod === 'prompts_only'
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    No Image (Text only)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPairingMethod('one_to_one');
                      parsePromptsToDraft(rawPromptText, uploadedImages, 'one_to_one', targetType, commonAspectRatio);
                    }}
                    className={`py-1.5 px-2 rounded border text-center transition-colors ${
                      pairingMethod === 'one_to_one'
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    1-to-1 Sequence
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPairingMethod('single_to_all');
                      parsePromptsToDraft(rawPromptText, uploadedImages, 'single_to_all', targetType, commonAspectRatio);
                    }}
                    className={`py-1.5 px-2 rounded border text-center transition-colors ${
                      pairingMethod === 'single_to_all'
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Single Image for All
                  </button>
                </div>
              </div>

              {/* Mini thumbnails preview */}
              <div className="h-24 bg-slate-950 rounded-lg border border-slate-800/80 p-2 overflow-x-auto flex items-center gap-2">
                {uploadedImages.length === 0 ? (
                  <div className="w-full text-center text-xs text-slate-600">
                    No images uploaded yet. (Optional if creating purely from prompts)
                  </div>
                ) : (
                  uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded bg-slate-900 border border-slate-800 shrink-0 overflow-hidden">
                      <img src={img} alt={`Ref ${idx}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 bg-slate-950/80 text-[9px] font-mono px-1 text-slate-300">
                        #{idx + 1}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Interactive Editable Draft Table */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Pre-Run Execution Table ({draftItems.length} tasks ready)
                </h3>
                <p className="text-xs text-slate-400">
                  Inspect, edit individual prompts, or remove unwanted items before queue submission.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddBlankItem}
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>

                <button
                  type="button"
                  onClick={handleEnqueueBatch}
                  disabled={draftItems.length === 0 || isSubmitting}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Enqueue Batch ({draftItems.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {draftItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Draft table is empty. Type prompts or load a .txt file above.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono text-[11px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4 w-12">#</th>
                      <th className="py-2.5 px-4">Prompt Description</th>
                      <th className="py-2.5 px-4 w-28">Ref Image</th>
                      <th className="py-2.5 px-4 w-24">Ratio</th>
                      <th className="py-2.5 px-4 w-28">Type</th>
                      <th className="py-2.5 px-4 w-16 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {draftItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={item.prompt}
                            onChange={(e) => handleUpdateItemPrompt(idx, e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none text-slate-200 py-0.5"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          {item.referenceImage ? (
                            <img
                              src={item.referenceImage}
                              alt="Ref"
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded object-cover border border-slate-800"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">None</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">{item.aspectRatio}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-cyan-400 uppercase">
                          {item.type.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleRemoveDraftItem(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History of Batches Tab */
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Saved Batch Runs</h3>
            <button
              onClick={loadBatchHistory}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {existingBatchJobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No batch runs recorded yet. Create one in the Builder tab.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {existingBatchJobs.map((job) => {
                const percent = Math.round(
                  ((job.completed_items + job.failed_items) / Math.max(1, job.total_items)) * 100
                );
                return (
                  <div key={job.id} className="p-4 hover:bg-slate-800/40 transition-colors space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{job.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">{job.id}</span>
                      </div>
                      <span className={`font-mono text-[11px] uppercase font-semibold ${
                        job.status === 'completed' ? 'text-emerald-400' : 'text-cyan-400'
                      }`}>
                        {job.status} ({percent}%)
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Total: {job.total_items} items</span>
                      <span>{job.completed_items} succeeded · {job.failed_items} failed</span>
                      <span>Started: {new Date(job.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
