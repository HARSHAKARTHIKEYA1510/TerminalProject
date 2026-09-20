# ⚡ TerminalDeck Pro

A modern, high-performance desktop application built with **Electron**, engineered specifically to showcase deep **Desktop APIs**, **Multi-Window Management**, **Hardened IPC Architecture**, and **System-Level Interactions**.

---

## 🌟 Highlights & Key Architectural Pillars

### 1. 🎛️ Desktop & Native System APIs
- **Dialogs API**: Native file pickers (`dialog.showOpenDialog`), folder selectors, file savers (`dialog.showSaveDialog`), and system confirmation alerts (`dialog.showMessageBox`, `dialog.showErrorBox`).
- **Clipboard Suite**: Native text reading and writing, binary clipboard image capture, format introspection, and clipboard clearing.
- **Native Notifications**: Desktop toast notifications with interactive action triggers and click-back response listeners.
- **Global Shortcuts**: System-wide key bindings (`Cmd/Ctrl+Shift+T` to toggle main window, `Cmd/Ctrl+Shift+H` to toggle HUD) registered through Electron's `globalShortcut`.
- **Shell Integrations**: Direct OS shell capabilities (`shell.openExternal`, `shell.openPath`, `shell.showItemInFolder`, `shell.trashItem`, `shell.beep`).
- **Power Monitor & Lifecycle**: System idle duration tracking (`powerMonitor.getSystemIdleTime`), battery vs. AC power state detection, and sleep/resume/suspend lifecycle broadcast.
- **Screen & Display Telemetry**: Multi-monitor geometry detection, scale factors, work areas, and real-time cursor coordinate tracking.
- **macOS Dock & Tray**: Dynamic dock badge counter manipulation (`app.dock.setBadge`), native system tray icon with context menu quick actions.

### 2. 🪟 Advanced Window Management
- **Frameless Glass Window**: Translucent dark aesthetic with macOS vibrancy (`under-window`), custom title bar, pin-on-top toggle, and drag regions.
- **Detachable Floating Mini HUD**: An independent, always-on-top translucent widget displaying synchronized live CPU and RAM meters.
- **Window State Persistence**: Automatically preserves and restores window position, dimensions, and maximized state across app launches.
- **Inter-Window Broadcast IPC**: Cross-window communication routing updates between the main dashboard and floating HUD windows.

### 3. 🛡️ Secure IPC (Inter-Process Communication)
- **Zero-Trust Renderer**: Strict enforcement of `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: false` (for preload bridging).
- **Two-Way IPC**: `ipcRenderer.invoke` $\leftrightarrow$ `ipcMain.handle` for asynchronous request-response transactions.
- **One-Way IPC**: `ipcRenderer.send` $\leftrightarrow$ `ipcMain.on` for fire-and-forget commands.
- **Real-Time Streaming**: High-frequency push updates from the Main process to renderers (`webContents.send`), powering live terminal stdout/stderr and 1.5s hardware metrics ticks.

### 4. 💻 System-Level Interactions & Terminal
- **Interactive Terminal Shell**:
  - Full streaming terminal powered by Node.js `child_process.spawn`.
  - ANSI escape code parser supporting colored terminal outputs.
  - Command input history navigation with Up/Down arrow keys.
  - Built-in `cd` directory tracking and working directory indicators.
  - Active process termination (`SIGINT` / `SIGTERM`).
  - Preconfigured system diagnostic macros (`git status`, `sw_vers`, `uname -a`, `df -h`).
- **Live Hardware Monitor**:
  - Dynamic CPU load calculation sampled across multi-core processor times.
  - Memory consumption breakdown (used, free, total, percentage).
  - Rolling Canvas-based area charts visualizing real-time CPU and RAM history.
  - Host telemetry: OS platform, kernel release, uptime, architecture, network interfaces.
- **Process Manager**:
  - Real-time system process inspection sorted by resource usage.
  - Instant search filtering by PID or process name.
  - Process termination controls (graceful `SIGTERM` and forced `SIGKILL`).
- **File System Explorer**:
  - Directory navigation with folder/file recognition, file sizes, and timestamps.
  - In-app file viewer modal for inspecting text, markdown, scripts, and configs.
  - Direct actions: "Open in Terminal" and "Reveal in Finder".

---

## 🏛️ Architecture Overview

```
TerminalProject/
├── package.json               # Package configuration & scripts
├── .gitignore                 # Git ignore patterns
├── src/
│   ├── main/
│   │   ├── main.js            # App lifecycle, Tray, Global shortcuts, Power monitoring
│   │   ├── windowManager.js   # Multi-window coordinator & state persistence
│   │   ├── ipcHandlers.js     # Centralized IPC dispatcher
│   │   ├── terminalService.js # PTY/shell process spawning & stream piping
│   │   └── systemService.js   # Hardware metrics, OS info, process & file system ops
│   ├── preload/
│   │   └── preload.js         # contextBridge API exposing window.electronAPI
│   └── renderer/
│       ├── index.html         # Main dashboard layout
│       ├── hud.html           # Floating hardware HUD window layout
│       ├── css/
│       │   └── styles.css     # Cyberpunk / glassmorphic theme & UI components
│       └── js/
│           ├── app.js         # Navigation, tab router, keyboard shortcuts
│           ├── terminal.js    # Interactive terminal emulator & ANSI parser
│           ├── desktopApis.js # Interactive native Desktop API test suites
│           ├── systemMonitor.js# Canvas charts & live process manager
│           ├── fileExplorer.js# Directory navigator & file preview modal
│           └── hud.js         # Mini HUD sync controller
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **npm**: v9.0.0 or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/HARSHAKARTHIKEYA1510/TerminalProject.git
cd TerminalProject

# Install dependencies
npm install
```

### Running the App
```bash
# Launch the desktop application
npm start
```

### Running Smoke Tests
```bash
# Verify headless initialization, windows, and IPC pipeline
npm test
npm start -- --smoke-test
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Scope | Action |
| :--- | :--- | :--- |
| `Cmd/Ctrl + Shift + T` | **Global (System)** | Toggle / Focus / Minimize TerminalDeck |
| `Cmd/Ctrl + Shift + H` | **Global (System)** | Toggle Detachable Floating Resource HUD |
| `Cmd/Ctrl + 1` | In-App | Switch to Terminal Shell |
| `Cmd/Ctrl + 2` | In-App | Switch to Desktop APIs Playground |
| `Cmd/Ctrl + 3` | In-App | Switch to Hardware Monitor |
| `Cmd/Ctrl + 4` | In-App | Switch to Process Manager |
| `Cmd/Ctrl + 5` | In-App | Switch to File Explorer |
| `Ctrl + C` | Terminal | Send `SIGINT` to running terminal command |
| `Up / Down Arrows` | Terminal | Browse previous command history |
| `Escape` | In-App | Close active modal dialog |

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
