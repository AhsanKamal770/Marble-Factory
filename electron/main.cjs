const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { initAutoUpdater } = require('./updater.cjs');

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
    backgroundColor: '#f1f5f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.webContents.session.clearCache();
  }

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

  // Initialize auto-updater for remote GitHub updates
  initAutoUpdater(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NATIVE PDF EXPORT HANDLER (Zero dialog issues, Direct Crisp Vector PDF)
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('export-pdf', async (event, htmlContent, defaultName, options = {}) => {
  let printWindow = null;
  try {
    const isThermal = options.format === 'thermal' || options.pageSize === '80mm';
    printWindow = new BrowserWindow({
      show: false,
      width: isThermal ? 360 : 1024,
      height: 900,
      webPreferences: {
        nodeIntegration: false
      }
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html dir="${options.dir || 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${defaultName || 'Document'}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${isThermal ? '80mm auto' : 'A4 portrait'};
            margin: ${isThermal ? '2mm' : '8mm'};
          }
          :root {
            --font-main: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
            --font-urdu: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', -apple-system, sans-serif;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: ${isThermal ? '4px' : '10px'};
            font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq';
            color: #0f172a;
            background: #ffffff;
            width: 100%;
          }
          .font-mono {
            font-family: 'JetBrains Mono', monospace !important;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
    try {
      await printWindow.webContents.executeJavaScript('document.fonts.ready');
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 200));

    const pdfBuffer = await printWindow.webContents.printToPDF({
      printBackground: true,
      landscape: !!options.landscape,
      pageSize: isThermal ? { width: 80000, height: 297000 } : 'A4',
      margins: {
        marginType: 'custom',
        top: 0.3,
        bottom: 0.3,
        left: 0.3,
        right: 0.3
      }
    });

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF Report (پی ڈی ایف محفوظ کریں)',
      defaultPath: defaultName || `report_${new Date().toISOString().slice(0, 10)}.pdf`,
      filters: [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, pdfBuffer);
      try {
        shell.openPath(filePath);
      } catch (_) {}
      return { success: true, filePath };
    }
    return { success: false, cancelled: true };
  } catch (err) {
    console.error('Export PDF error:', err);
    return { success: false, error: err.message };
  } finally {
    if (printWindow) {
      try { printWindow.close(); } catch (_) {}
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. NATIVE PRINT DOCUMENT HANDLER (A4 & 80mm Slip)
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('print-document', async (event, htmlContent, options = {}) => {
  let printWindow = null;
  try {
    const isThermal = options.format === 'thermal' || options.pageSize === '80mm';
    printWindow = new BrowserWindow({
      show: false,
      width: isThermal ? 360 : 1024,
      height: 900,
      webPreferences: {
        nodeIntegration: false
      }
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html dir="${options.dir || 'ltr'}">
      <head>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${isThermal ? '80mm auto' : 'A4 portrait'};
            margin: ${isThermal ? '0mm' : '8mm'};
          }
          :root {
            --font-main: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
            --font-urdu: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', -apple-system, sans-serif;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: ${isThermal ? '4px' : '10px'};
            font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq';
            color: #0f172a;
            background: #ffffff;
            width: ${isThermal ? '76mm' : '100%'};
          }
          .font-mono {
            font-family: 'JetBrains Mono', monospace !important;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
    try {
      await printWindow.webContents.executeJavaScript('document.fonts.ready');
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 200));

    return new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: options.silent || false,
          printBackground: true,
          deviceName: options.deviceName || '',
          pageSize: isThermal ? { width: 80000, height: 297000 } : 'A4'
        },
        (success, errorType) => {
          if (printWindow) {
            try { printWindow.close(); } catch (_) {}
          }
          resolve({ success, error: errorType });
        }
      );
    });
  } catch (err) {
    if (printWindow) {
      try { printWindow.close(); } catch (_) {}
    }
    return { success: false, error: err.message };
  }
});

// Thermal receipt legacy compatibility handler
ipcMain.handle('print-receipt', async (event, htmlContent) => {
  return ipcMain.emit('print-document', event, htmlContent, { format: 'thermal', silent: false });
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

// Window control handlers
ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
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
