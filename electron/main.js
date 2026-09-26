const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Marble & Tiles Factory Suite',
    icon: path.join(__dirname, '../public/favicon.ico'),
    frame: true,
    backgroundColor: '#0a0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Load local built index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Thermal receipt printing handler
ipcMain.handle('print-receipt', async (event, htmlContent) => {
  try {
    const printWindow = new BrowserWindow({
      show: false,
      width: 300,
      height: 600,
      webPreferences: {
        nodeIntegration: false
      }
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            margin: 0;
            padding: 8px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
            width: 72mm;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
    
    return new Promise((resolve) => {
      printWindow.webContents.print({
        silent: false,
        printBackground: true,
        margins: { marginType: 'none' }
      }, (success, errorType) => {
        printWindow.close();
        resolve({ success, error: errorType });
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// JSON Export backup handler
ipcMain.handle('export-data', async (event, jsonData, defaultName) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup Marble Factory Database',
    defaultPath: defaultName || `marble_factory_backup_${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON Backup Files', extensions: ['json'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, jsonData, 'utf-8');
    return { success: true, filePath };
  }
  return { success: false, cancelled: true };
});

// JSON Import restore handler
ipcMain.handle('import-data', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore Marble Factory Database',
    properties: ['openFile'],
    filters: [{ name: 'JSON Backup Files', extensions: ['json'] }]
  });

  if (filePaths && filePaths.length > 0) {
    const content = fs.readFileSync(filePaths[0], 'utf-8');
    return { success: true, content, filePath: filePaths[0] };
  }
  return { success: false, cancelled: true };
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
