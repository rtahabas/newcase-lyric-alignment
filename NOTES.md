> **DRAFT written by the AI agent for the candidate to edit.** The README asks
> for the candidate's own notes; this is a starting point assembled from
> `decisions.md`. Rewrite it in your own words, keep what you agree with, and
> delete this box before submitting.

# Notes

## Try it in a minute

```bash
pnpm install && pnpm dev     # http://localhost:5173
```

1. On the seeded track, press **Start timing** (lyrics pane), then **Enter** as
   each line starts. Every stamp closes the previous line; the lyrics flow in
   the karaoke strip as you go. `?` lists every shortcut.
2. Shift-click a run of lines and press `]` / `}` (or type an amount in the
   inspector, or `M` to start the run at the playhead) — they move as one.
3. **Tracks → New track from your audio…**, or drop an audio file on the page:
   title/artist come from the file's tags or name, lyrics are looked up
   (LRCLIB) and filled in when the match is clear; paste your own otherwise.

## What I chose

- **Speed of a timing pass first.** One key per line (Enter stamps a start and
  closes the previous line; Shift+Enter ends a line before a gap), a one-click
  start of a pass, double-click to go to a line, and stamps that snap onto the
  nearest sound onset (visible, says by how much, undoable, `O` to turn off).
- **Fixing in bulk** — select a run, nudge / shift / move to playhead; drag a
  block (the whole selection moves), trim an edge (touching edges move
  together; Alt = free), audition around a boundary (`P`, `B`, `E`).
- **Knowing what happened** — every edit is labelled ("Stamp line 4 at
  0:12.340"), shown in the status line and on the Undo button; undo restores
  the selection too, so Enter re-stamps a fumbled line.
- **Persistence: both paths.** The seeded track saves to the API explicitly
  (Save / ⌘S) and handles `409` (banner: keep mine, or load theirs — undoable)
  and `400` (the server's hint is shown). Tracks you bring stay in the browser
  (timings in localStorage, audio in IndexedDB) and autosave. The API is
  unchanged.
- **One units boundary** — everything is integer ms inside; seconds exist only
  at the `<audio>` element and `duration_seconds` (`src/lib/time.ts`).

## What I left out, on purpose

- **Automatic alignment.** The brief says the timings are what the tool is
  for producing; forced alignment would need an ML model or a paid service.
  Onset snapping is the in-scope assist instead.
- LRCLIB's **synced** lyrics are only an opt-in draft, offered when a timed
  version is within 10 s of your audio's length — otherwise they would not line
  up, and the dialog says so.
- Word-level timing, a spectrum view, peaks in a Web Worker (costs ~170 ms once
  when opening a 20-minute track), multi-tab sync of local tracks.

## What surprised me

- The sheet repeats lines verbatim; anything keyed on text breaks.
- LRCLIB rate-limits hard enough that the lookup needed retries, and a 429
  reaches the browser as a CORS-less network error.
- A React effect that accidentally *returned* a value crashed the editor and
  passed both `tsc` and ESLint — only the browser run caught it.

## How I know it works

- `pnpm check` — typecheck, ESLint (type-checked, 150-line cap per file),
  Prettier, 60+ unit tests on the pure editing logic.
- `pnpm test` — Playwright: the provided harness test plus five specs (keyboard
  pass + undo, bulk shift, rejected save both ways, a track we bring end to
  end, onset snap on audio with known note starts).
- `pnpm measure` — load, interaction and playback timings for the seeded track
  and a 10× synthetic one; numbers and caveats in `decisions.md` §12.

## Working with an AI agent

Most of the code was written by an agent (Claude, in Claude Code) under my
direction. `decisions.md` is its decision log, written as it went; the
decisions I made myself are marked there as mine (ESLint/150-line rule, the
plan, Radix, automatic lyrics, "both" for timings, onset snapping).
