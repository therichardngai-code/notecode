/**
 * NoteCode CLI - Watch Command
 * Real-time activity monitoring via SSE
 */

import { Command } from 'commander';
import { printError } from '../formatters.js';

const API_BASE = process.env.NOTECODE_API_URL || 'http://localhost:41920';

/**
 * Format event for human-readable output
 */
function formatEvent(event) {
  const time = new Date().toLocaleTimeString();
  const { type, ...data } = event;
  
  switch (type) {
    case 'session.started':
      return `[${time}] 🚀 Session started: ${data.aggregateId} (task: ${data.taskId || 'none'})`;
    
    case 'session.completed':
      return `[${time}] ✅ Session completed: ${data.aggregateId}`;
    
    case 'session.failed':
      return `[${time}] ❌ Session failed: ${data.aggregateId} - ${data.reason}`;
    
    case 'approval.pending':
      return `[${time}] ⏳ Approval pending: ${data.toolName} (session: ${data.sessionId})`;
    
    case 'task.status_changed':
      return `[${time}] 📋 Task ${data.taskId}: ${data.previousStatus} → ${data.status}`;
    
    case 'git:approval:created':
      return `[${time}] 🔀 Git approval: ${data.commitMessage} (${data.diffSummary?.files || 0} files)`;
    
    case 'git:approval:resolved':
      return `[${time}] ${data.status === 'approved' ? '✅' : '❌'} Git ${data.status}: ${data.aggregateId}`;
    
    case 'notification':
      return `[${time}] 🔔 ${data.title || 'Notification'}: ${data.message || ''}`;
    
    default:
      return `[${time}] ${type}: ${JSON.stringify(data)}`;
  }
}

/**
 * Connect to SSE endpoint and stream events
 */
async function watchEvents(opts) {
  const url = `${API_BASE}/sse/notifications`;
  
  console.log(`Connecting to ${url}...`);
  console.log('Press Ctrl+C to stop\n');
  
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'text/event-stream' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('\nConnection closed');
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      // Parse SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            
            if (opts.json) {
              // JSON mode: output raw event
              console.log(JSON.stringify(event));
            } else {
              // Human mode: format nicely
              console.log(formatEvent(event));
            }
          } catch (e) {
            // Not JSON, might be heartbeat
            if (line.slice(6).trim() && !line.includes(':ping')) {
              console.log(`[raw] ${line.slice(6)}`);
            }
          }
        }
      }
    }
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      printError('Cannot connect to NoteCode server. Is it running?');
    } else {
      printError(err.message);
    }
    process.exit(1);
  }
}

/**
 * Polling-based watch (fallback when SSE fails)
 */
async function watchPolling(opts) {
  const pollInterval = opts.interval || 2000;
  let lastApprovals = new Set();
  let lastSessionCount = 0;
  
  console.log(`Polling every ${pollInterval}ms (Ctrl+C to stop)\n`);
  
  while (true) {
    try {
      // Check pending approvals
      const approvalsRes = await fetch(`${API_BASE}/api/approvals/pending`);
      if (approvalsRes.ok) {
        const { approvals } = await approvalsRes.json();
        
        for (const approval of approvals) {
          if (!lastApprovals.has(approval.id)) {
            const event = {
              type: 'approval.pending',
              aggregateId: approval.id,
              sessionId: approval.sessionId,
              toolName: approval.payload?.toolName || 'unknown',
              occurredAt: new Date().toISOString()
            };
            
            if (opts.json) {
              console.log(JSON.stringify(event));
            } else {
              console.log(formatEvent(event));
            }
          }
        }
        
        lastApprovals = new Set(approvals.map(a => a.id));
      }
      
      // Check running sessions
      const sessionsRes = await fetch(`${API_BASE}/api/sessions/running`);
      if (sessionsRes.ok) {
        const { sessions } = await sessionsRes.json();
        
        if (sessions.length !== lastSessionCount) {
          const event = {
            type: 'notification',
            title: 'Sessions',
            message: `${sessions.length} running session(s)`,
            occurredAt: new Date().toISOString()
          };
          
          if (opts.json) {
            console.log(JSON.stringify(event));
          } else if (sessions.length > 0) {
            console.log(formatEvent(event));
          }
          
          lastSessionCount = sessions.length;
        }
      }
    } catch (err) {
      if (err.cause?.code === 'ECONNREFUSED') {
        printError('Connection lost. Retrying...');
      }
    }
    
    await new Promise(r => setTimeout(r, pollInterval));
  }
}

export function createWatchCommand() {
  const watch = new Command('watch')
    .description('Real-time activity monitoring')
    .option('--json', 'Output events as JSON stream')
    .option('--poll', 'Use polling instead of SSE')
    .option('-i, --interval <ms>', 'Polling interval in ms (default: 2000)', parseInt)
    .action(async (opts) => {
      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        console.log('\nStopping watch...');
        process.exit(0);
      });
      
      if (opts.poll) {
        await watchPolling(opts);
      } else {
        await watchEvents(opts);
      }
    });

  return watch;
}
