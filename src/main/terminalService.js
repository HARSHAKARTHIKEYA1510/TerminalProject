const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

class TerminalService {
  constructor() {
    this.activeProcesses = new Map(); // id -> ChildProcess
    this.sessionCwd = process.cwd();
    this.defaultShell = process.platform === 'win32'
      ? (process.env.COMSPEC || 'powershell.exe')
      : (process.env.SHELL || '/bin/zsh');
  }

  getDefaultCwd() {
    return this.sessionCwd;
  }

  setCwd(newPath) {
    const resolved = path.resolve(this.sessionCwd, newPath);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      this.sessionCwd = resolved;
      return { success: true, cwd: this.sessionCwd };
    }
    return { success: false, error: `Directory not found: ${newPath}`, cwd: this.sessionCwd };
  }

  /**
   * Execute a command in the user's shell and stream output to a webContents
   */
  executeCommand({ id, command, cwd, webContents }) {
    const runCwd = cwd ? path.resolve(this.sessionCwd, cwd) : this.sessionCwd;
    if (fs.existsSync(runCwd)) {
      this.sessionCwd = runCwd;
    }

    const trimmed = command.trim();

    // Built-in cd handling for instant directory changes
    if (trimmed.startsWith('cd ') || trimmed === 'cd') {
      const target = trimmed.slice(3).trim() || os.homedir();
      const res = this.setCwd(target);
      if (webContents && !webContents.isDestroyed()) {
        if (!res.success) {
          webContents.send(`terminal:stream:${id}`, {
            type: 'stderr',
            data: `cd: no such file or directory: ${target}\n`,
          });
          webContents.send(`terminal:exit:${id}`, { code: 1, cwd: this.sessionCwd });
        } else {
          webContents.send(`terminal:exit:${id}`, { code: 0, cwd: this.sessionCwd });
        }
      }
      return { id, isBuiltin: true, cwd: this.sessionCwd };
    }

    // Built-in clear
    if (trimmed === 'clear' || trimmed === 'cls') {
      if (webContents && !webContents.isDestroyed()) {
        webContents.send(`terminal:stream:${id}`, { type: 'clear' });
        webContents.send(`terminal:exit:${id}`, { code: 0, cwd: this.sessionCwd });
      }
      return { id, isBuiltin: true, cwd: this.sessionCwd };
    }

    const isWindows = process.platform === 'win32';
    const shell = this.defaultShell;
    const shellArgs = isWindows ? ['/d', '/s', '/c', command] : ['-c', command];

    const vlcDir = '/Applications/VLC.app/Contents/MacOS';
    const envPath = process.platform === 'darwin'
      ? `${vlcDir}:${process.env.PATH || ''}`
      : (process.env.PATH || '');

    const env = {
      ...process.env,
      PATH: envPath,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '3',
      LANG: process.env.LANG || 'en_US.UTF-8',
    };

    const startTime = Date.now();
    let child;

    try {
      child = spawn(shell, shellArgs, {
        cwd: this.sessionCwd,
        env,
        shell: false,
      });
    } catch (err) {
      if (webContents && !webContents.isDestroyed()) {
        webContents.send(`terminal:stream:${id}`, {
          type: 'stderr',
          data: `Failed to spawn process: ${err.message}\n`,
        });
        webContents.send(`terminal:exit:${id}`, { code: 1, cwd: this.sessionCwd, duration: 0 });
      }
      return { id, error: err.message };
    }

    this.activeProcesses.set(id, child);

    child.stdout.on('data', chunk => {
      if (webContents && !webContents.isDestroyed()) {
        webContents.send(`terminal:stream:${id}`, {
          type: 'stdout',
          data: chunk.toString('utf8'),
        });
      }
    });

    child.stderr.on('data', chunk => {
      if (webContents && !webContents.isDestroyed()) {
        webContents.send(`terminal:stream:${id}`, {
          type: 'stderr',
          data: chunk.toString('utf8'),
        });
      }
    });

    child.on('error', err => {
      if (webContents && !webContents.isDestroyed()) {
        webContents.send(`terminal:stream:${id}`, {
          type: 'stderr',
          data: `Error: ${err.message}\n`,
        });
      }
    });

    child.on('close', code => {
      this.activeProcesses.delete(id);
      const duration = Date.now() - startTime;
      if (webContents && !webContents.isDestroyed()) {
        webContents.send(`terminal:exit:${id}`, {
          code: code ?? 0,
          cwd: this.sessionCwd,
          duration,
        });
      }
    });

    return { id, pid: child.pid, cwd: this.sessionCwd };
  }

  sendInput(id, input) {
    const child = this.activeProcesses.get(id);
    if (child && child.stdin && !child.stdin.destroyed) {
      child.stdin.write(input);
      return true;
    }
    return false;
  }

  killProcess(id, signal = 'SIGINT') {
    const child = this.activeProcesses.get(id);
    if (child) {
      try {
        child.kill(signal);
        this.activeProcesses.delete(id);
        return true;
      } catch (err) {
        console.error(`Failed to kill process ${id}:`, err);
        return false;
      }
    }
    return false;
  }

  cleanupAll() {
    for (const [id, child] of this.activeProcesses.entries()) {
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
    this.activeProcesses.clear();
  }
}

module.exports = new TerminalService();
