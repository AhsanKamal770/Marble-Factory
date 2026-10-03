const { autoUpdater } = require('electron-updater');
const { ipcMain, app, dialog } = require('electron');

let mainWindowRef = null;

function initAutoUpdater(mainWindow) {
  mainWindowRef = mainWindow;

  // Configure autoUpdater
  autoUpdater.autoDownload = false; // User controls when to download
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  // Helper to send status to React frontend UI
  const sendStatusToWindow = (status, payload = {}) => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('auto-updater-event', { status, ...payload });
    }
  };

  // 1. Checking for Update
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for remote updates on GitHub...');
    sendStatusToWindow('CHECKING');
  });

  // 2. Update Available
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    sendStatusToWindow('UPDATE_AVAILABLE', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes || 'Bug fixes and performance enhancements.'
    });
  });

  // 3. Update Not Available (Already latest version)
  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] App is up to date. Version:', app.getVersion());
    sendStatusToWindow('UP_TO_DATE', {
      currentVersion: app.getVersion()
    });
  });

  // 4. Download Progress
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`[AutoUpdater] Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
    sendStatusToWindow('DOWNLOADING', {
      percent: Math.round(progressObj.percent || 0),
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond
    });
  });

  // 5. Update Downloaded (Ready to Install)
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded successfully:', info.version);
    sendStatusToWindow('UPDATE_DOWNLOADED', {
      version: info.version
    });
  });

  // 6. Error during update check/download
  autoUpdater.on('error', (err) => {
    console.warn('[AutoUpdater] Error:', err == null ? 'Unknown error' : (err.stack || err).toString());
    sendStatusToWindow('ERROR', {
      message: err?.message || 'Update check failed.'
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // IPC Handlers for Frontend Buttons
  // ─────────────────────────────────────────────────────────────────────────────
  ipcMain.handle('check-for-updates', async () => {
    try {
      if (!app.isPackaged) {
        // In dev mode, return mock info
        console.log('[AutoUpdater] Running in development mode');
        return { success: true, isDev: true, version: app.getVersion() };
      }
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo };
    } catch (err) {
      console.warn('[AutoUpdater] Check failed:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('start-download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('install-update-now', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Automatically check for updates 4 seconds after app starts
  setTimeout(() => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[AutoUpdater] Initial silent check failed:', err.message);
      });
    }
  }, 4000);
}

module.exports = { initAutoUpdater };
