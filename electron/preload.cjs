const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Printing & PDF Export
  printReceipt: (htmlContent) => ipcRenderer.invoke('print-receipt', htmlContent),
  printDocument: (htmlContent, options) => ipcRenderer.invoke('print-document', htmlContent, options),
  exportPDF: (htmlContent, defaultName, options) => ipcRenderer.invoke('export-pdf', htmlContent, defaultName, options),
  
  // Database Backup / Restore
  exportData: (data, defaultName) => ipcRenderer.invoke('export-data', data, defaultName),
  importData: () => ipcRenderer.invoke('import-data'),
  
  // Window Management
  closeApp: () => ipcRenderer.send('window-close'),
  minimizeApp: () => ipcRenderer.send('window-minimize'),
  maximizeApp: () => ipcRenderer.send('window-maximize'),

  // Remote GitHub Auto-Updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
  installUpdateNow: () => ipcRenderer.invoke('install-update-now'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdaterEvent: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('auto-updater-event', handler);
    return () => ipcRenderer.removeListener('auto-updater-event', handler);
  }
});
