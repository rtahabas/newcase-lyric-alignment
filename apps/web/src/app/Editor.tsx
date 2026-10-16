/**
 * The editor for one loaded track. Mounted with `key={track.meta.key}`, so
 * switching tracks resets every piece of state below by construction.
 */
import { useEffect, useMemo, useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoadedTrack } from '../sources/types';
import { editorReducer, initialEditor } from '../editor/reducer';
import { usePlayer } from '../audio/usePlayer';
import { useWaveform } from '../audio/useWaveform';
import { detectOnsets } from '../audio/onsets';
import { measure } from '../audio/peaks';
import { useSync } from '../session/useSync';
import { useShortcuts } from '../keyboard/useShortcuts';
import type { EditorContextValue } from './EditorContext';
import { EditorContext, ZOOM_DEFAULT } from './EditorContext';
import { TopBar } from '../components/TopBar';
import { SyncBanner } from '../components/SyncBanner';
import { LyricsPane } from '../components/lyrics/LyricsPane';
import { Timeline } from '../components/timeline/Timeline';
import { Inspector } from '../components/inspector/Inspector';
import { Karaoke } from '../components/Karaoke';
import { StatusLine } from '../components/StatusLine';
import { HelpOverlay } from '../components/HelpOverlay';
import { ResizeHandle } from '../ui/ResizeHandle';
import { PANE_LIMITS, usePaneWidths } from './usePaneWidths';

type Props = {
  track: LoadedTrack;
  trackMenu: ReactNode;
  modalOpen: boolean;
  /** Reports unsaved *server* edits (local tracks autosave), so a track switch can ask first. */
  onDirtyChange: (dirty: boolean) => void;
};

export function Editor({ track, trackMenu, modalOpen, onDirtyChange }: Props) {
  const { player, state: playerState } = usePlayer();
  const [editor, dispatch] = useReducer(editorReducer, track.doc, (doc) =>
    editorReducer(initialEditor, { type: 'load', doc }),
  );
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [helpOpen, setHelpOpen] = useState(false);
  const panes = usePaneWidths();
  const [snapOn, setSnapOn] = useState(true);
  const wave = useWaveform(track.meta.audioUrl);
  const onsets = useMemo(
    () => (wave.status === 'ready' ? measure('onsets:detect', () => detectOnsets(wave.peaks)) : null),
    [wave],
  );
  const sync = useSync(track, editor.doc, dispatch);
  const unsaved = sync.dirty && !sync.isLocal;
  useEffect(() => {
    onDirtyChange(unsaved);
  }, [onDirtyChange, unsaved]);
  // The tab says which song is open and whether it has unsaved server edits.
  useEffect(() => {
    document.title = `${unsaved ? '• ' : ''}${track.meta.title} — Lyric Alignment`;
  }, [unsaved, track.meta.title]);

  // The audio's own duration is the truth; the source's claim only fills the gap until it loads.
  const durationMs = playerState.durationMs ?? track.meta.durationMs;
  useEffect(() => dispatch({ type: 'duration', ms: durationMs }), [durationMs]);

  const ctx = useMemo<EditorContextValue>(
    () => ({ editor, dispatch, player, durationMs, zoom, setZoom, onsets, snapOn, setSnapOn }),
    [editor, player, durationMs, zoom, onsets, snapOn],
  );

  useShortcuts(
    { ...ctx, save: sync.save, toggleHelp: () => setHelpOpen((o) => !o) },
    !modalOpen && !helpOpen,
  );

  return (
    <EditorContext.Provider value={ctx}>
      <div className="app">
        <TopBar
          meta={track.meta}
          playerState={playerState}
          sync={sync}
          trackMenu={trackMenu}
          onHelp={() => setHelpOpen(true)}
        />
        <SyncBanner sync={sync} playerError={playerState.error} />
        <main
          className="workspace"
          style={{
            ['--lyrics-w' as string]: `${panes.widths.lyrics}px`,
            ['--inspector-w' as string]: `${panes.widths.inspector}px`,
          }}
        >
          <LyricsPane />
          <ResizeHandle
            label="Resize lyrics pane"
            testId="resize-lyrics"
            value={panes.widths.lyrics}
            {...PANE_LIMITS.lyrics}
            direction={1}
            onResize={(px) => panes.resize('lyrics', px)}
            onReset={() => panes.reset('lyrics')}
          />
          <section className="stage" aria-label="Timeline">
            <Timeline wave={wave} />
            <Karaoke />
          </section>
          <ResizeHandle
            label="Resize inspector pane"
            testId="resize-inspector"
            value={panes.widths.inspector}
            {...PANE_LIMITS.inspector}
            direction={-1}
            onResize={(px) => panes.resize('inspector', px)}
            onReset={() => panes.reset('inspector')}
          />
          <Inspector />
        </main>
        <StatusLine />
        <audio ref={player.attach} src={track.meta.audioUrl} preload="auto" />
        {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      </div>
    </EditorContext.Provider>
  );
}
