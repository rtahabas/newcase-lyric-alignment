# decisions.md — the agent's decision log

This file is written by the AI agent (Claude, in Claude Code) **as the work
happens**, not reconstructed at the end. Each entry is a decision the agent made
on the candidate's behalf: what was chosen, what was weighed against it, and
what was guessed because the brief did not say. Entries are appended in the
order they were made; later entries may revise earlier ones, and say so rather
than editing history.

The candidate's own notes live in `NOTES.md`. The split: `NOTES.md` is what the
candidate chose; this file is what the agent chose for them.

---

## Index by area (read this first)

This log is **chronological on purpose** — the README asks for it to be written
as the work happens, not reconstructed — so later entries revise earlier ones
and say so. This index regroups the same entries the way an engineer would
review them. Nothing below the index was reordered or rewritten.

| Area | Entries |
| --- | --- |
| **Scope and priorities** | D0.1, D0.2 (README's "what we look for" sets the order), D2.4 (plan), D18.1 (desktop-focused) |
| **Architecture and state** | D0.3 (two persistence paths), D0.4 → D4.1 (libraries), D0.5 (one units boundary), D1.4 (undo snapshots), D1.5 → D11.3 (selection in undo), D13.3 (warnings shown, not enforced), D14.14 (one span helper) |
| **Core timing loop** | D1.1–D1.3 (stamp model), D3.1, D9.1 (Start timing), D10.1–D10.3 (onset snap), D14.3 (kept end) |
| **Timeline editing** | D3.2 (audition), D3.3 (snap, linked edges), D13.4 (merge/split), D14.4 (merge only neighbours), D14.8 (scrub), D15.1–D15.2 (drag/selection overlays), D17.1 (resizable panes), D23.5–D23.6 (cursor, no text selection) |
| **Lyrics list and navigation** | D8.1 → D8.4 (double-click), D8.2 (reveal selection, revises D3.6), D8.3, D11.5 (Alt+↑↓), D13.2 → D14.11 (sheet parsing) |
| **Keyboard** | D13.1 (key map), D6.1 (no shortcuts in dialogs, no key repeat), D14.5 (buttons reachable by Tab), D14.6, D14.7 (Cmd+S) |
| **Bring your own track (pass/fail)** | D5.1–D5.6, D14.13 (insecure contexts), D14.15 (URL probe), D19.3 (stored data validated) |
| **Lyrics lookup (LRCLIB)** | D7.1–D7.7, D7.4 → D7.8 → D14.10 (confidence), D7.2 → D9.2–D9.4 (opt-in timed draft), D14.9, D14.12 |
| **Persistence and API** | D0.3, D6.1 (unsaved-switch guard), D14.1 (local autosave flush), D14.7, D22.1 (fetch, not axios), D22.2 (timeouts, response validation) |
| **Export** | D3.5 (LRC + TTML), D16.1–D16.2 (checked by ffmpeg and xmllint) |
| **Visual design and layout** | D13.5, D15.1, D20.1–D20.2 (conversion.al-inspired), D21.1–D21.2 (theme choice), D24.1–D24.3 |
| **Accessibility** | D19.1 (axe: 0 violations), D20.2, D14.5, D17.1, D23.1 |
| **Loading, errors, resilience** | D19.2 (error boundary), D19.3, D19.4, D22.2, D23.1–D23.4 (skeletons, no theme flash) |
| **Performance** | D12.1–D12.3 (`pnpm measure`), D10.3, D23.2 |
| **Tooling and code quality** | D0.6 (ESLint, 150-line cap), D2.1–D2.3, D11.4 |
| **Testing and verification** | D2.2, D5.5, D6.1, D9.4, D11.1–D11.3, D12.3, D16.1 |
| **Prior art** | D3.1–D3.6 (Musixmatch, Aegisub, Apple TTML) |
| **Mistakes found and fixed** | D5.6, D6.1, D6.2 (a crash this log does not hide), D14 (code review), D16.2, D21.2 |

Decisions the **candidate** made (the agent's are everything else): D0.6, D2.4,
D4.1 (challenge), §3 (research), §7, D9 ("both"), §10 (stay in scope), §15,
D18.1, §20, §21.

---

## 0. Before writing code

**D0.1 — Read the whole brief, API and harness before deciding anything.**
Read `README.md`, `docs/wireframe.png`, every file under `apps/api/src`,
`apps/web/src`, `e2e/` and `playwright.config.ts`. Things that shaped later
decisions:
- Lines repeat verbatim (`seed/lines.txt` says so on purpose). → Everything is
  keyed on line **id**, never text.
- Line ids are TEXT and client-owned (`db.js` comment). → New lines get
  client-generated string ids; no server round trip needed to create one.
- One segment per line, `end_ms > start_ms`, integer ms (`validate.js`).
  → The editor's segment model is "a line has zero or one segment".
- The existing Playwright test asserts a heading named after the track title.
  → Keep the track title as the page's `<h1>`.

**D0.2 — Priority order follows "What we are looking for", not the Ideas list.**
Speed of timing a sheet first, then interaction feel (undo, knowing what is
selected), then the bring-your-own-track pass/fail, then code quality. The
Ideas menu is used to pick features only where they serve those.

**D0.3 — Persistence path: both, split by where the track comes from.**
- The seeded track loads from and saves to the API (manual save, with 409/400
  handling), because the brief calls a real save "worth showing".
- A track the user brings lives entirely client-side: lines + timings in
  `localStorage`, the audio blob in IndexedDB so a reload does not lose it.
- Both go through one `TrackSource`-shaped boundary so the editor never knows
  which it is talking to.
- Rejected: adding a "create track" route to the API. The brief says the BYO
  requirement "lives on your side of the wire", and a server-side upload adds
  file handling that is not what is being assessed.
- Rejected: local-only for everything. Loses the 409 story, which is one of the
  "hard" items and cheap to show given the server already does the work.

**D0.4 — No UI or state libraries beyond React.** The interactions that matter
(stamping, dragging blocks, nudging a selection) are a few hundred lines of
pointer/keyboard code; a timeline or DnD library would mostly be fought rather
than used. State is a single `useReducer` with an undo history. Rejected:
wavesurfer.js / peaks.js (would own the timeline DOM, making the segment lane
and its drag semantics harder to control); Redux/Zustand (one screen, one
reducer — no cross-tree subscription problem to solve).

**D0.5 — One units boundary.** Inside the editor every time is an integer
millisecond. Seconds only exist at two edges: `HTMLMediaElement.currentTime` /
`duration`, and the API's `duration_seconds`. All conversion goes through
`src/lib/time.ts`; nothing else multiplies or divides by 1000.

**D0.6 — Candidate instructions received mid-build (recorded so the split of
who-decided-what stays honest).** The candidate asked for: ESLint, professional
/ clean code, and no component over 150 lines. How the agent implemented that:
- ESLint 9 flat config in `apps/web/eslint.config.js`: `@eslint/js` recommended,
  `typescript-eslint` *type-checked* recommended, `react-hooks`, `react-refresh`.
  `pnpm lint` at the root runs it.
- The 150-line limit is enforced by the `max-lines` rule (blank lines and
  comments counted) on **every** source file, not only components. The agent
  widened it from "components" to "all files" because a 220-line logic module
  is just as hard to review, and one rule is simpler than two. As a direct
  consequence the first draft of `editor/ops.ts` (≈220 lines) was split into
  `editor/timing.ts` and `editor/lines.ts` before anything imported it.
- Tech stack: the README prescribes none beyond the scaffold (React 18 + TS +
  Vite, Playwright). Kept as is; nothing added at runtime besides React.
- `typescript-eslint` pinned to 8.46.0: 8.18 (first tried) declares a peer range
  of TypeScript `<5.8`, and the lockfile resolves TypeScript 5.9.3.

## 1. Editor model

**D1.1 — Stamping model: one tap per line start; the next tap closes the
previous line.** `Enter` stamps the focused line's start at the playhead and
moves focus to the next line. The stamped line gets a *provisional* end (4 s,
capped by the next timed line and the track end); the next `Enter` pulls that
provisional end to the new tap, so a straight pass gives back-to-back lines.
`Shift+Enter` stamps an explicit end (for a line followed by an instrumental
gap). Weighed against:
- *Two taps per line (start + end)*: doubles the work on the common case
  (lyrics sung back to back) to serve the rarer case (gaps), which already has
  `Shift+Enter`.
- *Hold-to-time (keydown = start, keyup = end)*: elegant, but one fumbled hold
  ruins both edges, and holding through a 6-second line is tiring for 28 lines.
Guessed: 4 s as the provisional length. It only matters for the last line of a
pass and for lines followed by a gap; it is a named constant.

**D1.2 — Re-stamping keeps a good end.** If a line is already timed and the new
start is still before its end, the end is kept. Fixing a fumbled start should
not destroy the end the user already got right.

**D1.3 — Explicit navigation breaks the stamping chain.** Selecting a line by
click or arrow key clears `openId`. Otherwise "skip ahead to line 20 and stamp"
would stretch the last stamped line all the way to line 20.

**D1.4 — Undo history snapshots the whole Doc**, not inverse operations. A Doc
is 28 short strings and 28 pairs of integers; immutable updates share
structure. Inverse ops would need a hand-written inverse for merge/split/delete
— more code, more bugs, no measurable win at this size. Capped at 300 entries.
Every entry carries a label ("Stamp line 4 at 0:12.340") which the UI shows as
the last action and on the undo button, so the user can tell what an undo will
revert *before* pressing it.

**D1.5 — Selection is not part of undo.** Undo restores content; selection is
pruned to ids that still exist. Restoring the old selection on undo was
considered but makes the selection jump unexpectedly when undoing a nudge.

## 2. Tooling (agent's call; the candidate asked the agent to own these)

**D2.1 — Prettier + eslint-config-prettier, scoped to `apps/web`.** Formatting
is Prettier's job, correctness is ESLint's; `eslint-config-prettier` turns off
the ESLint rules that would fight Prettier. `printWidth: 110` because the
editor's pure functions read better with a signature on one line, and 80 made
the 150-line budget spend itself on wrapping. Scoped to `apps/web` so the
untouched fixture API does not show up as a reformatting diff.

**D2.2 — Vitest for the pure editor logic; Playwright stays for behaviour.**
Stamping, shifting, merge/split and undo are pure functions of a Doc, so they
are tested directly (fast, exact assertions on milliseconds). Playwright is
kept for what only a browser can show: keys, pointer drags, a rejected save
reaching the screen. Rejected: testing ms-level edge cases through Playwright —
slow, and the failures would point at the UI instead of the rule that broke.
`pnpm test` is left as the Playwright command the README documents;
`pnpm test:unit` runs Vitest; `pnpm check` runs typecheck + lint + format check
+ unit tests in one go.

**D2.3 — `.editorconfig` at the root** so editors agree on LF / 2 spaces before
Prettier ever runs.

**D2.4 — `PLAN.md` added on the candidate's request** ("plan first so nothing
is missed"). It maps each README requirement to a task and is ticked as work
lands. Phase 0 was already done when it was written; it is marked as such
rather than pretending the plan came first.

## 3. Prior art (researched at the candidate's request)

The candidate asked to look at how Spotify / YouTube Music / Yandex Music do
this. Those are *players*; the lyrics they show are produced elsewhere —
Spotify's come from Musixmatch, whose contributors time them in Musixmatch
Studio. So the agent looked at the producing tools instead: Musixmatch's sync
flow, Aegisub (the standard subtitle/karaoke timing tool), and Apple Music's
TTML delivery format. Sources: aegisub.org/docs/latest/timing, Musixmatch /
Spotify artist help pages, Apple Music Specification + the community AMLL TTML
spec. What was taken and what was not:

**D3.1 — Adopted: "sync a line when its first word is sung"** (Musixmatch's
rule). Confirms D1.1: the stamp is a line *start*, ends follow from the next
start.

**D3.2 — Adopted: audition keys around boundaries** (Aegisub plays the
selection, the 500 ms before the start, the last 500 ms, the 500 ms after the
end). Here: `P` plays the selection, `B` plays around its start, `E` plays
around its end. "Hear what you just placed, immediately" is literally in the
brief; boundary-local playback is how professionals check a boundary without
listening to the whole line.

**D3.3 — Adopted: snapping on by default, a modifier for free movement**
(Aegisub uses Shift; here Alt, since Shift is already "extend selection").
**Adopted with a change: linked boundaries.** Aegisub drags two touching
boundaries together with Ctrl. Here touching boundaries move together *by
default* (Alt unlinks), because the stamping pass produces back-to-back lines
on purpose, and dragging one edge should move the transition, not open a gap or
create an overlap. Guessed: that default is right for lyric timing even if it
is not for subtitles.

**D3.4 — Adopted: slowed playback** (Musixmatch users commonly slow tracks for
dense lines). `HTMLMediaElement.playbackRate` with pitch preserved; 0.5–1×.

**D3.5 — Adopted: Apple-style line-level TTML export next to LRC.** LRC is
what most players and Musixmatch-style tooling read; TTML with
`itunes:timing="line"` is what Apple Music ingests. Both are a few lines once
the Doc exists. Word-level timing (TTML spans, enhanced LRC) is **not** done:
the API stores one segment per line, and word timing is a different editor.

**D3.6 — Not adopted: spectrum view, lead-in/lead-out padding, auto-scroll
to selection.** Spectrum helps find onsets in noisy audio but is a second
renderer for a nice-to-have. Lead-in/out pads subtitle display time — a player
concern, not a data concern. Aegisub's own docs advise leaving auto-scroll off
while timing; here the view only follows the playhead during playback when it
leaves the screen.

## 4. Revisions

**D4.1 — Revises D0.4: Radix primitives + lucide icons for generic widgets.**
The candidate challenged "no UI library". Re-weighed: D0.4's argument holds for
the timeline, waveform and drag interactions (no library provides them; a
timeline library would own the DOM the drag code needs). It does *not* hold for
generic widgets — a dropdown menu with roving focus and typeahead, a modal with
focus trap/return and scroll lock, tooltips. Hand-rolling those is where
accessibility bugs come from, and they are not what is being assessed. So:
- `@radix-ui/react-dropdown-menu`, `react-dialog`, `react-tooltip`: unstyled,
  accessible primitives; the look stays ours (plain CSS with tokens).
- `lucide-react` for icons instead of unicode glyphs (consistent stroke, sized
  by CSS, tree-shaken per icon).
- Rejected: a styled component kit (MUI, Chakra, Mantine). It would impose a
  visual language on an editor whose most important surface (the timeline)
  it cannot render, leaving two design systems on one screen.
- Rejected: Tailwind. The token-based CSS already in `styles.css` covers it;
  switching mid-build buys nothing measurable.
- Still custom: timeline, waveform, segment drag/trim, lyric list drag.

## 5. Bring your own track (phase 9)

**D5.1 — A new track needs playable audio, a title and at least one lyric
line before it can be created.** The browser is asked to load the audio's
metadata first (`useAudioProbe`); an unplayable file or URL is reported in the
dialog instead of producing a track that cannot be timed. Duration always comes
from that metadata — nothing assumes the seeded track's 2:05 or 28 lines.
Guessed: requiring lyrics up front. An empty sheet could be pasted later in the
lyrics pane, but a track with zero lines has nothing to do, and the brief pairs
"their own audio" with "their own lyric sheet".

**D5.2 — File or URL, one at a time.** A file is stored in IndexedDB so it
survives a reload; a URL is stored as-is. Known limit, stated in the UI: a URL
on another origin without CORS headers plays but cannot be decoded, so it gets
no waveform (playback, stamping and everything else still work).

**D5.3 — Drop an audio file anywhere to start a track.** Only drags carrying
files count, so dragging a lyric line can never trigger it. If the dialog is
already open, the dropped file replaces the chosen one rather than discarding
what was typed.

**D5.4 — Deleting a local track asks first.** It is the one action undo cannot
reverse (the audio blob is gone), so it gets a confirmation that says so and
suggests exporting first. Nothing else in the editor confirms, because
everything else is undoable.

**D5.5 — Verified, not assumed.** A generated 37.5 s WAV (not the seeded mp3)
with a 5-line sheet containing a `[Chorus]` label and a duplicated line was
loaded through the dialog in a clean browser profile, stamped with the
keyboard, and reloaded: 5 lines (label dropped, duplicate kept), duration 0:37
from the audio, all five times identical after the reload. The same check runs
as a Playwright spec in phase 11.

**D5.6 — Bug found by that check, fixed:** the karaoke readout and the playing
line in the list only re-derived on playhead ticks, so an edit made while
paused (e.g. stamping an end at the playhead) left them stale until playback
moved. `usePlayheadValue` now also re-derives after each render; the equality
check keeps it from causing extra renders.

## 6. Checkpoint review (candidate asked to stop and check everything so far)

**D6.1 — Full read-through of state, sync, audio, keyboard, drag and
inspector code, then every `[~]` plan item exercised in a real browser** (35
scripted checks, saves mocked with `page.route` so the candidate's running dev
database was never written). All 35 pass, twice in a row. Bugs the review found
and fixed before that run:
- **Unsaved server edits were dropped silently on a track switch** (the editor
  is keyed per track). Now every switch goes through one `requestOpen` that asks
  first ("Keep editing" / "Discard and switch"). Local tracks autosave, so they
  never ask.
- **Shortcuts fired inside dialogs and menus**: Enter on a dialog's "Delete"
  button stamped a line instead. Keys whose target is inside a dialog/menu, or
  that something already handled (`defaultPrevented`), are now ignored.
- **Holding Enter stamped line after line** (key auto-repeat). Commands carry a
  `once` flag; stamping, play/pause, audition, save and help ignore repeats,
  nudges and arrows still repeat.
- **Escape in a time field committed the draft** (the blur it triggered ran the
  commit before state updated). A ref now marks the blur as cancelled.
- **"Set to playhead" swallowed refusals**; it now shows the reason like typing.
- Enter in the line-text box inserted a newline into a lyric line; now commits.
- A manual seek during an audition still stopped at the old range end; seeking
  now ends the audition.
- `pointercancel` was not handled, which could leave a drag or scrub stuck.

**D6.2 — Regression introduced by the fix and caught by the same check.** The
first version of the dirty-reporting effect returned the value of an
assignment; React treated it as a cleanup function and crashed the editor on
mount (blank page). TypeScript accepts a non-void return where `void` is
expected, so neither `tsc` nor lint flagged it — the browser run did. Fixed by
giving those effects block bodies. Lesson recorded rather than hidden: the
static checks are necessary, not sufficient.

## 7. Automatic lyrics for a new track (candidate request)

The candidate did not want to paste lyrics by hand for a new track.

**D7.1 — Source: LRCLIB (`lrclib.net/api/search`).** Free, no API key,
`access-control-allow-origin: *` (checked with curl and from inside the
browser), returns plain lyrics with track durations. Rejected: Musixmatch /
Genius APIs (keys, terms, and no CORS — would need a proxy in `apps/api`);
scraping (fragile, and not ours to scrape).

**D7.2 — Plain lyrics only; LRCLIB's synced lyrics are deliberately not
imported.** The brief: "there is no machine to guess it for you — the timings
are the thing you are building a tool to produce". Importing someone else's
timings would sidestep the exercise. Revisit only if the candidate decides
otherwise.

**D7.3 — What to search for comes from the file.** ID3v2.3/2.4 `TIT2`/`TPE1`
read in the browser from the first 256 KB (a ~50-line parser, unit-tested with
non-ASCII text); without a tag, "Artist - Title" is parsed out of the file name
(track numbers and "(Official Video)"-style suffixes dropped). Rejected: a tag
library (`music-metadata` and friends) — two frames are all that is needed.

**D7.4 — Auto-fill only a confident match; otherwise offer choices.**
Confident = length within 3 s of the audio, or the same title (normalised)
within 10 s. Ranking: closest length, then exact title. Duplicates (LRCLIB
holds one copy per album) are collapsed by normalised lyric text. When filled,
alternatives sit behind "Wrong song? Show N other matches". Guessed: the 3 s /
10 s thresholds — the first real check failed at 3 s alone because the test
file was 3.3 s longer than LRCLIB's record of the same song.

**D7.5 — The user's typing always wins.** Once the sheet is edited by hand, no
later lookup overwrites it. The paste box stays; the README explicitly allows
"their own lyric sheet", and a test track — e.g. another AI-generated song —
may simply not be in any database ("No lyrics found… paste them below").

**D7.6 — LRCLIB drops requests now and then** (seen in testing as
`net::ERR_FAILED` on roughly one request in three). Network errors, 429 and 5xx
are retried twice (0.7 s, 2 s); after that the dialog says it could not reach
LRCLIB and offers "Try again". Three consecutive real runs all ended correct
despite dropped requests.

**D7.7 — Privacy note:** the title and artist (never the audio) are sent to
lrclib.net when a file is picked. Acceptable for a tool whose user just asked
for exactly that lookup; stated in the dialog description.

**D7.8 — Revises D7.4 after the candidate's own track was not found.** The
candidate's file "Kendim ettim kendim buldum(Taha (Baş)" got "No lyrics
found" although LRCLIB has the song: the raw name, unbalanced parenthesis and
all, was sent as the title. Now:
- the search title is cleaned (`lib/searchTitle.ts`: bracketed and unbalanced
  parentheticals, "feat.", "- Live…" suffixes dropped; the form keeps what the
  file said);
- searches run as a plan — title + artist, then title alone, then LRCLIB's
  free-text `q` — and the first with results wins;
- **the same (cleaned, accent-insensitive) title now auto-fills at any
  length**, because a cover or another master has the same words; a length gap
  over 10 s is called out under the sheet ("probably another version, some words
  may differ"). A different title still needs a length within 3 s.
- the occasional failure seen earlier was LRCLIB's 429 rate limit (confirmed
  with curl); retries now wait 1 s then 3 s, and a final 429 says so.
Verified on the candidate's exact file name with a 3:10 file: filled from the
Erkin Koray recording (3:15), 24 lines, alternatives one click away.

## 8. Lyrics list navigation (candidate report: "double-click does nothing, every row says untimed")

**D8.1 — Double-click a line = go to it.** A timed line plays (as before). An
untimed line has no time, so it now jumps to where it most likely starts — 1.5 s
before the previous timed line ends, or the top — and plays on, with the line
focused, so the next Enter stamps it. Before, double-clicking an untimed line
did nothing, which on a fresh track (all lines untimed) made the list feel dead.

**D8.2 — Revises D3.6 (no auto-scroll to selection).** Aegisub's advice was
about its own timing loop; here the list is the main way to move around, and a
selection the timeline does not show reads as broken. Selecting a line now
scrolls its block into view if it is off screen — never while playing, when the
playhead owns the view. The playhead also pages into view after a seek while
paused, not only while playing.

**D8.3 — "untimed" on every row was noise.** Untimed rows now show a quiet
"—" (screen readers still hear "not timed yet"); the focused untimed row shows
an `Enter` key cap, i.e. "this is what Enter will stamp". With nothing placed
yet, the pane shows a two-line how-to (Space, Enter, double-click).

**D8.4 — Revises D8.1: never restart from the top.** The candidate reported
that double-clicking kept restarting the song. D8.1's fallback for an untimed
line with nothing timed before it was "jump to 0:00" — on a fresh track that is
every line, so every double-click rewound. That fallback was a guess dressed up
as navigation. Now an untimed line gets a *window* (after the previous timed
line, before the next) and `untimedSeek` decides: no window start → leave the
playhead where it is; already playing inside the window → leave it; otherwise
jump to the window start. Paused playback resumes from where it is. Timed lines
still restart their own audition on double-click — that is what "hear this
line" means. Verified: three double-clicks while playing on an untimed track
fired zero `seeking` events and playback advanced continuously.

## 9. "The lyrics don't flow" — timing pass button + opt-in LRCLIB draft

The candidate expected lyrics to flow and double-click to jump on a freshly
added track, Spotify-style. The agent explained that nothing is timed until
someone times it (the brief: "there is no machine to guess it for you — the
timings are the thing you are building a tool to produce") and asked rather
than decided. **The candidate chose "both"** (asked via a multiple-choice
question; recorded here as the candidate's decision, not the agent's).

**D9.1 — "Start timing" / "Continue from line N".** One button in the lyrics
pane focuses the first untimed line, puts the playhead where that line should
come round (top of the track on a fresh sheet — an explicit user action, not a
guess), and plays. From then on it is Enter per line; the lyrics flow behind
the stamps. The button disappears when every line is placed.

**D9.2 — Revises D7.2: LRCLIB's synced lyrics are offered as an opt-in draft.**
Off by default; ticking it creates the track with LRCLIB's line timings and
line breaks. The draft source is chosen separately from the sheet source: the
timed version of the same song closest in length to the user's audio, and it
is offered **only within 10 s** of that length. Further off, the dialog says
the timings belong to a different-length version and would not line up, and
points to Start timing. Weighed: offering any timed version "because some
timings beat none" — rejected after checking real data for the candidate's own
song: the nearest timed versions were 3:58 and 5:47 against a 3:10 file, i.e.
every line 50 s+ off; that is worse than no draft.
Risk accepted and stated: a grader may read imported timings as skipping the
exercise. Mitigations: it is opt-in, labelled with whose timings they are, and
irrelevant to the brief's own check (an AI-generated test track is unlikely to
be on LRCLIB, and the timing tools are the same either way).

**D9.3 — Draft construction** (`editor/draft.ts`, `lib/lrcParse.ts`, unit
tested): multiple stamps on one LRC line (repeated choruses) become separate
lines; an empty stamp ends the line before it (instrumental gap); each line
ends at the next stamp; nothing is placed past the end of the user's audio.
Built once on submit, so line ids are generated exactly once.

**D9.4 — Verified** with LRCLIB mocked to the exact shape the live API returned
for this song (the live API was rate-limiting the test runs): 3:10 file → sheet
filled, "timings only for a different-length version" shown; 3:58 file → draft
ticked → track opens 6/6 placed, double-click on line 5 seeks to 0:26 and
plays, karaoke shows the line.

## 10. Snap stamps to sound onsets (candidate asked "why isn't it automatic?")

The agent explained why full automatic alignment is out of scope — the README
says the timings are what the tool is for producing, forced alignment needs an
ML model (hundreds of MB in the browser, or Python on the server against
"Node 22 and pnpm, nothing else", or a paid cloud API that receives the audio),
and none of them is reliable on sung vocals under music. It proposed a
lighter, in-scope assist; **the candidate chose to stay within the README and
take the assist.**

**D10.1 — What it does.** On Enter, the stamp moves to the strongest sound
onset within 400 ms before / 150 ms after the key press (people tap late more
than early); with no onset in that window the stamp stays exactly where it was
pressed. The person still decides which line starts and roughly when; the
audio only sharpens the "exactly when". End stamps, typed times and drags are
not snapped (ends are not attacks; typed values are deliberate).

**D10.2 — How onsets are found** (`audio/onsets.ts`, unit-tested on synthetic
notes and steady noise): from the waveform peaks already computed for drawing —
no second decode — log-energy per 5 ms bucket, smoothed, rise over the previous
50 ms, local maxima above max(mean + 1.5 sd, a doubling), ≥ 80 ms apart. The
doubling floor was added after the first version reported 90 "onsets" in
steady noise. Rejected: true spectral flux via FFT (better on dense mixes, but
a second decode pass and ~10× the code for an assist).

**D10.3 — Measured on the seeded track:** 176 onsets in 2:05, median gap
640 ms, detection 8 ms. **Not measured, and stated plainly: accuracy against
vocal entries.** There is no ground truth to score against, and the detector
cannot tell a voice from a snare. That is why it is visible and reversible:
every snapped stamp says so and by how much ("Stamp line 1 at 0:10.325 ·
snapped −275 ms to the onset"), undo reverts it, onsets are drawn as ticks
under the waveform, and the magnet button / `O` turns it off. Default on,
because the candidate asked for the assist.

## 11. Playwright specs (phase 11)

**D11.1 — Five specs, each pinning one real interaction**, plus the provided
harness test, untouched: keyboard stamping pass (+ explicit end, undo label,
Alt+↓ reorder keeps timing); bulk shift by key / typed amount / to playhead,
one undo step; rejected save → take theirs → undo → save on their version, and
→ keep mine (asserts the exact sequence of versions sent: 0, 7, 8, 7); a track
we bring (generated 41.5 s WAV, file-name title, mocked LRCLIB fill, Start
timing, reload, LRC export contents); onset snap on generated audio whose note
starts are known exactly.

**D11.2 — Specs never touch the dev database.** The track GET is pinned to a
5-line untimed fixture and every PUT is answered by the test (`e2e/support.ts`);
the audio is still the real mp3 from the real API. LRCLIB is always mocked in
specs: the live API rate-limits, and a spec that depends on a third party's
mood is not a spec.

**D11.3 — Revises D1.5 (selection is not part of undo).** The stamping spec
caught it: after undoing a stamp, focus stayed on the *next* line, so Enter
re-stamped the wrong one. History entries now carry the selection from before
the edit and undo restores it. D1.5's worry — the selection jumping when
undoing a nudge — does not arise, because a nudge does not change the
selection, so the restored one is the same.

**D11.4 — Prettier config moved to the repo root** so `e2e/` is formatted like
the app (it had picked up Prettier's defaults); `pnpm check` now also checks
`e2e/`. The provided `track.spec.ts` was left byte-identical; the provided
`api.ts` gained one trailing comma from formatting, nothing else.

**D11.5 — Alt+↑ / Alt+↓ move the focused line** (keyboard counterpart of
drag-to-reorder), in `keyboard/lineCommands.ts`.

## 12. Measurements (phase 12) — what "smooth" and "fine at 10×" rest on

Reproduce with `pnpm dev` running, then `pnpm measure` (`scripts/measure-perf.mjs`).
Headless Chromium on the development MacBook, 2026-10-15; indicative, not a lab
benchmark. "10×" = a generated 20:50 track with 280 lines, all timed.
Interaction latency is key press → second animation frame, so ~33 ms means
"painted on the next frame".

| | seeded 2:05 / 28 lines | 10× 20:50 / 280 lines |
| --- | --- | --- |
| audio fetch | 48 ms | 61 ms |
| decode (off main thread) | 234 ms | 2.8–3.2 s |
| peaks (main thread) | 33 ms | 160–180 ms |
| onset detection | 2 ms | 10 ms |
| waveform redraw (scroll/zoom) | ~3 ms | p95 0.8 ms |
| nudge **all** lines (`]`) | ~32 ms | 44–51 ms |
| stamp one line (Enter) | 24–33 ms | 49–55 ms (first 81 ms) |
| playback frame interval, CPU 1× | p95 17.5 ms, no long tasks | p95 17.2 ms, no long tasks |
| playback frame interval, CPU 4× throttled | p95 17.6 ms, no long tasks | p95 17.6 ms, max 83 ms once, no long tasks |

**D12.1 — Conclusions the agent is willing to state:** playback stays at the
display rate at both sizes, even throttled 4×, because nothing re-renders per
frame (playhead/time are written to the DOM; React renders only when the
playing line changes). Edits at 10× cost roughly one extra frame. The waveform
draws only the visible window, so its cost does not grow with track length.

**D12.2 — Known cost, deliberately not fixed:** computing peaks for a 20-minute
track blocks the main thread for ~170 ms once, while the track opens (before
playback). Moving `computePeaks` to a Web Worker would remove it; at the
brief's scale (33 ms) it is not worth the extra moving part. Decode itself is
already off the main thread.

**D12.3 — 8.5 verified differently than planned.** Playwright could not observe
the browser's own leave-page prompt here — a control page with nothing but a
`beforeunload` handler did not produce one either, so it is the harness, not the
app. Verified instead by dispatching a cancelable `beforeunload`: not prevented
with no unsaved edits, prevented after an unsaved stamp. The handler also sets
the legacy `returnValue`, which some Chromium versions still require.

## 13. Final pass (phase 13.2) — gaps flagged, not rewritten

Entries above were not edited after the fact. This pass only flags what is
superseded, and records decisions that were made in code at the time but never
logged here. The latter are marked **late entry**: the reasoning is the one
the agent acted on, but it is being written down now, not then.

**Superseded:** D0.4 / D0.6 "nothing at runtime besides React" → D4.1 (Radix +
lucide). D1.5 "selection is not part of undo" → D11.3. D2.1 "Prettier scoped to
`apps/web`" → D11.4. D3.6 "no auto-scroll to selection" → D8.2. D7.2 "synced
lyrics never imported" → D9.2. D7.4 thresholds → D7.8. D8.1 "jump to the top"
→ D8.4.

**D13.1 (late entry) — Key map.** Enter / Shift+Enter stamp start / end;
`[` `]` nudge 50 ms, `{` `}` 500 ms (guessed: 50 ms is about the smallest
audible boundary error, 500 ms about a beat); ← → seek 2 s (Shift 5 s); `M`
move selection to playhead; `P` `B` `E` audition (D3.2); Space play/pause;
⌘Z / ⌘⇧Z / ⌘Y; ⌘S; `+` `−` zoom; `O` snap; Alt+↑↓ reorder; `?` help. All in
one table (`keyboard/*Commands.ts`) that also renders the help sheet. Keys are
ignored while typing and inside menus/dialogs (D6.1).

**D13.2 (late entry) — Lyric sheet parsing.** One non-blank line = one lyric
line; lines that are only a section label (`[Chorus]`, `(Verse 2)`, `# verse`)
are dropped because they are never sung; a lyric that merely contains brackets
is kept; duplicates are kept (`lib/lyrics.ts`, unit-tested).

**D13.3 (late entry) — Editorial checks are shown, never enforced.** Overlap,
timing against the list order, and running past the audio's end are flagged on
the row, the block and in the inspector, but nothing blocks an edit or a save —
the README calls them editorial questions, and the server allows them.

**D13.4 (late entry) — Merge and split keep timings sane.** Merge keeps the
earlier line's id and place, joins text in list order, and spans whichever
halves were timed. Split cuts the text at the cursor and the time at the
playhead when it is inside the line, else in proportion to the text; a half
shorter than 50 ms is left untimed rather than given an invented time.

**D13.5 (late entry) — Layout and look.** The wireframe's three panes (lyrics |
waveform + lane | inspector) with the karaoke strip under the timeline, because
it already matched the task's flow; a status line added at the bottom for "what
just happened / what undo will do". Neutral palette with one warm accent for the
playhead, stamping and primary actions; light/dark follow the OS. Blocks
alternate between two rows so back-to-back and overlapping lines stay
distinguishable. Zoom 10–400 px/s, default 60 px/s; snap distance 8 px on
screen. Guessed: those numbers; they are named constants.

## 14. Code review fixes (candidate ran `/code-review high` on the branch)

Two review passes reported 15 issues (unverified by the tool). The candidate
asked for all of them to be fixed without leaving the README's scope. Each was
reproduced or reasoned through first, fixed, and then checked in a browser by a
17-step script (all pass), plus the earlier 35-step regression script, 68 unit
tests (5 new) and the 6 Playwright specs.

**Data loss**
- **D14.1 — Local autosave could be lost** (400 ms timer cleared on unmount, no
  unload guard). Pending edits are now written at once on unmount (track
  switch), `pagehide` and `visibilitychange: hidden`. Verified: a stamp made
  just before switching tracks, and one made just before a reload, both survive.
- **D14.2 — A half-typed Inspector field was dropped** when a timeline block was
  clicked (pointerdown's preventDefault kept focus, the field unmounted without
  blurring). The block's pointerdown now blurs the active element first, so the
  field commits.
- **D14.3 — A kept end was overwritten one stamp later.** Re-stamping a start
  keeps a good end (D1.2), but the line was still marked "open", so the next
  stamp pulled that end. A kept end is no longer provisional. Unit-tested.
- **D14.4 — Revises D13.4 / the list drag: merge only with a neighbour.**
  Dropping on the middle of a distant row used to merge across the gap
  (scrambled text, one segment spanning everything between); it now moves the
  line there. The drop preview shows which will happen (the source row is
  tracked in `lineDrag.ts`, since dataTransfer is unreadable during dragover).

**Keyboard and interaction**
- **D14.5 — Revises D6.1: Enter/Space on a control reached by Tab activate it.**
  D6.1 sent Enter/Space to stamping/playback even on a focused button, which
  made buttons unusable from the keyboard. Now: a control the pointer just
  focused leaves Enter/Space to the editor (click Save, keep timing with Enter);
  a control reached with Tab gets them. `:focus-visible` was tried first and
  failed in the browser check — Chromium turns it on at the key press — so the
  hook tracks the pointer-focused control itself.
- **D14.6 — The speed select kept focus** and swallowed Space/Enter; it now
  hands focus back after a change.
- **D14.7 — Cmd+S follows the Save button's rules** (nothing to save, a save in
  flight, or an open conflict → do nothing), and commits a focused field before
  saving, so text typed and not yet blurred is included. The save reads the
  latest doc from a layout-effect ref for exactly that case.
- **D14.8 — Scrubbing drifted from the pointer.** Two causes: a stale bounding
  box (now measured on every move) and the playhead follow scrolling the view
  under a still pointer (follow is paused while scrubbing).

**Lyrics lookup**
- **D14.9 — "Use" on another match, and clearing the sheet, now stick.** Each
  lookup result may auto-fill at most once, and never over the user's own pick
  or typing.
- **D14.10 — Revises D7.8: the same title alone is not enough.** A same-title
  match auto-fills only when the artist does not contradict it (either side
  unknown, or they share a real word). The candidate's own case (no artist) is
  unchanged; "Hello" by a mistyped Lionel Richie no longer fills Adele's lyrics.
- **D14.11 — Revises D13.2: sung lines in parentheses are kept.** Only
  label-like parentheticals ("(Chorus x2)", "(Pre-Chorus)", "(x2)") are dropped;
  "(Ooh, baby)" is a backing vocal and stays.
- **D14.12 — ID3 "UTF-16 with BOM" honours a big-endian BOM** instead of
  assuming little-endian.

**Robustness and cleanup**
- **D14.13 — No more unguarded `crypto.randomUUID`.** It does not exist over
  plain http on a LAN address (e.g. the docker-compose setup reached by IP),
  which made creating a track — the pass/fail path — throw. One guarded
  `shortId()` in `lib/ids.ts` is used everywhere. Verified with randomUUID
  deleted in the page.
- **D14.14 — One `selectionSpan` helper** replaces four copies of the same
  min-start/max-end calculation.
- **D14.15 — The audio-URL check waits for typing to pause** (500 ms; a picked
  file is still checked at once). Verified: typing a URL fires one request.

## 15. Wireframe alignment (candidate: "add what is missing, keep our extras")

The README says the wireframe is not a contract; the candidate chose to adopt
its missing feedback affordances while keeping additions that serve speed.
Done so far (CSS only): trim handles always visible on blocks; a grip on the
playhead; placed lines recede in the list, lines still to place stand out.
Still to do: snap guide line while dragging; "origin" ghost of a dragged block;
"N segments selected" frame on the lane; always-open paste box with "Add all
lines" / "+ Add line"; "LINES · N / M placed" header; "Load song" and an
"Export LRC" primary button; Inspector titled "Segment" with a read-only
duration box. Kept on purpose: two-row lane (D13.5), no Confidence field
(README), Start timing, onset snap, speed, TTML.

**D15.1 — Completed.** Added after the first CSS pass:
- While dragging: a dashed **"origin"** ghost where the moved blocks started
  (on the block's own row), and a dashed **"snap"** guide through the ruler and
  waveform at the edge that caught (`snapMove` now also returns where it
  snapped; `LaneOverlays.tsx`). A multi-line selection gets a dashed frame
  labelled **"N segments selected"**.
- Lyrics pane: the paste box is always open, with **"Add all lines"** (appends)
  and **"+ Add line"** (inline field, after the focused line); "Replace all"
  stays as a small secondary action. A **"LINES · N / M placed"** header sits
  above the list.
- Top bar: **"Load song"** (the track menu, which also holds "New track from
  your audio…") and a one-click **"Export LRC"** with other formats behind a
  chevron.
- Inspector: titled **"Segment"**, a read-only **duration box**, and the
  wireframe's actions first (Merge with next, Split, Delete); Play and Clear
  timing below a rule.
- Guessed: once a timing pass is under way, the "Start timing" how-to shrinks
  to its button, because with the always-open paste box the list otherwise
  showed only about a dozen lines.
Verified: 68 unit tests, 6 Playwright specs (one updated for the export
button), the 35- and 17-step browser scripts, and screenshots of a drag
(ghost, snap guide) and a selection (frame).

**D15.2 — The "N segments selected" label stays on screen.** It was pinned to
the frame's left edge, so a selection starting left of the visible area hid
it. The lane now receives the viewport's left edge and slides the label right
to stay visible, never past the frame's own end. Verified with the frame
scrolled 150 px off the left edge: label fully visible.

## 16. Export formats checked by independent tools (candidate asked whether they really work)

**D16.1 — Export now checked by tools that are not ours.** The README lists
LRC export as an idea, TTML not at all (D3.5). Checking an export with our own
parser proves little, so `src/lib/exporters.tools.test.ts` writes real files and
reads them back with **ffmpeg's LRC demuxer** (converted to SRT: every cue time,
the blank stamp that closes a gap, untimed lines left out) and **xmllint**
(well-formed TTML, namespaced title, escaped text, one `<p>` per timed line).
Both are skipped with the reason shown when the tool is not installed — the
README promises "Node and pnpm, nothing else" — and that skip was verified with
a PATH holding only node.
**D16.2 — TTML fix found by that check:** the title was a bare `<title>` inside
`<metadata>`; TTML puts metadata in the `ttm` namespace. It is now `<ttm:title>`
with `xmlns:ttm` declared. Known limit, stated: LRC stores centiseconds, so
26.123 s exports as 26.12 s; Apple's own TTML validator is not public, so
acceptance by Apple Music is not proven, only conformance to the format.

## 17. Resizable side panes (candidate request)

**D17.1 — Lyrics and Inspector panes resize** by dragging the divider next to
them, or from the keyboard (Tab to the divider, ←/→, Shift for bigger steps);
double-click restores the default. Widths are clamped (240–600 px lyrics,
240–520 px inspector), never squeeze the timeline below 360 px, and are
remembered in this browser (`localStorage`, wrapped so a blocked storage just
means defaults). The dividers are `role="separator"` with aria values; their
arrow keys are consumed so they do not also seek the track. Below 1100 px the
existing stacked layout applies and the dividers are hidden. Verified in a
browser: drag, keys (track position unchanged), reload, reset, extreme drags.

## 18. Desktop-focused, on purpose (candidate's decision)

**D18.1 — Not a mobile editor.** Measured at 768 px and 390 px: tablet is
usable but cramped (title collapses, the lyric list is pushed off screen);
phone is broken (top bar overlaps, timeline ~110 px). The interaction model is
also desktop by nature — stamping is the Enter key, and list drag-and-drop uses
native HTML5 DnD, which iOS/Android do not support (block drags on the timeline
do work with touch). The agent offered two small fixes (stacked narrow layout,
an on-screen Stamp button); **the candidate chose to keep it desktop-focused**
and say so, since the README asks for none of it and fine timing on a phone
waveform is not where the time savings are.

## 19. Final polish (candidate: "professional FE touches — last fixes")

Driven by audits rather than taste:
- **D19.1 — axe-core** (loaded only into an audit script, not a project
  dependency) over the editor, the shortcut sheet and the new-track dialog, light
  and dark. Found: 4 colour-contrast failures in the light theme (orange text and
  white-on-orange buttons at 3.2:1, warning text at 3.6:1) and 2 scrollable
  regions not reachable by keyboard (lyric list, timeline). Fixed: text-safe
  colours (all ≥ 4.5:1, computed), and both scroll areas are focusable with a
  label. Result: 0 violations in both themes. No console warnings in a full flow;
  the two "aborted" requests are StrictMode's deliberate double effect and the
  media element's own range requests.
- **D19.2 — Error boundary.** A render error now shows "Something went wrong"
  with Reload instead of a blank page (the D6.2 crash showed what that looks
  like). Local tracks lose nothing — the unmount flush (D14.1) writes them.
- **D19.3 — Stored data is validated** before use: a corrupted local track now
  fails to load with a clear message instead of crashing the editor (found by
  testing the boundary with a deliberately broken record).
- **D19.4 — Small things that tell:** the tab title names the song and marks
  unsaved server edits ("• You Verse You — Lyric Alignment"); a favicon; a meta
  description; reveal-scrolling respects `prefers-reduced-motion`.

## 20. Visual language from conversion.al (candidate request)

**D20.1 — Inspired by, not copied from, the company site.** Measured from the
live page (computed styles + screenshots): warm off-white background, near-black
ink, orange primary, teal stat chips, heavy headings, rounded controls with a
soft glow, letter-spaced labels, a faint grid. Applied as `tokens.css` (colours,
light and dark) and `brand.css` (a removable layer loaded last). **Not used:**
the company's logo or name — a mark of our own (a waveform glyph) sits in the
top bar; using theirs would be impersonation, not inspiration.
**D20.2 — Accessibility over fidelity where they conflict.** The site sets
white text on its bright orange (#f97316, 2.8:1). The editor uses the brand's
deeper orange (#c2410c, 5.2:1) for anything with text and keeps the bright one
for glows, tints and onset ticks. The faint grid went where a grid means
something — the time lane. The karaoke line borrows the site's headline
treatment (heavy, ink fading to orange). axe: still 0 violations, both themes.

## 21. Light / dark choice in the UI (candidate request)

**D21.1 — A theme button: follow the system → light → dark.** The app only
followed the OS. Now `data-theme` on `<html>` pins light or dark (absent =
system), set from a top-bar button (icon shows the current choice, tooltip says
what a click does) and remembered in this browser. A tiny inline script in
`index.html` applies the saved choice before first paint, so a dark choice never
flashes light on reload. Dark tokens apply for `data-theme="dark"`, or for the
OS preference when nothing is pinned; `color-scheme` follows, so native controls
match. Verified: cycling, persistence (attribute set before the app mounts),
and "light" overriding a dark OS.
**D21.2 — Bug found while verifying: the waveform never used the theme.** A
`--wave: var(--wave)` rule on the canvas referenced itself, which CSS treats as
invalid, so the canvas always fell back to `#888`. Removed; the canvas now
reads the theme's colour and redraws on any theme change (a small
`useThemeVersion` signal from a MutationObserver plus the OS media query).
Checked by reading canvas pixels: #a19d94 light, #5b5b66 dark.

## 22. Network layer review (candidate asked: "did you use axios?")

**D22.1 — No axios, on purpose.** The scaffold ships a ~40-line `fetch` wrapper
(`api.ts`, "already wired" per the README); there are two API endpoints plus
LRCLIB and the audio file. axios would add a dependency for features not needed
here (interceptors, transforms, older-browser support). Also considered and
rejected: TanStack Query — caching and refetching do not apply to one GET and
one versioned PUT whose conflicts must be decided by the user.
**D22.2 — What the review found missing, and fixed:**
- **No time limit.** `fetch` has none, so a server that never answered left a
  save "Saving…" forever with the Save button locked. Every API call now has a
  15 s limit (combined with the caller's own abort signal); running out throws
  `ApiTimeoutError`, which the save turns into "The server did not answer
  within 15 s… your edits are still here" with Retry. A caller's abort (track
  switch) stays an abort, not a timeout. Browser-checked: a PUT that never
  answers gives up at 15.5 s, edits kept, Retry enabled.
- **No runtime validation.** Responses were trusted via `body as T`. Small
  hand-written guards in `wire.ts` (`isWireTrack`, `isWireState`, and a 409 is
  only reconcilable when it carries a usable state) check shape, integer
  milliseconds and the one float (`duration_seconds`) at the boundary. A
  malformed GET now shows "The server answered in an unexpected shape" instead
  of failing later; a malformed save reply is reported, not trusted. Rejected:
  zod — two shapes do not justify a runtime dependency.
`api.ts` is scaffold code; the README says "it is your code", and the changes
keep its contract (ApiError with status and body) intact. 7 new unit tests.

## 23. Loading and empty states (candidate: "check them, skeletons, the modern way")

Measured first, with the track GET delayed 2 s and the audio 3 s:
- Waiting for the track showed a lone "Loading track…" in an empty page; the
  whole editor then appeared at once.
- Waiting for the audio showed "Drawing waveform…" in a corner of an empty wave
  area (3 s+, and ~3 s of decode for a 20-minute track, §12).
- Before CSS/JS, the page was the browser's default background (a white flash
  is possible in dark mode while JS loads — the dev server's unbundled modules
  made that visible: 8 s blank on a throttled network).

**D23.1 — Skeletons that are the real layout.** `AppSkeleton` renders the
editor's own grid and pane classes (top bar, lyric rows, ruler + waveform,
inspector) with fixed widths, using the user's saved pane widths, under
`role="status"` / `aria-busy`; the waveform area gets bars tinted with the
waveform colour while audio loads or decodes. Shimmer is slow and stops under
`prefers-reduced-motion` (global rule). Screen readers still hear the loading
text (visually hidden).
**D23.2 — Stated honestly: this is not a CLS fix.** Cumulative Layout Shift was
already 0 (the loading text was replaced, nothing existing moved) and is still
0 after, light and dark. The gain is orientation — the user sees where things
will be from the first frame — not a metric.
**D23.3 — Theme background before anything loads.** An inline `<style>` in
`index.html` sets the light or dark background (honouring a saved choice and
the OS), so there is no white flash before the CSS arrives. Checked: the
background is the theme colour at DOMContentLoaded in both themes.
**D23.4 — Left as they are, on purpose:** the lyric lookup keeps its one-line
"Looking up lyrics…" status (it is fast, and a skeleton inside a text field
would suggest text that may not come); empty states (no lines yet, nothing
selected, nothing timed) already say what to do next.

**D23.5 — Timeline cursor (candidate report: "looks like a text cursor").** The
ruler and waveform had `cursor: text` - an I-beam over something that is not
text. They now show a pointer (click to seek), and `ew-resize` for the whole
duration of a scrub, even when the pointer wanders off the timeline (a body
class set on pointerdown, cleared on release).

**D23.6 — Scrubbing selected text (candidate report).** Dragging along the
ruler/waveform started a native text selection, highlighting the ruler's
numbers and nearby labels. The scrub's pointerdown now prevents that default
(as block drags already did), the timeline content is `user-select: none`
(nothing there is meant to be copied), and so is the page while a scrub is in
progress. Preventing the default also stops focus moving, so - as for blocks
(D14.2) - a half-typed Inspector field is blurred, and committed, first.
Checked: zero selected characters while scrubbing (also off the timeline) and
while dragging a block; typed text committed.

## 24. Completeness check (candidate asked: "is everything in decisions?")

Checked by listing every change made in the session against this file. Three
were missing; they are recorded here as **late entries** — the reasoning is
what the agent acted on at the time, written down now.

**D24.1 (late entry) — Layout: flex column, not grid rows.** The first layout
put the top bar, an optional banner, the workspace and the status line in grid
rows; with no banner, the rows shifted and the status line was pushed off the
bottom of the screen. Switched to a flex column (found in the first screenshot
checkpoint).

**D24.2 (late entry) — An untimed field says "untimed".** The Start field of an
untimed line showed a `0:00.000` placeholder, which read as a real value. It
now shows "untimed" until there is a time.

**D24.3 (late entry) — Help sheet key caps.** Key caps stretched to the height
of a wrapped description, turning into tall bars; they now keep their own
height (`align-items: flex-start`).

**D12.4 — Re-measured on the final UI (2026-10-16),** after the overlays,
theme, skeletons and network changes, same script (`pnpm measure`):

| | seeded 2:05 / 28 lines | 10× 20:50 / 280 lines |
| --- | --- | --- |
| decode / peaks / onsets | 167 / 22 / 1 ms | 1911 / 102 / 6 ms |
| nudge all lines | 31–34 ms | 34–43 ms |
| stamp one line | 21–33 ms | 34–57 ms |
| playback frame p95, CPU 1× / 4× | 17.2 / 17.5 ms, no long tasks | 17.4 / 17.5 ms, no long tasks |

The §12 conclusions still hold; nothing added since made playback or edits
slower (the 10× edits are slightly faster than the first measurement).

**D15.3 — Selection scope at the foot of the Inspector (candidate request).**
As in the sketch: "2 segments selected — edits apply to both" ("N lines
selected — edits apply to all N" when some are untimed), pinned to the bottom of
the pane; the same sentence was removed from the top so it is not said twice.
Kept different from the sketch on purpose (candidate's call): no drag shadow,
no "Zoom" text label, durations and list times with milliseconds.
Follow-up (candidate report): the heading still said "2 lines selected" above a
footnote saying "2 segments selected". Both now use one word — "segments" when
every selected line is timed, "lines" otherwise; the Delete button keeps
"lines" because it deletes lines.
Final wording (candidate: "decide"): **"lines" everywhere** — the Inspector
heading, its footnote, the Delete button and the lane frame all say "N lines
selected". A selection is always of lines (some may be untimed), and "Delete
2 segments" would wrongly suggest only the timing goes; "Clear timings" is the
action for that. The sketch's "segments selected" came from an example where
every line was timed.

## 25. Hosted demo (candidate request: "deploy it so it can be viewed directly")

**D25.1 — Render, one web service; not Vercel.** The editor needs the API for
the seeded track, its audio and the save/409 flow. The API is a long-running
Node server on `node:sqlite`. Vercel runs serverless functions with no shared
writable disk, so the API would have to be rewritten as functions and saves
would land on throwaway per-instance storage. Hosting only the frontend there
would open on an error, because the seeded track could not load. A
frontend-on-Vercel / API-on-Render split works but means two hosts and two
configs for no gain. The candidate agreed on Render.

**D25.2 — `scripts/serve-demo.mjs` instead of changing the API.** It starts the
unchanged API as a child process on a private port, serves `apps/web/dist`
(fingerprinted `/assets` cached for good, the shell `no-cache`, unknown paths
fall back to the shell) and forwards `/api` to the API. This is the same
single-origin setup the Vite proxy gives in development, so the frontend needs
no build-time API URL. No dependencies. If the API exits, the script exits too,
so the host restarts the whole service instead of serving a half-working app.
A path that escapes `dist`, including encoded `..` and malformed escapes like
`%E0` (which first crashed the server; caught before commit), gets the shell,
not a file or a crash.

**D25.3 — What the free plan means, accepted.** The service sleeps when idle
(the first visit takes about a minute), and the SQLite file is not persistent:
a restart reseeds the track. All visitors share one server alignment, so two
people saving see the 409 flow, which is a fair demo of it. Tracks visitors
bring stay in their own browser, as locally.

Checked locally against the production build: all 6 Playwright specs pass
against the demo server (baseURL :8080), no console errors, audio range
requests answer 206, and requests without a token get 401 through the proxy.

## 26. The candidate's own single in the track menu (candidate request)

**D26.1 — One click, through the same path a dropped file takes.** "Try:
Kendim Ettim Kendim Buldum · Taha Baş" sits second in the Load song menu, under
the seeded track (the candidate's placement). Clicking it fetches
`/samples/kendim-ettim-kendim-buldum.mp3` into a `File` and opens the New track
dialog with it, exactly as dropping that file would: title and artist from its
ID3 tag, lyrics looked up on LRCLIB. No special case in the dialog, so the
sample demonstrates the real bring-your-own-track flow rather than a shortcut
around it. A note covers the download (30 s timeout, error shown).
Not chosen: shipping it as a ready-made local project, which would skip the
flow the brief treats as pass/fail; preloading it on first visit, which would
hide the seeded track.

**D26.2 — MP3, not the 46 MB WAV.** Converted with ffmpeg to 160 kb/s MP3
(5.3 MB, 4:23) and given the ID3 tags the dialog reads. It lives in
`apps/web/public/samples`, so Vite serves it in development and copies it into
`dist` for the demo. The API is still unchanged.

**D26.3 — No MIT licence; the recording is all rights reserved.** The
candidate asked for "MIT, so the song isn't taken". MIT would do the opposite:
it grants everyone the right to reuse. The repo also contains the company's
scaffold, which is not the candidate's to license. So there is no licence file
(default copyright), and `samples/NOTICE.md` states the recording is © the
candidate, all rights reserved, included only for the demo. The song itself is
by Neşet Ertaş. A notice cannot stop a download of audio the browser plays.

**D26.4 — LRCLIB has no entry under the candidate's name.** The dialog lists
other artists' versions to "Use" and says their timings would not line up
(different length), so timing is done with Start timing. During the check
LRCLIB briefly answered 503; the dialog showed "Try again / paste the lyrics".
Bundling a lyric sheet with the sample was considered and left out for now.

Checked: `pnpm check` (77 unit tests), 7/7 Playwright including the new
`e2e/sample-track.spec.ts` (tags in the dialog, LRCLIB mocked), and by hand on
the production build against live LRCLIB (no console errors).
