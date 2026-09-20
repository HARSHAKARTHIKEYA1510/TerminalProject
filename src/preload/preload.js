const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    close: () => ipcRenderer.invoke('window:close'),
    togglePin: () => ipcRenderer.invoke('window:togglePin'),
    isPinned: () => ipcRenderer.invoke('window:isPinned'),
    toggleHud: () => ipcRenderer.invoke('window:toggleHud'),
    isHudOpen: () => ipcRenderer.invoke('window:isHudOpen'),
    onStateChanged: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('window-state-changed', handler);
      return () => ipcRenderer.removeListener('window-state-changed', handler);
    },
  },

  // Desktop Dialog APIs
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    openDirectory: (options) => ipcRenderer.invoke('dialog:openDirectory', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
    showMessageBox: (options) => ipcRenderer.invoke('dialog:showMessageBox', options),
    showErrorBox: (title, content) => ipcRenderer.invoke('dialog:showErrorBox', { title, content }),
  },

  // Desktop Clipboard APIs
  clipboard: {
    readText: () => ipcRenderer.invoke('clipboard:readText'),
    writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    clear: () => ipcRenderer.invoke('clipboard:clear'),
    getFormats: () => ipcRenderer.invoke('clipboard:getFormats'),
    readImage: () => ipcRenderer.invoke('clipboard:readImage'),
    writeImage: (dataUrl) => ipcRenderer.invoke('clipboard:writeImage', dataUrl),
  },

  // Desktop Notification APIs
  notification: {
    show: (options) => ipcRenderer.invoke('notification:show', options),
    onClicked: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('notification:clicked', handler);
      return () => ipcRenderer.removeListener('notification:clicked', handler);
    },
  },

  // Desktop Shell APIs
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),
    showItemInFolder: (targetPath) => ipcRenderer.invoke('shell:showItemInFolder', targetPath),
    trashItem: (targetPath) => ipcRenderer.invoke('shell:trashItem', targetPath),
    beep: () => ipcRenderer.invoke('shell:beep'),
  },

  // Screen and Display APIs
  screen: {
    getAllDisplays: () => ipcRenderer.invoke('screen:getAllDisplays'),
    getCursorPosition: () => ipcRenderer.invoke('screen:getCursorPosition'),
  },

  // Power Monitor APIs
  power: {
    getSystemIdleTime: () => ipcRenderer.invoke('power:getSystemIdleTime'),
    isOnBatteryPower: () => ipcRenderer.invoke('power:isOnBatteryPower'),
    onPowerEvent: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('power:event', handler);
      return () => ipcRenderer.removeListener('power:event', handler);
    },
  },

  // App & Dock
  app: {
    setBadge: (text) => ipcRenderer.invoke('app:setBadge', text),
    getAppInfo: () => ipcRenderer.invoke('app:getAppInfo'),
    onRunDiagnostic: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('app:run-diagnostic', handler);
      return () => ipcRenderer.removeListener('app:run-diagnostic', handler);
    },
  },

  // System & Processes
  system: {
    getMetrics: () => ipcRenderer.invoke('system:getMetrics'),
    getInfo: () => ipcRenderer.invoke('system:getInfo'),
    getProcesses: (limit) => ipcRenderer.invoke('system:getProcesses', limit),
    killProcess: (pid, force) => ipcRenderer.invoke('system:killProcess', { pid, force }),
    onMetricsTick: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('system:metrics-tick', handler);
      return () => ipcRenderer.removeListener('system:metrics-tick', handler);
    },
  },

  // File System Explorer
  fs: {
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath, maxBytes) => ipcRenderer.invoke('fs:readFile', { filePath, maxBytes }),
  },

  // Terminal
  terminal: {
    exec: (params) => ipcRenderer.invoke('terminal:exec', params),
    sendInput: (params) => ipcRenderer.invoke('terminal:input', params),
    kill: (params) => ipcRenderer.invoke('terminal:kill', params),
    getCwd: () => ipcRenderer.invoke('terminal:getCwd'),
    setCwd: (newPath) => ipcRenderer.invoke('terminal:setCwd', newPath),
    onStream: (id, callback) => {
      const channel = `terminal:stream:${id}`;
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    },
    onExit: (id, callback) => {
      const channel = `terminal:exit:${id}`;
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.once(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    },
  },

  // Inter-Window Broadcast
  broadcast: {
    send: (channel, data) => ipcRenderer.invoke('broadcast:send', { channel, data }),
    on: (channel, callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    },
  },
});
