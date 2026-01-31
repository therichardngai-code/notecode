# Electron Quick Start Guide

**Status:** ✅ **tsx spawn error FIXED**
**Date:** 2026-01-31
**For:** Chris (PM), Suman (Backend), Ayush (Frontend), DevOps Team

---

## ⚡ Quick Test (30 seconds)

```bash
# Step 1: Build backend (REQUIRED)
npm run build --prefix backend

# Step 2: Start Electron with frontend dev server
npm run electron:dev
```

**Expected Result:**
- ✅ No "spawn tsx ENOENT" error
- ✅ Backend starts on port 3001
- ✅ Electron window opens
- ✅ Frontend loads from Vite dev server

---

## What Was Fixed?

**Problem:**
```
❌ Error: spawn tsx ENOENT
```

**Root Cause:**
- Electron tried to run `tsx` command
- `tsx` is in `backend/node_modules/.bin/`, not in system PATH
- ENOENT = executable not found

**Solution:**
- Build backend to `dist/main.js` (compiled JavaScript)
- Use `node dist/main.js` instead of `tsx src/main.ts`
- Added auto-build to dev workflow

---

## Development Workflow

### Option 1: One Command (Recommended)

```bash
npm run electron:dev
```

**This does:**
1. Builds backend → `backend/dist/main.js`
2. Starts frontend dev server → `http://localhost:5173`
3. Waits for frontend to be ready
4. Starts Electron with embedded backend

### Option 2: Manual Control

```bash
# Terminal 1: Build backend
npm run build --prefix backend

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Start Electron
cd electron && npm run dev
```

---

## Troubleshooting

### Error: "Cannot find module 'dist/main.js'"

**Cause:** Backend not built yet

**Fix:**
```bash
npm run build --prefix backend
```

Verify file exists:
```bash
ls backend/dist/main.js
```

### Error: "EADDRINUSE: port 3001 already in use"

**Cause:** Backend already running (from previous dev session)

**Fix (Windows):**
```bash
netstat -ano | findstr :3001
taskkill /PID <process-id> /F
```

**Fix (Mac/Linux):**
```bash
lsof -ti:3001 | xargs kill -9
```

### Electron window blank/white screen

**Cause:** Frontend dev server not running

**Fix:**
```bash
# Start frontend dev server first
cd frontend && npm run dev

# Then start Electron
cd electron && npm run dev
```

Verify Vite is running: http://localhost:5173

### Backend logs not appearing

**Check Electron console:**
1. When Electron window opens
2. Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
3. Look for backend logs prefixed with `[Backend]`

Expected logs:
```
[Electron] Starting backend server...
[Electron] Backend script: C:\...\backend\dist\main.js
[Backend] Database initialized
[Backend] Server listening on http://localhost:3001
[Electron] Backend port detected: 3001
```

---

## Production Build

### Build for Your Platform

**Windows:**
```bash
npm run electron:package:win
```

Output: `release/NoteCode-1.0.0-win-x64.exe`

**macOS:**
```bash
npm run electron:package:mac
```

Output: `release/NoteCode-1.0.0-mac-x64.dmg`

**Linux:**
```bash
npm run electron:package:linux
```

Output: `release/NoteCode-1.0.0-linux-x64.AppImage`

### What Gets Packaged

✅ Compiled backend (`backend/dist/`)
✅ Backend dependencies (`backend/node_modules/`)
✅ Built frontend (`frontend/dist/`)
✅ Electron app code (`electron/dist/`)

**Total size:** ~150-250 MB (includes Node.js runtime)

---

## Testing Checklist

### Functional Tests

- [ ] Backend starts without errors
- [ ] Electron window opens
- [ ] Frontend loads and is interactive
- [ ] Can create/view tasks
- [ ] Can create/resume sessions
- [ ] Native folder picker works (File > Select Folder)
- [ ] WebSocket connection stable
- [ ] Data persists (SQLite database)

### Platform Tests (Production)

- [ ] Windows .exe installs and runs
- [ ] macOS .dmg mounts and runs
- [ ] Linux AppImage runs
- [ ] All features work in packaged app

---

## Performance

**Development Startup:**
- Backend build: ~5-10 seconds
- Backend startup: ~2-3 seconds
- Frontend dev server: ~3-5 seconds
- **Total:** ~10-15 seconds

**Production Startup:**
- Backend startup: ~2-3 seconds
- Frontend load: <1 second (cached)
- **Total:** ~3-5 seconds

**Build Times:**
- Backend: ~5-10 seconds
- Frontend: ~20-30 seconds
- Electron packaging: ~60-120 seconds

---

## Next Steps

### For Backend Team (Suman) ✅
**Status:** Complete - no changes needed

### For Frontend Team (Ayush)
**Optional enhancements:**
1. Test all features in Electron
2. Add Electron API types for TypeScript
3. Enhance folder picker with native dialog
4. Test on different screen sizes/resolutions

### For DevOps Team
**Required:**
1. Test production builds on all platforms
2. Setup code signing certificates
3. Configure auto-update server (optional)
4. Create installer customizations (branding)

### For Chris (PM)
**Deliverables:**
- ✅ Fix implemented and documented
- ✅ Quick start guide created
- ⏳ Pending team testing
- ⏳ Pending production deployment plan

---

## Resources

**Documentation:**
- Full fix report: `plans/reports/electron/fix-260131-0407-tsx-spawn-enoent.md`
- Original analysis: `plans/reports/electron/backend-enhancement-260131-0404-tsx-spawn-fix.md`
- Electron docs: `electron/README.md`
- Integration guide: `docs/ELECTRON-INTEGRATION.md`

**Commands Reference:**
```bash
# Development
npm run electron:dev              # Build backend + start Electron
npm run build --prefix backend    # Build backend only
npm run dev --prefix frontend     # Start frontend only

# Production
npm run electron:package:win      # Windows installer
npm run electron:package:mac      # macOS DMG
npm run electron:package:linux    # Linux AppImage

# Testing
npm run build                     # Build everything
npm test --prefix backend         # Backend tests
npm test --prefix frontend        # Frontend tests
```

---

## Questions?

**For Electron issues:** Check Electron DevTools console
**For backend issues:** Check Electron terminal output
**For frontend issues:** Check browser DevTools console
**For build issues:** Check build logs and troubleshooting section

**Contact:** Senior Developer team or submit issue ticket

---

**Last Updated:** 2026-01-31 04:07
**Status:** 🟢 **READY FOR TESTING**
