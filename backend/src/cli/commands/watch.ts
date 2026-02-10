/**
 * Watch Command
 * Real-time session and approval monitoring
 */

import { Command } from 'commander';
import { get } from '../api-client.js';
import { formatDate } from '../formatters/date.js';
import type { Session, SessionListResponse, ApprovalListResponse, GlobalOptions } from '../types.js';

interface WatchOptions extends GlobalOptions {
  interval?: string;
}

/**
 * Watch sessions and approvals in real-time
 */
async function watchSessions(options: WatchOptions): Promise<void> {
  const pollInterval = parseInt(options.interval ?? '2000', 10);
  let lastSessions: Session[] = [];
  let isFirstRun = true;

  console.log(`Watching NoteCode sessions (polling every ${pollInterval}ms)...`);
  console.log('Press Ctrl+C to stop\n');

  const poll = async (): Promise<void> => {
    try {
      const [sessionsData, approvalsData] = await Promise.all([
        get<SessionListResponse>(options.apiUrl, '/api/sessions?limit=10'),
        get<ApprovalListResponse>(options.apiUrl, '/api/approvals/pending'),
      ]);

      const sessions = sessionsData.sessions || [];
      const approvals = approvalsData.approvals || [];

      if (options.json) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          sessions,
          approvals,
        }));
        return;
      }

      // Check for changes
      const currentIds = sessions.map((s) => `${s.id}:${s.status}`).join(',');
      const lastIds = lastSessions.map((s) => `${s.id}:${s.status}`).join(',');

      if (currentIds !== lastIds || isFirstRun) {
        console.log(`\n[${new Date().toLocaleTimeString()}] Session Update`);
        console.log('─'.repeat(60));

        // Show running sessions
        const running = sessions.filter((s) => s.status === 'running');
        if (running.length > 0) {
          console.log(`🟢 Running: ${running.length}`);
          for (const s of running) {
            console.log(`   ${s.id.slice(0, 8)} - ${s.provider ?? 'unknown'}`);
          }
        }

        // Show pending approvals
        if (approvals.length > 0) {
          console.log(`\n⚠️  Pending Approvals: ${approvals.length}`);
          for (const a of approvals) {
            console.log(`   ${a.id.slice(0, 8)} - ${a.payload?.toolName ?? 'unknown'} (${a.toolCategory})`);
          }
        }

        // Show recent completed
        const completed = sessions.filter((s) => s.status === 'completed').slice(0, 3);
        if (completed.length > 0) {
          console.log(`\n✅ Recent Completed: ${completed.length}`);
          for (const s of completed) {
            console.log(`   ${s.id.slice(0, 8)} - ${formatDate(s.endedAt)}`);
          }
        }

        lastSessions = sessions;
        isFirstRun = false;
      }
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString()}] Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  // Initial poll
  await poll();

  // Set up interval
  const intervalId = setInterval(poll, pollInterval);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    console.log('\n\n👋 Watch stopped');
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

/**
 * Register watch command
 */
export function registerWatchCommand(program: Command, getApiUrl: () => string): void {
  program
    .command('watch')
    .description('Watch sessions and approvals in real-time')
    .option('--interval <ms>', 'Poll interval in milliseconds', '2000')
    .option('--json', 'Output as JSON (one line per update)')
    .action(async (opts) => {
      await watchSessions({ ...opts, apiUrl: getApiUrl() });
    });
}
