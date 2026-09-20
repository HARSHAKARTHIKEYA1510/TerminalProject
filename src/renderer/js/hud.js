document.addEventListener('DOMContentLoaded', () => {
  const cpuVal = document.getElementById('hud-cpu-val');
  const cpuFill = document.getElementById('hud-cpu-fill');
  const memVal = document.getElementById('hud-mem-val');
  const memFill = document.getElementById('hud-mem-fill');
  const memDetail = document.getElementById('hud-mem-detail');
  const uptimeEl = document.getElementById('hud-uptime');

  const btnClose = document.getElementById('btn-hud-close');
  const btnOpenMain = document.getElementById('btn-hud-open-main');

  btnClose.addEventListener('click', () => {
    window.electronAPI.window.toggleHud();
  });

  btnOpenMain.addEventListener('click', () => {
    window.electronAPI.window.maximize();
  });

  // Listen to live metrics stream from main process
  window.electronAPI.system.onMetricsTick((metrics) => {
    if (!metrics) return;

    if (metrics.cpu) {
      const usage = metrics.cpu.usagePercent || 0;
      cpuVal.textContent = `${usage}%`;
      cpuFill.style.width = `${usage}%`;
    }

    if (metrics.memory) {
      const memUsage = metrics.memory.usagePercent || 0;
      memVal.textContent = `${memUsage}%`;
      memFill.style.width = `${memUsage}%`;
      memDetail.textContent = `${metrics.memory.formattedUsed} / ${metrics.memory.formattedTotal}`;
    }

    if (metrics.os && metrics.os.uptimeFormatted) {
      uptimeEl.textContent = `UP: ${metrics.os.uptimeFormatted}`;
    }
  });

  // Fetch initial snapshot
  window.electronAPI.system.getMetrics().then((metrics) => {
    if (metrics) {
      cpuVal.textContent = `${metrics.cpu.usagePercent}%`;
      cpuFill.style.width = `${metrics.cpu.usagePercent}%`;
      memVal.textContent = `${metrics.memory.usagePercent}%`;
      memFill.style.width = `${metrics.memory.usagePercent}%`;
      memDetail.textContent = `${metrics.memory.formattedUsed} / ${metrics.memory.formattedTotal}`;
      uptimeEl.textContent = `UP: ${metrics.os.uptimeFormatted}`;
    }
  });
});
