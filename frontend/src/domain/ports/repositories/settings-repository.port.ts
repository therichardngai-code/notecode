import type { GlobalSettings } from '../../value-objects';

export interface ISettingsRepository {
  get(): Promise<GlobalSettings>;
  update(data: Partial<GlobalSettings>): Promise<GlobalSettings>;
  updateApiKey(provider: 'anthropic' | 'google' | 'openai', key: string): Promise<void>;
  deleteApiKey(provider: 'anthropic' | 'google' | 'openai'): Promise<void>;
}
