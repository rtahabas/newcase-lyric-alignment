/**
 * Owns the one <audio> element. Two channels out:
 * - `state` (playing, duration, rate, error): changes rarely; React subscribes
 *   via useSyncExternalStore and re-renders.
 * - `tick` (current time in ms): every animation frame while playing, once on
 *   seek/pause. Subscribers write to the DOM directly; React never renders per
 *   frame. That split is what keeps playback smooth.
 */
import type { Ms } from '../lib/time';
import { msToSec, secToMs } from '../lib/time';

export type PlayerState = { playing: boolean; durationMs: Ms | null; rate: number; error: string | null };
type Tick = (ms: Ms) => void;

const EVENTS = [
  'play',
  'pause',
  'seeked',
  'timeupdate',
  'loadedmetadata',
  'durationchange',
  'ended',
  'error',
  'emptied',
];

export class Player {
  private el: HTMLAudioElement | null = null;
  private ticks = new Set<Tick>();
  private stateListeners = new Set<() => void>();
  private raf = 0;
  private stopAtMs: Ms | null = null;
  private snapshot: PlayerState = { playing: false, durationMs: null, rate: 1, error: null };

  /** Ref callback for the <audio> element. */
  readonly attach = (el: HTMLAudioElement | null) => {
    if (this.el === el) return;
    for (const e of EVENTS) this.el?.removeEventListener(e, this.onEvent);
    this.el = el;
    for (const e of EVENTS) el?.addEventListener(e, this.onEvent);
    this.onEvent();
  };

  readonly subscribe = (fn: () => void) => {
    this.stateListeners.add(fn);
    return () => void this.stateListeners.delete(fn);
  };

  readonly getState = () => this.snapshot;

  onTick(fn: Tick): () => void {
    this.ticks.add(fn);
    fn(this.timeMs());
    return () => void this.ticks.delete(fn);
  }

  timeMs(): Ms {
    return this.el ? secToMs(this.el.currentTime) : 0;
  }

  /** A manual seek ends any audition range: the user has moved on. */
  seek(ms: Ms): void {
    if (!this.el) return;
    this.stopAtMs = null;
    const max = this.snapshot.durationMs ?? Number.MAX_SAFE_INTEGER;
    this.el.currentTime = msToSec(Math.max(0, Math.min(ms, max)));
    this.emitTick();
  }

  toggle(): void {
    if (this.snapshot.playing) this.pause();
    else this.play();
  }

  play(): void {
    this.stopAtMs = null;
    this.el?.play().catch((e: unknown) => this.setError(e));
  }

  pause(): void {
    this.el?.pause();
  }

  /** Audition a range: seek, play, and stop by itself at `endMs`. */
  playRange(startMs: Ms, endMs: Ms): void {
    this.seek(startMs);
    this.el?.play().catch((e: unknown) => this.setError(e));
    this.stopAtMs = endMs;
  }

  setRate(rate: number): void {
    if (this.el) this.el.playbackRate = rate;
    this.update({ rate });
  }

  private readonly onEvent = () => {
    const el = this.el;
    const durationMs = el && Number.isFinite(el.duration) ? secToMs(el.duration) : null;
    const playing = !!el && !el.paused && !el.ended;
    const error = el?.error
      ? `The audio could not be played (${el.error.message || `code ${el.error.code}`}).`
      : null;
    this.update({ playing, durationMs, error, rate: el?.playbackRate ?? 1 });
    if (playing) this.startLoop();
    else this.emitTick();
  };

  private startLoop() {
    if (this.raf) return;
    const frame = () => {
      this.raf = 0;
      if (!this.snapshot.playing) return;
      const now = this.timeMs();
      if (this.stopAtMs !== null && now >= this.stopAtMs) {
        this.stopAtMs = null;
        this.pause();
      }
      this.emitTick(now);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  private emitTick(now = this.timeMs()) {
    for (const fn of this.ticks) fn(now);
  }

  private setError(e: unknown) {
    // AbortError means play() was interrupted by a pause or a new source: expected, not a failure.
    if (e instanceof DOMException && e.name === 'AbortError') return;
    this.update({ error: e instanceof Error ? e.message : String(e) });
  }

  private update(patch: Partial<PlayerState>) {
    const next = { ...this.snapshot, ...patch };
    const same = (Object.keys(next) as (keyof PlayerState)[]).every((k) => next[k] === this.snapshot[k]);
    if (same) return;
    this.snapshot = next;
    for (const fn of this.stateListeners) fn();
  }
}
