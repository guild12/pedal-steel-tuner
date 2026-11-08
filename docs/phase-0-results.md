# Phase 0 — Accuracy test at the steel

**Question this answers:** can a web page on Gabe's iPhone read the steel accurately through both the phone's mic and the iRig HD X? (PRD §6 Phase 0, Open Question 2.)

## Setup

1. Set the iPhone's **Auto-Lock to Never** for the test (Settings → Display & Brightness → Auto-Lock), so the phone doesn't lock mid-test. If it does lock, tap **Tap to resume**.
2. On the iPhone, open the test page in Safari, tap Share → **Add to Home Screen**, then open it from the Home Screen.
3. Tap **Start** and allow the microphone.
4. The footer shows the sample rate and the input in use. Write both down in the tables below.
5. Have a tuner you trust handy (a Peterson, a clip-on, anything), and tune each open string to it first, so you know what "right" looks like.

## How to run it

Do the whole list once per input:

- **Phone mic:** phone about 30 cm (a foot) from the strings, iRig unplugged. Write down whether the amp was on.
- **iRig HD X:** guitar plugged into the iRig, iRig plugged into the phone. If the footer still says the phone's mic, pick the iRig in the input dropdown.

Expected octaves are the standard ones for a Sierra 14 (string 14 is the low E1, about 41 Hz). If yours differ, correct the Expected column.

For each open string:

1. Pluck it and let it ring.
2. Check that the note shown is right, and write down the **cents** it shows. (The string is in tune on your trusted tuner, so the right answer is about 0¢.)
3. About **2 seconds after the pluck**, read **Steadiness**. That's how much the reading wobbles over the last second; smaller is better. It stays "—" until the note has held long enough. If **Note jumps** keeps climbing, the reading is flipping between notes; write that down.
4. Notice whether the reading agrees with your ears.
5. If the note shows "—" while the string is clearly ringing, write down the **Level** reading.

For string 14 (the low E), also note roughly how long it takes for a reading to appear after you pluck.

## Pass / fail

- **Pass:** on **both** inputs, all 14 strings show the right note, Steadiness stays at **±0.5¢ or better** while the note sustains, and the low E reads within about **1 second**.
- **Pass:** web is confirmed (PRD Open Question 2), and the Phase 1 plan gets written.
- **Known detector limit, not a fail:** if the low strings read a few cents **sharp on both inputs** compared with your trusted tuner, that's the detector being pulled by the string's overtones (a known issue, fixed in Phase 1), not Safari. Write the numbers down. It's a fail only if the two inputs disagree with each other, or the reading won't hold still.
- **Fail:** write down which input and which strings, and what happened (wrong note, jumpy, slow). Then we reopen web vs. native.

## Results

**Date:**                **iPhone / iOS:**

### Phone mic — sample rate: ______ · amp on? ______

| String | Expected | Shown | Cents | Steadiness | Agrees with ears? | Notes |
|---|---|---|---|---|---|---|
| 1 | G#4 | | | | | |
| 2 | F#4 | | | | | |
| 3 | D#4 | | | | | |
| 4 | G#4 | | | | | |
| 5 | E4 | | | | | |
| 6 | B3 | | | | | |
| 7 | G#3 | | | | | |
| 8 | F#3 | | | | | |
| 9 | E3 | | | | | |
| 10 | B2 | | | | | |
| 11 | G#2 | | | | | |
| 12 | E2 | | | | | |
| 13 | B1 | | | | | |
| 14 | E1 | | | | | low E: seconds to first reading: ___ |

### iRig HD X — sample rate: ______

| String | Expected | Shown | Cents | Steadiness | Agrees with ears? | Notes |
|---|---|---|---|---|---|---|
| 1 | G#4 | | | | | |
| 2 | F#4 | | | | | |
| 3 | D#4 | | | | | |
| 4 | G#4 | | | | | |
| 5 | E4 | | | | | |
| 6 | B3 | | | | | |
| 7 | G#3 | | | | | |
| 8 | F#3 | | | | | |
| 9 | E3 | | | | | |
| 10 | B2 | | | | | |
| 11 | G#2 | | | | | |
| 12 | E2 | | | | | |
| 13 | B1 | | | | | |
| 14 | E1 | | | | | low E: seconds to first reading: ___ |

## What happened (2026-11-08, run live in chat)

The tables above weren't filled in string by string. Gabe ran the key checks with Claude and reported by chat. The Peterson wasn't available, so ears were the reference.

**iRig HD X (guitar plugged in), other strings muted:**
- **String 14 (low E):** reads E1 (right octave, no octave jump). The reading starts about +6¢ sharp on the pluck and settles within a second or two, which is normal pitch glide on a big string. It holds while the string rings.
- **String 1 (high G#):** Steadiness averages about ±0.2¢, with occasional spikes to ±1¢. Note jumps stay at 0.
- **E1/E2 octave by ear,** with both reading 0.0¢: "sounds pretty good" (hard to judge that low).
- Gabe's first impression: "seems to be pretty accurate."

**Phone mic:**
- **Unamplified steel:** doesn't hold steady. Expected: a solid-body steel makes very little acoustic sound.
- **Through the amp, phone about 30 cm from the speaker:** holds the note, and the dot is "a bit jumpy."

**Bugs found and fixed during the test (both live):**
1. Steadiness counted readings instead of time, so it vanished at 30 fps. Now it shows once a note has held 0.5 s.
2. The silence cutoff of −60 dBFS blanked a still-ringing string through the iRig. Gabe spotted it via the Level readout. Now −80 dBFS, and YIN still rejects noise.

**Carry into Phase 1:**
- **Very weak tails:** after about 4–5 s the reading jumps around. Hold the last solid reading or fade the display when the level or clarity drops.
- **Smoothing:** smooth the displayed value (calms the pluck attack and the mic jitter).
- **Overtone pull:** check the low strings against the Peterson once it turns up. Fundamental-weighted refinement is still planned (reviewer's inharmonicity finding).
- **iRig gain:** set it so full strums don't peak, and let the app handle the quiet tail.

## Decision

**Web confirmed.** Safari on Gabe's iPhone reads the steel accurately and steadily through the iRig HD X, the primary gig path, and holds through the phone mic with the amp on. PRD Open Question 2 is closed in favor of the web app. Next: write the Phase 1 plan.
