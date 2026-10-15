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
