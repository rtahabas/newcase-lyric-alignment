/**
 * Turns a messy title - from a tag or a file name - into what a lyrics
 * database would call the song. Used for searching only.
 *
 *   "Kendim ettim kendim buldum(Taha (Baş)"   -> "Kendim ettim kendim buldum"
 *   "Song (feat. Someone) [Remastered 2011]"  -> "Song"
 *   "Song - Live at Wembley"                  -> "Song"
 */
export function searchTitle(raw: string): string {
  let t = raw;
  // Balanced (...) and [...] groups, innermost first, until none are left.
  for (let prev = ''; prev !== t; ) {
    prev = t;
    t = t.replace(/\s*[([][^()[\]]*[)\]]/g, ' ');
  }
  return t
    .replace(/\s*[([].*$/, '') // an unbalanced "(" or "[" and everything after it
    .replace(/\s+(feat\.?|ft\.?|featuring)\s.*$/i, '')
    .replace(/\s+-\s+(live|remaster(ed)?|radio edit|acoustic|demo|version)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s\-–—:]+$/, '')
    .trim();
}
