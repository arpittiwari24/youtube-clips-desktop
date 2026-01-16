import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater';
import { setupYtdlpHandlers } from './ytdlp';
import { setupFfmpegHandlers } from './ffmpeg';
import { setupCaptionHandlers } from './captions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Disable GPU acceleration for better compatibility
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow() {
  // Get the icon path (icns for mac, png for linux/win in dev)
  const iconPath = isDev
    ? path.join(process.cwd(), 'resources', process.platform === 'darwin' ? 'icon.icns' : 'logo.png')
    : path.join(process.resourcesPath, 'icon.icns');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading local video files
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#FFFFFF',
    show: false,
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Auto-update configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  console.log('[Auto-Update] Update available:', info.version);
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version ${info.version} is available!`,
      buttons: ['Download', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('[Auto-Update] App is up to date');
});

autoUpdater.on('download-progress', (progress) => {
  console.log(`[Auto-Update] Download progress: ${progress.percent.toFixed(2)}%`);
  if (mainWindow) {
    mainWindow.setProgressBar(progress.percent / 100);
  }
});

autoUpdater.on('update-downloaded', () => {
  console.log('[Auto-Update] Update downloaded');
  if (mainWindow) {
    mainWindow.setProgressBar(-1);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. The app will restart to install the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  }
});

autoUpdater.on('error', (err) => {
  console.error('[Auto-Update] Error:', err);
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Setup IPC handlers
  setupYtdlpHandlers();
  setupFfmpegHandlers();
  setupCaptionHandlers();
  setupFileHandlers();

  // Check for updates (only in production)
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// File dialog handlers
function setupFileHandlers() {
  ipcMain.handle('dialog:saveFile', async (_, options: Electron.SaveDialogOptions) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result.filePath;
  });

  ipcMain.handle('dialog:openFile', async (_, options: Electron.OpenDialogOptions) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result.filePaths[0];
  });

  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('app:getPath', (_, name: 'home' | 'appData' | 'temp' | 'downloads') => {
    return app.getPath(name);
  });

  ipcMain.handle('app:getResourcesPath', () => {
    return isDev
      ? path.join(process.cwd(), 'resources')
      : process.resourcesPath;
  });
}
