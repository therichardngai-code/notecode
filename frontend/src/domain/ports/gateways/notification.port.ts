export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  onClick?: () => void;
}

export interface INotificationGateway {
  show(options: NotificationOptions): Promise<void>;
  requestPermission(): Promise<boolean>;
  isSupported(): boolean;
}
