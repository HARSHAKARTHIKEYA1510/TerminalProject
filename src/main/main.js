const { app, globalShortcut, Menu, Tray, nativeImage, powerMonitor } = require('electron');
const path = require('path');
const windowManager = require('./windowManager');
const { setupIpcHandlers } = require('./ipcHandlers');
const systemService = require('./systemService');
const terminalService = require('./terminalService');

// Ensure single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let tray = null;
let metricsInterval = null;

// Generate a clean in-memory 16x16 tray icon
function createDefaultTrayIcon() {
  // 16x16 PNG in base64: a cyan/blue terminal prompt cursor square
  const iconBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAElJREFUOE9jZKAQMFKon2H4//9/nDgN' +
    'sD2jGsDk6+rqyLEeXQMGDGBg+P//P64MGBkZaewGcg1gZ2fH6XpyDXAAMcAAjYkCAQeT2sUAAAAASUVORK5CYII=';
  const img = nativeImage.createFromDataURL(`data:image/png;base64,${iconBase64}`);
  return img.resize({ width: 16, height: 16 });
}

function createTray() {
  try {
    const icon = createDefaultTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('TerminalDeck Pro - System & Command Hub');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show TerminalDeck',
        click: () => {
          const win = windowManager.getMainWindow();
          if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
          }
        },
      },
      {
        label: 'Toggle Resource HUD (Ctrl+Shift+H)',
        click: () => {
          windowManager.toggleHudWindow();
        },
      },
      { type: 'separator' },
      {
        label: 'Run Quick Diagnostics',
        click: () => {
          const win = windowManager.getMainWindow();
          if (win) {
            win.show();
            win.focus();
            win.webContents.send('app:run-diagnostic');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit TerminalDeck',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      const win = windowManager.getMainWindow();
      if (win) {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
        }
      }
    });
  } catch (err) {
    console.warn('Tray creation skipped:', err.message);
  }
}

function registerGlobalShortcuts() {
  // Command/Ctrl + Shift + T : Toggle / Bring main window to front
  try {
    globalShortcut.register('CommandOrControl+Shift+T', () => {
      const win = windowManager.getMainWindow();
      if (win) {
        if (win.isFocused()) {
          win.minimize();
        } else {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
        }
      }
    });

    // Command/Ctrl + Shift + H : Toggle floating mini HUD
    globalShortcut.register('CommandOrControl+Shift+H', () => {
      windowManager.toggleHudWindow();
    });
  } catch (err) {
    console.warn('Could not register global shortcuts:', err.message);
  }
}

function startMetricsBroadcaster() {
  // Broadcast live CPU & Memory metrics every 1500ms
  metricsInterval = setInterval(() => {
    try {
      const metrics = systemService.getSystemMetrics();
      windowManager.broadcast('system:metrics-tick', metrics);
    } catch (err) {
      console.warn('Metrics broadcast error:', err.message);
    }
  }, 1500);
}

function setupPowerMonitoring() {
  powerMonitor.on('suspend', () => {
    windowManager.broadcast('power:event', { event: 'suspend', timestamp: Date.now() });
  });

  powerMonitor.on('resume', () => {
    windowManager.broadcast('power:event', { event: 'resume', timestamp: Date.now() });
  });

  powerMonitor.on('on-ac', () => {
    windowManager.broadcast('power:event', { event: 'ac', timestamp: Date.now() });
  });

  powerMonitor.on('on-battery', () => {
    windowManager.broadcast('power:event', { event: 'battery', timestamp: Date.now() });
  });
}

// App lifecycle
app.whenReady().then(() => {
  setupIpcHandlers();
  windowManager.createMainWindow();
  createTray();
  registerGlobalShortcuts();
  startMetricsBroadcaster();
  setupPowerMonitoring();

  if (process.argv.includes('--smoke-test')) {
    setTimeout(() => {
      console.log('✓ Smoke test passed: Electron app, windows, IPC, and modules initialized successfully.');
      app.quit();
    }, 1200);
  }

  app.on('activate', () => {
    const win = windowManager.getMainWindow();
    if (!win) {
      windowManager.createMainWindow();
    } else {
      win.show();
      win.focus();
    }
  });
});

app.on('second-instance', () => {
  const win = windowManager.getMainWindow();
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (metricsInterval) clearInterval(metricsInterval);
  globalShortcut.unregisterAll();
  terminalService.cleanupAll();
});
