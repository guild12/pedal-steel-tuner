# Session State — Pedal Steel Tuner

## Current task

**Phase 1 merged to main locally (2026-11-08 09:46 PST), not pushed.** 128 tests pass and the build is green. Pushing `main` deploys the site, so it needs Gabe's explicit OK. Then comes plan Task 8 (`docs/superpowers/plans/2026-11-08-phase-1-the-tuner.md`): confirm the deploy, then Gabe runs CP1–CP3 at the steel. Results go in `docs/phase-1-results.md`.

- **Phone checks owed:**
  - Offline relaunch: open the Home Screen app online twice before airplane mode, and force-quit and relaunch after each deploy.
  - Export through the share sheet. If it fails silently, it needs a fallback (parked).
  - No zoom when an input gets focus.
- **Deferred minors** (the scratch ledger was deleted, so this is the record):
  - Settings re-renders every frame.
  - No build version is shown on screen.
  - The waterfall is a bit blurry.
  - E#/B# are accepted in the open-note field.
  - The drop wizard can show "Pluck again" while a note is still settling.
  - Export filenames aren't sanitized.
  - The sw.test 404 test is vacuous: its mock has no `ok`.
- **Still open from the PRD:** OQ1 (rules for the B6 lock), OQ3 (P5 and the lock lever), OQ4 (the 14.49 value).

## Log

- **2026-11-08 09:46 PST**: Phase 1 built subagent-driven (Tasks 1–7, a final opus review, one fix wave) and fast-forward merged to main. 19 rulings were reported to Gabe in chat. Branch `phase-1-tuner` deleted.
- **2026-11-08 02:29 PST**: Phase 0 Tasks 1–3 done, 38 tests passing. The final review caught noise sensitivity (fixed with a 1 kHz low-pass) and a misleading Steadiness readout (fixed). Known and deferred to Phase 1: the low strings may read a few cents sharp because overtones pull the detector (inharmonicity); the test sheet treats that as a known limit, not a Safari fail. **Gotcha:** the browser pane pauses animation frames when the app window isn't in view, so check the page with a timer-driven harness.

- **2026-11-08 01:57 PST**: PRD approved and the Phase 0 plan written. Not a git repo yet; plan Task 1 runs `git init`. Creating GitHub repo `guild12/pedal-steel-tuner` and pushing need Gabe's explicit words (plan Task 4).
- **Gotcha:** don't open files under `~/Library/CloudStorage/OneDrive-Personal` that are online-only (`ls -lO` shows `dataless`). Reading `Pictures/sierra 14 copedent.jpg` crashed the session twice. Gabe's own copedent isn't in his visualizer app either (its copedents live in browser storage, and he never entered it). The seed copedent is the Sierra factory chart in `reference/`.
- **2026-11-06 → 08 brainstorm**: French calculator found at pedalsteel.fr/tuning/ (formula in `reference/copedent-and-formula.md`); gauge option C chosen; chord analyzer and MIDI parked in `IDEAS.md`.
