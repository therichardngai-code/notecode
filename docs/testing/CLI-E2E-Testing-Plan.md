# NoteCode CLI End-to-End Testing Plan

**Version:** 1.0  
**Date:** 2026-02-13  
**Author:** Wolf ⚡  

---

## Overview

This document covers end-to-end testing for the NoteCode CLI with all new features. Tests are organized by command group with prerequisites, test cases, and expected results.

---

## Prerequisites

### Environment Setup
```bash
# 1. Build the backend (includes CLI)
cd ~/Projects/notecode/backend
npm run build

# 2. Start the server
npm run dev
# OR
npx notecode server start -p 41920

# 3. Verify server is running
curl http://localhost:41920/api/system/platform
```

### Test Data Setup
```bash
# Create a test project first (many commands depend on this)
npx notecode project create "Test Project" --path /tmp/test-project --json
# Save the project ID for later tests
```

---

## 1. Server Commands

### 1.1 Server Start (Default)
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| SRV-01 | Start with default port | `npx notecode server start` | Server starts on port 41920, banner displays |
| SRV-02 | Start with custom port | `npx notecode server start -p 5000` | Server starts on port 5000 |
| SRV-03 | Start without browser | `npx notecode server start --no-browser` | Server starts, no browser opens |
| SRV-04 | Port conflict handling | Start 2 servers on same port | Second server finds next available port OR shows error |

### 1.2 Legacy Mode
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| SRV-05 | Legacy invocation | `npx notecode` | Server starts (legacy mode) |
| SRV-06 | Legacy with port | `npx notecode -p 3000` | Server starts on port 3000 |
| SRV-07 | Legacy no-browser | `npx notecode --no-browser` | Server starts without browser |

---

## 2. Task Commands

### 2.1 Task List
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| TSK-01 | List all tasks | `npx notecode task list` | Table with ID, Status, Priority, Title, Created |
| TSK-02 | List with JSON | `npx notecode task list --json` | JSON array output |
| TSK-03 | Filter by status | `npx notecode task list --status in-progress` | Only in-progress tasks shown |
| TSK-04 | Filter by assignee | `npx notecode task list --assignee claude` | Only tasks assigned to claude |
| TSK-05 | Filter by project | `npx notecode task list --project-id <id>` | Only tasks in that project |
| TSK-06 | Empty list | (no tasks exist) | "0 task(s) found" message |

### 2.2 Task Create
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| TSK-10 | Create basic task | `npx notecode task create "Fix bug"` | Task created, ID shown |
| TSK-11 | Create with priority | `npx notecode task create "Urgent fix" -p high` | Task with high priority |
| TSK-12 | Create with description | `npx notecode task create "Task" -d "Description here"` | Task with description |
| TSK-13 | Create with project | `npx notecode task create "Task" --project-id <id>` | Task linked to project |
| TSK-14 | Create with permission mode | `npx notecode task create "Task" --permission-mode bypassPermissions` | Task with permission mode set |
| TSK-15 | Create with allow-tools | `npx notecode task create "Task" --allow-tools "Read,Write"` | Task with tool allowlist |
| TSK-16 | Create with block-tools | `npx notecode task create "Task" --block-tools "Bash,Edit"` | Task with tool blocklist |
| TSK-17 | Create with provider | `npx notecode task create "Task" --provider anthropic` | Task with specific provider |
| TSK-18 | Create with model | `npx notecode task create "Task" --model claude-3-opus` | Task with specific model |
| TSK-19 | Create with skills | `npx notecode task create "Task" --skills "debugging,testing"` | Task with skills array |
| TSK-20 | Create with context files | `npx notecode task create "Task" --context-files "src/,README.md"` | Task with context files |
| TSK-21 | Create with JSON output | `npx notecode task create "Task" --json` | JSON object with task details |
| TSK-22 | Create all options | `npx notecode task create "Full" -p high -d "Desc" --provider anthropic --model sonnet --permission-mode acceptEdits --allow-tools "Read,Grep" --skills "debugging" --json` | Task with all options set |

### 2.3 Task Get
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| TSK-30 | Get task details | `npx notecode task get <task-id>` | Full task details displayed |
| TSK-31 | Get with JSON | `npx notecode task get <task-id> --json` | JSON object output |
| TSK-32 | Get with short ID | `npx notecode task get <first-8-chars>` | Task found by partial ID |
| TSK-33 | Get non-existent | `npx notecode task get invalid-id` | Error message |

### 2.4 Task Update
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| TSK-40 | Update status | `npx notecode task update <id> --status in-progress` | Status updated |
| TSK-41 | Update priority | `npx notecode task update <id> --priority low` | Priority updated |
| TSK-42 | Update title | `npx notecode task update <id> --title "New title"` | Title updated |
| TSK-43 | Update description | `npx notecode task update <id> --description "New desc"` | Description updated |
| TSK-44 | Update multiple fields | `npx notecode task update <id> --status done --priority high` | Both fields updated |
| TSK-45 | Update with JSON | `npx notecode task update <id> --status done --json` | JSON output |
| TSK-46 | Update no fields | `npx notecode task update <id>` | Error: "No update fields provided" |

---

## 3. Session Commands

### 3.1 Session List
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| SES-01 | List all sessions | `npx notecode session list` | Table with ID, Status, Task, Provider, Started, Duration |
| SES-02 | List with JSON | `npx notecode session list --json` | JSON array output |
| SES-03 | Filter by task | `npx notecode session list --task <task-id>` | Only sessions for that task |
| SES-04 | Limit results | `npx notecode session list --limit 5` | Max 5 sessions shown |
| SES-05 | Empty list | (no sessions exist) | "0 session(s) found" message |

### 3.2 Session Get
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| SES-10 | Get session details | `npx notecode session get <session-id>` | Full session details with tokens/cost |
| SES-11 | Get with JSON | `npx notecode session get <session-id> --json` | JSON object output |
| SES-12 | Get non-existent | `npx notecode session get invalid-id` | Error message |

---

## 4. Project Commands

### 4.1 Project List
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| PRJ-01 | List all projects | `npx notecode project list` | Table with ID, Name, Path, Active, Created |
| PRJ-02 | List with JSON | `npx notecode project list --json` | JSON array output |
| PRJ-03 | Empty list | (no projects exist) | "No projects found" message |

### 4.2 Project Create
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| PRJ-10 | Create basic project | `npx notecode project create "My Project"` | Project created, ID shown |
| PRJ-11 | Create with path | `npx notecode project create "My Project" -p /path/to/dir` | Project with path set |
| PRJ-12 | Create with JSON | `npx notecode project create "My Project" --json` | JSON output |

### 4.3 Project Get
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| PRJ-20 | Get project details | `npx notecode project get <project-id>` | Full project details |
| PRJ-21 | Get with JSON | `npx notecode project get <project-id> --json` | JSON object output |
| PRJ-22 | Get non-existent | `npx notecode project get invalid-id` | Error message |

### 4.4 Project Update
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| PRJ-30 | Update name | `npx notecode project update <id> --name "New Name"` | Name updated |
| PRJ-31 | Update path | `npx notecode project update <id> --path /new/path` | Path updated |
| PRJ-32 | Set active | `npx notecode project update <id> --active` | Project marked active |
| PRJ-33 | Set inactive | `npx notecode project update <id> --no-active` | Project marked inactive |
| PRJ-34 | Update with JSON | `npx notecode project update <id> --name "X" --json` | JSON output |
| PRJ-35 | Update no fields | `npx notecode project update <id>` | Error: "No update fields provided" |

### 4.5 Project Delete
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| PRJ-40 | Delete project | `npx notecode project delete <project-id>` | Project deleted |
| PRJ-41 | Delete with JSON | `npx notecode project delete <project-id> --json` | JSON output |
| PRJ-42 | Delete non-existent | `npx notecode project delete invalid-id` | Error message |

---

## 5. Approval Commands

### 5.1 Approval List
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| APR-01 | List pending approvals | `npx notecode approval list` | Table with ID, Type, Tool, Category, Session, Timeout |
| APR-02 | List with JSON | `npx notecode approval list --json` | JSON array output |
| APR-03 | Empty list | (no pending approvals) | "No pending approvals" message |

### 5.2 Approval Get
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| APR-10 | Get approval details | `npx notecode approval get <approval-id>` | Full details with payload and diffs |
| APR-11 | Get with JSON | `npx notecode approval get <approval-id> --json` | JSON object output |

### 5.3 Approval Approve
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| APR-20 | Approve pending | `npx notecode approval approve <approval-id>` | "Approval approved" message |
| APR-21 | Approve with JSON | `npx notecode approval approve <approval-id> --json` | JSON output |

### 5.4 Approval Reject
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| APR-30 | Reject pending | `npx notecode approval reject <approval-id>` | "Approval rejected" message |
| APR-31 | Reject with reason | `npx notecode approval reject <id> -r "Not safe"` | Rejected with reason |
| APR-32 | Reject with JSON | `npx notecode approval reject <id> --json` | JSON output |

---

## 6. Approval Gate Commands

### 6.1 Enable Approval Gate
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| AGT-01 | Enable global | `npx notecode approval-gate enable` | Gate enabled globally |
| AGT-02 | Enable for project | `npx notecode approval-gate enable --project <id>` | Gate enabled for project |
| AGT-03 | Enable with timeout | `npx notecode approval-gate enable --timeout 60` | Gate with 60s timeout |
| AGT-04 | Enable with auto-allow | `npx notecode approval-gate enable --auto-allow "Read,Grep"` | Custom auto-allow list |
| AGT-05 | Enable require-approval | `npx notecode approval-gate enable --require-approval "Bash,Write"` | Custom require list |
| AGT-06 | Enable with JSON | `npx notecode approval-gate enable --json` | JSON output |

### 6.2 Disable Approval Gate
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| AGT-10 | Disable global | `npx notecode approval-gate disable` | Gate disabled globally |
| AGT-11 | Disable for project | `npx notecode approval-gate disable --project <id>` | Gate disabled for project |
| AGT-12 | Disable with JSON | `npx notecode approval-gate disable --json` | JSON output |

---

## 7. Hook Commands

### 7.1 Hook List
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| HK-01 | List all hooks | `npx notecode hook list` | Table with Name, Type, Scope, Enabled, Synced |
| HK-02 | List with JSON | `npx notecode hook list --json` | JSON array output |
| HK-03 | Filter by project | `npx notecode hook list --project-id <id>` | Only project hooks |
| HK-04 | Filter by scope | `npx notecode hook list --scope global` | Only global hooks |
| HK-05 | Empty list | (no hooks) | "No hooks configured" message |

### 7.2 Hook Sync
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| HK-10 | Sync all hooks | `npx notecode hook sync` | Hooks synced to filesystem |
| HK-11 | Sync project hooks | `npx notecode hook sync --project-id <id>` | Project hooks synced |
| HK-12 | Sync with JSON | `npx notecode hook sync --json` | JSON output with count |

---

## 8. Data Commands

### 8.1 Export
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| DAT-01 | Export to stdout | `npx notecode export` | JSON output to console |
| DAT-02 | Export to file | `npx notecode export -o backup.json` | File created with tasks/sessions/projects/hooks |
| DAT-03 | Export with JSON flag | `npx notecode export --json` | Same as DAT-01 |

### 8.2 Import
| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| DAT-10 | Import file | `npx notecode import backup.json` | Data imported, counts shown |
| DAT-11 | Import with merge | `npx notecode import backup.json --merge` | Data merged, not replaced |
| DAT-12 | Import with JSON | `npx notecode import backup.json --json` | JSON output |
| DAT-13 | Import invalid file | `npx notecode import invalid.json` | Error: "Invalid export file format" |
| DAT-14 | Import non-existent | `npx notecode import missing.json` | File not found error |

---

## 9. Status Command

| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| STS-01 | Show status | `npx notecode status` | Server URL, Platform, Sessions/Tasks/Approvals counts |
| STS-02 | Status with JSON | `npx notecode status --json` | JSON object with all stats |
| STS-03 | Status server down | (server not running) | Connection error |

---

## 10. Watch Command

| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| WCH-01 | Watch default | `npx notecode watch` | Real-time updates every 2000ms |
| WCH-02 | Watch custom interval | `npx notecode watch --interval 5000` | Updates every 5000ms |
| WCH-03 | Watch with JSON | `npx notecode watch --json` | JSON lines output |
| WCH-04 | Watch Ctrl+C | (Ctrl+C while watching) | "Watch stopped" message, clean exit |

---

## 11. Global Options

| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| GLB-01 | Custom API URL | `npx notecode --api-url http://localhost:5000 status` | Uses custom API URL |
| GLB-02 | Help flag | `npx notecode --help` | Shows all commands and options |
| GLB-03 | Version flag | `npx notecode --version` | Shows version number |
| GLB-04 | Command help | `npx notecode task --help` | Shows task subcommands |
| GLB-05 | Subcommand help | `npx notecode task create --help` | Shows create options |

---

## 12. Error Handling

| ID | Test Case | Command | Expected Result |
|----|-----------|---------|-----------------|
| ERR-01 | Server not running | Any command | Connection refused error |
| ERR-02 | Invalid command | `npx notecode invalid` | Unknown command error |
| ERR-03 | Missing required arg | `npx notecode task create` | Missing argument error |
| ERR-04 | Invalid option value | `npx notecode task list --status invalid` | No results or error |
| ERR-05 | Invalid JSON input | `npx notecode import bad.json` | Parse error |

---

## 13. Integration Tests

### 13.1 Full Workflow Test
```bash
# 1. Start server
npx notecode server start -p 41920 --no-browser &

# 2. Create project
PROJECT_ID=$(npx notecode project create "Integration Test" --json | jq -r '.project.id')

# 3. Create task in project
TASK_ID=$(npx notecode task create "Test Task" -p high -d "Integration test task" --project-id $PROJECT_ID --json | jq -r '.task.id')

# 4. Update task status
npx notecode task update $TASK_ID --status in-progress

# 5. List tasks
npx notecode task list --project-id $PROJECT_ID

# 6. Export data
npx notecode export -o /tmp/backup.json

# 7. Check status
npx notecode status

# 8. Get task details
npx notecode task get $TASK_ID

# 9. Mark complete
npx notecode task update $TASK_ID --status done

# 10. Delete project (cleanup)
npx notecode project delete $PROJECT_ID

# 11. Stop server
pkill -f "notecode server"
```

### 13.2 Export/Import Roundtrip
```bash
# 1. Create test data
npx notecode project create "Export Test"
npx notecode task create "Task 1"
npx notecode task create "Task 2"

# 2. Export
npx notecode export -o /tmp/roundtrip.json

# 3. Note counts
cat /tmp/roundtrip.json | jq '.tasks | length'

# 4. Import to fresh instance (after clearing DB)
npx notecode import /tmp/roundtrip.json

# 5. Verify counts match
npx notecode task list --json | jq 'length'
```

---

## Test Execution Checklist

### Pre-Test
- [ ] Backend built successfully
- [ ] Server starts without errors
- [ ] Database initialized
- [ ] Test project created

### Phase 1: Core Commands
- [ ] Server commands (SRV-01 to SRV-07)
- [ ] Task commands (TSK-01 to TSK-46)
- [ ] Session commands (SES-01 to SES-12)
- [ ] Project commands (PRJ-01 to PRJ-42)

### Phase 2: Advanced Commands
- [ ] Approval commands (APR-01 to APR-32)
- [ ] Approval gate commands (AGT-01 to AGT-12)
- [ ] Hook commands (HK-01 to HK-12)
- [ ] Data commands (DAT-01 to DAT-14)

### Phase 3: Utility & Integration
- [ ] Status command (STS-01 to STS-03)
- [ ] Watch command (WCH-01 to WCH-04)
- [ ] Global options (GLB-01 to GLB-05)
- [ ] Error handling (ERR-01 to ERR-05)
- [ ] Integration tests (13.1, 13.2)

### Post-Test
- [ ] All tests documented with PASS/FAIL
- [ ] Bugs logged with test ID reference
- [ ] Screenshots/logs saved for failures

---

## Test Results Template

| Test ID | Status | Notes | Date |
|---------|--------|-------|------|
| TSK-01 | PASS/FAIL | | |
| TSK-02 | PASS/FAIL | | |
| ... | | | |

---

**Total Test Cases:** 98+

**Estimated Duration:** 2-3 hours (manual execution)

---

_Document maintained by Wolf ⚡_
