/**
 * What every pane of the editor needs: the editor state and its dispatch, the
 * player, the effective duration and the zoom. Passed by context so the panes
 * do not thread six props each through the layout.
 */
import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { EditorAction, EditorState } from '../editor/reducer';
import type { Player } from '../audio/player';
import type { Ms } from '../lib/time';
import type { Onsets } from '../audio/onsets';

export type EditorContextValue = {
  editor: EditorState;
  dispatch: Dispatch<EditorAction>;
  player: Player;
  durationMs: Ms | null;
  /** Horizontal zoom of the timeline, in pixels per second. */
  zoom: number;
  setZoom: (z: number) => void;
  /** Sound onsets found in the audio; null until the waveform is decoded (or if it cannot be). */
  onsets: Onsets | null;
  /** Whether a stamp snaps to the nearest onset (decisions.md D10). */
  snapOn: boolean;
  setSnapOn: (on: boolean) => void;
};

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used inside <EditorContext.Provider>');
  return ctx;
}

export const ZOOM_MIN = 10;
export const ZOOM_MAX = 400;
export const ZOOM_DEFAULT = 60;
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
