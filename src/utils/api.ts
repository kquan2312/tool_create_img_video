import { Task, QueueStats, ActivityLog, ProviderInfo, AppSettings, BatchJob } from '../types';

export const api = {
  // Tasks
  async getTasks(params?: { status?: string; type?: string; limit?: number }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/tasks?${query.toString()}`);
    const data = await res.json();
    return data.tasks || [];
  },

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create task');
    return data.task;
  },

  async retryTask(taskId: string): Promise<boolean> {
    const res = await fetch(`/api/tasks/retry/${taskId}`, { method: 'POST' });
    const data = await res.json();
    return data.success;
  },

  async cancelTask(taskId: string): Promise<boolean> {
    const res = await fetch(`/api/tasks/cancel/${taskId}`, { method: 'POST' });
    const data = await res.json();
    return data.success;
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  async cancelAllPending(): Promise<number> {
    const res = await fetch('/api/tasks/cancel-all-pending', { method: 'POST' });
    const data = await res.json();
    return data.count || 0;
  },

  async clearHistory(): Promise<boolean> {
    const res = await fetch('/api/tasks/clear-history', { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  // Batch
  async enqueueBatch(items: Partial<Task>[], batchName?: string): Promise<{ batchId: string; taskCount: number }> {
    const res = await fetch('/api/batch/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, batchName })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to enqueue batch');
    return data;
  },

  async getBatchJobs(): Promise<BatchJob[]> {
    const res = await fetch('/api/batch/jobs');
    const data = await res.json();
    return data.jobs || [];
  },

  // Stats & Dashboard
  async getStats(): Promise<{ stats: QueueStats; logs: ActivityLog[]; recentMedia: Task[] }> {
    const res = await fetch('/api/stats');
    const data = await res.json();
    return data;
  },

  // Queue Controls
  async pauseQueue(): Promise<boolean> {
    const res = await fetch('/api/queue/pause', { method: 'POST' });
    const data = await res.json();
    return data.isPaused;
  },

  async resumeQueue(): Promise<boolean> {
    const res = await fetch('/api/queue/resume', { method: 'POST' });
    const data = await res.json();
    return !data.isPaused;
  },

  async setConcurrency(limit: number): Promise<number> {
    const res = await fetch('/api/queue/concurrency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit })
    });
    const data = await res.json();
    return data.limit;
  },

  // Providers
  async getProviders(): Promise<ProviderInfo[]> {
    const res = await fetch('/api/providers');
    const data = await res.json();
    return data.providers || [];
  },

  async testProvider(providerId: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const res = await fetch(`/api/providers/test/${providerId}`, { method: 'POST' });
    const data = await res.json();
    return data.result;
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetch('/api/settings');
    const data = await res.json();
    return data.settings;
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<boolean> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    return data.success;
  },

  async resetDatabase(): Promise<boolean> {
    const res = await fetch('/api/settings/reset-database', { method: 'POST' });
    const data = await res.json();
    return data.success;
  },

  // Accounts
  async getAccounts(): Promise<any[]> {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    return data.accounts || [];
  },

  async saveAccount(account: any): Promise<boolean> {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account)
    });
    const data = await res.json();
    return data.success;
  },

  async deleteAccount(id: string): Promise<boolean> {
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  async testAccount(id: string): Promise<{ success: boolean; message: string; status: string }> {
    const res = await fetch(`/api/accounts/test/${id}`, { method: 'POST' });
    const data = await res.json();
    return data;
  },

  // Proxies
  async getProxies(): Promise<any[]> {
    const res = await fetch('/api/proxies');
    const data = await res.json();
    return data.proxies || [];
  },

  async saveProxy(proxy: any): Promise<boolean> {
    const res = await fetch('/api/proxies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proxy)
    });
    const data = await res.json();
    return data.success;
  },

  async deleteProxy(id: string): Promise<boolean> {
    const res = await fetch(`/api/proxies/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  }
};
