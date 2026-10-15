/**
 * Turns a pasted lyric sheet into lines.
 *
 * - One non-blank line of text is one lyric line.
 * - Lines that are only a section label - "[Chorus]", "(Verse 2)", "# verse" -
 *   are dropped. They are common in sheets copied from the web and are never
 *   sung, so timing them would be noise. A lyric that merely *contains*
 *   brackets ("Hold on (hold on)") is kept.
 * - Text is never used for identity; duplicates are expected and kept.
 */
export function parseLyricSheet(raw: string): string[] {
  return raw
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim().replace(/\s+/g, ' '))
    .filter((l) => l.length > 0)
    .filter((l) => !/^\[[^\]]*\]$/.test(l))
    .filter((l) => !/^\([^)]*\)$/.test(l))
    .filter((l) => !l.startsWith('#'));
}
