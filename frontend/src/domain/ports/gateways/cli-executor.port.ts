export interface CliExecutionOptions {
  command: string;
  workingDir: string;
  env?: Record<string, string>;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onExit?: (code: number) => void;
}

export interface CliExecutionResult {
  processId: number;
  exitCode?: number;
  stdout: string;
  stderr: string;
}

export interface ICliExecutor {
  execute(options: CliExecutionOptions): Promise<CliExecutionResult>;
  kill(processId: number): Promise<void>;
  isRunning(processId: number): boolean;
}
