# Build plan

Every requirement and assessment point in `README.md` is mapped to a task here,
so nothing is dropped. Tasks are done in order; `[x]` = done and verified, `[~]` = written but not yet verified in a browser or by a test.
Decisions made along the way go to `decisions.md`, not here.

## README requirement → where it is covered

| README says | Task |
| --- | --- |
| **`decisions.md`, written as we go (rejection if missing)** | 0.2, every phase |
| **Works with a track we bring (pass/fail)**; nothing keyed to this track | 9.x, 11.4, 14.3 |
| Add a second track yourself and align it before submitting | 14.3 (candidate, by ear) |
| Timing a sheet is fast: stamp while playing, nudge a run, hear it back | 1.x, 4.x, 5.x, 7.x |
| Interaction feels right: selection visible, undo, know what an edit changes | 0.4, 3.x, 5.x, 7.x |
| Code we could work in: sane state, clear boundaries, one units boundary | 0.3–0.5, 2.x, lint rules |
| Claims hold up: measure, don't guess | 12.x |
| Save can be rejected (409 with state); 400 with hint; say which path and why | 8.x |
| If API changed, say what and why | not changed — noted in decisions |
| One good Playwright spec for a real interaction | 11.x |
| Notes: what chosen, what skipped, what surprised | 13.1 |
| Existing harness test keeps passing (title is the `<h1>`) | 2.1, 14.1 |
| Confidence field is a leftover — ignore | not built |
| (candidate) professional prior art: Musixmatch, Aegisub, Apple TTML | decisions §3 |

## Phases

### 0. Foundations
- [x] 0.1 Read brief, API, harness, wireframe
- [x] 0.2 `decisions.md` started before code
- [x] 0.3 Units boundary (`lib/time.ts`), types, ids, lyric sheet parser
- [x] 0.4 Pure edits (`editor/timing.ts`, `editor/lines.ts`), selection, reducer with labelled undo/redo
- [x] 0.5 Sources: wire translation, server (typed save outcomes), local (localStorage + IndexedDB audio)
- [x] 0.6 Tooling: ESLint (type-checked, 150-line cap), Prettier, EditorConfig, Vitest, `pnpm check`

### 1. Audio
- [x] 1.1 Player hook: one `<audio>`, play/pause/seek/rate, play-a-segment-then-stop
- [x] 1.2 Playhead clock on rAF, written to the DOM via refs (no React render per frame)
- [x] 1.3 Waveform peaks: fetch + `decodeAudioData` + min/max buckets; failure degrades to "no waveform"

### 2. Shell
- [x] 2.1 App layout: top bar (title `<h1>`, transport, time, rate, zoom, save state, export, load), lyrics | timeline | inspector, karaoke
- [x] 2.2 Track session hook: load server/local, duration from the audio element, revoke blob URLs

### 3. Lyrics pane
- [x] 3.1 Paste sheet: replace or append; add single line
- [x] 3.2 List: index, text, time badge, untimed obvious at a glance, "n of m placed", playing line highlighted
- [x] 3.3 Click / shift / cmd selection; reorder by drag; drop onto a line to merge; Alt+↑/↓ from the keyboard
- [x] 3.4 Editorial warnings (overlap, out of order, past end) shown, not enforced

### 4. Timeline
- [x] 4.1 Ruler + waveform canvas drawing only the visible window; zoom
- [x] 4.2 Segment lane: block per timed line, selected state, click to select, click empty to seek
- [x] 4.3 Drag block to move (moves whole selection), drag edges to trim, snap to playhead/neighbours, touching edges move together (Alt = free) (D3.3)
- [x] 4.4 Drag a line from the list onto the lane to place it
- [x] 4.5 Playhead follows during playback

### 5. Inspector
- [x] 5.1 Exact start/end fields (typed time), duration, text edit
- [x] 5.2 Split at caret (time at playhead or proportional), merge with next, clear timing, delete
- [x] 5.3 Multi-selection: shift by N ms, move to playhead, "edits apply to n lines"
- [x] 5.4 Audition: play selection (`P`), around start (`B`), around end (`E`) — from Aegisub (D3.2)

### 6. Karaoke readout
- [x] 6.1 Previous / current / next line, updates only when the line changes

### 7. Keyboard
- [x] 7.1 Global key map (stamp, end, play, seek, nudge, select, undo/redo, save, zoom, delete) ignored while typing
- [x] 7.2 Help overlay listing every shortcut; visible hint for the stamp key

### 8. Saving
- [x] 8.1 Server: explicit save (button + Cmd/Ctrl+S), dirty indicator, version tracking
- [x] 8.2 409: banner with both options — keep mine (resave on their version) / take theirs (undoable)
- [x] 8.3 400 hint and network failure shown; edits never lost; retry
- [x] 8.4 Local tracks: autosave; storage failure shown
- [x] 8.5 Warn before leaving with unsaved server edits (verified via a cancelable beforeunload, D12.3)

### 9. Bring your own track
- [x] 9.1 Load dialog: audio file or URL, title, artist, lyric paste
- [x] 9.2 Drop an audio file anywhere to start a track
- [x] 9.3 Track switcher (server track + local tracks), delete local track
- [x] 9.4 Audit: no hard-coded duration / line count / ids (grep)

### 9b. Lyrics lookup (candidate request, 2026-10-15)
- [x] 9b.1 Read title/artist from ID3 tags, else from the file name
- [x] 9b.2 Look up plain lyrics on LRCLIB, rank by duration, auto-fill on a confident match, else offer choices; paste stays as fallback
- [x] 9b.3 Unit tests (ID3, ranking) + browser check with a mocked LRCLIB (e2e/own-track.spec.ts)

### 9c. List navigation (candidate report)
- [x] 9c.1 Double-click jumps to a line (timed: plays it; untimed: likely start, plays on)
- [x] 9c.2 Selecting a line reveals its block on the timeline; playhead stays in view after a seek
- [x] 9c.3 Untimed rows show “—” / Enter hint; how-to when nothing is placed

### 9d. Timing pass + LRCLIB draft (candidate chose “both”)
- [x] 9d.1 Start timing / Continue from line N button
- [x] 9d.2 Opt-in LRCLIB draft, closest timed version within 10 s, honest note otherwise
- [x] 9d.3 LRC parsing + draft construction unit-tested; browser-verified with mocked LRCLIB

### 9e. Onset snapping (candidate chose the in-scope assist)
- [x] 9e.1 Onset detection from existing peaks, unit-tested
- [x] 9e.2 Enter snaps to strongest onset in −400/+150 ms, label says by how much, undoable
- [x] 9e.3 Magnet toggle + `O`, onset ticks on the waveform; verified on the real track

### 10. Export
- [x] 10.1 LRC export (untimed lines skipped and counted)
- [x] 10.2 Line-level TTML export (Apple Music style, D3.5)

### 11. Playwright specs
- [x] 11.1 Stamp a pass with the keyboard, then undo
- [x] 11.2 Bulk shift a selection
- [x] 11.3 Rejected save (409) surfaces and reconciles
- [x] 11.4 Bring-your-own track: generated audio + pasted lyrics, timed and exported
- [x] 11.5 Onset snap on generated audio with known note starts

### 12. Measurements
- [x] 12.1 Decode + peaks time on the real track and on a 10× synthetic one
- [x] 12.2 Frame times during playback (rAF intervals), long tasks
- [x] 12.3 Record the numbers and how they were taken in `decisions.md`

### 13. Docs
- [x] 13.1 `NOTES.md` draft for the candidate to own (marked DRAFT — candidate rewrites in their own words): path chosen and why, skipped, surprises
- [x] 13.2 `decisions.md` final pass (no reconstruction — only gaps flagged)

### 13b. Code review fixes (candidate ran /code-review high)
- [x] 13b.1 15 findings fixed (decisions.md §14), 5 new unit tests
- [x] 13b.2 17-step browser check of the fixes + 35-step regression + `pnpm check` / `pnpm test` / `pnpm build`

### 13c. Wireframe alignment (candidate request)
- [x] 13c.1 Visible trim handles, playhead grip, placed/unplaced list contrast
- [x] 13c.2 Snap guide line + origin ghost + “N segments selected” frame while dragging/selecting
- [x] 13c.3 Lyrics pane: open paste box, “Add all lines”, “+ Add line”, “LINES · N / M placed”
- [x] 13c.4 Top bar “Load song” + “Export LRC”; Inspector “Segment” layout with duration box

### 13d. Scope decisions
- [x] 13d.1 Desktop-focused, not a mobile editor (candidate's decision, decisions.md D18.1; NOTES.md)

### 14. Verification
- [x] 14.1 `pnpm check`, `pnpm test`, `pnpm build` all green
- [x] 14.2 Manual run in a browser — agent: scripted browser runs + screenshots throughout; candidate: by hand (confirmed 2026-10-16)
- [x] 14.3 Candidate aligned a second real song of their own (reported 2026-10-16)
