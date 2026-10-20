const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#020617',
    frame: true,
    title: 'DGT Auto Generate Video AI v1.5.4',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const devUrl = 'http://localhost:3000';
  const prodUrl = `file://${path.join(__dirname, '../dist/index.html')}`;

  // Check if server is running on port 3000, otherwise load dist or retry
  mainWindow.loadURL(devUrl).catch(() => {
    // If dev server not yet ready, load built dist/index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch((err) => {
      console.warn('Could not load local index.html. Ensure npm run dev or npm run build has run.', err);
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('dialog:select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:select-files', async (_event, filters) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: filters || [
      { name: 'Media & Text', extensions: ['txt', 'png', 'jpg', 'jpeg', 'webp'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths;
});

ipcMain.handle('shell:open-path', async (_event, targetPath) => {
  try {
    await shell.openPath(targetPath);
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

ipcMain.on('notify:show', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
