/**
 * Terminal Stream Handler
 * WebSocket handler for PTY terminal I/O
 */

import { WebSocket } from 'ws';
import * as pty from 'node-pty';
import { Terminal, ShellType, TERMINAL_CONFIG } from '../../domain/entities/terminal.entity.js';

// Store active terminals and their PTY processes
const activeTerminals = new Map<string, {
  terminal: Terminal;
  ptyProcess: pty.IPty;
  clients: Set<WebSocket>;
}>();

// Track terminals per project for limit enforcement
const terminalsPerProject = new Map<string, Set<string>>();

/**
 * Get default shell based on platform
 */
function getDefaultShell(): ShellType {
  if (process.platform === 'win32') {
    return 'powershell';
  }
  // Check for zsh first, fallback to bash
  const shell = process.env.SHELL;
  if (shell?.includes('zsh')) return 'zsh';
  if (shell?.includes('bash')) return 'bash';
  return 'sh';
}

/**
 * Get shell executable path
 */
function getShellPath(shell: ShellType): string {
  switch (shell) {
    case 'powershell':
      return 'powershell.exe';
    case 'cmd':
      return 'cmd.exe';
    case 'bash':
      return process.platform === 'win32' ? 'bash.exe' : '/bin/bash';
    case 'zsh':
      return '/bin/zsh';
    case 'sh':
    default:
      return '/bin/sh';
  }
}

/**
 * Create a new terminal session
 */
export function createTerminal(
  id: string,
  projectId: string,
  cwd: string,
  shell?: ShellType,
  cols = TERMINAL_CONFIG.defaultCols,
  rows = TERMINAL_CONFIG.defaultRows
): Terminal | { error: string } {
  // Check project limit
  const projectTerminals = terminalsPerProject.get(projectId) ?? new Set();
  if (projectTerminals.size >= TERMINAL_CONFIG.maxTerminalsPerProject) {
    return { error: `Maximum terminals per project (${TERMINAL_CONFIG.maxTerminalsPerProject}) reached` };
  }

  // Check global limit
  if (activeTerminals.size >= TERMINAL_CONFIG.maxTerminalsTotal) {
    return { error: `Maximum total terminals (${TERMINAL_CONFIG.maxTerminalsTotal}) reached` };
  }

  // Determine shell
  const resolvedShell = shell ?? getDefaultShell();
  const shellPath = getShellPath(resolvedShell);

  // Spawn PTY process
  const ptyProcess = pty.spawn(shellPath, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
    },
  });

  // Create terminal entity
  const terminal = Terminal.create(id, projectId, resolvedShell, cwd, ptyProcess.pid);

  // Store terminal
  activeTerminals.set(id, {
    terminal,
    ptyProcess,
    clients: new Set(),
  });

  // Track per project
  if (!terminalsPerProject.has(projectId)) {
    terminalsPerProject.set(projectId, new Set());
  }
  terminalsPerProject.get(projectId)!.add(id);

  console.log(`[Terminal] Created terminal ${id.slice(0, 8)} for project ${projectId.slice(0, 8)}, shell: ${resolvedShell}, pid: ${ptyProcess.pid}`);

  return terminal;
}

/**
 * Handle WebSocket connection for terminal
 */
export function handleTerminalConnection(
  ws: WebSocket,
  terminalId: string
): void {
  const entry = activeTerminals.get(terminalId);

  if (!entry) {
    ws.send(JSON.stringify({ type: 'error', message: 'Terminal not found' }));
    ws.close();
    return;
  }

  const { terminal, ptyProcess, clients } = entry;

  // Add client
  clients.add(ws);
  terminal.touch();

  console.log(`[Terminal] Client connected to terminal ${terminalId.slice(0, 8)}, clients: ${clients.size}`);

  // Send initial info
  ws.send(JSON.stringify({
    type: 'connected',
    terminalId,
    shell: terminal.shell,
    cwd: terminal.cwd,
    pid: terminal.pid,
  }));

  // Forward PTY output to client
  const dataHandler = (data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }));
    }
  };
  ptyProcess.onData(dataHandler);

  // Handle PTY exit
  const exitHandler = ({ exitCode }: { exitCode: number; signal?: number }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', exitCode }));
    }
    closeTerminal(terminalId);
  };
  ptyProcess.onExit(exitHandler);

  // Handle client messages
  ws.on('message', (message: Buffer) => {
    try {
      const msg = JSON.parse(message.toString());
      terminal.touch();

      switch (msg.type) {
        case 'input':
          // Write to PTY
          ptyProcess.write(msg.data);
          break;

        case 'resize':
          // Resize PTY
          if (msg.cols && msg.rows) {
            ptyProcess.resize(msg.cols, msg.rows);
          }
          break;

        case 'ping':
          // Keep-alive ping
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          console.warn(`[Terminal] Unknown message type: ${msg.type}`);
      }
    } catch (error) {
      console.error('[Terminal] Message parse error:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[Terminal] Client disconnected from terminal ${terminalId.slice(0, 8)}, remaining: ${clients.size}`);

    // Don't close terminal when last client disconnects - allow reconnect
    // Terminal will be closed by idle timeout instead
  });

  ws.on('error', (error) => {
    console.error(`[Terminal] WebSocket error for ${terminalId.slice(0, 8)}:`, error);
    clients.delete(ws);
  });
}

/**
 * Close a terminal session
 */
export function closeTerminal(terminalId: string): boolean {
  const entry = activeTerminals.get(terminalId);

  if (!entry) {
    return false;
  }

  const { terminal, ptyProcess, clients } = entry;

  // Kill PTY process
  try {
    ptyProcess.kill();
  } catch (error) {
    console.error(`[Terminal] Error killing PTY ${terminalId.slice(0, 8)}:`, error);
  }

  // Close all clients
  for (const client of clients) {
    try {
      client.send(JSON.stringify({ type: 'closed' }));
      client.close();
    } catch (error) {
      // Ignore errors closing clients
    }
  }

  // Remove from tracking
  activeTerminals.delete(terminalId);
  const projectTerminals = terminalsPerProject.get(terminal.projectId);
  if (projectTerminals) {
    projectTerminals.delete(terminalId);
    if (projectTerminals.size === 0) {
      terminalsPerProject.delete(terminal.projectId);
    }
  }

  console.log(`[Terminal] Closed terminal ${terminalId.slice(0, 8)}`);

  return true;
}

/**
 * Get terminal by ID
 */
export function getTerminal(terminalId: string): Terminal | null {
  return activeTerminals.get(terminalId)?.terminal ?? null;
}

/**
 * List terminals for a project
 */
export function listTerminals(projectId: string): Terminal[] {
  const terminalIds = terminalsPerProject.get(projectId);
  if (!terminalIds) return [];

  return Array.from(terminalIds)
    .map(id => activeTerminals.get(id)?.terminal)
    .filter((t): t is Terminal => t !== undefined);
}

/**
 * Get total terminal count
 */
export function getTerminalCount(): number {
  return activeTerminals.size;
}

/**
 * Cleanup idle terminals (call periodically)
 */
export function cleanupIdleTerminals(): number {
  let closed = 0;

  for (const [id, entry] of activeTerminals) {
    if (entry.terminal.isIdle() && entry.clients.size === 0) {
      closeTerminal(id);
      closed++;
    }
  }

  if (closed > 0) {
    console.log(`[Terminal] Cleaned up ${closed} idle terminals`);
  }

  return closed;
}

// Start idle cleanup interval
setInterval(cleanupIdleTerminals, 5 * 60 * 1000); // Check every 5 minutes
