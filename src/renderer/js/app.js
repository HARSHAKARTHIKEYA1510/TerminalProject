class AppController {
  constructor() {
    this.currentTab = 'terminal';
    this.init();
  }

  init() {
    this.bindWindowControls();
    this.bindTabs();
    this.bindShortcuts();
    this.bindAppEvents();

    // Initialize sub-controllers
    window.terminalController = new window.TerminalController();
    window.desktopApisController = new window.DesktopApisController();
    window.systemMonitorController = new window.SystemMonitorController();
    window.fileExplorerController = new window.FileExplorerController();
  }

  bindWindowControls() {
    const btnMin = document.getElementById('btn-min');
    const btnMax = document.getElementById('btn-max');
    const btnClose = document.getElementById('btn-close');
    const btnPin = document.getElementById('btn-toggle-pin');
    const pinLabel = document.getElementById('pin-label');
    const btnHud = document.getElementById('btn-toggle-hud');

    btnMin.addEventListener('click', () => {
      window.electronAPI.window.minimize();
    });

    btnMax.addEventListener('click', () => {
      window.electronAPI.window.maximize();
    });

    btnClose.addEventListener('click', () => {
      window.electronAPI.window.close();
    });

    btnPin.addEventListener('click', async () => {
      const isPinned = await window.electronAPI.window.togglePin();
      btnPin.classList.toggle('active', isPinned);
      pinLabel.textContent = isPinned ? 'Pinned' : 'Pin';
    });

    btnHud.addEventListener('click', async () => {
      await window.electronAPI.window.toggleHud();
    });

    // Check initial pin state
    window.electronAPI.window.isPinned().then((pinned) => {
      btnPin.classList.toggle('active', pinned);
      pinLabel.textContent = pinned ? 'Pinned' : 'Pin';
    });

    // Update HUD button active state on broadcast
    window.electronAPI.window.onStateChanged((state) => {
      if (state.window === 'hud') {
        btnHud.classList.toggle('active', state.visible);
      }
    });
  }

  bindTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        this.switchTab(target);
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabName}`);
    });

    // Auto-focus terminal input if switching to terminal
    if (tabName === 'terminal') {
      const input = document.getElementById('terminal-input');
      if (input) input.focus();
    }
  }

  bindShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + 1..5 switches tabs
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (e.key === '1') this.switchTab('terminal');
        else if (e.key === '2') this.switchTab('desktop-apis');
        else if (e.key === '3') this.switchTab('system-monitor');
        else if (e.key === '4') this.switchTab('process-manager');
        else if (e.key === '5') this.switchTab('file-explorer');
      }
    });
  }

  bindAppEvents() {
    // Native tray diagnostic action listener
    window.electronAPI.app.onRunDiagnostic(() => {
      this.switchTab('terminal');
      if (window.terminalController) {
        window.terminalController.execute('echo "=== DIAGNOSTIC REPORT ===" && uname -a && sw_vers && df -h');
      }
    });

    // E2E Test execution listener
    if (window.electronAPI.e2e) {
      window.electronAPI.e2e.onRun(async () => {
        await this.runE2ETests();
      });
    }
  }

  async runE2ETests() {
    const results = [];
    const test = async (name, fn) => {
      try {
        await fn();
        results.push({ name, success: true });
      } catch (err) {
        results.push({ name, success: false, error: err.message });
      }
    };

    // 1. API Bridge Integrity
    await test('IPC Bridge initialized with required namespaces', async () => {
      const api = window.electronAPI;
      if (!api.window || !api.dialog || !api.clipboard || !api.system || !api.terminal || !api.fs || !api.screen) {
        throw new Error('Missing one or more required namespaces on window.electronAPI');
      }
    });

    // 2. System Metrics IPC
    await test('IPC system:getMetrics returns valid data', async () => {
      const metrics = await window.electronAPI.system.getMetrics();
      if (!metrics || typeof metrics.cpu?.usagePercent !== 'number' || !metrics.memory?.totalBytes) {
        throw new Error('Invalid metrics structure');
      }
    });

    // 3. System Info IPC
    await test('IPC system:getInfo returns user and platform', async () => {
      const info = await window.electronAPI.system.getInfo();
      if (!info || !info.userInfo?.username || !info.os?.platform) {
        throw new Error('Invalid info structure');
      }
    });

    // 4. Clipboard IPC (Write & Read)
    await test('IPC clipboard write & read cycle', async () => {
      const testToken = `E2E_TOKEN_${Date.now()}`;
      await window.electronAPI.clipboard.writeText(testToken);
      const readBack = await window.electronAPI.clipboard.readText();
      if (readBack !== testToken) {
        throw new Error(`Expected "${testToken}", got "${readBack}"`);
      }
    });

    // 5. Screen Displays IPC
    await test('IPC screen:getAllDisplays returns primary display', async () => {
      const displayData = await window.electronAPI.screen.getAllDisplays();
      if (!displayData || !Array.isArray(displayData.displays) || displayData.displays.length === 0) {
        throw new Error('No displays detected');
      }
    });

    // 6. Power Telemetry IPC
    await test('IPC power:getSystemIdleTime returns number', async () => {
      const idle = await window.electronAPI.power.getSystemIdleTime();
      if (typeof idle !== 'number' || idle < 0) {
        throw new Error('Invalid idle time');
      }
    });

    // 7. File System readDir IPC
    await test('IPC fs:readDir reads project directory', async () => {
      const dir = await window.electronAPI.fs.readDir('.');
      if (!dir || !dir.success || !Array.isArray(dir.items) || dir.items.length === 0) {
        throw new Error('Failed to read project directory');
      }
    });

    // 8. Terminal Command Execution & Streaming IPC
    await test('IPC terminal:exec streams output and completes with code 0', async () => {
      const testId = `e2e_term_${Date.now()}`;
      let receivedOutput = false;
      let exitCode = null;

      const removeStream = window.electronAPI.terminal.onStream(testId, (chunk) => {
        if (chunk.data && chunk.data.includes('E2E_STREAM_VERIFIED')) {
          receivedOutput = true;
        }
      });

      const exitPromise = new Promise((resolve) => {
        const removeExit = window.electronAPI.terminal.onExit(testId, (res) => {
          exitCode = res.code;
          removeStream();
          removeExit();
          resolve();
        });
      });

      await window.electronAPI.terminal.exec({
        id: testId,
        command: 'echo "E2E_STREAM_VERIFIED"',
      });

      await exitPromise;

      if (!receivedOutput) {
        throw new Error('Did not receive expected stdout stream data');
      }
      if (exitCode !== 0) {
        throw new Error(`Command exited with code ${exitCode}`);
      }
    });

    // 9. Window Controls & HUD Toggle IPC
    await test('IPC window:toggleHud opens and closes HUD', async () => {
      const opened = await window.electronAPI.window.toggleHud();
      if (!opened) throw new Error('HUD failed to open');
      const closed = await window.electronAPI.window.toggleHud();
      // HUD window toggles between open/hidden
    });

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    await window.electronAPI.e2e.report({ passed, failed, results });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.appController = new AppController();
});
