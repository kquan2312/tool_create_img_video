const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dgtDesktop', {
  isElectron: true,
  platform: process.platform,
  version: '1.5.4-clone',

  // Dialogs
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  selectFiles: (filters) => ipcRenderer.invoke('dialog:select-files', filters),

  // File system interactions
  openPathInExplorer: (fullPath) => ipcRenderer.invoke('shell:open-path', fullPath),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // System notifications
  showNotification: (title, body) => ipcRenderer.send('notify:show', { title, body })
});
