# Pedal Steel Tuner — Product Requirements Document

> **Format:** Context document for Claude Code, written in the FestiFiOS PRD template (North Star / Anti-Goals / Users / Domain Model / Critical Paths / Phases / Architecture / Open Questions). It is the single source of truth for what we're building. Read it in full before any design or implementation work.
> **Status:** v1.0, **APPROVED by Gabe 2026-11-08.** A fresh reviewer read it as the builder before approval, and its gaps are folded in.
> **What it is:** A tuner for pedal steel guitar that knows Gabe's guitars. It takes each guitar's copedent and cabinet drop and gives him per-note targets that account for the cabinet drop. That replaces his old workflow: run the French calculator, type its numbers into PitchLab as two custom temperaments, then tune.

---

## 1. North Star

**Gabe sits down at any of his steels, opens the tuner on his iPhone, plugged in or not and with or without internet, and gets the guitar tuned at least as well as his old PitchLab setup, without retyping a single number.**

Decision filter: if a feature doesn't get the guitar in tune faster or more trustworthily, it doesn't get built.

**Why:** Gabe's working setup was the [pedalsteel.fr calculator](https://pedalsteel.fr/tuning/) plus PitchLab's custom temperaments: one for pedals up and one for A+B down. He tuned by going back and forth between them and let his ears pick the happy medium. PitchLab stopped being supported long ago and has now stopped working on the old Android phone he kept only for it. That process worked well, even though the calculator was built for 10-string E9 and he used it on 12- and 14-string universals. The bar is "as good as the old process", not mathematical perfection.

## 2. Anti-Goals (what this isn't, ranked by temptation)

1. **Not a chord analyzer.** That's a real idea, and it's parked in `IDEAS.md`. If a feature needs to know what chord is being played, it's out.
2. **Not a MIDI or pickup project.** That's parked in `IDEAS.md` too.
3. **Not the authority on correct tuning.** The app gets Gabe close, and his ears make the final call. No "your tuning is wrong" warnings, no auto-correcting his offsets, and no insisting on one theory of intonation.
4. **Not a general guitar tuner.** No modes for other instruments. Every screen assumes a pedal steel with a copedent.
5. **Not dependent on the internet.** Gigs have bad or no wifi, so after the first install everything must work in airplane mode.
6. **Not tied to one phone or one vendor.** Losing PitchLab is why this exists. Guitars and settings must be exportable to a file Gabe owns, and the app can't depend on an app store, an account or a server to keep working.
7. **No accounts, sharing or social features yet.** It's for Gabe first. Other players might use it later, so keep the code clean enough to allow that, but don't build for it.

## 3. Users & Context

- **User:** Gabe, a pedal steel player. He picks with 3 fingers and a thumb, and plays several guitars with different copedents and cabinet drops. The main one is a 14-string Sierra E9/B6 universal in Bill Stafford's setup. He also has 12-string universals.
- **Device:** iPhone, in Safari, added to the Home Screen.
- **At home:** listening through the phone's mic.
- **At gigs:** an IK Multimedia **iRig HD X** (one instrument input; comes with Lightning and USB-C cables) with the guitar plugged straight into it. It's noisy, there may be no internet, and he's in a hurry.
- **How he tunes:** pluck, watch the display, turn the key or the changer nut. Open strings are set at the keyhead. Each raise and lower is set at the changer while the pedal or lever is held. Both hands are busy (a wrench, the pedals and levers), so he shouldn't have to touch the screen on every string.

## 4. Domain Model

### 4.1 Guitar profile (persisted)

- `name`, e.g. "Sierra 14".
- `copedent`: strings (number, open note with octave) plus pedals and levers. Each control lists the strings it changes and by how many semitones, so changes are data, not hardcoded. Builder's call: start from the [pedal-steel-visualizer](https://github.com/guild12/pedal-steel-visualizer) `Copedent` shape (`src/types.ts`) so files can move between the two apps. It lacks two things this app must add:
  - **Locks:** a lock lever holds another change engaged. The Sierra's change lok holds strings 5 and 9 at E♭ for B6. Model it as a declared relationship (e.g. `locks: "<control>"`) so the change isn't counted twice. This approach was noted in the visualizer project's Claude memory; its repo doesn't implement it yet, and its sample S14 file fakes the lock with a 0-semitone change.
  - **Half-stops:** a change can have more than one stop. On the Sierra, RKR takes string 3 to D at the half-stop and to C# at full travel.
- `cabinetDrop`: cents, one decimal place, entered or measured (CP3).
- `aRef`: Hz, default 440. Adjustable like the French site's 440, 441 and 442.
- `noteTable`: the offset, in cents from equal temperament, for each of the 12 note names, before cabinet drop (see 4.2). It's seeded from the French values and editable.
- **Per-change target** (my call, from the builder check): every change, and every half-stop, stores which single value the lock shows. The options are `up` (`noteTable + c`), `down` (`noteTable`) or an **override**, a fixed number of cents (e.g. F# reached by the C pedal = −T).
  - Defaults: pedal changes use `down` and knee-lever changes use `up`.
  - Seeded profiles set each change so every note the French chart covers gets exactly the French value. Changes to notes the chart doesn't cover (C, B♭, the B6 side) keep the defaults and stay editable.

### 4.2 Target math

This comes from the pedalsteel.fr calculator source (`js/script.js`). Full notes are in `reference/copedent-and-formula.md`. With T = 14.49 cents and c = cabinet drop:

| Note | French value | `noteTable` base (before c) |
|---|---|---|
| E, B, F#, G | `+c` | 0 |
| G#, D#/E♭ | `c − T` | −T |
| A, D | 0 | 0 |
| C# | −T | −T |
| F | −2T | −2T |
| F# raised by the C pedal | −T | override: −T |

**The two gauges** (chosen in brainstorming, mockup option C) show, for the detected note:

- **Pedals up** target = `noteTable[note] + c`
- **A+B down** target = `noteTable[note]`

Check: open E reads +c with pedals up. With A+B down the cabinet drops it by c to 0, which matches the A (0) and C# (−T) that the pedals pull to. That's why the A chord lands in tune. The French site's own table follows this pattern, and it matches how Gabe used two PitchLab temperaments.

**Known gaps:**

- The French site has no values for **C** and **B♭/A#**, which this guitar needs on the B6 side and the right knee levers. In v1 they default to 0 in `noteTable` and Gabe can edit them (builder's call, marked for Gabe's review).
- Every French lever value lands on one of the two gauges, but not always the one that matches the feet. Levers are tuned with no pedals down, yet LKL's F (−2T) and LKR's D (0) match the **A+B down** gauge, while RKR's E and G (+c) and RKL's E♭ (c − T) match **pedals up**. The F# from the C pedal (−T) matches neither, which is why it's an override. In v1 the gauges show both values, and the lock (4.3) shows the exact target for a specific string and control. The builder seeds overrides only where the Sierra copedent hits a known exception, and Gabe's ears decide the rest.
- The B6 side, with the lock engaged, has no cabinet-drop rule at all. See Open Question 1.

### 4.3 Live reading (in memory)

Detected pitch (Hz) → nearest note → cents from equal temperament at `aRef` → deviation from each gauge's target. A **lock** (an optional tap) pins the display to one string and one change (or open string). It then shows that change's single per-change target (4.1).

## 5. Critical Paths

### CP1 — Gig tune-up (the reason this exists)
1. Airplane mode is on. Gabe opens the app from the Home Screen. The USB interface is plugged into the phone, with the guitar plugged into it.
2. The last-used guitar loads. The app is listening to the interface, not the phone's mic.
3. He plucks each open string. The note is detected automatically, and the **pedals up** gauge reads at top dead center when the string is on target.
4. He presses A+B and checks the **A+B down** gauge. He goes back and forth and settles by ear.
5. No screen taps between strings.

### CP2 — Tuning a change at the changer
1. Gabe holds P1 and plucks string 6. The app hears C# and shows the C# targets.
2. If the note has an override on this guitar (like F# from the C pedal), the app makes that visible. One tap locks onto the string and control combination for the exact target.
3. He turns the nut until it reads on target.

### CP3 — Measuring cabinet drop (new guitar or re-check)
1. Gabe chooses "measure drop" and tunes the high E to its target.
2. He presses A and B and plucks the high E again.
3. The app shows the difference and saves it to that guitar, with the option to retry and average. He can also type a number in directly.

### CP4 — Adding a guitar
1. He creates a profile from a starting copedent (the Sierra 14, E9/B6 universal, 10-string E9) or imports a file.
2. He edits strings, pedals and levers.
3. He sets the cabinet drop with CP3 or by typing it in.

### CP5 — New phone, same guitars
1. He exports all guitars to one file and saves it wherever he wants.
2. On a fresh phone or browser, he imports it, and everything is back.

## 6. Phases

| Phase | Delivers | Exit test |
|---|---|---|
| **0 — Accuracy spike** (throwaway) | A bare web page: one gauge, cents readout, and a choice of input. Hosted over HTTPS so iPhone Safari allows mic access. | On Gabe's iPhone, through **both the mic and his iRig HD X**, every string on the Sierra (including the low E) reads steadily, and he trusts it against his ears. If either input fails or wanders, stop and reopen the web vs. native question (Open Q2). |
| **1 — The tuner** | Sierra 14 profile, note table and two gauges with waterfall, auto-detect plus lock, measuring cabinet drop, A reference, offline install to Home Screen, export of the profile to a file. **Plain editing of the copedent, note table and per-change targets is included**, because the seed comes from a photo and P5 is already known to differ. | CP1–CP3 pass at the steel. Gabe tunes up with it and his ears agree it's at least as good as the old setup. |
| **2 — All the guitars** | Multiple profiles, a friendlier copedent editor, import (including the visualizer format). | CP4–CP5 pass with a second real guitar. |
| **Later** | Sharing with other players, chord analyzer, MIDI ideas (`IDEAS.md`). | — |

Development discipline: Phase 0 comes first, because the riskiest unknown is whether Safari's audio input is accurate enough. The UI doesn't matter if the numbers wander.

## 7. Architecture (proposed, not yet approved)

- **Platform:** a web app (PWA), installed to the iPhone Home Screen. Gabe chose web over native for low cost, easy sharing and no single-device lock-in, with native as the fallback if Phase 0 fails.
- **Stack:** builder's call. The natural default is the visualizer's stack (React + Vite + TypeScript + Tailwind, deployed to GitHub Pages under `guild12`), which gives HTTPS for free and reuses known code.
- **Audio:** `getUserMedia` with echo cancellation, noise suppression and auto gain turned off. Processing runs in an AudioWorklet. The pitch-detection algorithm (YIN, MPM or similar) is the builder's call, but it must handle the low E around 41 Hz without lag the player notices. iOS routes a connected USB interface as the input; Phase 0 confirms this.
- **Display:** two gauges side by side (mockup option C, `.superpowers/brainstorm/*/content/tuner-gauge.html`): circle gauge, top dead center = on target, ±cents readout, and a waterfall inside each gauge. The screen stays awake while tuning. The Wake Lock API needs iOS 18.4 or newer in a Home Screen app; on older versions the builder adds a fallback (Gabe's iPhone model and iOS version weren't confirmed).
- **Offline:** a service worker caches the whole app, and the first launch after install works in airplane mode.
- **Persistence:** profiles stored on the device (IndexedDB or localStorage, builder's call) plus export/import of one human-readable JSON file. On-device storage alone isn't enough: the visualizer showed that copedents trapped in a browser get lost.
- **Testing:** unit tests on the target math. The French 10-string E9 chart, built as a profile, must reproduce every one of its per-change values exactly at several cabinet drops. A gauge-only check doesn't count, because every French value already appears on one of the two gauges. Also test the cents/Hz conversions and copedent parsing. The pitch detector is tested against synthesized tones at known offsets across 40–700 Hz, plus a few recorded steel clips.

## 8. Open Questions (deferred deliberately)

1. **B6 side and the lock.** The French formula only covers E9 with A+B. What should the targets be with the lock engaged, and for C and B♭? v1 defaults these to editable values and lets Gabe's ears decide. Revisit after real use. *Owner: Gabe at the steel.*
2. ~~**Web or native, for good.**~~ **Closed 2026-11-08: web confirmed** by the Phase 0 test at the steel (`docs/phase-0-results.md`). The iRig HD X reads accurately and steadily in Safari, and the phone mic works with the amp on.
3. **Sierra P5 and any other personal changes.** The seed copedent is Sierra's factory SCM-14SE chart, read from a low-res photo (`reference/sierra-scm-14se-chart.jpg`). Gabe says his P5 is a little different, and which lever engages the lock is a guess from the chart. Because Phase 1 includes editing, this doesn't block the build. *Owner: Gabe, when he can check the guitar.*
4. **14.49 vs. a pure third (13.69).** The French site uses 14.49. Keep it for fidelity to the process that worked; making T editable is cheap. *Owner: later.*
5. **Visualizer interop.** Sharing one copedent format with the pedal-steel-visualizer is a builder's-call default. Merging the two apps is not in scope.

## Companion notes

- `reference/copedent-and-formula.md`: the Sierra SCM-14SE copedent transcription and the French calculator formula, with sources.
- `reference/sierra-scm-14se-chart.jpg`: the source photo of the chart.
- `IDEAS.md`: parked ideas (chord analyzer, MIDI pickup).
- The brainstorm mockup of the three gauge options is in `.superpowers/brainstorm/`. Gabe picked option C.
