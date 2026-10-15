import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Ms } from '../lib/time';
import type { PlayerState } from './player';
import { Player } from './player';

/** One Player for the lifetime of the component that owns the <audio>. */
export function usePlayer(): { player: Player; state: PlayerState } {
  const [player] = useState(() => new Player());
  const state = useSyncExternalStore(player.subscribe, player.getState);
  return { player, state };
}

/**
 * Per-frame callback while playing (and once on seek/pause). The callback is
 * read through a ref so callers can pass an inline function without
 * resubscribing every render.
 */
export function usePlayheadTick(player: Player, fn: (ms: Ms) => void): void {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => player.onTick((ms) => ref.current(ms)), [player]);
}

/**
 * A React value derived from the playhead that only re-renders when the derived
 * value changes - e.g. "which line is playing", which changes a few times per
 * minute, not 60 times per second.
 */
export function usePlayheadValue<T>(
  player: Player,
  derive: (ms: Ms) => T,
  equal: (a: T, b: T) => boolean = Object.is,
): T {
  const [value, setValue] = useState<T>(() => derive(player.timeMs()));
  const update = (ms: Ms) => {
    const next = derive(ms);
    setValue((prev) => (equal(prev, next) ? prev : next));
  };
  usePlayheadTick(player, update);
  // An edit while paused changes what `derive` returns without any tick arriving.
  // Re-derive after every render; the equality check makes it a no-op when nothing changed.
  useEffect(() => update(player.timeMs()));
  return value;
}
