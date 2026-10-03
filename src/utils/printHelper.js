/**
 * Unified Printing & PDF Export Helper for Electron Desktop & Web
 */

export const printElement = async (elementOrRef, options = {}) => {
  const {
    title = 'Document',
    format = 'a4',
    isExportPDF = false,
    landscape = false,
    dir = 'rtl'
  } = options;

  let htmlContent = '';
  if (typeof elementOrRef === 'string') {
    htmlContent = elementOrRef;
  } else if (elementOrRef && elementOrRef.innerHTML) {
    htmlContent = elementOrRef.innerHTML;
  } else if (elementOrRef && elementOrRef.current && elementOrRef.current.innerHTML) {
    htmlContent = elementOrRef.current.innerHTML;
  }

  // 1. If running in Electron Desktop App
  if (window.electronAPI) {
    if (isExportPDF) {
      const cleanTitle = title.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
      const defaultName = `${cleanTitle || 'Report'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      return await window.electronAPI.exportPDF(htmlContent, defaultName, {
        format,
        landscape,
        dir
      });
    }

    // Direct Document Printing
    return await window.electronAPI.printDocument(htmlContent, {
      format,
      landscape,
      dir,
      silent: false
    });
  }

  // 2. Fallback for Web Browser (Chrome/Edge)
  window.print();
  return { success: true };
};
