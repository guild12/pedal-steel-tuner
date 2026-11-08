# Reference: copedent and cabinet drop formula

Research notes, 2026-11-06. Not yet confirmed against Gabe's own guitar or paper chart.

## Sierra SCM-14SE E9/B6 copedent

Source: `sierra-scm-14se-chart.jpg` in this folder, a low-res photo of Sierra's "14 String E9/B6 Tuning Guide: SCM-14SE", posted by Jerry Overstreet on the [Steel Guitar Forum](https://bb.steelguitarforum.com/viewtopic.php?p=3302097). That post says the letters denote Bill Stafford's set.

Bill Stafford's own chart was at drewhoward.com/billstafford.gif (he replied "The chart looks correct" in [this thread](https://bb.steelguitarforum.com/viewtopic.php?t=83899)). That site is gone and the Internet Archive lists no copy. Stafford's written description in the same thread agrees with this chart on: high G# as string 1, E B E as strings 12-14, pedal 8 lowering string 13 B to G#, pedal 6 raising the locked Eb to E, and one lever lowering D# to D while raising B to D.

### Open strings

| String | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E9 | G# | F# | D# | G# | E | B | G# | F# | E | B | G# | E | B | E |
| B6 (lock on) | G# | F# | D# | G# | Eb | B | G# | F# | Eb | B | G# | E | B | E |

### Changes

| Control | Side | Changes (string → note) |
|---|---|---|
| LK left | E9 | 5 → F, 9 → F |
| LV (vertical) | E9 | 5 → F# |
| LK right | E9 | 5 → Eb, 9 → Eb (likely the change lok; a guess from the chart) |
| P1 | E9 | 6, 10, 13 → C# |
| P2 | E9 | 4, 7, 11 → A |
| P3 | E9 | 5 → F#, 6 → C# |
| ILK left | B6 | 6 → C#, 7 → A# |
| ILK right | B6 | 8 → G |
| P4 | B6 | 7, 11 → A# |
| P5 | B6 | 2 → G, 8 → F, 12 → F, 13 → C# |
| P6 | B6 | 5 → E, 9 → D |
| P7 | B6 | 4, 7, 11 → A |
| P8 | B6 | 10 → C, 12 → Eb, 13 → G# |
| RK left | Both | 6, 10 → Bb |
| RK right | Both | 3 → D/C#, 10 → D |

The chart says the right knee levers work on both tunings.

Known difference: Gabe says the P5 on his guitar is a little different from this chart (details unknown until he can check it).

## Cabinet drop formula

Source: https://pedalsteel.fr/tuning/ ("My steel settings" by Matthieu Davallet, aka Mat Budymat; script by Emmanuel Danan). The math is in https://pedalsteel.fr/tuning/js/script.js. The site's article links return 404, but the tool works.

It takes only the cabinet drop `c`. There is no copedent entry: the chart is a fixed 10-string E9 with A, B, C pedals and LKL, LKR, RKL, RKR. It has no B6 side.

Offsets in cents from equal temperament:

| Offset | Notes |
|---|---|
| `+c` | E, B, F# (strings 1 and 7 open), G (string 7, RKR) |
| `c - 14.49` | G#, D#/Eb |
| `0` | A, D |
| `-14.49` | C#, F# (string 4, C pedal) |
| `-28.98` | F |

Effect: pedals up, the open E chord sits `c` sharp but stays in tune with itself. With A and B down, the drop pulls the unchanged E strings down to 0, matching the A and C# changes, so the A chord lands in tune.
