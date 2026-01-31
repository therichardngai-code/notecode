/**
 * Context Warning Hook
 * Monitors context window usage and triggers warning at critical threshold
 * Throttles warnings to max once per 5 minutes
 */

import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@/adapters/api/sessions-api';
import { PROVIDER_CONTEXT_CONFIG } from '@/shared/constants/provider-config';

interface UseContextWarningResult {
  showWarning: boolean;
  dismissWarning: () => void;
}

export function useContextWarning(session?: Session): UseContextWarningResult {
  const [showWarning, setShowWarning] = useState(false);
  const [lastWarnedAt, setLastWarnedAt] = useState<number>(0);

  useEffect(() => {
    if (!session?.contextWindow) {
      return;
    }

    const { contextPercent, provider } = session.contextWindow;
    const config = PROVIDER_CONTEXT_CONFIG[provider];

    // Show warning when crossing critical threshold
    if (contextPercent >= config.criticalThreshold) {
      const now = Date.now();
      const THROTTLE_MS = 5 * 60 * 1000; // Show max once per 5 minutes

      if (now - lastWarnedAt > THROTTLE_MS) {
        setShowWarning(true);
        setLastWarnedAt(now);
      }
    }
  }, [session?.contextWindow?.contextPercent, lastWarnedAt]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return { showWarning, dismissWarning };
}
