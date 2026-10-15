/**
 * Every keyboard command, in one table. The key handler and the help overlay
 * both read it, so documented shortcuts cannot drift from the real ones.
 */
import type { Command } from './types';
import { TIMING_COMMANDS } from './timingCommands';
import { LISTEN_COMMANDS, SELECT_EDIT_COMMANDS, VIEW_COMMANDS } from './otherCommands';
import { LINE_COMMANDS } from './lineCommands';

export const COMMANDS: Command[] = [
  ...TIMING_COMMANDS,
  ...LISTEN_COMMANDS,
  ...LINE_COMMANDS,
  ...SELECT_EDIT_COMMANDS,
  ...VIEW_COMMANDS,
];
