import type { ISettingsRepository } from '../domain/ports/repositories';
import type { GlobalSettings } from '../domain/value-objects';
import type { ProviderType } from '../domain/entities';

export interface UpdateSettingsInput {
  defaultProvider?: ProviderType;
  defaultModel?: string;
  yoloMode?: boolean;
  theme?: 'light' | 'dark' | 'system';
  autoExtractSummary?: boolean;
}

export class UpdateSettingsUseCase {
  private settingsRepository: ISettingsRepository;

  constructor(settingsRepository: ISettingsRepository) {
    this.settingsRepository = settingsRepository;
  }

  async execute(input: UpdateSettingsInput): Promise<GlobalSettings> {
    return await this.settingsRepository.update(input);
  }

  async get(): Promise<GlobalSettings> {
    return await this.settingsRepository.get();
  }
}
