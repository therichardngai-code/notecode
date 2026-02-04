/**
 * Cleanup Job Scheduler
 * Runs orphan cleanup on schedule to prevent storage bloat
 */

import { OrphanCleanupService } from '../../domain/services/orphan-cleanup.service.js';

/** Run every hour */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/** Initial delay before first cleanup (5 minutes after startup) */
const STARTUP_DELAY_MS = 5 * 60 * 1000;

/**
 * Start the cleanup scheduler
 * - Runs every hour
 * - Also runs 5 minutes after startup
 */
export function startCleanupScheduler(cleanupService: OrphanCleanupService): void {
  // Run cleanup job
  const runCleanup = async () => {
    try {
      const result = await cleanupService.runCleanup();
      // Only log if something was cleaned
      if (result.approvalsExpired > 0 || result.diffsReverted > 0 || result.contentCleared > 0) {
        console.log('[Cleanup] Completed:', result);
      }
    } catch (error) {
      console.error('[Cleanup] Failed:', error);
    }
  };

  // Run on schedule (every hour)
  setInterval(runCleanup, CLEANUP_INTERVAL_MS);

  // Run on startup (after 5 min delay to let system stabilize)
  setTimeout(runCleanup, STARTUP_DELAY_MS);

  console.log('[Cleanup] Scheduler started (runs hourly, first run in 5 min)');
}
