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
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.appController = new AppController();
});
