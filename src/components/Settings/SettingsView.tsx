import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { 
  Settings, 
  Folder, 
  Cpu, 
  Database, 
  Globe, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, refreshData, addToast, language, setLanguage, providers, t } = useApp();

  const [outputDir, setOutputDir] = useState('');
  const [concurrency, setConcurrency] = useState('2');
  const [maxRetries, setMaxRetries] = useState('2');
  const [timeoutSec, setTimeoutSec] = useState('120');
  const [namingTemplate, setNamingTemplate] = useState('{timestamp}_{index}_{slug}');
  const [isSaving, setIsSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number }>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (settings) {
      setOutputDir(settings.outputDirectory || '');
      setConcurrency(settings.concurrencyLimit || '2');
      setMaxRetries(settings.maxRetries || '2');
      setTimeoutSec(settings.requestTimeoutSeconds || '120');
      setNamingTemplate(settings.namingConvention || '{timestamp}_{index}_{slug}');
    }
  }, [settings]);

  const handleSelectNativeFolder = async () => {
    if ((window as any).dgtDesktop?.selectDirectory) {
      const selected = await (window as any).dgtDesktop.selectDirectory();
      if (selected) {
        setOutputDir(selected);
      }
    } else {
      addToast('info', 'Desktop Electron native folder picker is active when packaged as .exe');
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const result = await api.testProvider(providerId);
      setTestResults((prev) => ({ ...prev, [providerId]: result }));
      if (result.success) {
        addToast('success', `${providerId} test passed (${result.latencyMs}ms)`);
      } else {
        addToast('warn', `${providerId} connection warning: ${result.message}`);
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: { success: false, message: err.message || 'Connection failed' }
      }));
      addToast('error', err.message);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings({
        outputDirectory: outputDir,
        concurrencyLimit: concurrency,
        maxRetries,
        requestTimeoutSeconds: timeoutSec,
        namingConvention: namingTemplate,
        language
      });
      await refreshData();
      addToast('success', 'Workstation settings successfully saved');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDb = async () => {
    try {
      await api.resetDatabase();
      setShowResetConfirm(false);
      await refreshData();
      addToast('info', 'SQLite database records wiped');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
          Module G · System Preferences
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">
          {t('nav.settings')}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure local paths, AI engine providers, worker queues, and SQLite database storage.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Storage & Output Directory */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">Local Output & Naming Convention</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Output Directory Path</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                  placeholder="C:\DgtAutoVideo\Outputs or ./outputs"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleSelectNativeFolder}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  Browse Folder
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Generated images are written to <code className="text-slate-400 font-mono">/images</code> and videos to <code className="text-slate-400 font-mono">/videos</code>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">File Naming Template</label>
              <input
                type="text"
                value={namingTemplate}
                onChange={(e) => setNamingTemplate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-500">
                Variables: <span className="font-mono text-cyan-400">{'{timestamp}'}</span>, <span className="font-mono text-cyan-400">{'{index}'}</span>, <span className="font-mono text-cyan-400">{'{slug}'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Worker Queue & Concurrency */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">Worker Concurrency & Reliability</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Concurrent Workers (1 - 8)</label>
              <input
                type="number"
                min="1"
                max="8"
                value={concurrency}
                onChange={(e) => setConcurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-500">Max parallel execution threads</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Automatic Retry Count</label>
              <input
                type="number"
                min="0"
                max="5"
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-500">Retries on transient network error</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Request Timeout (Seconds)</label>
              <input
                type="number"
                min="30"
                max="600"
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-500">Veo render timeout threshold</p>
            </div>
          </div>
        </div>

        {/* AI Engine Providers & Health Check */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-100">AI Provider Adapters & Health Probe</h2>
          </div>

          <div className="space-y-3">
            {providers.map((p) => {
              const testRes = testResults[p.providerId];
              return (
                <div
                  key={p.providerId}
                  className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{p.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        p.isAvailable
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}>
                        {p.isAvailable ? 'AVAILABLE' : 'STANDBY'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{p.statusMessage}</p>
                    {testRes && (
                      <div className={`text-[11px] font-mono flex items-center gap-1.5 pt-1 ${
                        testRes.success ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {testRes.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{testRes.message} {testRes.latencyMs && `(${testRes.latencyMs}ms)`}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTestConnection(p.providerId)}
                    disabled={testingProvider === p.providerId}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded font-medium transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <RotateCcw className={`w-3 h-3 ${testingProvider === p.providerId ? 'animate-spin' : ''}`} />
                    <span>Test Connection</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Language & UI Preferences */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">Language & UI Display</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLanguage('vi')}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium text-center transition-colors ${
                language === 'vi'
                  ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              🇻🇳 Tiếng Việt (Mặc định v1.5.4)
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium text-center transition-colors ${
                language === 'en'
                  ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              🌐 English (Workstation Pro)
            </button>
          </div>
        </div>

        {/* Database & Maintenance */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-100">SQLite Storage & Maintenance</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="text-slate-300 font-medium">Reset Task Database</p>
              <p className="text-[11px] text-slate-500">
                Purge all tasks, batch runs, and activity logs from <code className="font-mono text-slate-400">./data/dgt_workstation.sqlite</code>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-3.5 py-2 bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-900/50 rounded-lg font-medium transition-colors shrink-0"
            >
              Clear SQLite Data
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : t('action.save')}</span>
          </button>
        </div>
      </form>

      {/* Database Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-semibold text-base text-slate-100">Confirm Database Reset</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This action will permanently delete all task records, batch execution histories, and activity logs in SQLite. Local output media files in <code className="font-mono text-cyan-400">./outputs</code> will not be deleted.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDb}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Yes, Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
