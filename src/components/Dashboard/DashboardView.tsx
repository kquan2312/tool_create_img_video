import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Play, 
  Layers, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  FolderOpen, 
  Terminal,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { stats, recentMedia, logs, setActiveTab, setIsQueueDrawerOpen, t } = useApp();
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  const kpis = [
    { label: 'Total Tasks', value: stats.total, icon: Layers, color: 'text-slate-100', border: 'border-slate-800' },
    { label: 'Active Running', value: stats.running, icon: TrendingUp, color: 'text-cyan-400', border: 'border-cyan-500/30' },
    { label: 'Queued (Pending)', value: stats.pending, icon: Clock, color: 'text-amber-400', border: 'border-amber-500/30' },
    { label: 'Succeeded', value: stats.succeeded, icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/30' },
    { label: 'Failed (Errors)', value: stats.failed, icon: AlertCircle, color: 'text-rose-400', border: 'border-rose-500/30' },
  ];

  const successRate = stats.total > 0 
    ? Math.round((stats.succeeded / Math.max(1, stats.succeeded + stats.failed)) * 100) 
    : 100;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
            Overview · Workstation Monitor
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            {t('nav.dashboard')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time pipeline statistics, active worker throughput, and recent generated artifacts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsQueueDrawerOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium flex items-center gap-2 transition-colors"
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>View Live Queue</span>
            <span className="font-mono text-xs px-1.5 py-0.2 bg-slate-800 rounded text-cyan-300">
              {stats.running + stats.pending}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl bg-slate-900/90 border ${kpi.border} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className="mt-3">
                <span className={`text-2xl font-bold font-mono tracking-tight ${kpi.color}`}>
                  {kpi.value.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Launch Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('image_gen')}
          className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mt-3 group-hover:text-cyan-300 transition-colors">
              AI Image Generator
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Text-to-Image & Image-to-Image synthesis with aspect ratios, negative prompts, and high-res models.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-cyan-400 font-medium mt-4">
            <span>Launch Image Studio</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => setActiveTab('video_gen')}
          className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
              <VideoIcon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mt-3 group-hover:text-indigo-300 transition-colors">
              Veo AI Video Generator
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Generate 720p/1080p motion sequences from text prompts or reference start/end frames.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-indigo-400 font-medium mt-4">
            <span>Launch Video Studio</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => setActiveTab('batch_jobs')}
          className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mt-3 group-hover:text-emerald-300 transition-colors">
              Batch Processing Pipeline
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Import prompts from .txt, pair with reference photos, preview queue table, and execute in bulk.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium mt-4">
            <span>Open Batch Runner</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Two Column Layout: Recent Media Gallery & Live Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Media (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-xl border border-slate-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Recent Generated Media</h2>
              <p className="text-xs text-slate-400">Outputs generated in local workspace</p>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View Gallery</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentMedia.length === 0 ? (
            <div className="flex-1 min-h-[220px] rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center">
              <ImageIcon className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-400">No media generated yet</p>
              <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                Start generating images or videos using the sidebar tools to see results here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentMedia.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedia(item)}
                  className="group relative aspect-square rounded-lg bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-colors"
                >
                  <img
                    src={item.output_url || item.thumbnail_url}
                    alt={item.prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                    <span className="text-[10px] font-mono text-cyan-300 uppercase">
                      {item.type}
                    </span>
                    <p className="text-[11px] text-slate-200 truncate">{item.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Activity Log Console (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-xl border border-slate-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Live Activity Log</h2>
                <p className="text-[11px] text-slate-400">SQLite real-time stream</p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              {logs.length} events
            </span>
          </div>

          <div className="flex-1 min-h-[220px] max-h-[300px] bg-slate-950 rounded-lg p-3 overflow-y-auto font-mono text-[11px] space-y-2 border border-slate-800/80">
            {logs.length === 0 ? (
              <div className="text-slate-500 py-4 text-center">No activity recorded yet.</div>
            ) : (
              logs.map((log) => {
                let badgeColor = 'text-cyan-400';
                if (log.level === 'warn') badgeColor = 'text-amber-400';
                if (log.level === 'error') badgeColor = 'text-rose-400';
                if (log.level === 'success') badgeColor = 'text-emerald-400';

                return (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-500 shrink-0">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                    <span className={`shrink-0 uppercase font-semibold ${badgeColor}`}>
                      [{log.level}]
                    </span>
                    <span className="text-slate-300 break-all">{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Selected Media */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-200">
                Generated Asset Preview · {selectedMedia.type}
              </span>
              <button
                onClick={() => setSelectedMedia(null)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
              <img
                src={selectedMedia.output_url}
                alt={selectedMedia.prompt}
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-400">Prompt</div>
              <p className="text-xs text-slate-200 font-medium">{selectedMedia.prompt}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="font-mono text-slate-500">ID: {selectedMedia.id}</span>
              <a
                href={selectedMedia.output_url}
                download
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors"
              >
                Download File
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
