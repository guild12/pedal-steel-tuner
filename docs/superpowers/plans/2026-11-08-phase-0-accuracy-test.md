# Phase 0 Accuracy Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A bare one-gauge tuner page, hosted over HTTPS, that Gabe opens on his iPhone to decide whether a web app can read his steel accurately through both the phone's mic and his iRig HD X.

**Architecture:** Vanilla TypeScript, no framework, because the page is throwaway (PRD Phase 0). The two pure modules (`src/pitch/notes.ts` and `src/pitch/detect.ts`) are written test-first, because they carry forward into Phase 1 if web wins. A small page wires `getUserMedia` → `AnalyserNode` → detector → gauge, and GitHub Pages provides the HTTPS that iPhone Safari requires for mic access.

**Tech Stack:** TypeScript ~5.9.3, Vite ^8.0.3, Vitest ^4.1.1 (versions matched to `guild12/pedal-steel-visualizer`). Node 22 in CI.

**Spec:** `PRD.md` (Phase 0 row of §6, Audio and Display bullets of §7, Open Question 2).

## Global Constraints

- Phase 0 is a throwaway spike: no React, no profiles, no copedent, no two gauges. Only `src/pitch/*` is meant to survive.
- Detection range is 38–520 Hz. The lowest string is around E1 (41.2 Hz); the highest pulled note on the Sierra is about A#4 (466 Hz).
- The A reference is fixed at 440 Hz for this phase.
- Call `getUserMedia` with `echoCancellation: false, noiseSuppression: false, autoGainControl: false`.
- The audio context must start from a user tap (iOS requirement).
- The gauge follows mockup option C's look: a circle, top dead center = 0¢, ±20¢ spread over ±150°.
- Git: work on branch `phase-0-accuracy-test`. **Creating the GitHub repo, merging to `main` and pushing require Gabe's explicit words** (global CLAUDE.md).

## Review Focus

1. **Octave errors on the low strings.** A low E whose 2nd harmonic is louder than its fundamental must still read E1, not E2. This is pinned in Task 2.
2. **Silence and decaying tails.** When no note is ringing, the detector returns `null` and the page shows "—" instead of jumping around. This is pinned in Task 2 (silence and low-level noise) and checked by hand in Task 3.
3. **Sample rate differences.** iOS may run at 44.1, 48 or 96 kHz, so the detector must use the context's actual rate. This is pinned in Task 2, with tests at 44100, 48000 and 96000.
4. **Mic permission denied or an insecure page.** The page shows a plain-English message rather than going blank. This is checked by hand in Task 3.
5. **A noisy room.** A note with background noise should still read within 1¢. This is pinned in Task 2 with a 20 dB signal-to-noise test.

---

### Task 1: Project scaffold and note math

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `index.html`
- Create: `src/pitch/notes.ts`
- Test: `src/pitch/notes.test.ts`

**Interfaces:**
- Produces:
  - `type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'`
  - `interface NoteReading { name: NoteName; octave: number; midi: number; cents: number }`, where `cents` is in [−50, 50)
  - `noteFromFrequency(hz: number, aRef?: number): NoteReading` (aRef defaults to 440)
  - `centsBetween(hz: number, refHz: number): number`, which is `1200 * log2(hz / refHz)`

- [ ] **Step 1: Initialize the repo and scaffold**

Run `git init -b main`, make an empty initial commit, then `git switch -c phase-0-accuracy-test`.

`package.json`: name `pedal-steel-tuner`, `"type": "module"`, scripts `dev: vite`, `build: tsc --noEmit && vite build`, `test: vitest run`, and devDependencies `typescript ~5.9.3`, `vite ^8.0.3`, `vitest ^4.1.1`.

`tsconfig.json`: strict, target ES2022, module ESNext, moduleResolution bundler, lib `["ES2022", "DOM"]`, include `src`.

`vite.config.ts`: `base: process.env.BASE_PATH ?? '/'` (same as the visualizer).

`.gitignore`: `node_modules`, `dist`, `.superpowers/`, `.DS_Store`.

`index.html`: a viewport meta tag and `<script type="module" src="/src/main.ts">`.

Then run `npm install`.

- [ ] **Step 2: Write the failing tests** in `src/pitch/notes.test.ts`

```ts
test('A440 is A4, 0 cents', () => expect(noteFromFrequency(440)).toEqual({ name: 'A', octave: 4, midi: 69, cents: 0 }))
test('low E1', () => { const r = noteFromFrequency(41.2034); expect([r.name, r.octave]).toEqual(['E', 1]); expect(Math.abs(r.cents)).toBeLessThan(0.01) })
test('high G#4', () => { const r = noteFromFrequency(415.3047); expect([r.name, r.octave]).toEqual(['G#', 4]); expect(Math.abs(r.cents)).toBeLessThan(0.01) })
test('442 Hz reads +7.85 at A440', () => expect(noteFromFrequency(442).cents).toBeCloseTo(7.85, 2))
test('442 Hz reads 0 at A442', () => expect(noteFromFrequency(442, 442).cents).toBeCloseTo(0, 6))
test('just past the quarter-tone reads the next note', () => { const r = noteFromFrequency(440 * 2 ** (51 / 1200)); expect(r.name).toBe('A#'); expect(r.cents).toBeCloseTo(-49, 6) })
test('centsBetween', () => expect(centsBetween(446, 440)).toBeCloseTo(23.45, 2))
```

- [ ] **Step 3: Run `npm test`.** Expected: FAIL (module not found).

- [ ] **Step 4: Implement `noteFromFrequency` and `centsBetween` in `src/pitch/notes.ts`.** Compute `midi = 69 + 12 * log2(hz / aRef)`, round to the nearest note, and set `cents = (midiExact − midiRounded) × 100`. Exactly +50 rounds up to the next note (so it becomes −50). Name the note from `midi % 12` with sharps, and set `octave = floor(midi / 12) − 1`.

- [ ] **Step 5: Run `npm test`.** Expected: all 7 pass.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat: scaffold project and note math"`

---

### Task 2: Pitch detector

**Files:**
- Create: `src/pitch/detect.ts`
- Create: `src/pitch/synth.ts` (test helper only)
- Test: `src/pitch/detect.test.ts`

**Interfaces:**
- Consumes: `centsBetween` from Task 1 (in tests)
- Produces:
  - `interface PitchResult { frequency: number; clarity: number }`, where `clarity` is in [0, 1]
  - `detectPitch(samples: Float32Array, sampleRate: number): PitchResult | null`
  - `MIN_HZ = 38`, `MAX_HZ = 520`
  - `requiredSamples(sampleRate: number): number`, the buffer length `detectPitch` needs (`2 × ceil(sampleRate / MIN_HZ)`)
- Test helper: `tone(opts: { hz: number; sampleRate: number; length: number; harmonics?: number[]; noiseDb?: number; seed?: number }): Float32Array`. `harmonics` is the amplitude per partial (default `[1]`). `noiseDb` adds seeded white noise at that SNR, using a fixed simple PRNG (mulberry32) so tests are deterministic.

- [ ] **Step 1: Write the failing tests** in `src/pitch/detect.test.ts`

Each case builds `tone({ hz, sampleRate, length: requiredSamples(sampleRate), ... })` and asserts `Math.abs(centsBetween(result.frequency, hz))` is below the tolerance:

| Test | hz | sampleRate | harmonics / noise | Tolerance |
|---|---|---|---|---|
| sine across range | 41.2034, 61.735, 82.407, 164.81, 329.63, 415.30, 466.16 | 48000 | `[1]` | 0.2¢ |
| off-pitch sines | 329.63 × 2^(±3.7/1200), × 2^(±14.49/1200) | 48000 | `[1]` | 0.2¢ |
| steel-like tone | 82.407, 246.94 | 48000 | `[1, 0.7, 0.5, 0.35, 0.25]` | 0.2¢ |
| **low E, weak fundamental** | 41.2034 | 48000 | `[0.3, 1.0, 0.6, 0.4]` | 0.5¢ (must not read 82.4) |
| sample rates | 82.407 | 44100, 48000, 96000 | `[1, 0.5]` | 0.2¢ |
| noisy room | 164.81 | 48000 | `[1, 0.5]`, `noiseDb: 20` | 1¢ |

Two more tests:
- `detectPitch(new Float32Array(requiredSamples(48000)), 48000)` is `null` (silence).
- Noise alone at amplitude 0.002 returns `null`.

- [ ] **Step 2: Run `npm test`.** Expected: FAIL (module not found).

- [ ] **Step 3: Implement `tone` in `src/pitch/synth.ts`** as a sum of `harmonics[k] · sin(2π(k+1)·hz·t)`, normalized to a peak of 0.8, plus noise when `noiseDb` is set.

- [ ] **Step 4: Implement `detectPitch` in `src/pitch/detect.ts` with YIN** (de Cheveigné & Kawahara, 2002). These are the choices the tests don't determine:
  - Return `null` if the buffer's RMS is below 0.005 (silence gate).
  - `maxTau = ceil(sampleRate / MIN_HZ)`, `minTau = floor(sampleRate / MAX_HZ)`, integration window `W = maxTau`.
  - Compute the difference function `d(τ)`, then the cumulative-mean-normalized `d'(τ)`.
  - Pick the first `τ ≥ minTau` where `d'(τ) < 0.15`, then walk forward to that dip's local minimum. If nothing falls under the threshold, return `null`. Taking the *first* dip is what prevents octave errors, so don't switch to the global minimum.
  - Refine `τ` with parabolic interpolation on `d'` at τ−1, τ, τ+1. Then `frequency = sampleRate / τ_refined` and `clarity = 1 − d'(τ)`.

- [ ] **Step 5: Run `npm test`.** Expected: all pass. If the 0.2¢ sine cases fail only above 300 Hz, run the parabolic interpolation on the raw `d(τ)` instead of `d'(τ)` and re-run before changing anything else.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat: YIN pitch detector with synthetic-tone tests"`

---

### Task 3: The test page

**Files:**
- Create: `src/gauge.ts`, `src/stats.ts`, `src/main.ts`
- Test: `src/gauge.test.ts`, `src/stats.test.ts`

**Interfaces:**
- Consumes: `detectPitch`, `requiredSamples` (Task 2); `noteFromFrequency` (Task 1)
- Produces (page-only, not reused):
  - `centsToAngle(cents: number, range?: number, sweep?: number): number`, defaults 20 and 150, clamped to ±sweep
  - `class RollingStats { constructor(windowMs: number); push(value: number, timeMs: number): void; readonly mean: number | null; readonly stdDev: number | null; reset(): void }`

- [ ] **Step 1: Write the failing tests**

```ts
// gauge.test.ts
test('0 cents is top dead center', () => expect(centsToAngle(0)).toBe(0))
test('+20 cents is +150°', () => expect(centsToAngle(20)).toBe(150))
test('clamps past range', () => expect(centsToAngle(-35)).toBe(-150))
// stats.test.ts
test('mean and stdDev over window', () => { const s = new RollingStats(1000); [1, 2, 3].forEach((v, i) => s.push(v, i * 100)); expect(s.mean).toBe(2); expect(s.stdDev).toBeCloseTo(0.8165, 3) })
test('drops values older than window', () => { const s = new RollingStats(1000); s.push(10, 0); s.push(2, 1500); expect(s.mean).toBe(2) })
test('empty is null', () => expect(new RollingStats(1000).stdDev).toBeNull())
```

`stdDev` is the population standard deviation.

- [ ] **Step 2: Run `npm test`.** Expected: the new tests fail.

- [ ] **Step 3: Implement `centsToAngle` and `RollingStats`.** Run `npm test` and expect everything to pass.

- [ ] **Step 4: Build the page in `src/main.ts` and `src/gauge.ts`.** It's a single dark screen, phone-first, with:
  - A **Start** button, because the audio context must start from a tap.
  - An **Input** dropdown, filled from `enumerateDevices()` audio inputs after permission is granted. Changing it restarts the stream with `deviceId: { exact }`.
  - Big note name with octave; frequency to 2 decimals; cents to 1 decimal, signed.
  - An SVG circle gauge using `centsToAngle`, with ticks every 2¢ and a pointer dot.
  - A **Steadiness** line: `RollingStats(1000)` standard deviation of cents, shown as `±0.3¢`. It resets whenever the detected note changes.
  - A footer showing the actual `audioContext.sampleRate` and the active device's label.

  The loop: `AnalyserNode` with `fftSize` = the next power of two ≥ `requiredSamples(sampleRate)`, `getFloatTimeDomainData` every animation frame, then detect and render. When `detectPitch` returns `null`, show "—" and leave the pointer hidden.

  Show these messages:
  - Permission denied: "Microphone access was blocked. Allow it in Settings → Safari → Microphone, then reload."
  - `navigator.mediaDevices` missing: "This page must be opened over https."

- [ ] **Step 5: Check it by hand.** Run `npm run dev`, open it in desktop Chrome and click Start. Play a reference tone from another device (any online tone generator at 440 Hz, then 82.41 Hz). Expected: A4 near 0.0¢, then E2 near 0.0¢, and "—" when the tone stops. Block mic permission and reload to see the blocked message. Then run `npm run build`, which must succeed with no type errors.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat: phase 0 single-gauge test page"`

---

### Task 4: Put it on HTTPS (needs Gabe's go-ahead)

**Files:**
- Create: `.github/workflows/deploy.yml`, copied from `guild12/pedal-steel-visualizer` with `BASE_PATH: /pedal-steel-tuner/`

- [ ] **Step 1: Add the workflow** and commit it on the branch.
- [ ] **Step 2: Stop and ask Gabe** to approve creating the public repo `guild12/pedal-steel-tuner`, merging the branch to `main` and pushing. Don't continue without his explicit words.
- [ ] **Step 3: On his OK:**
  1. Run `gh repo create guild12/pedal-steel-tuner --public --source . --remote origin`.
  2. Merge the branch into `main` and push `main`.
  3. Run `gh api -X POST repos/guild12/pedal-steel-tuner/pages -f build_type=workflow`.
  4. Re-run the workflow with `gh workflow run deploy.yml`.
- [ ] **Step 4: Verify** that `curl -sI https://guild12.github.io/pedal-steel-tuner/` returns 200, and that the page loads in a browser with a working Start button.

---

### Task 5: The test at the steel (Gabe)

**Files:**
- Create: `docs/phase-0-results.md`, the protocol plus a results table Gabe fills in, or that Claude fills in from what he reports.

- [ ] **Step 1: Write the protocol.** Use the open strings of the Sierra 14 from `reference/copedent-and-formula.md`. For each input (phone mic at about 30 cm from the strings; iRig HD X with the guitar plugged in):
  - Pluck each of the 14 open strings and let it ring.
  - Record: the correct note shown (Y/N), the Steadiness reading while it sustains, and seconds until a reading appears on string 14.
  - Note whether it agrees with his ears, and with any other tuner he trusts.
  - Record the sample rate shown in the footer.
- [ ] **Step 2: Gabe runs it** on his iPhone, with the page added to the Home Screen.
- [ ] **Step 3: Record the results and the decision.** Pass means: all 14 strings show the right note on both inputs, Steadiness stays at ±0.5¢ or better while the note sustains, and the low E reads within about 1 second. On a pass, mark PRD Open Question 2 "web confirmed" and write the Phase 1 plan. On a fail, write down which input failed and how, then reopen web vs. native with Gabe.
- [ ] **Step 4: Commit** the results.
