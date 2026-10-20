import React from 'react';
import { useApp } from '../../context/AppContext';
import { Play, Pause, Layers, Globe, Minus, Square, X, Laptop } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const { stats, pauseQueue, resumeQueue, isQueueDrawerOpen, setIsQueueDrawerOpen, language, setLanguage, t } = useApp();

  const handleMinimize = () => {
    if ((window as any).dgtDesktop?.minimizeWindow) {
      (window as any).dgtDesktop.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if ((window as any).dgtDesktop?.maximizeWindow) {
      (window as any).dgtDesktop.maximizeWindow();
    }
  };

  const handleClose = () => {
    if ((window as any).dgtDesktop?.closeWindow) {
      (window as any).dgtDesktop.closeWindow();
    }
  };

  return (
    <header className="h-10 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between px-3 select-none z-40 text-xs shrink-0">
      {/* Zone 1: Brand & Window Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-cyan-600 flex items-center justify-center font-bold text-white text-[11px] shadow-sm">
            D
          </div>
          <span className="font-semibold text-slate-200 tracking-tight whitespace-nowrap">
            DGT Auto Generate Video AI
          </span>
          <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
            v1.5.4
          </span>
        </div>
      </div>

      {/* Zone 2: Central Queue Control & Throughput */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
          <span>{stats.running} active</span>
          <span>·</span>
          <span>{stats.pending} queued</span>
          <span>·</span>
          <span>{stats.succeeded} completed</span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <button
          onClick={stats.isPaused ? resumeQueue : pauseQueue}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
            stats.isPaused
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {stats.isPaused ? (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>{t('action.resume')}</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 fill-current" />
              <span>{t('action.pause')}</span>
            </>
          )}
        </button>
      </div>

      {/* Zone 3: Tools & Window Actions */}
      <div className="flex items-center gap-2">
        {/* Language switch */}
        <button
          onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          title="Toggle Language (Tiếng Việt / English)"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="font-mono uppercase font-medium">{language}</span>
        </button>

        {/* Queue Drawer Toggle */}
        <button
          onClick={() => setIsQueueDrawerOpen(!isQueueDrawerOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            isQueueDrawerOpen
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="font-medium hidden sm:inline">{t('title.queue')}</span>
          {(stats.running > 0 || stats.pending > 0) && (
            <span className="w-4 h-4 rounded-full bg-cyan-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">
              {stats.running + stats.pending}
            </span>
          )}
        </button>

        {/* Desktop Window Controls */}
        <div className="flex items-center ml-2 border-l border-slate-800 pl-2">
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            title="Maximize"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-100 hover:bg-rose-600/80 rounded transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
