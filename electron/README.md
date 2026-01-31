# Electron Desktop App for NoteCode

## Overview

Packages NoteCode as a native desktop application for Windows, macOS, and Linux with:
- Embedded backend server (no separate process needed)
- Native OS folder dialogs (best UX)
- System tray integration
- Auto-updates (optional)
- Offline capability

## Architecture

```
┌─────────────────────────────────────────────┐
│         Electron Application                │
├─────────────────────────────────────────────┤
│  Main Process (Node.js)                     │
│  ├── main.ts          Window & lifecycle    │
│  ├── preload.ts       IPC bridge (secure)   │
│  └── Backend          Fastify (embedded)    │
├─────────────────────────────────────────────┤
│  Renderer Process (Chromium)                │
│  └── Frontend         React SPA             │
└─────────────────────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
cd electron
npm install
```

### 2. Build Electron Code

```bash
npm run build
```

## Development

### Run in Development Mode

**IMPORTANT:** Backend must be built first (compiled to `dist/main.js`).

```bash
# Option 1: Auto-build and start (recommended)
npm run electron:dev

# Option 2: Manual steps
# Step 1: Build backend
npm run build --prefix backend

# Step 2: Start frontend dev server
cd frontend && npm run dev

# Step 3: In another terminal, start Electron
cd electron && npm run dev
```

**Note:**
- Electron will connect to Vite dev server at `http://localhost:5173`
- Backend runs compiled code (`dist/main.js`), not TypeScript source
- If you modify backend, rebuild: `npm run build --prefix backend`

## Building Desktop Apps

### Prerequisites

1. **Build backend and frontend first:**

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build

# Build Electron code
cd electron
npm run build
```

### Package for All Platforms

```bash
cd electron
npm run package
```

### Platform-Specific Builds

```bash
# Windows (.exe, portable)
npm run package:win

# macOS (.dmg, .zip)
npm run package:mac

# Linux (AppImage, .deb, .rpm)
npm run package:linux
```

### Output

Built apps will be in `release/` directory:

```
release/
├── NoteCode-1.0.0-win-x64.exe
├── NoteCode-1.0.0-win-portable.exe
├── NoteCode-1.0.0-mac-x64.dmg
├── NoteCode-1.0.0-mac-arm64.dmg
├── NoteCode-1.0.0-linux-x64.AppImage
├── NoteCode-1.0.0-linux-x64.deb
└── NoteCode-1.0.0-linux-x64.rpm
```

## Features

### Native OS Dialogs

Instead of PowerShell/AppleScript/zenity, Electron uses native dialogs:

```typescript
// In renderer (frontend):
const result = await window.electronAPI.selectFolder({
  title: 'Select Project Folder',
  defaultPath: '/home/user/projects'
});

if (!result.cancelled) {
  console.log('Selected:', result.path);
}
```

### Platform Detection

```typescript
// In renderer (frontend):
if (window.electronAPI?.isElectron()) {
  console.log('Running in Electron');
  console.log('Platform:', window.electronAPI.getPlatform());
  const version = await window.electronAPI.getAppVersion();
}
```

### Window Controls (Optional)

For custom title bar:

```typescript
// Minimize
window.electronAPI.minimize();

// Maximize/Restore
window.electronAPI.maximize();

// Close
window.electronAPI.close();
```

## Configuration

### electron-builder.json

Controls how the app is packaged:

- **App ID:** `com.notecode.app`
- **Product Name:** NoteCode
- **Icons:** Place in `electron/build/`
  - Windows: `icon.ico` (256x256)
  - macOS: `icon.icns` (512x512)
  - Linux: `icon.png` (512x512)

### Code Signing (Production)

#### Windows

```bash
# Install certificate
# Set environment variables
set CSC_LINK=path/to/certificate.pfx
set CSC_KEY_PASSWORD=your_password

npm run package:win
```

#### macOS

```bash
# Install certificate in Keychain
# Set environment variables
export CSC_LINK=Developer ID Application: Your Name (TEAM_ID)

# Enable notarization
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=app-specific-password

npm run package:mac
```

## Project Structure

```
electron/
├── src/
│   ├── main.ts          # Main process (window, backend)
│   └── preload.ts       # IPC bridge (security)
├── dist/                # Compiled TypeScript
├── build/              # Build resources (icons)
├── package.json
├── tsconfig.json
└── README.md

Root level:
├── electron-builder.json  # Build configuration
└── release/              # Built applications
```

## Troubleshooting

### Backend Doesn't Start

```bash
# Check backend build
cd backend
npm run build
ls dist/

# Check logs in Electron console
# View > Toggle Developer Tools
```

### Frontend Won't Load

```bash
# Check frontend build
cd frontend
npm run build
ls dist/

# In development, ensure Vite is running
npm run dev
```

### Icons Not Showing

- **Windows:** Ensure `icon.ico` is 256x256 (multi-resolution)
- **macOS:** Convert PNG to ICNS using `iconutil`
- **Linux:** Use PNG with 512x512 resolution

### Build Fails

```bash
# Clear cache
rm -rf electron/dist
rm -rf release

# Rebuild everything
cd backend && npm run build
cd ../frontend && npm run build
cd ../electron && npm run build
cd ../electron && npm run package
```

## Security

- **Context Isolation:** Enabled (renderer can't access Node.js)
- **Node Integration:** Disabled (secure by default)
- **Preload Script:** Only exposes safe IPC methods
- **Sandboxing:** Disabled (needed for IPC)

## Performance

### Reduce Bundle Size

1. Use `asar` (enabled by default)
2. Set `compression: maximum` in electron-builder.json
3. Exclude dev dependencies from packaging

### Startup Time

- Backend starts in ~2-3 seconds
- Frontend loads in <1 second (cached)
- Total startup: ~3-5 seconds

## Next Steps

1. **Add icons** to `electron/build/`
2. **Test platform-specific builds**
3. **Configure auto-updates** (optional)
4. **Setup code signing** for distribution
5. **Create installer customizations**

## Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [electron-builder Docs](https://www.electron.build)
- [Code Signing Guide](https://www.electron.build/code-signing)
