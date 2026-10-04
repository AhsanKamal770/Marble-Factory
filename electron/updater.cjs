const { ipcMain, app } = require('electron');

let mainWindowRef = null;
let autoUpdater = null;

function getAutoUpdater() {
  if (autoUpdater) return autoUpdater;
  try {
    const updaterModule = require('electron-updater');
    autoUpdater = updaterModule.autoUpdater || updaterModule;
    return autoUpdater;
  } catch (err) {
    console.warn('[AutoUpdater] electron-updater module not available:', err.message);
    return null;
  }
}

function initAutoUpdater(mainWindow) {
  mainWindowRef = mainWindow;

  const updater = getAutoUpdater();

  // If electron-updater is not available in current environment, register safe fallbacks
  if (!updater) {
    console.log('[AutoUpdater] Auto-updater running in fallback mode.');

    ipcMain.handle('check-for-updates', async () => {
      return { success: false, isDev: !app.isPackaged, error: 'Auto-updater module not available in this environment' };
    });

    ipcMain.handle('start-download-update', async () => {
      return { success: false, error: 'Auto-updater module not available' };
    });

    ipcMain.handle('install-update-now', () => {
      console.warn('[AutoUpdater] Cannot install update: module not available');
    });

    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    return;
  }

  try {
    // Configure autoUpdater
    updater.autoDownload = false; // User controls when to download
    updater.autoInstallOnAppQuit = true;
    updater.allowPrerelease = false;

    // Helper to send status to React frontend UI
    const sendStatusToWindow = (status, payload = {}) => {
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('auto-updater-event', { status, ...payload });
      }
    };

    // 1. Checking for Update
    updater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for remote updates on GitHub...');
      sendStatusToWindow('CHECKING');
    });

    // 2. Update Available
    updater.on('update-available', (info) => {
      console.log('[AutoUpdater] Update available:', info?.version);
      sendStatusToWindow('UPDATE_AVAILABLE', {
        version: info?.version,
        releaseDate: info?.releaseDate,
        releaseNotes: info?.releaseNotes || 'Bug fixes and performance enhancements.'
      });
    });

    // 3. Update Not Available (Already latest version)
    updater.on('update-not-available', (info) => {
      console.log('[AutoUpdater] App is up to date. Version:', app.getVersion());
      sendStatusToWindow('UP_TO_DATE', {
        currentVersion: app.getVersion()
      });
    });

    // 4. Download Progress
    updater.on('download-progress', (progressObj) => {
      console.log(`[AutoUpdater] Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
      sendStatusToWindow('DOWNLOADING', {
        percent: Math.round(progressObj.percent || 0),
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    });

    // 5. Update Downloaded (Ready to Install)
    updater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater] Update downloaded successfully:', info?.version);
      sendStatusToWindow('UPDATE_DOWNLOADED', {
        version: info?.version
      });
    });

    // 6. Error during update check/download
    updater.on('error', (err) => {
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
        const result = await updater.checkForUpdates();
        return { success: true, updateInfo: result?.updateInfo };
      } catch (err) {
        console.warn('[AutoUpdater] Check failed:', err.message);
        return { success: false, error: err.message };
      }
    });

    ipcMain.handle('start-download-update', async () => {
      try {
        await updater.downloadUpdate();
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    ipcMain.handle('install-update-now', () => {
      try {
        updater.quitAndInstall(false, true);
      } catch (err) {
        console.error('[AutoUpdater] quitAndInstall error:', err);
      }
    });

    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    // Automatically check for updates 4 seconds after app starts
    setTimeout(() => {
      if (app.isPackaged) {
        updater.checkForUpdates().catch((err) => {
          console.warn('[AutoUpdater] Initial silent check failed:', err.message);
        });
      }
    }, 4000);
  } catch (err) {
    console.error('[AutoUpdater] Initialization failed:', err);
  }
}

module.exports = { initAutoUpdater };
