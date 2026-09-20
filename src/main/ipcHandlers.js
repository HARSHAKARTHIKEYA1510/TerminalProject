const { BrowserWindow, ipcMain, dialog, clipboard, shell, screen, powerMonitor, Notification, app, nativeImage } = require('electron');
const path = require('path');
const systemService = require('./systemService');
const terminalService = require('./terminalService');
const windowManager = require('./windowManager');

function setupIpcHandlers() {
  // -------------------------------------------------------------
  // Window Controls
  // -------------------------------------------------------------
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
    return true;
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      return win.isMaximized();
    }
    return false;
  });

  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
  });

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
    return true;
  });

  ipcMain.handle('window:togglePin', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const isPinned = !win.isAlwaysOnTop();
      win.setAlwaysOnTop(isPinned);
      return isPinned;
    }
    return false;
  });

  ipcMain.handle('window:isPinned', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isAlwaysOnTop() : false;
  });

  ipcMain.handle('window:toggleHud', () => {
    return windowManager.toggleHudWindow();
  });

  ipcMain.handle('window:isHudOpen', () => {
    return windowManager.isHudOpen();
  });

  // -------------------------------------------------------------
  // Desktop Dialog APIs
  // -------------------------------------------------------------
  ipcMain.handle('dialog:openFile', async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, {
      properties: ['openFile', ...(options.multiSelections ? ['multiSelections'] : [])],
      filters: options.filters || [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Text & Scripts', extensions: ['txt', 'md', 'json', 'js', 'sh', 'py'] },
      ],
      title: options.title || 'Select File',
    });
    return res;
  });

  ipcMain.handle('dialog:openDirectory', async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: options.title || 'Select Folder',
    });
    return res;
  });

  ipcMain.handle('dialog:saveFile', async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showSaveDialog(win, {
      title: options.title || 'Save File',
      defaultPath: options.defaultPath || 'untitled.txt',
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return res;
  });

  ipcMain.handle('dialog:showMessageBox', async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showMessageBox(win, {
      type: options.type || 'info',
      title: options.title || 'TerminalDeck Alert',
      message: options.message || '',
      detail: options.detail || '',
      buttons: options.buttons || ['OK'],
      defaultId: 0,
      cancelId: options.buttons ? options.buttons.length - 1 : 0,
    });
    return res;
  });

  ipcMain.handle('dialog:showErrorBox', (event, { title, content }) => {
    dialog.showErrorBox(title || 'Error', content || 'An unknown error occurred.');
    return true;
  });

  // -------------------------------------------------------------
  // Desktop Clipboard APIs
  // -------------------------------------------------------------
  ipcMain.handle('clipboard:readText', () => {
    return clipboard.readText();
  });

  ipcMain.handle('clipboard:writeText', (event, text) => {
    clipboard.writeText(text || '');
    return true;
  });

  ipcMain.handle('clipboard:clear', () => {
    clipboard.clear();
    return true;
  });

  ipcMain.handle('clipboard:getFormats', () => {
    return clipboard.availableFormats();
  });

  ipcMain.handle('clipboard:readImage', () => {
    const img = clipboard.readImage();
    if (img.isEmpty()) return null;
    return {
      dataUrl: img.toDataURL(),
      size: img.getSize(),
    };
  });

  ipcMain.handle('clipboard:writeImage', (event, dataUrl) => {
    try {
      const img = nativeImage.createFromDataURL(dataUrl);
      clipboard.writeImage(img);
      return true;
    } catch (err) {
      return false;
    }
  });

  // -------------------------------------------------------------
  // Desktop Notification APIs
  // -------------------------------------------------------------
  ipcMain.handle('notification:show', (event, options = {}) => {
    if (!Notification.isSupported()) {
      return { supported: false, error: 'System notifications not supported.' };
    }

    const notification = new Notification({
      title: options.title || 'TerminalDeck Notification',
      subtitle: options.subtitle || '',
      body: options.body || '',
      silent: options.silent ?? false,
      urgency: options.urgency || 'normal',
    });

    notification.on('click', () => {
      event.sender.send('notification:clicked', { id: options.id });
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    });

    notification.show();
    return { supported: true, shown: true };
  });

  // -------------------------------------------------------------
  // Desktop Shell APIs
  // -------------------------------------------------------------
  ipcMain.handle('shell:openExternal', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('shell:openPath', async (event, targetPath) => {
    try {
      const errMsg = await shell.openPath(targetPath);
      return { success: !errMsg, error: errMsg };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('shell:showItemInFolder', (event, targetPath) => {
    try {
      shell.showItemInFolder(targetPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('shell:trashItem', async (event, targetPath) => {
    try {
      await shell.trashItem(targetPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('shell:beep', () => {
    shell.beep();
    return true;
  });

  // -------------------------------------------------------------
  // Screen and Display APIs
  // -------------------------------------------------------------
  ipcMain.handle('screen:getAllDisplays', () => {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    return {
      displays: displays.map(d => ({
        id: d.id,
        bounds: d.bounds,
        workArea: d.workArea,
        scaleFactor: d.scaleFactor,
        rotation: d.rotation,
        isPrimary: d.id === primary.id,
        size: d.size,
      })),
      primaryId: primary.id,
    };
  });

  ipcMain.handle('screen:getCursorPosition', () => {
    const point = screen.getCursorScreenPoint();
    return point;
  });

  // -------------------------------------------------------------
  // Power Monitor APIs
  // -------------------------------------------------------------
  ipcMain.handle('power:getSystemIdleTime', () => {
    return powerMonitor.getSystemIdleTime();
  });

  ipcMain.handle('power:isOnBatteryPower', () => {
    return powerMonitor.isOnBatteryPower();
  });

  // -------------------------------------------------------------
  // App Dock & Metadata
  // -------------------------------------------------------------
  ipcMain.handle('app:setBadge', (event, text) => {
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setBadge(String(text || ''));
      return true;
    }
    return false;
  });

  ipcMain.handle('app:getAppInfo', () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      paths: {
        userData: app.getPath('userData'),
        home: app.getPath('home'),
        appData: app.getPath('appData'),
        temp: app.getPath('temp'),
        desktop: app.getPath('desktop'),
        documents: app.getPath('documents'),
        downloads: app.getPath('downloads'),
      },
    };
  });

  // -------------------------------------------------------------
  // System Metrics & Process Services
  // -------------------------------------------------------------
  ipcMain.handle('system:getMetrics', () => {
    return systemService.getSystemMetrics();
  });

  ipcMain.handle('system:getInfo', () => {
    return systemService.getSystemInfo();
  });

  ipcMain.handle('system:getProcesses', async (event, limit) => {
    return await systemService.getRunningProcesses(limit);
  });

  ipcMain.handle('system:killProcess', async (event, { pid, force }) => {
    return await systemService.killProcess(pid, force);
  });

  // -------------------------------------------------------------
  // File System Explorer APIs
  // -------------------------------------------------------------
  ipcMain.handle('fs:readDir', async (event, dirPath) => {
    return await systemService.readDirectory(dirPath);
  });

  ipcMain.handle('fs:readFile', async (event, { filePath, maxBytes }) => {
    return await systemService.readFileContent(filePath, maxBytes);
  });

  // -------------------------------------------------------------
  // Terminal Execution APIs
  // -------------------------------------------------------------
  ipcMain.handle('terminal:exec', (event, { id, command, cwd }) => {
    return terminalService.executeCommand({
      id,
      command,
      cwd,
      webContents: event.sender,
    });
  });

  ipcMain.handle('terminal:input', (event, { id, input }) => {
    return terminalService.sendInput(id, input);
  });

  ipcMain.handle('terminal:kill', (event, { id, signal }) => {
    return terminalService.killProcess(id, signal);
  });

  ipcMain.handle('terminal:getCwd', () => {
    return terminalService.getDefaultCwd();
  });

  ipcMain.handle('terminal:setCwd', (event, newPath) => {
    return terminalService.setCwd(newPath);
  });

  // -------------------------------------------------------------
  // Inter-Window Broadcast
  // -------------------------------------------------------------
  ipcMain.handle('broadcast:send', (event, { channel, data }) => {
    windowManager.broadcast(channel, data);
    return true;
  });
}

module.exports = { setupIpcHandlers };
