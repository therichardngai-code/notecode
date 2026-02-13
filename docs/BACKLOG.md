# NoteCode Backlog

## Feature Enhancement Requests

### FER-001: Implement Import API Endpoint

**Priority:** Medium  
**Type:** Feature Enhancement  
**Date Logged:** 2026-02-13  
**Found By:** E2E Testing

**Description:**
The CLI `notecode import <file>` command exists but the backend API endpoint `/api/backup/import` is not implemented (returns HTTP 501).

**Current Behavior:**
```bash
npx notecode export -o backup.json  # ✅ Works
npx notecode import backup.json     # ❌ Returns 501 Not Implemented
```

**Expected Behavior:**
Import should restore tasks, projects, sessions, and hooks from a previously exported JSON file.

**Requirements:**
- Implement `POST /api/backup/import` endpoint
- Accept JSON body with exported data structure
- Support `merge` mode (add to existing) vs replace mode
- Return count of imported items

**CLI Already Supports:**
- `--merge` flag for merge mode
- `--json` flag for JSON output
- File path validation

**Affected Files:**
- Backend route handler (needs creation)
- `backend/src/cli/commands/data.ts` (CLI ready, just needs working API)

---

## Completed

_(none yet)_

---

_Last updated: 2026-02-13_
