import type { ISettingsRepository } from '../domain/ports/repositories';
import type { ProviderType } from '../domain/entities';

export interface SaveApiKeyInput {
  provider: ProviderType;
  apiKey: string;
}

export class SaveApiKeyUseCase {
  private settingsRepository: ISettingsRepository;

  constructor(settingsRepository: ISettingsRepository) {
    this.settingsRepository = settingsRepository;
  }

  async execute(input: SaveApiKeyInput): Promise<void> {
    if (!input.apiKey || input.apiKey.trim() === '') {
      throw new Error('API key cannot be empty');
    }

    await this.settingsRepository.updateApiKey(input.provider, input.apiKey.trim());
  }

  async delete(provider: ProviderType): Promise<void> {
    await this.settingsRepository.deleteApiKey(provider);
  }
}
