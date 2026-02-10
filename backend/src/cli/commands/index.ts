/**
 * CLI Commands
 * Re-exports all command registration functions
 */

export { registerTaskCommands } from './task.js';
export { registerSessionCommands } from './session.js';
export { registerApprovalCommands } from './approval.js';
export { registerWatchCommand } from './watch.js';
export { registerStatusCommand } from './status.js';
export {
  registerServerCommands,
  isLegacyInvocation,
  handleLegacyInvocation,
} from './server.js';
