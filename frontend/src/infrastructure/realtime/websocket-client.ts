export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private reconnectTimer?: number;
  private config: WebSocketConfig;
  private intentionallyClosed = false;

  constructor(config: WebSocketConfig) {
    this.url = config.url;
    this.config = config;
    this.reconnectInterval = config.reconnectInterval ?? 3000;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 10;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.intentionallyClosed = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.config.onOpen?.();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        this.config.onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (event: Event) => {
      this.config.onError?.(event);
    };

    this.ws.onclose = () => {
      this.config.onClose?.();
      this.handleReconnect();
    };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.ws?.close();
    this.ws = null;
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleReconnect(): void {
    if (this.intentionallyClosed) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.reconnectTimer = window.setTimeout(() => {
        console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectInterval);
    }
  }
}

export const createWebSocketClient = (config: WebSocketConfig): WebSocketClient => {
  return new WebSocketClient(config);
};
