import type { ReactNode } from 'react';
import { Keyboard, Magnet, Pause, Play, ZoomIn, ZoomOut } from 'lucide-react';
import type { TrackMeta } from '../sources/types';
import type { PlayerState } from '../audio/player';
import type { Sync } from '../session/useSync';
import { useEditor, clampZoom } from '../app/EditorContext';
import { formatShort } from '../lib/time';
import { IconButton } from '../ui/IconButton';
import { ThemeToggle } from '../ui/ThemeToggle';
import { TimeReadout } from './TimeReadout';
import { SaveControl } from './SaveControl';
import { ExportMenu } from './ExportMenu';

type Props = {
  meta: TrackMeta;
  playerState: PlayerState;
  sync: Sync;
  trackMenu: ReactNode;
  onHelp: () => void;
};

const RATES = [0.5, 0.75, 1];

export function TopBar({ meta, playerState, sync, trackMenu, onHelp }: Props) {
  const { player, durationMs, zoom, setZoom, editor, snapOn, setSnapOn, onsets } = useEditor();
  const { lines, segments } = editor.doc;
  const placed = lines.filter((l) => segments[l.id]).length;

  return (
    <header className="topbar">
      <div className="topbar__track">
        {trackMenu}
        <div className="topbar__title">
          <h1>{meta.title}</h1>
          <span className="muted small">
            {meta.artist || 'Unknown artist'} · {durationMs !== null ? formatShort(durationMs) : '–:––'}
          </span>
        </div>
        <span className="pill" data-testid="placed-count">
          {placed}/{lines.length} placed
        </span>
      </div>

      <div className="topbar__transport">
        <IconButton
          className="btn-play"
          label={playerState.playing ? 'Pause' : 'Play'}
          shortcut="Space"
          onClick={() => player.toggle()}
        >
          {playerState.playing ? <Pause size={18} /> : <Play size={18} />}
        </IconButton>
        <TimeReadout />
        <IconButton
          label={snapOn ? 'Snap stamps to sound onsets: on' : 'Snap stamps to sound onsets: off'}
          shortcut="O"
          aria-pressed={snapOn}
          className={snapOn ? 'is-on' : ''}
          disabled={!onsets}
          onClick={() => setSnapOn(!snapOn)}
          data-testid="snap-toggle"
        >
          <Magnet size={16} />
        </IconButton>
        <label className="field-inline">
          <span className="visually-hidden">Playback speed</span>
          <select
            value={playerState.rate}
            onChange={(e) => {
              player.setRate(Number(e.target.value));
              e.currentTarget.blur(); // hand the keyboard back to Space/Enter
            }}
            title="Playback speed (pitch preserved)"
          >
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="topbar__actions">
        <div className="group" role="group" aria-label="Zoom">
          <IconButton label="Zoom out" shortcut="−" onClick={() => setZoom(clampZoom(zoom / 1.5))}>
            <ZoomOut size={16} />
          </IconButton>
          <IconButton label="Zoom in" shortcut="+" onClick={() => setZoom(clampZoom(zoom * 1.5))}>
            <ZoomIn size={16} />
          </IconButton>
        </div>
        <ExportMenu meta={meta} />
        <SaveControl sync={sync} />
        <ThemeToggle />
        <IconButton label="Keyboard shortcuts" shortcut="?" onClick={onHelp}>
          <Keyboard size={16} />
        </IconButton>
      </div>
    </header>
  );
}
