/**
 * Reads LRC text ("[01:23.45] words"). A line may carry several stamps when a
 * chorus repeats ("[00:12.00][01:30.00]words"); each becomes its own entry. A
 * stamp with no words marks where the previous line stops. Metadata tags
 * ("[ar:...]") are ignored.
 */
import type { Ms } from './time';
import { secToMs } from './time';

export type LrcEntry = { ms: Ms; text: string };

const STAMP = /^\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/;

export function parseLrc(source: string): LrcEntry[] {
  const out: LrcEntry[] = [];
  for (const raw of source.split(/\r\n|\r|\n/)) {
    let rest = raw.trim();
    const stamps: Ms[] = [];
    for (let m = STAMP.exec(rest); m; m = STAMP.exec(rest)) {
      const seconds = Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(`0.${m[3]}`) : 0);
      stamps.push(secToMs(seconds));
      rest = rest.slice(m[0].length).trimStart();
    }
    for (const ms of stamps) out.push({ ms, text: rest.replace(/\s+/g, ' ').trim() });
  }
  return out.sort((a, b) => a.ms - b.ms);
}
