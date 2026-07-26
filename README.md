# MATH ALONE

A snowy home-defense maths game for 8-year-olds. The Slush Bandits are creeping up
the street — solve the sums, spring the traps, keep them out of the house.

## Two ways to play

Live at **https://ckofidis-git.github.io/math-alone/**

| File | What it is |
|---|---|
| `index.html` + `style.css` + `game.js` | The full game. |
| `math-alone-offline.html` | A quiet practice sheet — 48 questions, multiple choice, live score. **No JavaScript at all**, so it works in previewers that block scripts (iPad Files, Mail). |

## The game

**Three modes.** *Six Nights* is the story: six nights of ten questions, each night unlocking
the next, ending with the Big Bandit boss. *Practice Range* drills one chosen skill with no
timer and no way to lose. *Twin Duel* is two players alternating, with a tug-of-war bar.

**Nine question types**, following the Year 3 curriculum: adding, taking away, times tables
(2, 3, 4, 5, 8, 10), sharing, missing numbers, number bonds, comparing, counting in steps,
and word problems.

**It adapts.** Every answer is recorded per skill, and the game asks more questions on
whichever skills have the lowest accuracy. The Sticker Book shows those percentages.

**Wrong answers teach.** Instead of just marking it wrong, the game draws the maths: dot
arrays for multiplication, sharing into groups for division, a number line for adding and
taking away, a bar model for number bonds.

**Coins, traps and badges.** Correct answers earn coins; coins build new traps in the Trap
Workshop (12 to collect); 12 badges and 6 ranks track long-term progress. All saved on the device.

## Checking the maths

The generators are exposed for testing when `?selftest` is in the URL or
`localStorage.mathAlone.selftest` is `'1'`, so every question type can be verified in bulk
(40,000+ generated questions, cross-checked against both the printed prompt and the
teaching picture).

## Making a fresh practice sheet

The offline sheet's questions are baked into the file. Regenerate it for a new set,
and put the girls' real names on it:

```powershell
.\make-offline-sheet.ps1 -Player1 "Name" -Player2 "Name"
```

Add `-Seed 123` to reproduce an identical sheet.
