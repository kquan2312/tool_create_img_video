import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { 
  Film, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Download, 
  Search, 
  ExternalLink,
  Layers,
  Copy,
  Check
} from 'lucide-react';

export const HistoryGalleryView: React.FC = () => {
  const { tasks, addToast, t } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [search, setSearch] = useState('');
  const [activeMedia, setActiveMedia] = useState<Task | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const completedMedia = tasks.filter((t) => {
    if (t.status !== 'succeeded' || !t.output_url) return false;
    const matchesSearch = t.prompt.toLowerCase().includes(search.toLowerCase());
    if (filterType === 'image') return matchesSearch && t.type !== 'video_gen';
    if (filterType === 'video') return matchesSearch && t.type === 'video_gen';
    return matchesSearch;
  });

  const handleCopyPrompt = (prompt: string, id: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    addToast('info', 'Prompt copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
            Module F · Output Storage & History
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            {t('nav.history')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Browse all completed AI visual assets, inspect generation metadata, or download batch archive.
          </p>
        </div>

        {/* Download All as ZIP button */}
        <a
          href="/api/batch/export-zip"
          download
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow"
        >
          <Download className="w-4 h-4" />
          <span>{t('action.exportZip')}</span>
        </a>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gallery by prompt description..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterType === 'all' ? 'bg-slate-800 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Media ({tasks.filter((t) => t.status === 'succeeded').length})
          </button>
          <button
            onClick={() => setFilterType('image')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterType === 'image' ? 'bg-slate-800 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Images Only
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterType === 'video' ? 'bg-slate-800 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Videos Only
          </button>
        </div>
      </div>

      {/* Visual Gallery Grid */}
      {completedMedia.length === 0 ? (
        <div className="p-16 rounded-xl border border-dashed border-slate-800 text-center flex flex-col items-center justify-center space-y-2">
          <Film className="w-10 h-10 text-slate-700" />
          <p className="text-sm font-medium text-slate-400">No media found in history</p>
          <p className="text-xs text-slate-600 max-w-sm">
            Generated items that complete successfully are preserved in local SQLite storage and will display here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {completedMedia.map((media) => (
            <div
              key={media.id}
              onClick={() => setActiveMedia(media)}
              className="group relative aspect-square rounded-xl bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-all shadow-md"
            >
              <img
                src={media.output_url || media.thumbnail_url}
                alt={media.prompt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Type pill in corner */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] font-mono text-cyan-300 uppercase">
                {media.type === 'video_gen' ? 'VIDEO' : 'IMAGE'}
              </div>

              {/* Hover overlay with prompt info */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                <p className="text-xs text-slate-200 line-clamp-2 leading-snug">
                  {media.prompt}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>{media.aspect_ratio}</span>
                  <span>{media.provider}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeMedia && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-100">Media Inspector</span>
                <span className="text-xs font-mono text-cyan-400">· {activeMedia.type}</span>
              </div>
              <button
                onClick={() => setActiveMedia(null)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center relative">
              {activeMedia.output_url?.endsWith('.mp4') ? (
                <video
                  src={activeMedia.output_url}
                  controls
                  autoPlay
                  loop
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <img
                  src={activeMedia.output_url}
                  alt={activeMedia.prompt}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Prompt:</span>
                <button
                  onClick={() => handleCopyPrompt(activeMedia.prompt, activeMedia.id)}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-[11px]"
                >
                  {copiedId === activeMedia.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Prompt</span>
                </button>
              </div>
              <p className="text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                {activeMedia.prompt}
              </p>

              <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <div>Model: <span className="text-slate-200">{activeMedia.model}</span></div>
                <div>Ratio: <span className="text-slate-200">{activeMedia.aspect_ratio}</span></div>
                <div>Time: <span className="text-slate-200">{new Date(activeMedia.completed_at || activeMedia.created_at).toLocaleString()}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="font-mono text-slate-500 text-[11px]">Local File: {activeMedia.output_path}</span>
              <a
                href={activeMedia.output_url}
                download
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium flex items-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save to Disk</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
