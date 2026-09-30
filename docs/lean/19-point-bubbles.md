# 19: point bubbles

Run this after spec 18 is merged: it shows 18's double points for the fast zombies, and 17's walk is
already in.

## What the owner wants

The points appear as floating bubbles that rise and disappear in the air. The owner asked on 30
September 2026 and left the details to us; these are the defaults we propose. Scoring itself does not
change: this only shows it.

## When a bubble appears

A bubble appears each time the score goes up for something the player brought down, at the place it
fell, showing the points it gave with a plus sign: `+100` for a zombie, `+200` for a fast zombie
(spec 18), `+250` for a pumpkin monster, a crow's points, `+25` for a pumpkin shot down in the air, and
the boss's points when it falls. That is every place the game adds to the score: one bubble per
award, whatever brought it down (the Popper, the Scattergun, the Gatling, an explosion). Things that
fall for no points, such as everything that bursts when the boss falls, show no bubble.

## What a bubble is

Made in code, no image files. There is no bubble in the game today, so this description is the whole design; nothing on an
existing screen is to be matched. Its number is set in the HUD's own font (the page's bold
sans-serif, as the score is). It lives in the game's effects (`effects.js`) as plain data, drawn by
the stage.

```
      ( +100 )        a translucent bubble, the points in gold in its middle
       .--.
      /    \
      \    /
       '--'
```

- **Its look:** a round bubble, translucent white-blue
  (`#cfe8ff` at 0.35 opacity) with a thin lighter rim, and the points in the middle in gold
  (`#ffd24a`) in a bold sans font. Its **size** goes with the points: 0.5 across for 1 to 199 points, 0.65 for
  200 to 999, and 0.9 for 1000 and more (the boss's 2000 and 3000), and the number is always drawn
  to fill 70% of the bubble's width, so it stays legible at any size. The 200-point bubble's number is orange (`#ff9a2a`), so the fast
  zombie's reward stands out.
- **Where it starts:** 1.5 units above where the enemy fell (a flying crow at its own height plus
  0.5), at its x and z.
- **Its life:** 1.2 seconds. It grows from 60% to full size in the first 0.15 seconds, rises 1.6
  units, drifts sideways in a slow wave (0.15 units either way, one swing over its life, its own
  phase so two bubbles do not move together), stays whole until 0.8 seconds, then fades to nothing by
  1.2 seconds. It fades away in the air: it does not pop, land or leave anything behind.
- **Reduced motion** (`game.reducedMotion`): it does not rise, drift or grow: it appears at full size
  (100%, not the 60% the normal bubble starts at), stays where it appeared and fades out over 0.8
  seconds.
- **At most 12 bubbles** at once; when a 13th comes, the oldest goes.
- **It only shows:** it is never a target, never blocks a shot or a pick (its `raycast` does
  nothing), gives no points, and is drawn over the scene (no depth test, so a fence or a crowd does
  not hide it) but under the HUD, which is the page over the canvas.

## Every screen

- Loading, error, title and the intro card: no bubbles, as no points can be won.
- Play, the gaps between waves and the boss fight: as above.
- Paused: every bubble freezes where it is, as it was, and goes on from there.
- Victory and defeat: the scene freezes as it is, bubbles included; they do not go on fading. The
  boss's own bubble is not affected: the victory card comes 1.5 seconds after the boss falls and the
  bubble lasts 1.2 seconds, so it is gone before the card. Any other bubble still on its way when
  the victory or defeat card appears stays frozen where it is until the next start.
- Each level start, **Try again**, **Play again**, **Next level** and **Back to title** clear them
  all.

## Nothing else changes

The score and its display, the points of everything, waves, the weapons, the sounds (no new sound),
the HUD, the fences, the zombies, the weather, `get_state` and `llms.txt` stay as they are. No new
text appears in the HUD.

## Files

- `src/logic/effects.js`: a list of bubbles beside the streaks and bursts: made with the points, the
  place and the `reducedMotion` flag; updated by `dt` (it already updates on the game's live and
  play clock as the other effects do); a function that says a bubble's size, height, sideways drift
  and opacity at its age; and the cap of 12. Under 200 lines.
- `src/logic/game.js`: one call where each award is added to the score (`this.score +=`), at most
  10 lines longer than today.
- `src/view/bubbles.js`: draws them: one textured, translucent sprite or quad per bubble, its
  texture drawn on a canvas once for each value and cached, made and removed as the list changes,
  disposed with the scene on a level change. Under 200 lines.
- `src/view/stage.js`: calls it; at most 10 lines longer than today.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the bubbles
is the supervisor's step. The builder may add and edit test files, and the fake three.js in the
tests, as far as the new drawing needs it (a sprite, a canvas texture and their disposal). It changes
no earlier test except by adding what those need.

## Done when

`node --test` passes, and its tests prove:

1. Each award makes exactly one bubble with the points it gave: a zombie 100, a fast zombie 200
   (double a zombie's), a pumpkin monster 250, a shot-down pumpkin 25, a crow its points, the boss its
   points; a fall that gives no points, such as everything bursting with the boss, makes none.
2. The bubble's curve: it starts at 60% size, is full size at 0.15 seconds, has risen 1.6 units and
   drifted within 0.15 either way at 1.2 seconds, is at full opacity up to 0.8 seconds and at 0
   by 1.2 seconds, and is then gone from the list.
3. With reduced motion a bubble's position and size never change, and it fades from full to 0 over
   0.8 seconds.
4. No more than 12 bubbles at once, the oldest dropped first.
5. They stand still while paused and go on from the same age; they stand still on victory and
   defeat; a level start, Try again, Play again, Next level and Back to title clear them.
6. The stage (with the fake three.js) makes a bubble for each in the list and removes it when it is
   gone; a bubble ignores rays and is not in what a shot can hit; a bubble's size is 0.5, 0.65 or 0.9 across by its
   points as above, and the 200-point bubble has its own number colour; the textures are made once per value; nothing is left in the scene
   after a level change.
7. Nothing about the score changes: the same game with and without the bubbles ends with the same
   score, and the game's `random` is not called for them.
8. Any new file is under 200 lines, and `game.js` and `stage.js` are no longer than the limits above.
