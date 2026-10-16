# Notes

**Live demo:** https://newcase-lyric-alignment.onrender.com — free hosting, so
the first visit after a quiet spell can take about a minute to wake up.

```bash
pnpm install && pnpm dev    # http://localhost:5173 — press ? for shortcuts
```

## What I chose

- **Speed of a timing pass first.** Start timing, then one Enter per line; each
  stamp closes the previous line and snaps to the nearest sound onset (shown,
  undoable, `O` to turn off). Bulk shift for a run of late lines, labelled
  undo/redo, audition around a boundary.
- **The wireframe's layout, plus what helps speed** — drag/trim with snap guides,
  resizable panes, karaoke strip, light/dark theme, a look inspired by
  conversion.al. Desktop-focused on purpose.
- **Bring your own track:** pick or drop an audio file; title/artist come from
  its tags, lyrics are looked up on LRCLIB (paste your own if not found).
  I added a second track of my own and aligned it — it works.
- **Persistence, both paths:** the seeded track saves to the API (409 → keep
  mine / load theirs, 400 hint shown, 15 s timeout); my own tracks live in the
  browser and autosave. **The API is unchanged.**

## What I left out

- **Automatic alignment** — the brief makes timing the user's job; onset snap is
  the in-scope help. LRCLIB's ready timings are only an opt-in draft.
- Phones/tablets, word-level timing, a spectrum view.

## What surprised me

- Lyrics don't "just flow" like in Spotify — someone has to time them, which is
  exactly what this tool is for.
- My own song wasn't found at first because of a messy file name; LRCLIB also
  rate-limits hard.
- A code review still found 15 issues after everything passed — a few could lose
  edits.

## How I know it works

`pnpm check` (types, lint, 77 unit tests) · `pnpm test` (6 Playwright specs) ·
`pnpm measure` (performance numbers in `decisions.md` §12) · axe: 0 violations.

## AI agent

Most of the code was written by Claude (Claude Code) under my direction; I
drafted these notes with it. My decisions are marked as the candidate's in
`decisions.md`; the rest of that file is the agent's log.
