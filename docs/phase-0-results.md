# Phase 0 — Accuracy test at the steel

**Question this answers:** can a web page on Gabe's iPhone read the steel accurately through both the phone's mic and the iRig HD X? (PRD §6 Phase 0, Open Question 2.)

## Setup

1. On the iPhone, open the test page in Safari, tap Share → **Add to Home Screen**, then open it from the Home Screen.
2. Tap **Start** and allow the microphone.
3. The footer shows the sample rate and the input in use. Write both down in the tables below.

## How to run it

Do the whole list once per input:

- **Phone mic:** phone about 30 cm (a foot) from the strings, iRig unplugged.
- **iRig HD X:** guitar plugged into the iRig, iRig plugged into the phone. If the footer still says the phone's mic, pick the iRig in the input dropdown.

Expected octaves are the standard ones for a Sierra 14 (string 14 is the low E1, about 41 Hz). If yours differ, correct the Expected column.

For each open string:

1. Pluck it and let it ring.
2. Check that the note shown is right.
3. While it sustains, read **Steadiness**. That's how much the reading wobbles over the last second; smaller is better.
4. Notice whether the reading agrees with your ears (and with any other tuner you trust, if one's handy).

For string 14 (the low E), also note roughly how long it takes for a reading to appear after you pluck.

## Pass / fail

- **Pass:** on **both** inputs, all 14 strings show the right note, Steadiness stays at **±0.5¢ or better** while the note sustains, and the low E reads within about **1 second**.
- **Pass:** web is confirmed (PRD Open Question 2), and the Phase 1 plan gets written.
- **Fail:** write down which input and which strings, and what happened (wrong note, jumpy, slow). Then we reopen web vs. native.

## Results

**Date:**                **iPhone / iOS:**

### Phone mic — sample rate: ______

| String | Expected | Shown | Steadiness | Agrees with ears? | Notes |
|---|---|---|---|---|---|
| 1 | G#4 | | | | |
| 2 | F#4 | | | | |
| 3 | D#4 | | | | |
| 4 | G#4 | | | | |
| 5 | E4 | | | | |
| 6 | B3 | | | | |
| 7 | G#3 | | | | |
| 8 | F#3 | | | | |
| 9 | E3 | | | | |
| 10 | B2 | | | | |
| 11 | G#2 | | | | |
| 12 | E2 | | | | |
| 13 | B1 | | | | |
| 14 | E1 | | | | low E: seconds to first reading: ___ |

### iRig HD X — sample rate: ______

| String | Expected | Shown | Steadiness | Agrees with ears? | Notes |
|---|---|---|---|---|---|
| 1 | G#4 | | | | |
| 2 | F#4 | | | | |
| 3 | D#4 | | | | |
| 4 | G#4 | | | | |
| 5 | E4 | | | | |
| 6 | B3 | | | | |
| 7 | G#3 | | | | |
| 8 | F#3 | | | | |
| 9 | E3 | | | | |
| 10 | B2 | | | | |
| 11 | G#2 | | | | |
| 12 | E2 | | | | |
| 13 | B1 | | | | |
| 14 | E1 | | | | low E: seconds to first reading: ___ |

## Decision

(Filled in after the test.)
