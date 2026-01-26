export interface SSEConfig {
  url: string;
  reconnectInterval?: number;
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private url: string;
  private config: SSEConfig;
  private reconnectInterval: number;
  private reconnectTimer?: number;
  private intentionallyClosed = false;

  constructor(config: SSEConfig) {
    this.url = config.url;
    this.config = config;
    this.reconnectInterval = config.reconnectInterval ?? 3000;
  }

  connect(): void {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    this.intentionallyClosed = false;
    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      this.config.onOpen?.();
    };

    this.eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.config.onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    this.eventSource.onerror = (event: Event) => {
      this.config.onError?.(event);
      this.handleReconnect();
    };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.eventSource?.close();
    this.eventSource = null;
    this.config.onClose?.();
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  private handleReconnect(): void {
    if (this.intentionallyClosed) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = window.setTimeout(() => {
      console.log('SSE reconnecting...');
      this.eventSource?.close();
      this.connect();
    }, this.reconnectInterval);
  }
}

export const createSSEClient = (config: SSEConfig): SSEClient => {
  return new SSEClient(config);
};
