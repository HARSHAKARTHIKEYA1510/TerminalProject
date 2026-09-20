const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SystemService {
  constructor() {
    this.prevCpuTimes = this._getCpuTimes();
  }

  _getCpuTimes() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    return { totalIdle, totalTick, count: cpus.length };
  }

  getCpuUsage() {
    const current = this._getCpuTimes();
    const idleDiff = current.totalIdle - this.prevCpuTimes.totalIdle;
    const totalDiff = current.totalTick - this.prevCpuTimes.totalTick;
    this.prevCpuTimes = current;

    if (totalDiff <= 0) return 0;
    const usage = 100 - (100 * idleDiff) / totalDiff;
    return Math.max(0, Math.min(100, Math.round(usage * 10) / 10));
  }

  getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryPercent = Math.round((usedMem / totalMem) * 1000) / 10;
    const cpuPercent = this.getCpuUsage();
    const loadAvg = os.loadavg();
    const uptimeSeconds = os.uptime();

    return {
      cpu: {
        usagePercent: cpuPercent,
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown CPU',
        speedMhz: os.cpus()[0]?.speed || 0,
        loadAvg: [
          Math.round(loadAvg[0] * 100) / 100,
          Math.round(loadAvg[1] * 100) / 100,
          Math.round(loadAvg[2] * 100) / 100,
        ],
      },
      memory: {
        totalBytes: totalMem,
        freeBytes: freeMem,
        usedBytes: usedMem,
        usagePercent: memoryPercent,
        formattedTotal: this._formatBytes(totalMem),
        formattedUsed: this._formatBytes(usedMem),
        formattedFree: this._formatBytes(freeMem),
      },
      os: {
        platform: os.platform(),
        type: os.type(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptimeFormatted: this._formatUptime(uptimeSeconds),
        uptimeSeconds: Math.floor(uptimeSeconds),
      },
      network: this._getNetworkSummary(),
      timestamp: Date.now(),
    };
  }

  getSystemInfo() {
    return {
      ...this.getSystemMetrics(),
      userInfo: {
        username: os.userInfo()?.username || 'user',
        homedir: os.homedir(),
        shell: os.userInfo()?.shell || process.env.SHELL || '/bin/zsh',
      },
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      v8Version: process.versions.v8,
    };
  }

  _getNetworkSummary() {
    const ifaces = os.networkInterfaces();
    const result = [];
    for (const [name, addrs] of Object.entries(ifaces)) {
      for (const addr of addrs || []) {
        if (!addr.internal && addr.family === 'IPv4') {
          result.push({
            interface: name,
            address: addr.address,
            netmask: addr.netmask,
            mac: addr.mac,
          });
        }
      }
    }
    return result;
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  _formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  }

  async getRunningProcesses(limit = 60) {
    try {
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        const { stdout } = await execAsync('tasklist /FO CSV /NH');
        const lines = stdout.trim().split('\r\n');
        return lines.slice(0, limit).map((line, idx) => {
          const parts = line.split('","').map(s => s.replace(/(^"|"$)/g, ''));
          return {
            pid: parseInt(parts[1], 10) || idx,
            name: parts[0] || 'Unknown',
            cpuPercent: 0,
            memFormatted: parts[4] || '0 K',
          };
        });
      }

      // macOS and Linux: ps command
      const { stdout } = await execAsync('ps -eo pid,ppid,%cpu,%mem,comm -r');
      const lines = stdout.trim().split('\n');
      const processes = [];

      for (let i = 1; i < lines.length && processes.length < limit; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parseInt(parts[0], 10);
          const ppid = parseInt(parts[1], 10);
          const cpuPercent = parseFloat(parts[2]) || 0;
          const memPercent = parseFloat(parts[3]) || 0;
          const command = parts.slice(4).join(' ');
          const name = path.basename(command);

          processes.push({
            pid,
            ppid,
            name,
            command,
            cpuPercent,
            memPercent,
          });
        }
      }
      return processes;
    } catch (err) {
      console.error('Failed to get processes:', err);
      return [];
    }
  }

  async killProcess(pid, force = false) {
    try {
      const signal = force ? 'SIGKILL' : 'SIGTERM';
      process.kill(pid, signal);
      return { success: true, message: `Sent ${signal} to PID ${pid}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async readDirectory(targetPath) {
    const resolvedPath = path.resolve(targetPath || os.homedir());
    try {
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const items = await Promise.all(
        entries.map(async entry => {
          const itemPath = path.join(resolvedPath, entry.name);
          let stats = null;
          try {
            stats = await fs.stat(itemPath);
          } catch {
            // Ignore broken symlinks or permission errors
          }

          return {
            name: entry.name,
            path: itemPath,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
            isSymbolicLink: entry.isSymbolicLink(),
            size: stats ? stats.size : 0,
            formattedSize: stats && entry.isFile() ? this._formatBytes(stats.size) : '--',
            mtime: stats ? stats.mtime : null,
            mode: stats ? stats.mode.toString(8) : null,
          };
        })
      );

      // Sort directories first, then alphabetical
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      return {
        currentPath: resolvedPath,
        parentPath: path.dirname(resolvedPath),
        items,
        success: true,
      };
    } catch (err) {
      return {
        currentPath: resolvedPath,
        items: [],
        success: false,
        error: err.message,
      };
    }
  }

  async readFileContent(filePath, maxBytes = 100000) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > maxBytes * 5) {
        return {
          success: false,
          error: `File is too large (${this._formatBytes(stats.size)}) to preview directly.`,
        };
      }
      const buffer = await fs.readFile(filePath);
      // Check if buffer contains null bytes (binary check)
      const isBinary = buffer.slice(0, 1024).includes(0);
      if (isBinary) {
        return {
          success: true,
          isBinary: true,
          size: stats.size,
          formattedSize: this._formatBytes(stats.size),
          filePath,
        };
      }

      return {
        success: true,
        isBinary: false,
        content: buffer.toString('utf8', 0, maxBytes),
        size: stats.size,
        formattedSize: this._formatBytes(stats.size),
        filePath,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new SystemService();
