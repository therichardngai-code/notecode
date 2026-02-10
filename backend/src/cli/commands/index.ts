/**
 * CLI Commands
 * Re-exports all command registration functions
 */

export { registerTaskCommands } from './task.js';
export { registerSessionCommands } from './session.js';
export {
  registerServerCommands,
  isLegacyInvocation,
  handleLegacyInvocation,
} from './server.js';
