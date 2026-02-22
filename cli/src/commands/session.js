/**
 * NoteCode CLI - Session Commands
 */

import { Command } from 'commander';
import * as api from '../api.js';
import {
  formatSessionRow,
  formatSessionHeader,
  formatSessionDetails,
  printError,
} from '../formatters.js';

export function createSessionCommands() {
  const session = new Command('session')
    .description('Manage sessions');
  
  // session list
  session
    .command('list')
    .description('List sessions')
    .option('--task-id <id>', 'Filter by task ID')
    .option('--status <status>', 'Filter by status (running, completed, etc.)')
    .option('--limit <n>', 'Maximum number of results', '20')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        let sessions;
        
        // If filtering by running status, use the dedicated endpoint
        if (opts.status === 'running') {
          const result = await api.listRunningSessions();
          sessions = result.sessions;
        } else {
          const result = await api.listSessions({
            taskId: opts.taskId,
            limit: parseInt(opts.limit, 10),
          });
          sessions = result.sessions;
          
          // Client-side filter by status if specified
          if (opts.status && opts.status !== 'running') {
            sessions = sessions.filter(s => s.status === opts.status);
          }
        }
        
        if (opts.json) {
          console.log(JSON.stringify({ sessions }, null, 2));
          return;
        }
        
        if (sessions.length === 0) {
          console.log('No sessions found.');
          return;
        }
        
        console.log(formatSessionHeader());
        console.log('-'.repeat(100));
        sessions.forEach(s => console.log(formatSessionRow(s)));
        console.log(`\n${sessions.length} session(s) found.`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
  
  // session status <id> (alias for get, more intuitive)
  session
    .command('status <id>')
    .description('Get session status and details')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      try {
        const { session: sessionData } = await api.getSession(id);
        
        if (opts.json) {
          console.log(JSON.stringify({ session: sessionData }, null, 2));
          return;
        }
        
        console.log(formatSessionDetails(sessionData));
      } catch (err) {
        if (err.status === 404) {
          printError(`Session not found: ${id}`);
        } else {
          printError(err.message);
        }
        process.exit(1);
      }
    });
  
  // session get <id> (same as status, for consistency)
  session
    .command('get <id>')
    .description('Get session details (alias for status)')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      try {
        const { session: sessionData } = await api.getSession(id);
        
        if (opts.json) {
          console.log(JSON.stringify({ session: sessionData }, null, 2));
          return;
        }
        
        console.log(formatSessionDetails(sessionData));
      } catch (err) {
        if (err.status === 404) {
          printError(`Session not found: ${id}`);
        } else {
          printError(err.message);
        }
        process.exit(1);
      }
    });
  
  return session;
}
