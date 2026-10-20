/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TitleBar } from './components/Layout/TitleBar';
import { Sidebar } from './components/Layout/Sidebar';
import { QueueDrawer } from './components/Layout/QueueDrawer';
import { DashboardView } from './components/Dashboard/DashboardView';
import { ImageGenView } from './components/ImageGen/ImageGenView';
import { VideoGenView } from './components/VideoGen/VideoGenView';
import { BatchJobsView } from './components/BatchJobs/BatchJobsView';
import { TaskManagerView } from './components/TaskManager/TaskManagerView';
import { AccountManagerView } from './components/Accounts/AccountManagerView';
import { HistoryGalleryView } from './components/History/HistoryGalleryView';
import { SettingsView } from './components/Settings/SettingsView';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeTab, toasts } = useApp();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* Top Application Desktop Titlebar */}
      <TitleBar />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Main Content Viewport */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'image_gen' && <ImageGenView />}
          {activeTab === 'video_gen' && <VideoGenView />}
          {activeTab === 'batch_jobs' && <BatchJobsView />}
          {activeTab === 'task_manager' && <TaskManagerView />}
          {activeTab === 'accounts' && <AccountManagerView />}
          {activeTab === 'history' && <HistoryGalleryView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* Sliding Queue Drawer */}
        <QueueDrawer />
      </div>

      {/* Floating System Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          let Icon = Info;
          let color = 'bg-slate-900 border-slate-700 text-slate-200';
          if (toast.type === 'success') {
            Icon = CheckCircle2;
            color = 'bg-slate-900 border-emerald-500/50 text-emerald-300';
          } else if (toast.type === 'warn') {
            Icon = AlertTriangle;
            color = 'bg-slate-900 border-amber-500/50 text-amber-300';
          } else if (toast.type === 'error') {
            Icon = AlertCircle;
            color = 'bg-slate-900 border-rose-500/50 text-rose-300';
          }

          return (
            <div
              key={toast.id}
              className={`p-3 rounded-lg border shadow-xl flex items-center gap-2.5 text-xs pointer-events-auto animate-in slide-in-from-bottom-2 ${color}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 font-medium">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
