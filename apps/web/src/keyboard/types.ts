import type { Dispatch } from 'react';
import type { EditorAction, EditorState } from '../editor/reducer';
import type { Player } from '../audio/player';
import type { Ms } from '../lib/time';
import type { Onsets } from '../audio/onsets';

export type CommandContext = {
  editor: EditorState;
  dispatch: Dispatch<EditorAction>;
  player: Player;
  durationMs: Ms | null;
  zoom: number;
  setZoom: (z: number) => void;
  save: () => void;
  toggleHelp: () => void;
  onsets: Onsets | null;
  snapOn: boolean;
  setSnapOn: (on: boolean) => void;
};

export type Command = {
  group: 'Timing' | 'Listen' | 'Select' | 'Edit' | 'View';
  /** Display form for the help overlay, e.g. ['⌘', 'Z']. */
  keys: string[];
  label: string;
  match: (e: KeyboardEvent) => boolean;
  run: (c: CommandContext, e: KeyboardEvent) => void;
  /** Ignore auto-repeat while the key is held (stamping, play/pause, save…). */
  once?: boolean;
};

export const isMod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey;

/** Exact match on key + modifiers. `shift: undefined` accepts either. */
export const key =
  (k: string, opts: { shift?: boolean; mod?: boolean } = {}) =>
  (e: KeyboardEvent) =>
    e.key === k &&
    (opts.shift === undefined || e.shiftKey === opts.shift) &&
    isMod(e) === !!opts.mod &&
    !e.altKey;

/** "line" or "3 lines", for action labels. */
export const countLabel = (c: CommandContext) =>
  c.editor.selection.ids.length === 1 ? 'line' : `${c.editor.selection.ids.length} lines`;
