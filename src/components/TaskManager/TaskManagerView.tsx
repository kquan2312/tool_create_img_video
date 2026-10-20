import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskStatus, TaskType } from '../../types';
import { 
  Search, 
  RotateCcw, 
  Trash2, 
  X, 
  Eye, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2, 
  Download,
  FolderOpen
} from 'lucide-react';

export const TaskManagerView: React.FC = () => {
  const { 
    tasks, 
    retryTask, 
    cancelTask, 
    deleteTask, 
    cancelAllPending, 
    clearHistory, 
    refreshData,
    t 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesType = typeFilter === 'all' || task.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
            Module E · Task Orchestration
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            {t('nav.taskManager')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor, inspect, retry, and manage lifecycle states for all local and cloud AI workers.
          </p>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={cancelAllPending}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-colors"
          >
            {t('action.cancelAll')}
          </button>
          <button
            onClick={clearHistory}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-rose-300 border border-slate-800 hover:border-rose-900/50 text-xs font-medium transition-colors"
          >
            {t('action.clearHistory')}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by prompt or ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            {['all', 'running', 'pending', 'succeeded', 'failed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors capitalize ${
                  statusFilter === st
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Types</option>
            <option value="image_gen">Image Gen</option>
            <option value="image_edit">Image Edit</option>
            <option value="video_gen">Video Gen</option>
          </select>
        </div>
      </div>

      {/* High Density Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4 w-28">Task ID</th>
                <th className="py-3 px-4 w-24">Type</th>
                <th className="py-3 px-4">Prompt & Input</th>
                <th className="py-3 px-4 w-36">Provider / Model</th>
                <th className="py-3 px-4 w-28">Status</th>
                <th className="py-3 px-4 w-20">Retry</th>
                <th className="py-3 px-4 w-24">Time</th>
                <th className="py-3 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    No tasks found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  let statusBadge = (
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Queued</span>
                    </span>
                  );

                  if (task.status === 'running') {
                    statusBadge = (
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{task.progress}%</span>
                      </span>
                    );
                  } else if (task.status === 'succeeded') {
                    statusBadge = (
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </span>
                    );
                  } else if (task.status === 'failed') {
                    statusBadge = (
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Failed</span>
                      </span>
                    );
                  } else if (task.status === 'cancelled') {
                    statusBadge = (
                      <span className="font-mono text-[11px] text-slate-500">
                        Cancelled
                      </span>
                    );
                  }

                  return (
                    <tr key={task.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {task.id.slice(0, 14)}...
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] uppercase text-cyan-300">
                        {task.type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 max-w-xs sm:max-w-md">
                        <div className="flex items-center gap-2">
                          {task.reference_image && (
                            <img
                              src={task.reference_image}
                              alt="Ref"
                              referrerPolicy="no-referrer"
                              className="w-6 h-6 rounded object-cover shrink-0 border border-slate-700"
                            />
                          )}
                          <p className="text-slate-200 truncate" title={task.prompt}>
                            {task.prompt || '(No prompt provided)'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[140px]" title={task.model}>
                        {task.provider} / {task.model}
                      </td>
                      <td className="py-3 px-4">{statusBadge}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {task.retry_count}/{task.max_retries}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(task.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {(task.status === 'failed' || task.status === 'cancelled') && (
                            <button
                              onClick={() => retryTask(task.id)}
                              className="p-1 rounded text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                              title="Retry Task"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(task.status === 'pending' || task.status === 'running') && (
                            <button
                              onClick={() => cancelTask(task.id)}
                              className="p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-slate-800"
                              title="Cancel Task"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Inspection Lightbox */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-100">
                  Task Detail Inspector: <span className="font-mono text-cyan-400">{selectedTask.id}</span>
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  {selectedTask.type} · {selectedTask.provider} · {selectedTask.model}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Preview image if available */}
            {selectedTask.output_url && (
              <div className="aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                <img
                  src={selectedTask.output_url}
                  alt={selectedTask.prompt}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Prompt:</span>
                <p className="text-slate-200 bg-slate-950 p-2.5 rounded border border-slate-800/80 mt-1">
                  {selectedTask.prompt}
                </p>
              </div>

              {selectedTask.error_message && (
                <div>
                  <span className="text-rose-400 font-medium">Error Stack / Message:</span>
                  <p className="text-rose-300 font-mono text-[11px] bg-rose-950/30 border border-rose-900/40 p-2.5 rounded mt-1">
                    {selectedTask.error_message}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <div>Status: <span className="text-slate-200">{selectedTask.status}</span></div>
                <div>Ratio: <span className="text-slate-200">{selectedTask.aspect_ratio}</span></div>
                <div>Retries: <span className="text-slate-200">{selectedTask.retry_count} / {selectedTask.max_retries}</span></div>
                <div>Created: <span className="text-slate-200">{new Date(selectedTask.created_at).toLocaleString()}</span></div>
                {selectedTask.output_path && (
                  <div className="col-span-2 truncate">
                    Output: <span className="text-cyan-400">{selectedTask.output_path}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
              >
                Close
              </button>

              {selectedTask.output_url && (
                <a
                  href={selectedTask.output_url}
                  download
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Media</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
