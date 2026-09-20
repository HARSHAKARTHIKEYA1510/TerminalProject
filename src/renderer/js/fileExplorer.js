class FileExplorerController {
  constructor() {
    this.currentPathEl = document.getElementById('fs-current-path');
    this.fileListEl = document.getElementById('fs-file-list');
    this.btnUp = document.getElementById('btn-fs-up');
    this.btnHome = document.getElementById('btn-fs-home');
    this.btnProject = document.getElementById('btn-fs-project');
    this.btnOpenTerm = document.getElementById('btn-fs-open-term');
    this.btnReveal = document.getElementById('btn-fs-reveal');

    // Modal elements
    this.modalEl = document.getElementById('file-modal');
    this.modalTitle = document.getElementById('modal-filename');
    this.modalContent = document.getElementById('modal-content');
    this.modalClose = document.getElementById('modal-close');

    this.currentPath = '';
    this.parentPath = '';

    this.init();
  }

  async init() {
    this.bindEvents();
    // Default to current project or homedir
    const appInfo = await window.electronAPI.app.getAppInfo();
    const startPath = appInfo.paths.home;
    this.loadDirectory(startPath);
  }

  bindEvents() {
    this.btnUp.addEventListener('click', () => {
      if (this.parentPath && this.parentPath !== this.currentPath) {
        this.loadDirectory(this.parentPath);
      }
    });

    this.btnHome.addEventListener('click', async () => {
      const appInfo = await window.electronAPI.app.getAppInfo();
      this.loadDirectory(appInfo.paths.home);
    });

    this.btnProject.addEventListener('click', async () => {
      const cwd = await window.electronAPI.terminal.getCwd();
      this.loadDirectory(cwd);
    });

    this.btnOpenTerm.addEventListener('click', () => {
      if (window.appController) {
        window.appController.switchTab('terminal');
        if (window.terminalController) {
          window.terminalController.execute(`cd "${this.currentPath}"`);
        }
      }
    });

    this.btnReveal.addEventListener('click', async () => {
      await window.electronAPI.shell.showItemInFolder(this.currentPath);
    });

    this.modalClose.addEventListener('click', () => {
      this.modalEl.classList.remove('active');
    });

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.modalEl.classList.remove('active');
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl.classList.contains('active')) {
        this.modalEl.classList.remove('active');
      }
    });
  }

  async loadDirectory(dirPath) {
    this.fileListEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Loading files...</div>';
    const result = await window.electronAPI.fs.readDir(dirPath);

    if (!result.success) {
      this.fileListEl.innerHTML = `<div style="padding: 20px; color: var(--accent-rose);">Error: ${result.error}</div>`;
      return;
    }

    this.currentPath = result.currentPath;
    this.parentPath = result.parentPath;
    this.currentPathEl.textContent = this.currentPath;
    this.renderItems(result.items);
  }

  renderItems(items) {
    this.fileListEl.innerHTML = '';

    if (!items || items.length === 0) {
      this.fileListEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Empty folder</div>';
      return;
    }

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'file-item';

      let icon = '📄';
      if (item.isDirectory) icon = '📁';
      else if (item.name.endsWith('.js') || item.name.endsWith('.ts') || item.name.endsWith('.json')) icon = '⚡';
      else if (item.name.endsWith('.md') || item.name.endsWith('.txt')) icon = '📝';
      else if (item.name.endsWith('.png') || item.name.endsWith('.jpg') || item.name.endsWith('.svg')) icon = '🖼️';
      else if (item.name.endsWith('.sh') || item.name.endsWith('.py')) icon = '⚙️';

      el.innerHTML = `
        <span class="file-icon">${icon}</span>
        <div class="file-info">
          <span class="file-name" title="${item.name}">${item.name}</span>
          <span class="file-sub">${item.isDirectory ? 'Folder' : item.formattedSize}</span>
        </div>
      `;

      el.addEventListener('click', () => {
        if (item.isDirectory) {
          this.loadDirectory(item.path);
        } else {
          this.previewFile(item.path, item.name);
        }
      });

      this.fileListEl.appendChild(el);
    });
  }

  async previewFile(filePath, fileName) {
    this.modalTitle.textContent = fileName;
    this.modalContent.textContent = 'Loading file contents...';
    this.modalEl.classList.add('active');

    const res = await window.electronAPI.fs.readFile(filePath, 80000);
    if (!res.success) {
      this.modalContent.textContent = `Error: ${res.error}`;
      return;
    }

    if (res.isBinary) {
      this.modalContent.textContent = `[Binary File (${res.formattedSize})] - Preview not supported in plain text viewer.\nPath: ${filePath}`;
    } else {
      this.modalContent.textContent = res.content || '(Empty file)';
    }
  }
}

window.FileExplorerController = FileExplorerController;
