# MATH ALONE

A snowy home-defense maths game for 8-year-olds. The Slush Bandits are creeping up
the street — solve the sums, spring the traps, keep them out of the house.

## Two ways to play

| File | What it is |
|---|---|
| `index.html` | The full game: timers, traps, waves, streak bonuses, one or two players. Needs a real browser. |
| `math-alone-offline.html` | A quiet practice sheet — 48 questions, multiple choice, live score. **No JavaScript at all**, so it works in previewers that block scripts (iPad Files, Mail). |

## The game

- Pick 1 or 2 players (two players alternate questions, each with their own score).
- Choose which maths to practise: `+`, `−`, `×`, `÷`, in any combination.
- Easy / Medium / Hard, with the difficulty stepping up every 3 waves.
- Timer on for speed bonuses, or relaxed mode with no countdown.
- Right answer springs a trap and drives a bandit back; wrong answer lets them creep closer. Five steps and they're in.
- Six waves of ten questions saves the house. Best score is remembered per device.

## Making a fresh practice sheet

The offline sheet's questions are baked into the file. Regenerate it for a new set,
and put the girls' real names on it:

```powershell
.\make-offline-sheet.ps1 -Player1 "Name" -Player2 "Name"
```

Add `-Seed 123` to reproduce an identical sheet.
