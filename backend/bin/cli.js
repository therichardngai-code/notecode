#!/usr/bin/env node

/**
 * NoteCode CLI Entry Point
 * Usage: npx notecode [command] [options]
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

// Default API URL
const DEFAULT_API_URL = 'http://localhost:41920';

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatTable(rows, columns) {
  if (rows.length === 0) {
    console.log('No items found.');
    return;
  }

  // Calculate column widths
  const widths = columns.map(col => {
    const values = rows.map(row => String(row[col.key] ?? '').length);
    return Math.max(col.header.length, ...values);
  });

  // Print header
  const header = columns.map((col, i) => col.header.padEnd(widths[i])).join('  ');
  console.log(header);
  console.log(columns.map((_, i) => '─'.repeat(widths[i])).join('──'));

  // Print rows
  for (const row of rows) {
    const line = columns.map((col, i) => {
      const value = String(row[col.key] ?? '');
      return value.padEnd(widths[i]);
    }).join('  ');
    console.log(line);
  }
}

function formatJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

// ============================================================================
// API Client
// ============================================================================

async function apiRequest(apiUrl, method, path, body = null) {
  const url = `${apiUrl}${path}`;
  
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to NoteCode server at ${apiUrl}\nIs the server running? Start it with: notecode server start`);
    }
    throw error;
  }
}

// ============================================================================
// Server Command (current behavior)
// ============================================================================

async function startServer(options) {
  const { createServer } = await import('../dist/infrastructure/server/fastify.server.js');
  const { initializeDatabase, closeDatabase } = await import('../dist/infrastructure/database/connection.js');
  const { DEFAULT_PORT, findAvailablePort, parsePort } = await import('../dist/infrastructure/server/port-utils.js');
  const { networkInterfaces } = await import('os');

  const HOST = process.env.HOST || '0.0.0.0';
  const NO_BROWSER = process.env.NO_BROWSER === 'true' || options.noBrowser;

  function getLocalIP() {
    try {
      const nets = networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
          if (net.family === 'IPv4' && !net.internal) {
            return net.address;
          }
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  // ASCII banner
  console.log(`
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║                                                                          ║
  ║   ███╗   ██╗ ██████╗ ████████╗███████╗ ██████╗ ██████╗ ██████╗ ███████╗  ║
  ║   ████╗  ██║██╔═══██╗╚══██╔══╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝  ║
  ║   ██╔██╗ ██║██║   ██║   ██║   █████╗  ██║     ██║   ██║██║  ██║█████╗    ║
  ║   ██║╚██╗██║██║   ██║   ██║   ██╔══╝  ██║     ██║   ██║██║  ██║██╔══╝    ║
  ║   ██║ ╚████║╚██████╔╝   ██║   ███████╗╚██████╗╚██████╔╝██████╔╝███████╗  ║
  ║   ╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚══════╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝  ║
  ║                                                                          ║
  ║   v${pkg.version.padEnd(8)} AI Coding Task Management                                    ║
  ╚══════════════════════════════════════════════════════════════════════════╝
`);

  try {
    const specifiedPort = options.port ? parseInt(options.port, 10) : null;
    const PORT = specifiedPort ?? await findAvailablePort(DEFAULT_PORT);

    console.log('  📦 Initializing database...');
    await initializeDatabase();

    console.log('  🌐 Starting server...');
    const server = await createServer();
    await server.listen({ port: PORT, host: HOST });

    const address = server.server.address();
    const actualPort = typeof address === 'object' && address !== null ? address.port : PORT;
    const localIP = getLocalIP();

    const localUrl = `http://localhost:${actualPort}`;
    const networkUrl = localIP ? `http://${localIP}:${actualPort}` : null;

    console.log(`
  ✅ NoteCode is ready!

     Local:    ${localUrl}${networkUrl ? `
     Network:  ${networkUrl}` : ''}

     Press Ctrl+C to stop
`);

    if (!NO_BROWSER) {
      try {
        const open = (await import('open')).default;
        await open(localUrl);
      } catch {
        console.log(`  💡 Open ${localUrl} in your browser`);
      }
    }

    const shutdown = async (signal) => {
      console.log(`\n  🛑 Received ${signal}, shutting down...`);
      const forceExit = setTimeout(() => {
        console.log('  ⚠️  Force exit');
        process.exit(0);
      }, 3000);

      try {
        await server.close();
        await closeDatabase();
        clearTimeout(forceExit);
        console.log('  👋 Goodbye!\n');
        process.exit(0);
      } catch (error) {
        clearTimeout(forceExit);
        console.error('  Shutdown error:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error(`
  ❌ Failed to start NoteCode

  Error: ${error.message}

  Troubleshooting:
    1. Check if port is available: notecode server start -p 5000
    2. Check file permissions for data directory
    3. Run with --help for more options
`);
    process.exit(1);
  }
}

// ============================================================================
// Task Commands
// ============================================================================

async function taskList(options) {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.assignee) params.set('agentId', options.assignee);
  if (options.projectId) params.set('projectId', options.projectId);

  const query = params.toString();
  const path = `/api/tasks${query ? '?' + query : ''}`;
  
  try {
    const data = await apiRequest(options.apiUrl, 'GET', path);
    
    if (options.json) {
      formatJson(data.tasks);
    } else {
      const rows = data.tasks.map(t => ({
        id: t.id.slice(0, 8),
        status: t.status,
        priority: t.priority ?? '-',
        title: truncate(t.title, 50),
        created: formatDate(t.createdAt),
      }));
      formatTable(rows, [
        { key: 'id', header: 'ID' },
        { key: 'status', header: 'Status' },
        { key: 'priority', header: 'Priority' },
        { key: 'title', header: 'Title' },
        { key: 'created', header: 'Created' },
      ]);
      console.log(`\n${data.tasks.length} task(s) found`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function taskGet(taskId, options) {
  try {
    const data = await apiRequest(options.apiUrl, 'GET', `/api/tasks/${taskId}`);
    
    if (options.json) {
      formatJson(data.task);
    } else {
      const t = data.task;
      console.log(`Task: ${t.title}`);
      console.log(`${'─'.repeat(60)}`);
      console.log(`ID:          ${t.id}`);
      console.log(`Status:      ${t.status}`);
      console.log(`Priority:    ${t.priority ?? 'none'}`);
      console.log(`Description: ${t.description || '(none)'}`);
      console.log(`Project ID:  ${t.projectId}`);
      console.log(`Created:     ${formatDate(t.createdAt)}`);
      console.log(`Updated:     ${formatDate(t.updatedAt)}`);
      if (t.provider) console.log(`Provider:    ${t.provider}`);
      if (t.model) console.log(`Model:       ${t.model}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function taskCreate(title, options) {
  const body = {
    title,
    description: options.description ?? '',
    priority: options.priority ?? null,
  };
  if (options.projectId) body.projectId = options.projectId;

  try {
    const data = await apiRequest(options.apiUrl, 'POST', '/api/tasks', body);
    
    if (options.json) {
      formatJson(data.task);
    } else {
      console.log(`✅ Task created: ${data.task.id}`);
      console.log(`   Title: ${data.task.title}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function taskUpdate(taskId, options) {
  const body = {};
  if (options.status) body.status = options.status;
  if (options.priority) body.priority = options.priority;
  if (options.title) body.title = options.title;
  if (options.description) body.description = options.description;

  if (Object.keys(body).length === 0) {
    console.error('Error: No update fields provided. Use --status, --priority, --title, or --description.');
    process.exit(1);
  }

  try {
    const data = await apiRequest(options.apiUrl, 'PATCH', `/api/tasks/${taskId}`, body);
    
    if (options.json) {
      formatJson(data.task);
    } else {
      console.log(`✅ Task updated: ${data.task.id}`);
      console.log(`   Status: ${data.task.status}`);
      if (data.warnings?.length) {
        for (const w of data.warnings) {
          console.log(`   ⚠️  ${w.message}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// ============================================================================
// Session Commands
// ============================================================================

async function sessionList(options) {
  const params = new URLSearchParams();
  if (options.task) params.set('taskId', options.task);
  if (options.limit) params.set('limit', options.limit);

  const query = params.toString();
  const path = `/api/sessions${query ? '?' + query : ''}`;
  
  try {
    const data = await apiRequest(options.apiUrl, 'GET', path);
    
    if (options.json) {
      formatJson(data.sessions);
    } else {
      const rows = data.sessions.map(s => ({
        id: s.id.slice(0, 8),
        status: s.status,
        task: s.taskId?.slice(0, 8) ?? '-',
        provider: s.provider ?? '-',
        started: formatDate(s.startedAt),
        duration: s.endedAt && s.startedAt 
          ? `${Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 1000)}s`
          : '-',
      }));
      formatTable(rows, [
        { key: 'id', header: 'ID' },
        { key: 'status', header: 'Status' },
        { key: 'task', header: 'Task' },
        { key: 'provider', header: 'Provider' },
        { key: 'started', header: 'Started' },
        { key: 'duration', header: 'Duration' },
      ]);
      console.log(`\n${data.sessions.length} session(s) found`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function sessionGet(sessionId, options) {
  try {
    const data = await apiRequest(options.apiUrl, 'GET', `/api/sessions/${sessionId}`);
    
    if (options.json) {
      formatJson(data.session);
    } else {
      const s = data.session;
      console.log(`Session: ${s.id}`);
      console.log(`${'─'.repeat(60)}`);
      console.log(`Status:      ${s.status}`);
      console.log(`Task ID:     ${s.taskId ?? '(none)'}`);
      console.log(`Provider:    ${s.provider ?? '(none)'}`);
      console.log(`Working Dir: ${s.workingDir ?? '(none)'}`);
      console.log(`Started:     ${formatDate(s.startedAt)}`);
      if (s.endedAt) console.log(`Ended:       ${formatDate(s.endedAt)}`);
      if (s.tokenUsage) {
        console.log(`Tokens:      ${s.tokenUsage.inputTokens ?? 0} in / ${s.tokenUsage.outputTokens ?? 0} out`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// ============================================================================
// Main Program
// ============================================================================

// Check for legacy invocation BEFORE commander parses
// Legacy: notecode, notecode -p 5000, notecode --no-browser
const args = process.argv.slice(2);
const knownCommands = ['server', 'task', 'session', 'help', '--help', '-h', '--version', '-V'];
const isLegacyInvocation = args.length === 0 || 
  (args[0] === '-p' || args[0] === '--port' || args[0] === '--no-browser') ||
  (!knownCommands.includes(args[0]) && !args[0].startsWith('--api-url'));

if (isLegacyInvocation && !args.includes('--help') && !args.includes('-h')) {
  // Parse legacy flags manually
  const opts = {};
  const pIndex = args.indexOf('-p');
  if (pIndex !== -1 && args[pIndex + 1]) {
    opts.port = args[pIndex + 1];
  }
  const portIndex = args.findIndex(a => a.startsWith('--port='));
  if (portIndex !== -1) {
    opts.port = args[portIndex].split('=')[1];
  } else if (args.indexOf('--port') !== -1) {
    const pi = args.indexOf('--port');
    if (args[pi + 1]) opts.port = args[pi + 1];
  }
  opts.noBrowser = args.includes('--no-browser');
  startServer(opts);
} else {
  // Use commander for subcommand mode
  const program = new Command();

  program
    .name('notecode')
    .description('NoteCode - AI Coding Task Management')
    .version(pkg.version)
    .option('--api-url <url>', 'API server URL', DEFAULT_API_URL);

  // Server commands
  const serverCmd = program
    .command('server')
    .description('Server management');

  serverCmd
    .command('start')
    .description('Start the NoteCode server')
    .option('-p, --port <port>', 'Server port')
    .option('--no-browser', 'Don\'t open browser automatically')
    .action(startServer);

  // Task commands
  const taskCmd = program
    .command('task')
    .description('Task management');

  taskCmd
    .command('list')
    .description('List tasks')
    .option('--status <status>', 'Filter by status (not-started,in-progress,review,done,cancelled,archived)')
    .option('--assignee <id>', 'Filter by assignee agent ID')
    .option('--project-id <id>', 'Filter by project ID')
    .option('--json', 'Output as JSON')
    .action((options) => {
      options.apiUrl = program.opts().apiUrl;
      taskList(options);
    });

  taskCmd
    .command('get <task-id>')
    .description('Get task details')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      options.apiUrl = program.opts().apiUrl;
      taskGet(taskId, options);
    });

  taskCmd
    .command('create <title>')
    .description('Create a new task')
    .option('-p, --priority <priority>', 'Priority (high, medium, low)')
    .option('-d, --description <desc>', 'Task description')
    .option('--project-id <id>', 'Project ID (uses active project if not specified)')
    .option('--json', 'Output as JSON')
    .action((title, options) => {
      options.apiUrl = program.opts().apiUrl;
      taskCreate(title, options);
    });

  taskCmd
    .command('update <task-id>')
    .description('Update a task')
    .option('--status <status>', 'New status')
    .option('--priority <priority>', 'New priority')
    .option('--title <title>', 'New title')
    .option('--description <desc>', 'New description')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      options.apiUrl = program.opts().apiUrl;
      taskUpdate(taskId, options);
    });

  // Session commands
  const sessionCmd = program
    .command('session')
    .description('Session management');

  sessionCmd
    .command('list')
    .description('List sessions')
    .option('--task <task-id>', 'Filter by task ID')
    .option('--limit <n>', 'Maximum number of sessions to return')
    .option('--json', 'Output as JSON')
    .action((options) => {
      options.apiUrl = program.opts().apiUrl;
      sessionList(options);
    });

  sessionCmd
    .command('get <session-id>')
    .description('Get session details')
    .option('--json', 'Output as JSON')
    .action((sessionId, options) => {
      options.apiUrl = program.opts().apiUrl;
      sessionGet(sessionId, options);
    });

  program.parse();
}
