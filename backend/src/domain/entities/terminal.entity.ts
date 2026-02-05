/**
 * Terminal Entity
 * Represents a PTY terminal session
 */

export type ShellType = 'bash' | 'zsh' | 'powershell' | 'cmd' | 'sh';

export interface TerminalConfig {
  maxTerminalsPerProject: number;
  maxTerminalsTotal: number;
  idleTimeoutMs: number;
  defaultCols: number;
  defaultRows: number;
}

export const TERMINAL_CONFIG: TerminalConfig = {
  maxTerminalsPerProject: 5,
  maxTerminalsTotal: 20,
  idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  defaultCols: 80,
  defaultRows: 24,
};

export class Terminal {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly shell: ShellType,
    public readonly cwd: string,
    public readonly pid: number,
    public readonly createdAt: Date,
    public lastActivityAt: Date
  ) {}

  /**
   * Update last activity timestamp
   */
  touch(): void {
    this.lastActivityAt = new Date();
  }

  /**
   * Check if terminal is idle (exceeded timeout)
   */
  isIdle(): boolean {
    const now = Date.now();
    const lastActivity = this.lastActivityAt.getTime();
    return now - lastActivity > TERMINAL_CONFIG.idleTimeoutMs;
  }

  /**
   * Create new terminal instance
   */
  static create(
    id: string,
    projectId: string,
    shell: ShellType,
    cwd: string,
    pid: number
  ): Terminal {
    const now = new Date();
    return new Terminal(id, projectId, shell, cwd, pid, now, now);
  }
}
