# Phase 1 — The Tuner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 0 test page with the real tuner. It covers Gabe's Sierra 14 profile, two gauges (pedals up and A+B down) with waterfalls, auto-detect plus lock, cabinet drop measurement, plain editing, export, and offline install, so that CP1–CP3 pass at the steel.

**Architecture:**
- **Pure core:** `src/pitch/*` (kept from Phase 0) and a new `src/model/*` for the profile types, seeds, target math and storage. Both are test-first.
- **Audio engine:** `src/audio/engine.ts` is the Phase 0 page's audio logic, made into a class.
- **UI:** React components in `src/ui/*`, with one tuner screen and one settings screen.
- **Offline:** a hand-written service worker. No PWA plugin, because Vite 8 compatibility is unverified.

**Tech Stack:** TypeScript ~5.9.3, Vite ^8.0.3, Vitest ^4.1.1. Added in this phase, matched to `guild12/pedal-steel-visualizer`: react/react-dom ^19.2.4, @vitejs/plugin-react ^6.0.1, tailwindcss and @tailwindcss/vite ^4.2.2, @testing-library/react ^16.3.2, @testing-library/jest-dom ^6.9.1, @testing-library/user-event ^14.6.1, jsdom ^29.0.1, @types/react ^19.2.14, @types/react-dom ^19.2.3.

**Spec:** `PRD.md` (approved). Phase 0 findings and carry-overs: `docs/phase-0-results.md`. Copedent source: `reference/copedent-and-formula.md`.

## Global Constraints

- **T** = 14.49¢. **c** = the profile's cabinet drop in cents, one decimal place. **A reference** defaults to 440 Hz and is editable from 430 to 450.
- **Gauge targets:** pedals up = `noteTable[note] + c`; A+B down = `noteTable[note]` (PRD §4.2).
- **Lock target rules:** `up` = `noteTable + c`; `down` = `noteTable`; `cents` = a fixed number.
- **Gauges:** circle, top dead center = on target, ±20¢ spread over ±150°, a waterfall inside each, labels exactly **"Pedals up"** and **"A+B down"** (mockup option C).
- **No screen taps between strings** while tuning (CP1). The lock is optional.
- **Offline:** after the first load, everything works in airplane mode.
- **Storage:** stored on the device, plus export to one human-readable JSON file. No accounts and no server.
- **Not in Phase 1:** multiple profiles UI, import, the visualizer format, sharing, chord features.
- **Git:** work on branch `phase-1-tuner`. Merging to `main` and pushing need Gabe's explicit words, because pushing `main` deploys.

## Review Focus

1. **No cabinet drop yet (c = 0).** Both gauges show the same target and still work, and the screen shows a "Measure cabinet drop" hint. This is pinned in Task 4.
2. **A detected note with no copedent position** (for example C, while tuning something odd). The gauges still show the note table's targets, with no crash and no blank screen. This is pinned in Task 4.
3. **Corrupt or old saved data.** The app falls back to the Sierra seed, keeps the bad data under a backup key, and doesn't crash. This is pinned in Task 6.
4. **Measuring cabinet drop with no steady reading** (the string isn't ringing, or the reading jumps). The wizard refuses to save and asks to pluck again. This is pinned in Task 5.
5. **The A reference changed mid-session.** Readings and targets update immediately, with no reload. This is pinned in Task 4.

---

### Task 1: React scaffold and audio engine

**Files:**
- Modify: `package.json`, `vite.config.ts` (add React and Tailwind plugins), `tsconfig.json` (`"jsx": "react-jsx"`), `index.html` (`/src/main.tsx`)
- Create: `src/main.tsx`, `src/ui/App.tsx`, `src/index.css` (`@import "tailwindcss";` plus the dark background), `src/audio/engine.ts`, `src/test-setup.ts` (jest-dom), and vitest config (`environment: 'jsdom'`, `setupFiles`)
- Delete: `src/main.ts`, `src/gauge.ts`, `src/gauge.test.ts`, `src/stats.ts`, `src/stats.test.ts` (the Phase 0 page; `src/pitch/*` stays)

**Interfaces:**
- Produces:
  - `interface Frame { frequency: number | null; clarity: number; rms: number; timeMs: number }`
  - `type EngineStatus = 'idle' | 'running' | 'interrupted' | 'blocked' | 'insecure' | 'error'`
  - `class TunerEngine { constructor(onFrame: (f: Frame) => void, onStatus: (s: EngineStatus, detail?: string) => void); start(deviceId?: string): Promise<void>; stop(): void; inputs(): Promise<{ id: string; label: string }[]>; readonly sampleRate: number | null; readonly inputLabel: string }`

- [ ] **Step 1:** Run `git switch -c phase-1-tuner`. Install the dependencies listed in Tech Stack. Delete the Phase 0 page files.
- [ ] **Step 2: Port `src/main.ts`'s audio logic into `TunerEngine`.** Keep all of it:
  - `getUserMedia` constraints off; analyser `fftSize` = next power of two ≥ `requiredSamples`; detect on the newest `requiredSamples` samples.
  - `devicechange` refresh; `statechange`, `mute`, `ended` and `visibilitychange` → status `'interrupted'`.
  - Wake Lock, with the release listener.
  - The blocked and insecure messages move into the UI.
  - Loop via `requestAnimationFrame`. Each frame calls `onFrame`, with `frequency: null` when `detectPitch` returns null.
- [ ] **Step 3:** `App.tsx` renders a placeholder: a Start button that starts the engine and shows the raw note from `noteFromFrequency`.
- [ ] **Step 4: Verify.**
  - `npx vitest run`: the `src/pitch` tests (≈31) pass.
  - `npm run build` succeeds.
  - Check by hand with the timer-driven harness from Phase 0 (override `requestAnimationFrame` with `setTimeout`, inject an oscillator as `getUserMedia`): 82.407 Hz → E2.
- [ ] **Step 5:** Commit `feat: React scaffold and audio engine`.

---

### Task 2: Profile model, seeds and target math

**Files:**
- Create: `src/model/types.ts`, `src/model/targets.ts`, `src/model/seeds/sierra14.ts`, `src/model/seeds/french10.ts` (a test fixture and an optional future preset)
- Test: `src/model/targets.test.ts`, `src/model/seeds.test.ts`

**Interfaces:**
- Consumes: `NoteName`, `noteFromFrequency` (`src/pitch/notes.ts`)
- Produces:
  - `type TargetRule = { kind: 'up' } | { kind: 'down' } | { kind: 'cents'; cents: number }`
  - `interface ChangeStop { semitones: number; target: TargetRule }`: semitones are relative to the open note. A half-stop change has two stops, half first.
  - `interface StringChange { control: string; stops: ChangeStop[]; requires?: string[] }`: `requires` lists controls that must be held too (e.g. the B6 lock).
  - `interface StringConfig { number: number; openNote: string; openTarget: TargetRule; changes: StringChange[] }`: `openNote` is like `'G#4'`.
  - `interface Control { id: string; kind: 'pedal' | 'lever'; latching?: boolean }`
  - `interface Profile { id: string; name: string; controls: Control[]; strings: StringConfig[]; cabinetDrop: number; aRef: number; noteTable: Record<NoteName, number> }`
  - `const T = 14.49`
  - `frenchNoteTable(): Record<NoteName, number>` → E, B, F#, G, A, D, C, A# = 0; G#, D#, C# = −T; F = −2T
  - `ruleCents(rule: TargetRule, note: NoteName, p: Profile): number`
  - `gaugeTargets(note: NoteName, p: Profile): { up: number; down: number }`
  - `positionTarget(p: Profile, stringNumber: number, change: string | null, stop?: number): { note: string; cents: number }`: `change` null means the open string; `note` is like `'C#4'`.
  - `positionsForNote(p: Profile, note: NoteName): { string: number; change: string | null; stop: number; cents: number }[]`
  - `const sierra14: Profile`, `const french10: Profile`

- [ ] **Step 1: Write the failing tests.**

`targets.test.ts`, the French reproduction. This is the PRD's required test and must check per change, not per gauge:

```ts
for (const c of [0, 5, 10.3]) {
  const p = { ...french10, cabinetDrop: c }
  const expected: [number, string | null, number][] = [
    [1, null, c], [1, 'RKR', c - T],
    [2, null, c - T], [2, 'LKR', 0], [2, 'RKR', c],
    [3, null, c - T], [3, 'B', 0],
    [4, null, c], [4, 'LKL', -2 * T], [4, 'C', -T], [4, 'RKL', c - T],
    [5, null, c], [5, 'A', -T], [5, 'C', -T],
    [6, null, c - T], [6, 'B', 0],
    [7, null, c], [7, 'RKR', c],
    [8, null, c], [8, 'LKL', -2 * T], [8, 'RKL', c - T],
    [9, null, 0],
    [10, null, c], [10, 'A', -T],
  ]
  test(`French chart reproduced at c=${c}`, () => {
    for (const [s, ch, cents] of expected) expect(positionTarget(p, s, ch).cents).toBeCloseTo(cents, 6)
  })
}
test('gauges: open E with c=5 → up 5, down 0', () => expect(gaugeTargets('E', { ...french10, cabinetDrop: 5 })).toEqual({ up: 5, down: 0 }))
test('gauges: C# → up c−T, down −T', () => { const g = gaugeTargets('C#', { ...french10, cabinetDrop: 5 }); expect(g.up).toBeCloseTo(5 - T); expect(g.down).toBeCloseTo(-T) })
test('positionsForNote finds F# from P3 on the Sierra with its override', () =>
  expect(positionsForNote(sierra14, 'F#')).toContainEqual({ string: 5, change: 'P3', stop: 0, cents: -14.49 }))
test('half-stop: Sierra RKR on string 3 → D then C#', () => {
  expect(positionTarget(sierra14, 3, 'RKR', 0).note).toBe('D4')
  expect(positionTarget(sierra14, 3, 'RKR', 1).note).toBe('C#4')
})
```

`seeds.test.ts`:
- Sierra has 14 strings with open notes G#4 F#4 D#4 G#4 E4 B3 G#3 F#3 E3 B2 G#2 E2 B1 E1.
- Sierra has 15 controls: P1–P8, LKL, LV, LKR (`latching: true`), ILKL, ILKR, RKL, RKR.
- Every `requires` names an existing control.
- The P6 changes on strings 5 and 9 require `['LKR']`.

- [ ] **Step 2:** Run `npx vitest run src/model`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement `types.ts`, `targets.ts` and both seeds.**

  **`french10`:**
  - Open strings: F#4 D#4 G#4 E4 B3 G#3 F#3 E3 D3 B2.
  - Controls: A, B, C (pedals); LKL, LKR, RKL, RKR (levers).
  - Changes follow the French chart in `reference/copedent-and-formula.md`. Each change's rule is set so the test above holds: E→F = `down`; D#→D = `down`; C-pedal E→F# = `cents −14.49`; A/B/C pedals = `down`; RKL→E♭, RKR→E/G/G# = `up`.
  - Open target: `up` on every string except string 9 (D) = `down`.

  **`sierra14`** (semitones are relative to the open note):

  | String | Changes |
  |---|---|
  | 1 | none |
  | 2 | P5 +1 |
  | 3 | RKR stops −1 then −2 |
  | 4 | P2 +1, P7 +1 |
  | 5 | LKL +1, LV +2, LKR −1, P3 +2, P6 0 (requires LKR) |
  | 6 | P1 +2, P3 +2, ILKL +2, RKL −1 |
  | 7 | P2 +1, ILKL +2, P4 +2, P7 +1 |
  | 8 | ILKR +1, P5 −1 |
  | 9 | LKL +1, LKR −1, P6 −2 (requires LKR) |
  | 10 | P1 +2, P8 +1, RKL −1, RKR +3 |
  | 11 | P2 +1, P4 +2, P7 +1 |
  | 12 | P5 +1, P8 −1 |
  | 13 | P1 +2, P5 +2, P8 −3 |
  | 14 | none |

  Rules for the Sierra:
  - Defaults: pedal changes `down`, lever changes `up`, open strings `up`.
  - Exceptions, so the notes on the French chart get the French values: LKL (E→F) `down`; RKR on strings 3 and 10 (→D, →C#) `down`; P3 on string 5 (→F#) `cents −14.49`.
  - Use `cabinetDrop: 0`, `aRef: 440`, `noteTable: frenchNoteTable()`, `name: 'Sierra 14'`, `id: 'sierra14'`.

- [ ] **Step 4:** Run `npx vitest run`. Expected: all pass.
- [ ] **Step 5:** Commit `feat: profile model, Sierra and French seeds, target math`.

---

### Task 3: Display smoothing and tail hold

**Files:**
- Create: `src/pitch/display.ts`
- Test: `src/pitch/display.test.ts`

**Interfaces:**
- Consumes: `Frame` (Task 1), `noteFromFrequency`
- Produces:
  - `interface Shown { note: NoteName; octave: number; cents: number; held: boolean }`. `held` is true while the reading is frozen on the last good value.
  - `class DisplayFilter { constructor(opts?: { tauMs?: number; holdMs?: number; tailDb?: number }); push(f: Frame, aRef: number): Shown | null; reset(): void }`. Defaults: `tauMs` 150, `holdMs` 400, `tailDb` 30.

**Behavior** (Phase 0 carry-overs: smoothing, and the jumpy weak tail):
- Exponential smoothing of cents with time constant `tauMs`. Restart smoothing when the note changes.
- Track the peak RMS since the note started. When `rms` < peak − `tailDb` dB, treat the frame as weak: freeze the last good value with `held: true`.
- A null or weak frame keeps the last value (`held: true`) for up to `holdMs`, then returns `null`.

- [ ] **Step 1: Write the failing tests**, with frames 16.7 ms apart:
  - **Smooths a step:** steady 0¢, then a +6¢ step. After 150 ms the shown cents are between 3.5 and 4.2 (≈ 1 − e⁻¹ of the step).
  - **Note change restarts:** E2 then A2 shows A2's cents immediately, without smoothing from E2's value.
  - **Weak tail freezes:** the peak RMS is 0.1. Frames at RMS 0.002 (−34 dB from the peak) with wild frequencies return the last good cents with `held: true`.
  - **Hold then clear:** null frames show `held: true` until 400 ms, then `null`.
  - **Pluck attack settles:** a decaying +6¢ glide reaches within 0.3¢ of the settled value within 600 ms.
- [ ] **Step 2:** Run it and expect FAIL.
- [ ] **Step 3:** Implement. Compute the smoothing coefficient per frame from the real `Δt` (`α = 1 − e^(−Δt/τ)`), so 30, 60 and 120 fps all behave the same.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all pass.
- [ ] **Step 5:** Commit `feat: display smoothing and tail hold`.

---

### Task 4: Tuner screen: two gauges, waterfall, lock

**Files:**
- Create: `src/ui/Gauge.tsx`, `src/ui/Waterfall.tsx`, `src/ui/TunerScreen.tsx`, `src/ui/StringStrip.tsx`, `src/ui/useTuner.ts`
- Modify: `src/ui/App.tsx`
- Test: `src/ui/TunerScreen.test.tsx`, `src/ui/gaugeMath.test.ts`

**Interfaces:**
- Consumes: `TunerEngine` (Task 1), `Profile`, `gaugeTargets`, `positionTarget`, `positionsForNote` (Task 2), `DisplayFilter`, `Shown` (Task 3)
- Produces:
  - `centsToAngle(cents: number, range?: number, sweep?: number): number` in `src/ui/gaugeMath.ts` (ported from Phase 0, with its 3 tests)
  - `useTuner(profile: Profile): { shown: Shown | null; status: EngineStatus; start(deviceId?: string): void; inputs; inputLabel; sampleRate }`
  - `<TunerScreen profile shown status lock onLock onOpenSettings />`, where `lock: { string: number; change: string | null; stop: number } | null`

**Layout** (mockup option C):
- The note name and octave, large.
- Two gauges side by side: **"Pedals up"** (green mark) and **"A+B down"** (blue mark). Each shows its own deviation `shown.cents − target` (signed, one decimal place, e.g. `+1.2¢`) and has a waterfall of the last ~3 s of that deviation inside the dial.
- `held: true` dims both gauges to 50% opacity.
- **Override chips:** below the gauges, one chip per entry in `positionsForNote(profile, shown.note)` whose cents differ by more than 0.05 from both gauge targets, e.g. `F# · string 5 · P3 → −14.5¢`. Tapping a chip sets the lock.
- **StringStrip:** 14 small chips showing number and open note. Tapping one opens a picker of that string's positions (Open, each change, each half-stop, labelled "with LKR" when `requires`). Choosing one sets the lock.
- **Locked view:** one full-width gauge titled e.g. `String 6 · P1 → C#3` showing deviation from `positionTarget(...).cents`, plus an "Unlock" button.
- When `cabinetDrop === 0`, show a slim hint bar: "Cabinet drop not set — both gauges show the same target. Measure it in Settings."
- The A reference comes from the profile and is passed to `DisplayFilter.push`, so changing it re-reads immediately.

- [ ] **Step 1: Write the failing tests** (RTL, rendering `TunerScreen` with a fixed `shown`, which needs no audio):
  - **Two gauges:** `shown` = C#4 at −14.49 on the Sierra with c = 5. "A+B down" reads `+0.0¢`; "Pedals up" reads `−5.0¢`.
  - **c = 0 (Review Focus 1):** both gauges read the same value, and the hint text is visible.
  - **Note with no copedent position (Review Focus 2):** `shown` = C4 at −3. Both gauges render numbers, and no override chips appear.
  - **Override chip:** `shown` = F#4 → a chip containing `P3` and `−14.5¢`. Clicking it calls `onLock({ string: 5, change: 'P3', stop: 0 })`.
  - **Locked view:** with `lock = { string: 3, change: 'RKR', stop: 1 }`, there's one gauge titled `String 3 · RKR → C#4`.
  - **A reference (Review Focus 5):** in `useTuner`, using a fake engine frame of 442 Hz: with aRef 440 the displayed A4 cents is about +7.9; after switching to aRef 442 it's about 0.0 on the next frame.
  - **gaugeMath:** the 3 `centsToAngle` tests carried over.
- [ ] **Step 2:** Run it and expect FAIL.
- [ ] **Step 3:** Implement. `Waterfall` is a `<canvas>` clipped to a circle that scrolls 2 px per frame, with a vertical center line, in the style of the mockup (`.superpowers/brainstorm/*/content/tuner-gauge.html`).
- [ ] **Step 4:** Run `npx vitest run` and `npm run build`. Both pass.
- [ ] **Step 5:** Commit `feat: tuner screen with two gauges, waterfall and lock`.

---

### Task 5: Cabinet drop measurement

**Files:**
- Create: `src/model/drop.ts`, `src/ui/DropWizard.tsx`
- Test: `src/model/drop.test.ts`, `src/ui/DropWizard.test.tsx`

**Interfaces:**
- Consumes: `Shown` (Task 3), `Profile` (Task 2)
- Produces:
  - `steadyCents(samples: { cents: number; timeMs: number }[], minMs?: number, maxSpread?: number): number | null`. Defaults: `minMs` 700, `maxSpread` 1.0. Returns the median of the last `minMs` window if its max−min ≤ `maxSpread`, otherwise null.
  - `averageDrop(pairs: { up: number; down: number }[]): number`, rounded to 0.1.
  - `<DropWizard profile onSave(cabinetDrop: number) onCancel />`

**Flow (CP3):**
1. "Pluck your high E (string 5) with no pedals and let it ring." The step completes when `steadyCents` returns a value. The E must be the detected note.
2. "Now hold A and B and pluck it again." Completes the same way.
3. Show the result `up − down` (e.g. `Drop: 6.3¢`). Buttons: **Again** (adds another pair and shows the running average), **Save** and **Cancel**.

There's also a "type it in instead" field (0–30, one decimal place).

- [ ] **Step 1: Write the failing tests:**
  - `steadyCents`: steady 2.0 ± 0.2 for 800 ms → ≈ 2.0. The same with one sample at +3 → null. Only 500 ms of data → null.
  - `averageDrop([{ up: 2, down: -4.1 }, { up: 1.8, down: -4.5 }])` → 6.2.
  - **Wizard with no steady reading (Review Focus 4):** feed jumping cents. Save stays disabled and "Pluck again — the reading wasn't steady" shows.
  - **Wizard happy path:** feed steady +2.0 then −4.3. Save calls `onSave(6.3)`.
- [ ] **Step 2:** Run it and expect FAIL.
- [ ] **Step 3:** Implement. Reach the wizard from Settings and from the hint bar.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all pass.
- [ ] **Step 5:** Commit `feat: cabinet drop measurement`.

---

### Task 6: Storage, settings editor and export

**Files:**
- Create: `src/model/storage.ts`, `src/model/exportProfile.ts`, `src/ui/Settings.tsx`
- Test: `src/model/storage.test.ts`, `src/ui/Settings.test.tsx`

**Interfaces:**
- Consumes: `Profile`, `sierra14`, `T`, `TargetRule` (Task 2); `DropWizard` (Task 5)
- Produces:
  - `const STORAGE_KEY = 'pst-profiles-v1'`
  - `loadProfile(): Profile`
  - `saveProfile(p: Profile): void`
  - `exportProfile(p: Profile): string`: pretty JSON, `{ "format": "pedal-steel-tuner/profile", "version": 1, "profile": … }`
  - `<Settings profile onChange(p: Profile) onClose />`

**Settings screen** (plain forms, one scrolling page, phone-first):
- Name.
- Cabinet drop (number) plus a **Measure** button that opens the wizard.
- A reference (430–450).
- Note table: 12 number inputs, with a "Reset to French values" button.
- Copedent:
  - one row per string: the open note, and a list of changes;
  - each change has: the control, a semitones number per stop, and a target rule select (Pedals up / A+B down / Fixed ¢, with a number input for Fixed);
  - Add/remove buttons for changes and stops;
  - the open-string target rule select.
- **Export** button: downloads `<name>.json`.

Every edit calls `onChange`, and `App` saves via `saveProfile`.

- [ ] **Step 1: Write the failing tests:**
  - **Round trip:** `saveProfile(p)`, then `loadProfile()` deep-equals `p`.
  - **Empty storage** → returns `sierra14`.
  - **Corrupt data (Review Focus 3):** `localStorage[STORAGE_KEY] = '{oops'` → `loadProfile()` returns `sierra14`, and the bad text is copied to `pst-profiles-v1-corrupt`.
  - `exportProfile` JSON has `format`, `version: 1` and 14 strings for the Sierra.
  - **Settings (RTL):** changing string 5 → P3's rule from Fixed −14.49 to "A+B down" calls `onChange` with that change's `target.kind === 'down'`. Typing 6.3 into cabinet drop calls `onChange` with `cabinetDrop: 6.3`.
- [ ] **Step 2:** Run it and expect FAIL.
- [ ] **Step 3:** Implement. The storage format is `{ version: 1, profile }`. Anything else counts as corrupt.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all pass.
- [ ] **Step 5:** Commit `feat: settings editor, storage and export`.

---

### Task 7: Offline install

**Files:**
- Create: `public/manifest.webmanifest`, `public/sw.js`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` (180×180)
- Modify: `index.html` (manifest link, `apple-touch-icon`, `apple-mobile-web-app-capable`, `theme-color` `#0f1216`), `src/main.tsx` (register the service worker in production only)

**Specifics:**
- **Manifest:** name "Steel Tuner", `display: standalone`, `start_url: "."`, `scope: "."` (relative, so it works under `/pedal-steel-tuner/`), background `#0f1216`.
- **`sw.js`:**
  - on install, precache `./` and `./index.html`;
  - on fetch (GET, same origin), cache-first, falling back to the network and storing the response;
  - navigation requests fall back to the cached `./index.html` when offline;
  - bump `CACHE = 'pst-v1'` to invalidate.
- **Icons:** a simple green circle-gauge mark on `#0f1216`. Generate the PNGs once with a small script; only the PNGs are committed.

- [ ] **Step 1: Verify** that `npm run build` puts `manifest.webmanifest`, `sw.js` and the icons in `dist/`.
- [ ] **Step 2: Verify offline in the browser pane.** Use `npm run build && npx vite preview`, load once, then block the network with DevTools-style request interception (or stop the preview server) and reload. The app still renders and the Start button works with the injected-oscillator harness.
- [ ] **Step 3:** Commit `feat: offline install`.

---

### Task 8: Ship and test at the steel (needs Gabe)

- [ ] **Step 1:** Run `npx vitest run` and `npm run build`, both green. Run the final whole-branch review (executing-plans) and fix its findings.
- [ ] **Step 2: Stop and ask Gabe** to approve merging `phase-1-tuner` to `main` and pushing, which deploys. Don't continue without his explicit words.
- [ ] **Step 3: On his OK,** merge, push, and wait for the deploy workflow. Confirm the page returns 200 and its script asset returns 200.
- [ ] **Step 4: Gabe runs CP1–CP3** (`PRD.md` §5), feeding results back in chat:
  - **CP1:** airplane mode, open from the Home Screen, iRig, tune all open strings without tapping, both gauges.
  - **CP2:** hold P1, tune string 6 at the changer; try the F#/P3 chip and the lock.
  - **CP3:** measure the cabinet drop and save it.

  Record the results in `docs/phase-1-results.md` and update `SESSION_STATE.md`.
