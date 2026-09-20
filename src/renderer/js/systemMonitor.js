class SystemMonitorController {
  constructor() {
    this.cpuValEl = document.getElementById('metric-cpu-val');
    this.cpuFillEl = document.getElementById('meter-cpu-fill');
    this.cpuModelEl = document.getElementById('metric-cpu-model');
    this.cpuCoresEl = document.getElementById('metric-cpu-cores');

    this.memValEl = document.getElementById('metric-mem-val');
    this.memFillEl = document.getElementById('meter-mem-fill');
    this.memDetailEl = document.getElementById('metric-mem-detail');
    this.memFreeEl = document.getElementById('metric-mem-free');

    this.chartCpuCanvas = document.getElementById('chart-cpu');
    this.chartMemCanvas = document.getElementById('chart-mem');

    this.cpuHistory = new Array(30).fill(0);
    this.memHistory = new Array(30).fill(0);

    // Process Manager elements
    this.processTableBody = document.getElementById('process-table-body');
    this.processSearchInput = document.getElementById('process-search');
    this.processCountEl = document.getElementById('process-count');
    this.btnRefreshProcesses = document.getElementById('btn-refresh-processes');
    this.processes = [];

    this.init();
  }

  async init() {
    this.initCharts();
    this.bindProcessEvents();

    // Listen to live metrics stream from Main process
    window.electronAPI.system.onMetricsTick((metrics) => {
      this.updateMetrics(metrics);
    });

    // Load initial system info & specs
    const info = await window.electronAPI.system.getInfo();
    this.renderSystemInfo(info);
    this.updateMetrics(info);

    // Load initial processes
    this.fetchProcesses();
  }

  initCharts() {
    this.drawChart(this.chartCpuCanvas, this.cpuHistory, '#00f0ff', 'rgba(0, 240, 255, 0.15)');
    this.drawChart(this.chartMemCanvas, this.memHistory, '#a855f7', 'rgba(168, 85, 247, 0.15)');
  }

  updateMetrics(metrics) {
    if (!metrics) return;

    if (metrics.cpu) {
      const cpuUsage = metrics.cpu.usagePercent || 0;
      this.cpuValEl.textContent = `${cpuUsage}%`;
      this.cpuFillEl.style.width = `${cpuUsage}%`;
      this.cpuModelEl.textContent = metrics.cpu.model;
      this.cpuCoresEl.textContent = `${metrics.cpu.cores} Cores`;

      this.cpuHistory.push(cpuUsage);
      this.cpuHistory.shift();
      this.drawChart(this.chartCpuCanvas, this.cpuHistory, '#00f0ff', 'rgba(0, 240, 255, 0.2)');
    }

    if (metrics.memory) {
      const memUsage = metrics.memory.usagePercent || 0;
      this.memValEl.textContent = `${memUsage}%`;
      this.memFillEl.style.width = `${memUsage}%`;
      this.memDetailEl.textContent = `Used: ${metrics.memory.formattedUsed} / Total: ${metrics.memory.formattedTotal}`;
      this.memFreeEl.textContent = `Free: ${metrics.memory.formattedFree}`;

      this.memHistory.push(memUsage);
      this.memHistory.shift();
      this.drawChart(this.chartMemCanvas, this.memHistory, '#a855f7', 'rgba(168, 85, 247, 0.2)');
    }

    if (metrics.os) {
      const uptimeEl = document.getElementById('spec-uptime');
      if (uptimeEl) uptimeEl.textContent = metrics.os.uptimeFormatted;
    }
  }

  drawChart(canvas, data, strokeColor, fillColor) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const step = width / (data.length - 1);
    ctx.beginPath();
    ctx.moveTo(0, height - (data[0] / 100) * height);

    for (let i = 1; i < data.length; i++) {
      const x = i * step;
      const y = height - (data[i] / 100) * height;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  renderSystemInfo(info) {
    if (!info) return;

    document.getElementById('spec-os').textContent = `${info.os.platform} (${info.os.release})`;
    document.getElementById('spec-arch').textContent = info.os.arch;
    document.getElementById('spec-hostname').textContent = info.os.hostname;
    document.getElementById('spec-uptime').textContent = info.os.uptimeFormatted;
    document.getElementById('spec-versions').textContent = `v${info.electronVersion} / v${info.chromeVersion}`;
    document.getElementById('spec-home').textContent = info.userInfo.homedir;

    // Network interfaces
    const netContainer = document.getElementById('network-list');
    netContainer.innerHTML = '';
    if (info.network && info.network.length > 0) {
      info.network.forEach(net => {
        const item = document.createElement('div');
        item.className = 'spec-item';
        item.innerHTML = `
          <span class="spec-label">${net.interface} (IPv4)</span>
          <span class="spec-val" style="color: var(--accent-cyan);">${net.address}</span>
          <span style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">MAC: ${net.mac || 'N/A'}</span>
        `;
        netContainer.appendChild(item);
      });
    } else {
      netContainer.innerHTML = '<div class="spec-item"><span class="spec-val">No external IPv4 interfaces</span></div>';
    }
  }

  // -------------------------------------------------------------
  // Process Manager
  // -------------------------------------------------------------
  bindProcessEvents() {
    this.btnRefreshProcesses.addEventListener('click', () => {
      this.fetchProcesses();
    });

    this.processSearchInput.addEventListener('input', () => {
      this.renderProcesses();
    });
  }

  async fetchProcesses() {
    this.processTableBody.innerHTML = `
      <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Refreshing process list...</td></tr>
    `;
    this.processes = await window.electronAPI.system.getProcesses(75);
    this.renderProcesses();
  }

  renderProcesses() {
    const query = this.processSearchInput.value.toLowerCase().trim();
    const filtered = this.processes.filter(p => {
      return (
        String(p.pid).includes(query) ||
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.command && p.command.toLowerCase().includes(query))
      );
    });

    this.processCountEl.textContent = `Showing ${filtered.length} of ${this.processes.length} processes`;
    this.processTableBody.innerHTML = '';

    if (filtered.length === 0) {
      this.processTableBody.innerHTML = `
        <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No processes matching "${query}"</td></tr>
      `;
      return;
    }

    filtered.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color: var(--accent-cyan); font-weight: 600;">${p.pid}</td>
        <td>${p.ppid !== undefined ? p.ppid : '--'}</td>
        <td title="${p.command || p.name}">
          <span style="font-weight: 500; color: var(--text-primary);">${p.name}</span>
        </td>
        <td>${p.cpuPercent !== undefined ? p.cpuPercent + '%' : '--'}</td>
        <td>${p.memPercent !== undefined ? p.memPercent + '%' : (p.memFormatted || '--')}</td>
        <td style="text-align: right;">
          <button class="btn btn-danger" style="padding: 3px 8px; font-size: 10.5px;" data-kill-pid="${p.pid}" data-force="false">Kill</button>
          <button class="btn" style="padding: 3px 8px; font-size: 10.5px;" data-kill-pid="${p.pid}" data-force="true">Force</button>
        </td>
      `;

      tr.querySelectorAll('[data-kill-pid]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const pid = parseInt(btn.getAttribute('data-kill-pid'), 10);
          const force = btn.getAttribute('data-force') === 'true';
          const confirmRes = await window.electronAPI.dialog.showMessageBox({
            type: 'warning',
            title: 'Terminate Process',
            message: `Terminate process ${p.name} (PID: ${pid})?`,
            detail: force ? 'Will issue SIGKILL immediately.' : 'Will issue graceful SIGTERM.',
            buttons: ['Terminate', 'Cancel'],
          });

          if (confirmRes.response === 0) {
            const res = await window.electronAPI.system.killProcess(pid, force);
            if (res.success) {
              tr.style.opacity = '0.4';
              tr.style.pointerEvents = 'none';
            } else {
              alert(`Failed to kill process: ${res.error}`);
            }
          }
        });
      });

      this.processTableBody.appendChild(tr);
    });
  }
}

window.SystemMonitorController = SystemMonitorController;
