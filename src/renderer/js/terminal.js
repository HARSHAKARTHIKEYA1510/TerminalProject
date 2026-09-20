class TerminalController {
  constructor() {
    this.outputEl = document.getElementById('terminal-output');
    this.inputEl = document.getElementById('terminal-input');
    this.cwdEl = document.getElementById('term-cwd');
    this.killBtn = document.getElementById('btn-term-kill');
    this.clearBtn = document.getElementById('btn-term-clear');

    this.history = [];
    this.historyIndex = -1;
    this.currentCommandId = null;
    this.currentCwd = '~';

    this.init();
  }

  async init() {
    // Get initial working directory
    const cwd = await window.electronAPI.terminal.getCwd();
    this.updateCwd(cwd);

    // Initial banner
    this.appendLine('system', '⚡ TerminalDeck Pro - Interactive System Shell initialized');
    this.appendLine('system', `Host: ${navigator.userAgent.includes('Mac') ? 'macOS' : 'Unix/Windows'} | Platform: Electron ${process?.versions?.electron || ''}`);
    this.appendLine('system', 'Type a command or click quick macros above. Use Up/Down arrows for command history.\n');

    this.bindEvents();
  }

  bindEvents() {
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = this.inputEl.value.trim();
        if (cmd) {
          this.history.push(cmd);
          this.historyIndex = this.history.length;
          this.execute(cmd);
          this.inputEl.value = '';
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.history.length > 0 && this.historyIndex > 0) {
          this.historyIndex--;
          this.inputEl.value = this.history[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.inputEl.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          this.inputEl.value = '';
        }
      } else if (e.ctrlKey && e.key === 'c') {
        if (this.currentCommandId) {
          this.killActiveCommand();
        }
      }
    });

    this.clearBtn.addEventListener('click', () => {
      this.clearOutput();
    });

    this.killBtn.addEventListener('click', () => {
      this.killActiveCommand();
    });

    // Macro pills
    document.querySelectorAll('.macro-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const cmd = pill.getAttribute('data-cmd');
        if (cmd) {
          this.inputEl.value = cmd;
          this.execute(cmd);
          this.inputEl.value = '';
        }
      });
    });
  }

  updateCwd(newCwd) {
    if (!newCwd) return;
    this.currentCwd = newCwd;
    this.cwdEl.textContent = newCwd;
  }

  clearOutput() {
    this.outputEl.innerHTML = '';
  }

  async execute(command) {
    const id = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentCommandId = id;
    this.killBtn.style.display = 'inline-flex';

    // Print command invocation
    this.appendLine('cmd', `❯ ${command}`);

    // Stream listener
    const removeStream = window.electronAPI.terminal.onStream(id, (chunk) => {
      if (chunk.type === 'clear') {
        this.clearOutput();
      } else {
        this.appendChunk(chunk.data, chunk.type === 'stderr');
      }
    });

    // Exit listener
    const removeExit = window.electronAPI.terminal.onExit(id, (exitInfo) => {
      this.currentCommandId = null;
      this.killBtn.style.display = 'none';

      if (exitInfo.cwd) {
        this.updateCwd(exitInfo.cwd);
      }

      const durationStr = exitInfo.duration !== undefined ? ` in ${exitInfo.duration}ms` : '';
      if (exitInfo.code === 0) {
        this.appendLine('system', `✓ Completed${durationStr}\n`);
      } else {
        this.appendLine('stderr', `✗ Exited with code ${exitInfo.code}${durationStr}\n`);
      }

      removeStream();
      removeExit();
    });

    try {
      await window.electronAPI.terminal.exec({
        id,
        command,
        cwd: this.currentCwd,
      });
    } catch (err) {
      this.appendLine('stderr', `Execution failed: ${err.message}\n`);
      this.currentCommandId = null;
      this.killBtn.style.display = 'none';
    }
  }

  async killActiveCommand() {
    if (!this.currentCommandId) return;
    await window.electronAPI.terminal.kill({
      id: this.currentCommandId,
      signal: 'SIGINT',
    });
    this.appendLine('system', '^C (SIGINT sent to active process)');
    this.currentCommandId = null;
    this.killBtn.style.display = 'none';
  }

  appendLine(type, text) {
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.innerHTML = this.parseAnsi(this.escapeHtml(text));
    this.outputEl.appendChild(line);
    this.scrollToBottom();
  }

  appendChunk(text, isError = false) {
    const span = document.createElement('span');
    if (isError) span.className = 'terminal-line stderr';
    span.innerHTML = this.parseAnsi(this.escapeHtml(text));
    this.outputEl.appendChild(span);
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  parseAnsi(input) {
    if (!input) return '';
    // Color map for ANSI SGR escape sequences
    return input
      .replace(/\x1b\[0m/g, '</span>')
      .replace(/\x1b\[1m/g, '<span style="font-weight: bold;">')
      .replace(/\x1b\[2m/g, '<span style="opacity: 0.7;">')
      .replace(/\x1b\[31m/g, '<span style="color: #f43f5e;">')
      .replace(/\x1b\[32m/g, '<span style="color: #10b981;">')
      .replace(/\x1b\[33m/g, '<span style="color: #f59e0b;">')
      .replace(/\x1b\[34m/g, '<span style="color: #3b82f6;">')
      .replace(/\x1b\[35m/g, '<span style="color: #d946ef;">')
      .replace(/\x1b\[36m/g, '<span style="color: #06b6d4;">')
      .replace(/\x1b\[37m/g, '<span style="color: #f8fafc;">')
      .replace(/\x1b\[90m/g, '<span style="color: #64748b;">')
      .replace(/\x1b\[[0-9;]*m/g, ''); // strip unhandled ANSI codes
  }
}

window.TerminalController = TerminalController;
