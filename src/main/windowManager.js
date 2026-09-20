const { BrowserWindow, app, screen } = require('electron');
const path = require('path');
const fs = require('fs');

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.hudWindow = null;
    this.scratchpadWindow = null;
    this.stateFilePath = path.join(app.getPath('userData'), 'window-state.json');
  }

  _loadSavedState() {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const raw = fs.readFileSync(this.stateFilePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read saved window state:', err.message);
    }
    return null;
  }

  _saveState() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    try {
      const isMaximized = this.mainWindow.isMaximized();
      const bounds = this.mainWindow.getBounds();
      const state = {
        isMaximized,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
    } catch (err) {
      console.warn('Could not save window state:', err.message);
    }
  }

  createMainWindow() {
    const savedState = this._loadSavedState();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    let width = 1220;
    let height = 840;
    let x = Math.round((screenWidth - width) / 2);
    let y = Math.round((screenHeight - height) / 2);

    if (savedState) {
      width = savedState.width || width;
      height = savedState.height || height;
      if (savedState.x !== undefined && savedState.y !== undefined) {
        // Ensure within display bounds
        x = savedState.x;
        y = savedState.y;
      }
    }

    const isMac = process.platform === 'darwin';

    this.mainWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      minWidth: 960,
      minHeight: 640,
      frame: false, // frameless for custom aesthetic
      titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
      trafficLightPosition: { x: 16, y: 16 },
      vibrancy: 'under-window',
      visualEffectState: 'active',
      backgroundColor: '#0c0f17',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        spellcheck: false,
      },
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    this.mainWindow.once('ready-to-show', () => {
      if (savedState && savedState.isMaximized) {
        this.mainWindow.maximize();
      }
      this.mainWindow.show();
    });

    // Debounced window bounds saver
    let saveTimeout = null;
    const triggerSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => this._saveState(), 400);
    };

    this.mainWindow.on('resize', triggerSave);
    this.mainWindow.on('move', triggerSave);
    this.mainWindow.on('close', () => {
      this._saveState();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      if (this.hudWindow && !this.hudWindow.isDestroyed()) {
        this.hudWindow.close();
      }
      if (this.scratchpadWindow && !this.scratchpadWindow.isDestroyed()) {
        this.scratchpadWindow.close();
      }
    });

    return this.mainWindow;
  }

  toggleHudWindow() {
    if (this.hudWindow && !this.hudWindow.isDestroyed()) {
      if (this.hudWindow.isVisible()) {
        this.hudWindow.hide();
      } else {
        this.hudWindow.show();
        this.hudWindow.focus();
      }
      return this.hudWindow.isVisible();
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;

    this.hudWindow = new BrowserWindow({
      width: 340,
      height: 250,
      x: screenWidth - 360,
      y: 50,
      resizable: false,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: true,
      transparent: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.hudWindow.loadFile(path.join(__dirname, '../renderer/hud.html'));

    this.hudWindow.on('closed', () => {
      this.hudWindow = null;
      this.broadcast('window-state-changed', { window: 'hud', visible: false });
    });

    this.hudWindow.once('ready-to-show', () => {
      this.hudWindow.show();
      this.broadcast('window-state-changed', { window: 'hud', visible: true });
    });

    return true;
  }

  isHudOpen() {
    return !!(this.hudWindow && !this.hudWindow.isDestroyed() && this.hudWindow.isVisible());
  }

  getMainWindow() {
    return this.mainWindow;
  }

  getHudWindow() {
    return this.hudWindow;
  }

  broadcast(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    }
  }
}

module.exports = new WindowManager();
