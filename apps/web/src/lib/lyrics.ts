/** A whole-line parenthetical that names a section rather than being sung. */
const PAREN_LABEL =
  /^\((intro|outro|verse|chorus|pre-?chorus|post-?chorus|bridge|hook|refrain|interlude|instrumental|solo|break|repeat|x\s*\d+|\d+\s*x)\b[^)]*\)$/i;

/**
 * Turns a pasted lyric sheet into lines.
 *
 * - One non-blank line of text is one lyric line.
 * - Lines that are only a section label - "[Chorus]", "(Verse 2)", "# verse" -
 *   are dropped: common in sheets copied from the web, never sung. A whole line
 *   in parentheses is dropped only when it reads like a label; "(Ooh, baby)" is
 *   a sung backing vocal and stays. A lyric that merely *contains* brackets
 *   ("Hold on (hold on)") is kept.
 * - Text is never used for identity; duplicates are expected and kept.
 */
export function parseLyricSheet(raw: string): string[] {
  return raw
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim().replace(/\s+/g, ' '))
    .filter((l) => l.length > 0)
    .filter((l) => !/^\[[^\]]*\]$/.test(l))
    .filter((l) => !PAREN_LABEL.test(l))
    .filter((l) => !l.startsWith('#'));
}
