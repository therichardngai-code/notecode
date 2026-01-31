import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import type { ChatMessage } from '@/shared/types';

interface ScrollRestorationParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chatMessages: ChatMessage[];
  currentAssistantMessage: string;
}

/**
 * Manages scroll position restoration and auto-scroll behavior for chat containers.
 *
 * Features:
 * - Saves and restores scroll position during session Resume
 * - Auto-scrolls to bottom when new messages arrive (if user hasn't scrolled up)
 * - Tracks user scroll state to prevent unwanted auto-scroll
 * - Uses useLayoutEffect for synchronous restoration before paint
 * - Encapsulates all state mutations (React Compiler compliant)
 *
 * @param containerRef - Ref to the scrollable chat container (nullable)
 * @param chatMessages - Array of chat messages (triggers restoration check)
 * @param currentAssistantMessage - Current streaming assistant message (triggers auto-scroll)
 */
export function useScrollRestoration({
  containerRef,
  chatMessages,
  currentAssistantMessage,
}: ScrollRestorationParams) {
  // Track if user has manually scrolled up from bottom (internal state)
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Save scroll position for Resume mode (restored after message refetch)
  const savedScrollPosition = useRef<number | null>(null);

  // Prevent duplicate restoration attempts
  const isRestoringScroll = useRef(false);

  // UI state for scroll position indicator
  const [isScrolledUpFromBottom, setIsScrolledUpFromBottom] = useState(false);

  // Restore scroll position after Resume (when messages refetch)
  // Use useLayoutEffect for synchronous execution before browser paint
  useLayoutEffect(() => {
    // Prevent duplicate restoration attempts (useLayoutEffect can trigger multiple times)
    if (isRestoringScroll.current) {
      return;
    }

    if (savedScrollPosition.current !== null && containerRef.current) {
      const scrollPos = savedScrollPosition.current;
      const container = containerRef.current;

      // KEY FIX: Only restore if container is tall enough
      // During Resume, messages are cleared first, causing scrollHeight to drop
      // Wait until messages are loaded and scrollHeight >= saved position
      if (container.scrollHeight >= scrollPos + container.clientHeight) {
        isRestoringScroll.current = true;

        // Wait for DOM to fully render before restoring
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = scrollPos;
            }
            savedScrollPosition.current = null;
            // Keep restoration flag active briefly to prevent auto-scroll override
            setTimeout(() => {
              isRestoringScroll.current = false;
            }, 100);
          });
        });
      }
      // Container too short - wait for more messages to load (will retry on next update)
    }
  }, [chatMessages, containerRef]);

  // Auto-scroll to bottom when streaming (only if user hasn't scrolled up)
  // CRITICAL: Only depends on currentAssistantMessage, NOT userScrolledUp
  // If we add userScrolledUp to deps, effect re-runs on every scroll = broken behavior
  useEffect(() => {
    // Don't auto-scroll if currently restoring scroll position
    if (isRestoringScroll.current) return;

    const container = containerRef.current;
    if (!container || !currentAssistantMessage) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom || !userScrolledUp) {
      container.scrollTop = container.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAssistantMessage, containerRef]);

  // ✅ ENCAPSULATED: Reset scroll state (called on session renew)
  const resetScrollState = useCallback(() => {
    setUserScrolledUp(false);
  }, []);

  // ✅ ENCAPSULATED: Handle scroll events from child component
  const handleScroll = useCallback((container: HTMLElement) => {
    const scrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 100;
    setUserScrolledUp(scrolledUp);
    setIsScrolledUpFromBottom(scrolledUp);
  }, []);

  // ✅ ENCAPSULATED: Save scroll position for Resume mode
  const saveScrollPosition = useCallback(() => {
    if (containerRef.current) {
      savedScrollPosition.current = containerRef.current.scrollTop;
    }
  }, [containerRef]);

  return {
    // ✅ Read-only state values
    isScrolledUpFromBottom,
    // ✅ Encapsulated methods (not raw refs/setters)
    resetScrollState,
    handleScroll,
    saveScrollPosition,
  };
}
