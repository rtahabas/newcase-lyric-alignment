/**
 * The one units boundary.
 *
 * Inside the editor every time is an integer number of milliseconds. Seconds
 * exist at exactly two edges - HTMLMediaElement (`currentTime`, `duration`) and
 * the API's `duration_seconds` - and they are converted here and nowhere else.
 */
export type Ms = number;

/** Seconds (float, from the media element or the API) -> integer ms. */
export function secToMs(seconds: number): Ms {
  return Math.round(seconds * 1000);
}

/** Integer ms -> seconds, only for handing back to the media element. */
export function msToSec(ms: Ms): number {
  return ms / 1000;
}

export function clampMs(ms: number, min: Ms, max: Ms): Ms {
  return Math.min(max, Math.max(min, Math.round(ms)));
}

/** 83456 -> "1:23.456". Always three decimals so columns line up. */
export function formatMs(ms: Ms): string {
  const sign = ms < 0 ? '-' : '';
  const abs = Math.abs(Math.round(ms));
  const m = Math.floor(abs / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const frac = abs % 1000;
  return `${sign}${m}:${String(s).padStart(2, '0')}.${String(frac).padStart(3, '0')}`;
}

/** Short form for rulers and list badges: "1:23". */
export function formatShort(ms: Ms): string {
  const abs = Math.max(0, Math.round(ms));
  const m = Math.floor(abs / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Parses what a person types into a time field: "1:23.456", "83.456", "1:23",
 * "83". Returns null for anything else rather than guessing.
 */
export function parseTime(input: string): Ms | null {
  const t = input.trim();
  const m = /^(?:(\d+):)?(\d+(?:\.\d{1,3})?)$/.exec(t);
  if (!m) return null;
  const minutes = m[1] ? Number(m[1]) : 0;
  const seconds = Number(m[2]);
  if (m[1] && seconds >= 60) return null;
  return secToMs(minutes * 60 + seconds);
}

/** Ruler label: "1:23", or "1:23.5" between whole seconds when ticks are sub-second. */
export function formatTick(ms: Ms, stepMs: Ms): string {
  return stepMs < 1000 && ms % 1000 ? formatMs(ms).replace(/0+$/, '') : formatShort(ms);
}

/** Full clock time "HH:MM:SS.mmm" (W3C TTML clock-time form). */
export function formatClock(ms: Ms): string {
  const abs = Math.max(0, Math.round(ms));
  const pad = (v: number, n = 2) => String(v).padStart(n, '0');
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(abs % 1000, 3)}`;
}
