import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Play, Pause, Trash2, RotateCcw, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';

export const QueueDrawer: React.FC = () => {
  const { 
    isQueueDrawerOpen, 
    setIsQueueDrawerOpen, 
    tasks, 
    stats, 
    pauseQueue, 
    resumeQueue, 
    cancelTask, 
    retryTask,
    cancelAllPending,
    refreshData,
    addToast,
    t 
  } = useApp();

  if (!isQueueDrawerOpen) return null;

  const runningTasks = tasks.filter((t) => t.status === 'running');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const failedTasks = tasks.filter((t) => t.status === 'failed').slice(0, 5);

  const handleConcurrencyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    await api.setConcurrency(val);
    await refreshData();
    addToast('info', `Concurrency set to ${val} parallel workers`);
  };

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-30 select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-100">{t('title.queue')}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300">
            {stats.running + stats.pending} active
          </span>
        </div>
        <button
          onClick={() => setIsQueueDrawerOpen(false)}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Queue Performance & Concurrency Controls */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Worker Concurrency</span>
          <span className="font-mono font-semibold text-cyan-400">{stats.concurrencyLimit} Parallel</span>
        </div>
        <input
          type="range"
          min="1"
          max="8"
          value={stats.concurrencyLimit}
          onChange={handleConcurrencyChange}
          className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={stats.isPaused ? resumeQueue : pauseQueue}
            className={`flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              stats.isPaused
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-amber-600 text-white hover:bg-amber-500'
            }`}
          >
            {stats.isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{stats.isPaused ? t('action.resume') : t('action.pause')}</span>
          </button>

          {stats.pending > 0 && (
            <button
              onClick={cancelAllPending}
              className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-rose-900/40 text-rose-300 border border-slate-700 hover:border-rose-700/50 transition-colors flex items-center gap-1.5"
              title="Cancel all pending queue items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel All</span>
            </button>
          )}
        </div>
      </div>

      {/* Task Streams */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Active Running Section */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Running Workers ({runningTasks.length})</span>
            {runningTasks.length > 0 && (
              <span className="text-cyan-400 font-mono text-[10px] animate-pulse">PROCESSING</span>
            )}
          </div>

          {runningTasks.length === 0 ? (
            <div className="p-4 rounded-lg border border-slate-800/80 bg-slate-950/20 text-center text-xs text-slate-500">
              No workers active. Queue is idle.
            </div>
          ) : (
            <div className="space-y-2.5">
              {runningTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                        <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                          {task.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">· {task.provider}</span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-1" title={task.prompt}>
                        {task.prompt}
                      </p>
                    </div>
                    <button
                      onClick={() => cancelTask(task.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                      title="Cancel Task"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Progress</span>
                      <span className="text-cyan-300">{task.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, task.progress)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Queued Pending Section */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Queued Items ({pendingTasks.length})</span>
            <span className="text-[10px] font-mono text-slate-500">FIFO</span>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/20 text-center text-xs text-slate-500">
              No pending jobs in waiting list.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 w-4">{idx + 1}.</span>
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-slate-300 truncate" title={task.prompt}>
                        {task.prompt}
                      </p>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {task.type} · {task.aspect_ratio}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => cancelTask(task.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                    title="Remove from queue"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Failures & Retry Section */}
        {failedTasks.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Recent Failed Tasks ({failedTasks.length})</span>
            </div>

            <div className="space-y-2">
              {failedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 rounded-lg border border-rose-900/40 bg-rose-950/20 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-rose-300 truncate max-w-[180px]">
                      {task.id}
                    </span>
                    <button
                      onClick={() => retryTask(task.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('action.retry')}</span>
                    </button>
                  </div>
                  <p className="text-slate-300 text-[11px] truncate">{task.prompt}</p>
                  {task.error_message && (
                    <p className="text-rose-400 text-[10px] font-mono truncate">
                      {task.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
