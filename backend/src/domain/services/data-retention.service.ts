/**
 * Data Retention Service
 * Auto-deletes tasks inactive for longer than configured retention period
 */

import { lt } from 'drizzle-orm';
import { tasks } from '../../infrastructure/database/schema.js';
import { getDatabase } from '../../infrastructure/database/connection.js';
import { ISettingsRepository } from '../../adapters/repositories/sqlite-settings.repository.js';

export class DataRetentionService {
  constructor(private settingsRepo: ISettingsRepository) {}

  /**
   * Run data retention cleanup
   * Deletes tasks where updatedAt is older than dataRetentionDays
   * Sessions/Messages cascade delete automatically via FK constraints
   */
  async runCleanup(): Promise<{ deletedCount: number }> {
    const settings = await this.settingsRepo.getGlobal();

    // Check if enabled
    if (!settings.dataRetentionEnabled) {
      return { deletedCount: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.dataRetentionDays);
    const cutoffIso = cutoffDate.toISOString();

    const db = getDatabase();

    // Delete tasks where updatedAt < cutoff
    // Sessions, messages, approvals cascade delete via FK
    const result = await db
      .delete(tasks)
      .where(lt(tasks.updatedAt, cutoffIso));

    const deletedCount = result.changes;

    if (deletedCount > 0) {
      console.log(`[DataRetention] Deleted ${deletedCount} tasks older than ${settings.dataRetentionDays} days`);
    }

    return { deletedCount };
  }
}
