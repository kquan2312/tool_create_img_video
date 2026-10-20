import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Layers, 
  ListOrdered, 
  Users,
  Film, 
  Settings,
  Database,
  Cpu
} from 'lucide-react';

interface NavItem {
  id: NavigationTab;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, stats, providers, t } = useApp();

  const navItems: NavItem[] = [
    { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'image_gen', labelKey: 'nav.imageGen', icon: ImageIcon },
    { id: 'video_gen', labelKey: 'nav.videoGen', icon: VideoIcon },
    { id: 'batch_jobs', labelKey: 'nav.batchJobs', icon: Layers },
    { 
      id: 'task_manager', 
      labelKey: 'nav.taskManager', 
      icon: ListOrdered,
      badge: (stats.running + stats.pending) > 0 ? (stats.running + stats.pending) : undefined
    },
    { id: 'accounts', labelKey: 'nav.accounts', icon: Users },
    { id: 'history', labelKey: 'nav.history', icon: Film },
    { id: 'settings', labelKey: 'nav.settings', icon: Settings },
  ];

  const activeProvider = providers.find((p) => p.isAvailable) || providers[0];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Workstation Header */}
      <div className="px-5 py-4 border-b border-slate-800/80">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
          Workstation Navigation
        </div>
        <div className="text-sm font-semibold text-slate-200 mt-0.5">
          {t('title.version')}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap">{t(item.labelKey)}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Workstation System Card */}
      <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate max-w-[120px]">{activeProvider?.name || 'Local Studio'}</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-400">ONLINE</span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>SQLite Local DB</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">{stats.total} records</span>
        </div>
      </div>
    </aside>
  );
};
