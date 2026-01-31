import { useMemo } from 'react';
import type { Message, Diff } from '@/adapters/api/sessions-api';
import { messageToChat, diffToUI } from '@/shared/utils';

interface MessageConversionParams {
  apiMessages: Message[];
  apiDiffs: Diff[];
}

export function useMessageConversion({
  apiMessages,
  apiDiffs,
}: MessageConversionParams) {
  const chatMessages = useMemo(
    () => apiMessages.map(messageToChat),
    [apiMessages]
  );

  const sessionDiffs = useMemo(
    () => apiDiffs.map(diffToUI),
    [apiDiffs]
  );

  return { chatMessages, sessionDiffs };
}
