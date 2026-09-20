class DesktopApisController {
  constructor() {
    this.badgeCounter = 0;
    this.init();
  }

  init() {
    this.bindDialogApis();
    this.bindClipboardApis();
    this.bindNotificationApis();
    this.bindShellApis();
    this.bindScreenApis();
    this.bindPowerApis();
  }

  // -------------------------------------------------------------
  // Dialog APIs
  // -------------------------------------------------------------
  bindDialogApis() {
    const out = document.getElementById('output-dialogs');

    document.getElementById('btn-api-open-file').addEventListener('click', async () => {
      out.textContent = 'Awaiting user file selection...';
      const result = await window.electronAPI.dialog.openFile({
        title: 'Choose a File to Inspect',
        filters: [{ name: 'All Files', extensions: ['*'] }],
      });
      out.textContent = JSON.stringify(result, null, 2);
    });

    document.getElementById('btn-api-open-dir').addEventListener('click', async () => {
      out.textContent = 'Awaiting directory selection...';
      const result = await window.electronAPI.dialog.openDirectory({
        title: 'Select Folder',
      });
      out.textContent = JSON.stringify(result, null, 2);
    });

    document.getElementById('btn-api-save-file').addEventListener('click', async () => {
      out.textContent = 'Awaiting save path...';
      const result = await window.electronAPI.dialog.saveFile({
        title: 'Save New Script',
        defaultPath: 'script.sh',
      });
      out.textContent = JSON.stringify(result, null, 2);
    });

    document.getElementById('btn-api-msg-box').addEventListener('click', async () => {
      const result = await window.electronAPI.dialog.showMessageBox({
        type: 'question',
        title: 'System Confirmation',
        message: 'Proceed with system maintenance script?',
        detail: 'This will run standard diagnostics on the local environment.',
        buttons: ['Yes, Proceed', 'Cancel'],
      });
      out.textContent = `User response button index: ${result.response} (${result.response === 0 ? 'Approved' : 'Cancelled'})`;
    });

    document.getElementById('btn-api-err-box').addEventListener('click', async () => {
      await window.electronAPI.dialog.showErrorBox(
        'Critical Alert Simulation',
        'Simulated native error alert modal from Electron Main process.'
      );
      out.textContent = 'Displayed native dialog.showErrorBox() modal.';
    });
  }

  // -------------------------------------------------------------
  // Clipboard APIs
  // -------------------------------------------------------------
  bindClipboardApis() {
    const out = document.getElementById('output-clipboard');

    document.getElementById('btn-clip-read').addEventListener('click', async () => {
      const text = await window.electronAPI.clipboard.readText();
      out.textContent = text ? `[CLIPBOARD TEXT]:\n${text}` : '(Clipboard is empty or contains non-text data)';
    });

    document.getElementById('btn-clip-write').addEventListener('click', async () => {
      const stamp = `TerminalDeck Timestamp: ${new Date().toISOString()}`;
      await window.electronAPI.clipboard.writeText(stamp);
      out.textContent = `Copied to clipboard:\n"${stamp}"`;
    });

    document.getElementById('btn-clip-formats').addEventListener('click', async () => {
      const formats = await window.electronAPI.clipboard.getFormats();
      out.textContent = `Available formats:\n${JSON.stringify(formats, null, 2)}`;
    });

    document.getElementById('btn-clip-image').addEventListener('click', async () => {
      const imgInfo = await window.electronAPI.clipboard.readImage();
      if (imgInfo && imgInfo.dataUrl) {
        out.innerHTML = `Image found! Size: ${imgInfo.size.width}x${imgInfo.size.height}<br/><img src="${imgInfo.dataUrl}" style="max-width: 180px; max-height: 80px; margin-top: 6px; border-radius: 4px;" />`;
      } else {
        out.textContent = 'No image currently present in clipboard.';
      }
    });

    document.getElementById('btn-clip-clear').addEventListener('click', async () => {
      await window.electronAPI.clipboard.clear();
      out.textContent = 'System clipboard cleared.';
    });
  }

  // -------------------------------------------------------------
  // Notification & Dock APIs
  // -------------------------------------------------------------
  bindNotificationApis() {
    const out = document.getElementById('output-notification');
    const titleIn = document.getElementById('notif-title');
    const bodyIn = document.getElementById('notif-body');

    document.getElementById('btn-notif-send').addEventListener('click', async () => {
      const title = titleIn.value.trim() || 'TerminalDeck';
      const body = bodyIn.value.trim() || 'Notification triggered.';
      out.textContent = 'Sending notification...';

      const res = await window.electronAPI.notification.show({
        title,
        body,
        id: `notif_${Date.now()}`,
      });
      out.textContent = `Notification dispatched: ${JSON.stringify(res)}`;
    });

    window.electronAPI.notification.onClicked((data) => {
      out.textContent = `Notification clicked by user! ID: ${data?.id || 'unknown'}`;
    });

    document.getElementById('btn-notif-dock-badge').addEventListener('click', async () => {
      this.badgeCounter++;
      await window.electronAPI.app.setBadge(String(this.badgeCounter));
      out.textContent = `macOS Dock badge set to: ${this.badgeCounter}`;
    });

    document.getElementById('btn-notif-clear-badge').addEventListener('click', async () => {
      this.badgeCounter = 0;
      await window.electronAPI.app.setBadge('');
      out.textContent = 'macOS Dock badge cleared.';
    });
  }

  // -------------------------------------------------------------
  // Shell APIs
  // -------------------------------------------------------------
  bindShellApis() {
    const out = document.getElementById('output-shell');

    document.getElementById('btn-shell-browser').addEventListener('click', async () => {
      const url = 'https://github.com/HARSHAKARTHIKEYA1510/TerminalProject';
      const res = await window.electronAPI.shell.openExternal(url);
      out.textContent = `Opened external browser: ${url} (Success: ${res.success})`;
    });

    document.getElementById('btn-shell-reveal').addEventListener('click', async () => {
      const appInfo = await window.electronAPI.app.getAppInfo();
      await window.electronAPI.shell.showItemInFolder(appInfo.paths.userData);
      out.textContent = `Revealed userData folder in Finder: ${appInfo.paths.userData}`;
    });

    document.getElementById('btn-shell-beep').addEventListener('click', async () => {
      await window.electronAPI.shell.beep();
      out.textContent = 'System beep triggered!';
    });
  }

  // -------------------------------------------------------------
  // Screen APIs
  // -------------------------------------------------------------
  bindScreenApis() {
    const out = document.getElementById('output-screen');

    document.getElementById('btn-screen-displays').addEventListener('click', async () => {
      const data = await window.electronAPI.screen.getAllDisplays();
      out.textContent = `Displays count: ${data.displays.length}\nPrimary ID: ${data.primaryId}\n${JSON.stringify(data.displays, null, 2)}`;
    });

    document.getElementById('btn-screen-cursor').addEventListener('click', async () => {
      const pt = await window.electronAPI.screen.getCursorPosition();
      out.textContent = `Cursor Coordinates:\nX: ${pt.x} px | Y: ${pt.y} px`;
    });
  }

  // -------------------------------------------------------------
  // Power APIs
  // -------------------------------------------------------------
  bindPowerApis() {
    const out = document.getElementById('output-power');

    document.getElementById('btn-power-idle').addEventListener('click', async () => {
      const seconds = await window.electronAPI.power.getSystemIdleTime();
      out.textContent = `System idle duration: ${seconds} seconds`;
    });

    document.getElementById('btn-power-battery').addEventListener('click', async () => {
      const onBattery = await window.electronAPI.power.isOnBatteryPower();
      out.textContent = `Power source: ${onBattery ? '🔋 Battery Power' : '🔌 AC Power connected'}`;
    });

    window.electronAPI.power.onPowerEvent((data) => {
      out.textContent = `Power event detected: ${data.event} at ${new Date(data.timestamp).toLocaleTimeString()}`;
    });
  }
}

window.DesktopApisController = DesktopApisController;
