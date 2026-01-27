/**
 * Settings Hooks
 * React Query hooks for settings management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type GlobalSettings } from '@/adapters/api/settings-api';

const settingsKeys = {
  all: ['settings'] as const,
  encryption: ['settings', 'encryption'] as const,
};

/** Fetch global settings */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: settingsApi.getSettings,
  });
}

/** Update settings mutation */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<GlobalSettings>) =>
      settingsApi.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
    onError: (error) => {
      console.error('Failed to update settings:', error);
    },
  });
}

/** Set API key mutation */
export function useSetApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: 'anthropic' | 'google' | 'openai'; apiKey: string }) =>
      settingsApi.setApiKey(provider, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
    onError: (error) => {
      console.error('Failed to save API key:', error);
    },
  });
}

/** Remove API key mutation */
export function useRemoveApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: string) => settingsApi.removeApiKey(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
    onError: (error) => {
      console.error('Failed to remove API key:', error);
    },
  });
}

/** Get encryption status */
export function useEncryptionStatus() {
  return useQuery({
    queryKey: settingsKeys.encryption,
    queryFn: settingsApi.getEncryptionStatus,
  });
}
