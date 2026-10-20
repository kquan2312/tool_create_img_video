import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Task, QueueStats, ActivityLog, ProviderInfo, AppSettings } from '../types';
import { api } from '../utils/api';

export type NavigationTab = 
  | 'dashboard'
  | 'image_gen'
  | 'video_gen'
  | 'batch_jobs'
  | 'task_manager'
  | 'accounts'
  | 'history'
  | 'settings';

interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

interface AppContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  tasks: Task[];
  stats: QueueStats;
  logs: ActivityLog[];
  recentMedia: Task[];
  providers: ProviderInfo[];
  settings: AppSettings | null;
  isQueueDrawerOpen: boolean;
  setIsQueueDrawerOpen: (open: boolean) => void;
  language: 'vi' | 'en';
  setLanguage: (lang: 'vi' | 'en') => void;
  toasts: ToastItem[];
  addToast: (type: 'info' | 'success' | 'warn' | 'error', message: string) => void;
  refreshData: () => Promise<void>;
  pauseQueue: () => Promise<void>;
  resumeQueue: () => Promise<void>;
  cancelTask: (taskId: string) => Promise<void>;
  retryTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  cancelAllPending: () => Promise<void>;
  clearHistory: () => Promise<void>;
  t: (key: string) => string;
}

const defaultStats: QueueStats = {
  total: 0,
  pending: 0,
  running: 0,
  succeeded: 0,
  failed: 0,
  concurrencyLimit: 2,
  isPaused: false
};

const translations = {
  en: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.imageGen': 'AI Image Generator',
    'nav.videoGen': 'AI Video Generator',
    'nav.batchJobs': 'Batch Processing',
    'nav.taskManager': 'Task Manager',
    'nav.accounts': 'Account & Proxy Manager',
    'nav.history': 'History & Gallery',
    'nav.settings': 'Settings',
    
    // Status
    'status.pending': 'Queued',
    'status.running': 'Running',
    'status.succeeded': 'Completed',
    'status.failed': 'Failed',
    'status.cancelled': 'Cancelled',
    'status.paused': 'Queue Paused',
    'status.active': 'Queue Active',

    // Actions
    'action.retry': 'Retry',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.pause': 'Pause Queue',
    'action.resume': 'Resume Queue',
    'action.cancelAll': 'Cancel All Pending',
    'action.clearHistory': 'Clear History',
    'action.generate': 'Start Generation',
    'action.testConnection': 'Test Connection',
    'action.save': 'Save Changes',
    'action.exportZip': 'Download All (ZIP)',
    'action.openOutput': 'Open Folder',

    // Titles
    'title.app': 'DGT Auto Generate Video AI',
    'title.version': 'v1.5.4 Desktop Edition',
    'title.queue': 'Active Tasks & Queue'
  },
  vi: {
    // Nav
    'nav.dashboard': 'Bảng Điều Khiển',
    'nav.imageGen': 'Tạo Ảnh AI',
    'nav.videoGen': 'Tạo Video AI',
    'nav.batchJobs': 'Xử Lý Hàng Loạt',
    'nav.taskManager': 'Quản Lý Tác Vụ',
    'nav.accounts': 'Tài Khoản & Proxy',
    'nav.history': 'Lịch Sử & Bộ Sưu Tập',
    'nav.settings': 'Cài Đặt Hệ Thống',
    
    // Status
    'status.pending': 'Đang chờ',
    'status.running': 'Đang xử lý',
    'status.succeeded': 'Thành công',
    'status.failed': 'Thất bại',
    'status.cancelled': 'Đã hủy',
    'status.paused': 'Hàng đợi tạm dừng',
    'status.active': 'Hàng đợi hoạt động',

    // Actions
    'action.retry': 'Thử lại',
    'action.cancel': 'Hủy bỏ',
    'action.delete': 'Xóa',
    'action.pause': 'Tạm dừng hàng đợi',
    'action.resume': 'Tiếp tục xử lý',
    'action.cancelAll': 'Hủy tất cả chờ duyệt',
    'action.clearHistory': 'Xóa lịch sử cũ',
    'action.generate': 'Bắt đầu tạo',
    'action.testConnection': 'Kiểm tra kết nối',
    'action.save': 'Lưu cấu hình',
    'action.exportZip': 'Tải tất cả (ZIP)',
    'action.openOutput': 'Mở thư mục lưu',

    // Titles
    'title.app': 'DGT Tự Động Tạo Video AI',
    'title.version': 'Phiên bản 1.5.4 Desktop',
    'title.queue': 'Tác Vụ Đang Xử Lý & Hàng Đợi'
  }
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<QueueStats>(defaultStats);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [recentMedia, setRecentMedia] = useState<Task[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: 'info' | 'success' | 'warn' | 'error', message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const t = useCallback((key: string): string => {
    const dict = translations[language] as Record<string, string>;
    return dict[key] || key;
  }, [language]);

  const refreshData = useCallback(async () => {
    try {
      const [statsData, taskList, providerList, currentSettings] = await Promise.all([
        api.getStats(),
        api.getTasks({ limit: 100 }),
        api.getProviders(),
        api.getSettings()
      ]);

      if (statsData.stats) setStats(statsData.stats);
      if (statsData.logs) setLogs(statsData.logs);
      if (statsData.recentMedia) setRecentMedia(statsData.recentMedia);
      setTasks(taskList);
      setProviders(providerList);
      if (currentSettings) {
        setSettings(currentSettings);
        if (currentSettings.language && (currentSettings.language === 'vi' || currentSettings.language === 'en')) {
          setLanguage(currentSettings.language);
        }
      }
    } catch (err) {
      console.error('Error refreshing app state:', err);
    }
  }, []);

  // Periodic polling for real-time queue synchronization
  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      refreshData();
    }, 2500);
    return () => clearInterval(interval);
  }, [refreshData]);

  const pauseQueue = async () => {
    try {
      await api.pauseQueue();
      await refreshData();
      addToast('warn', language === 'vi' ? 'Đã tạm dừng hàng đợi' : 'Task queue paused');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const resumeQueue = async () => {
    try {
      await api.resumeQueue();
      await refreshData();
      addToast('info', language === 'vi' ? 'Đã kích hoạt lại hàng đợi' : 'Task queue resumed');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const cancelTask = async (taskId: string) => {
    try {
      await api.cancelTask(taskId);
      await refreshData();
      addToast('warn', language === 'vi' ? `Đã hủy tác vụ ${taskId}` : `Cancelled task ${taskId}`);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const retryTask = async (taskId: string) => {
    try {
      await api.retryTask(taskId);
      await refreshData();
      addToast('info', language === 'vi' ? `Đã đưa tác vụ ${taskId} vào hàng đợi lại` : `Re-queued task ${taskId}`);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      await refreshData();
      addToast('info', language === 'vi' ? `Đã xóa tác vụ ${taskId}` : `Deleted task ${taskId}`);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const cancelAllPending = async () => {
    try {
      const count = await api.cancelAllPending();
      await refreshData();
      addToast('warn', language === 'vi' ? `Đã hủy ${count} tác vụ đang chờ` : `Cancelled ${count} pending tasks`);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const clearHistory = async () => {
    try {
      await api.clearHistory();
      await refreshData();
      addToast('info', language === 'vi' ? 'Đã dọn dẹp lịch sử tác vụ' : 'Cleared completed task history');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        tasks,
        stats,
        logs,
        recentMedia,
        providers,
        settings,
        isQueueDrawerOpen,
        setIsQueueDrawerOpen,
        language,
        setLanguage,
        toasts,
        addToast,
        refreshData,
        pauseQueue,
        resumeQueue,
        cancelTask,
        retryTask,
        deleteTask,
        cancelAllPending,
        clearHistory,
        t
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
