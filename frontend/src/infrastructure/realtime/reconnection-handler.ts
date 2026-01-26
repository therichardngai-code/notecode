export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  onReconnect?: (attempt: number) => void;
  onMaxAttemptsReached?: () => void;
}

export class ReconnectionHandler {
  private attempts = 0;
  private timer?: number;
  private config: ReconnectionConfig;

  constructor(config: ReconnectionConfig) {
    this.config = config;
  }

  scheduleReconnect(callback: () => void): void {
    if (this.attempts >= this.config.maxAttempts) {
      this.config.onMaxAttemptsReached?.();
      return;
    }

    this.attempts++;
    const delay = this.calculateDelay();

    this.timer = window.setTimeout(() => {
      this.config.onReconnect?.(this.attempts);
      callback();
    }, delay);
  }

  private calculateDelay(): number {
    const delay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, this.attempts - 1),
      this.config.maxDelay
    );
    return delay;
  }

  reset(): void {
    this.attempts = 0;
    this.cancel();
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  getAttempts(): number {
    return this.attempts;
  }
}

export const createReconnectionHandler = (
  config: ReconnectionConfig
): ReconnectionHandler => {
  return new ReconnectionHandler(config);
};
