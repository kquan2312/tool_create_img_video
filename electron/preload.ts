import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, isolated IPC APIs to Renderer Process
// Strict context isolation: No Node.js globals leaked to window
contextBridge.exposeInMainWorld('dgtDesktop', {
  isElectron: true,
  platform: process.platform,
  version: '1.5.4-clone',

  // Dialogs
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:select-directory'),
  selectFiles: (filters?: { name: string; extensions: string[] }[]): Promise<string[] | null> =>
    ipcRenderer.invoke('dialog:select-files', filters),

  // File system interactions
  openPathInExplorer: (fullPath: string): Promise<boolean> =>
    ipcRenderer.invoke('shell:open-path', fullPath),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // System notifications
  showNotification: (title: string, body: string) =>
    ipcRenderer.send('notify:show', { title, body })
});
