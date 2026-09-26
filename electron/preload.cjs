const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (htmlContent) => ipcRenderer.invoke('print-receipt', htmlContent),
  exportData: (data, defaultName) => ipcRenderer.invoke('export-data', data, defaultName),
  importData: () => ipcRenderer.invoke('import-data'),
  closeApp: () => ipcRenderer.send('window-close'),
  minimizeApp: () => ipcRenderer.send('window-minimize'),
  maximizeApp: () => ipcRenderer.send('window-maximize')
});
