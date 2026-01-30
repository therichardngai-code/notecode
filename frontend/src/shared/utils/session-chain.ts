/**
 * Session Chain Utilities
 *
 * Handles session chain traversal for Renew mode filtering.
 * Tracks parent-child relationships via resumedFromSessionId.
 */

import type { Session } from '@/adapters/api/sessions-api';

/**
 * Find the Renew root session in the chain by traversing parents
 *
 * Traverses up the session chain to find a session with resumeMode='renew'.
 * If found, returns that session's ID. Otherwise returns null.
 *
 * @param currentSession - The current session to start traversal from
 * @param allSessions - All available sessions for the task
 * @param visited - Set to detect circular references (defensive)
 * @returns SessionId of Renew root, or null if no Renew in chain
 *
 * @example
 * // Session A (first start)
 * // Session B (renew from A) <- Renew root
 * // Session C (resume from B)
 * findRenewRootSessionId(sessionC, [A, B, C]) // Returns B.id
 */
export function findRenewRootSessionId(
  currentSession: Session | undefined,
  allSessions: Session[],
  visited = new Set<string>()
): string | null {
  // Guard: No session provided
  if (!currentSession) {
    return null;
  }

  // Guard: Circular reference detected
  if (visited.has(currentSession.id)) {
    console.error('[session-chain] Circular session reference detected', {
      sessionId: currentSession.id,
      visited: Array.from(visited),
    });
    return null;
  }
  visited.add(currentSession.id);

  // Check if current session is Renew
  if (currentSession.resumeMode === 'renew') {
    return currentSession.id;
  }

  // No parent - reached end of chain without finding Renew
  if (!currentSession.resumedFromSessionId) {
    return null;
  }

  // Find parent session
  const parentSession = allSessions.find(
    (s) => s.id === currentSession.resumedFromSessionId
  );

  // Guard: Parent not found (shouldn't happen, but defensive)
  if (!parentSession) {
    console.warn('[session-chain] Parent session not found', {
      sessionId: currentSession.id,
      resumedFromSessionId: currentSession.resumedFromSessionId,
    });
    return null;
  }

  // Check if parent is Renew
  if (parentSession.resumeMode === 'renew') {
    return parentSession.id;
  }

  // Recursively traverse up the chain
  return findRenewRootSessionId(parentSession, allSessions, visited);
}

/**
 * Build list of sessionIds from Renew root onwards (inclusive descendants)
 *
 * Performs breadth-first traversal to find all sessions that descend from
 * the Renew root session (including the root itself).
 *
 * @param renewRootId - The sessionId of the Renew root
 * @param allSessions - All available sessions for the task
 * @returns Array of sessionIds in the Renew chain
 *
 * @example
 * // Session A (first start)
 * // Session B (renew from A) <- Renew root
 * // Session C (resume from B)
 * // Session D (resume from C)
 * buildSessionChainFromRenew(B.id, [A, B, C, D]) // Returns [B.id, C.id, D.id]
 */
export function buildSessionChainFromRenew(
  renewRootId: string,
  allSessions: Session[]
): string[] {
  const chain: string[] = [renewRootId];
  let currentGeneration = [renewRootId];

  // Breadth-first traversal to find all descendants
  while (currentGeneration.length > 0) {
    const nextGeneration: string[] = [];

    for (const sessionId of currentGeneration) {
      // Find children (sessions that resumed from this one)
      const children = allSessions.filter(
        (s) => s.resumedFromSessionId === sessionId
      );

      for (const child of children) {
        chain.push(child.id);
        nextGeneration.push(child.id);
      }
    }

    currentGeneration = nextGeneration;
  }

  return chain;
}

/**
 * Get filtered session IDs for message display based on Renew mode
 *
 * Convenience function that combines findRenewRootSessionId and
 * buildSessionChainFromRenew.
 *
 * @param currentSession - The current active session
 * @param allSessions - All available sessions for the task
 * @returns Array of sessionIds to show, or null for no filter (show all)
 *
 * @example
 * // Renew mode: Returns [renewRoot, ...descendants]
 * // Retry/Resume mode: Returns null (show all cumulative)
 */
export function getFilteredSessionIds(
  currentSession: Session | undefined,
  allSessions: Session[]
): string[] | null {
  const renewRootId = findRenewRootSessionId(currentSession, allSessions);

  if (!renewRootId) {
    return null; // No Renew in chain, show all messages
  }

  return buildSessionChainFromRenew(renewRootId, allSessions);
}
