# 28: level 3, the shell

Run this after spec 27 is merged. It is the first of six specs that build level 3, the Spider Wood
(the plan is in `docs/level-3-plan.md`): spec 29 adds spiders, 30 dropping spiders, 31 wolves, 32
bats and 33 the Spider Queen. This one gives the game a third level that plays like the earlier ones,
with today's enemies only.

## What the owner wants

A third level, the Spider Wood: a webbed twilight forest, after level 2's cornfield. The owner asked
on 30 September 2026 and left the details to us; these are the defaults we propose. Every model stays
our own, made in code. The level uses the same components and rules as levels 1 and 2.

## The level

`src/levels/level-3.js`, exporting `level3`, in the shape of `level-2.js`:

- `name: 'The Spider Wood'`, `number: 3`, and `text`: intro `The wood is silent. Something watches from
  the webs.`, boss `The Zombie King rises!`, victory `You made it through the wood — for now.`
- `player`, `roadZ`, `spawn` and `timing` as level 2 has them (level 1's).
- `enemies`: level 2's (`...level2.enemies`: the zombie with its fast rule, the pumpkin monster and the
  crow).
- `waves`, five, each wave's enemies one second apart in this order: 1: 5 zombies, 1 crow. 2: 6 zombies,
  2 crows. 3: 6 zombies, 1 pumpkin monster, 2 crows. 4: 7 zombies, 2 pumpkin monsters, 3 crows. 5: 8
  zombies, 2 pumpkin monsters, 3 crows.
- `boss`: level 1's Zombie King exactly (`...level1.boss`: name `Zombie King`, model `zombieKing`, its hits,
  points, stomp and summons). Spec 33 replaces it with the Spider Queen.
- `music`: `{ key: 'E minor', bpm: 92, bars: 8, root: 52, bass: [0, 3, 0, 4, 5, 3, 4, 4], melody: [2,
  null, 4, 3, 2, null, 0, null, 1, 2, 3, null, 4, 3, 2, null, 4, null, 5, 4, 3, null, 2, null, 1, null,
  0, null, -1, null, 0, null] }`.
- `light`: `{ fog: '#1d2b2a', fogFar: 100, sky: '#6b7fa8', ground: '#1a231e', key: '#c9d6ff', keyAt: [-10,
  14, -20], fill: '#8f7fc0' }`.
- `weather`: `{ between: [8, 18], rest: 0.4, gusts: 0.6, leaf: '#6f7f4a' }`.
- `sky`: `{ cycle: 100, clouds: { seed: 7, colors: ['#c7d2e8', '#8fa3c9', '#7d6fa3', '#b9c7d6'] }, moon:
  { radius: 3.5, at: [-16, 24, -72], colors: ['#e6f0d8', '#cfe0ff', '#d9d2f0'] } }`.
- `scenery`, in this order: `{ model: 'sky', top: '#1b1533', horizon: '#3d5a4e' }`, `{ model: 'ground',
  color: '#1f2a24' }`, `{ model: 'road', color: '#8f9a7a', length: 26, width: 2.6, missing: 0.2, seed:
  21 }`; ten `tree` entries (`height` 7 to 9, `seed` 1 to 10) at x −18, −13, −9, −5, 5, 9, 13, 18, −15,
  16 and z −8, −14, −18, −22, −20, −16, −12, −9, −26, −25; four `mushroom` entries (`cap: '#4a6fa5'`,
  `size` 1.6 to 3) at (−11, −4), (11.5, −3), (−6.5, −15) and (7, −17); and six `web` entries (the new
  model, below) at (−9, −7), (9.5, −8), (−3, −19), (4, −21), (−14, −13) and (14, −14), each `size` 2 to
  2.6, `height` 2.8 to 4 and `turn` between −0.5 and 0.5. There are **no fences** in level 3: zombies
  walk straight to the road.
- `main.js` lists `level3` after `level2` in `levels` (`{ levels: [level1, level2, level3] }`).

## The new model: a web

`buildWeb({ size = 2, height = 3, color = '#d8e0ea', seed = 1 })`, in a new file
`src/view/models/webs.js`, registered in the stage's scenery table as `web`: an orb web standing
upright, its centre `height` above the ground, radius `size`: 8 radial spokes and 4 rings (thin boxes,
0.02 thick, flat-lit and unfogged `MeshBasicMaterial`, `color` at 0.55 opacity, double-sided), with a
small ragged gap (one spoke of `seed`'s choosing is missing). Its `raycast` does nothing (shots pass
through it) and it goes with the backdrop when the level changes.

## Getting in and out

- Level 2's victory screen now has **Next level** (starting level 3's intro card) beside **Play again**,
  in place of **Back to title**. Level 3's victory has **Play again** and **Back to title**; its defeat
  has **Try again**. Play again and Try again restart level 3 from its intro card, with the score it
  began with.
- The title page's level buttons (spec 27) now show `Level 3` as well: a click starts level 3 (5
  hearts, score 0, the Popper only).
- Hearts reset to 5 when level 3 starts; the score carries over from level 2.

## What the player sees

The reference is level 2's screens: the HUD, the overlays, the banners and the boss health bar (labelled
`Zombie King` for now) are unchanged; the HUD's right side reads `Level 3 · Wave N / 5`. Only the
backdrop, its palette, the music and the weather change. No new text except the three level texts
above, and no new sound.

## Every screen

Loading, error, title and the intro card as today (the title's scene is level 1's; the level buttons
now number three). Play, the gaps between waves and the boss fight: as level 2's, with level 3's data.
Paused freezes everything; victory and defeat freeze the scene. Each level start, Try again, Play again,
Next level and Back to title start fresh, as today.

## Nothing else changes

Levels 1 and 2's data, rules and looks, the weapons, the fences of levels 1 and 2, `get_state` (its
`level` is now 1, 2 or 3; `llms.txt` says so and describes level 3 in a sentence), the score and the
crates. Crates, canisters and the fast zombies work in level 3 as in the others.

## Files

- `src/levels/level-3.js` (new), `src/view/models/webs.js` (new): each under 200 lines.
- `src/main.js`: the import and the list, at most 3 lines longer.
- `src/view/stage.js`: registers `web` in the scenery table, at most 2 lines longer.
- `llms.txt`: one sentence for level 3 and `level` is `1`, `2` or `3`.

`game.js` and the others are not otherwise touched. The Pages workflow copies `src` whole.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the wood is the
supervisor's step. The builder may add and edit test files, and the fake page. It may change an earlier
test only where that test asserts that level 2 has no next level (its victory buttons, `game.next`), that
the game has two levels (the title's level buttons, `game.levels.length`), or that `level` is 1 or 2, and
only those numbers.

## Done when

`node --test` passes, and its tests prove:

1. Level 3's data: number, name, texts, five waves with the counts and order above (one second apart),
   the boss (level 1's), the palette values, and no `fence` entry in its scenery.
2. Playing through: level 2's victory offers Next level and it starts level 3's intro card with 5
   hearts and the score carried over; level 3's victory offers Play again and Back to title; Try again
   and Play again restart level 3.
3. The title shows three level buttons; `startAt(2)` starts level 3 with score 0, five hearts and only the
   Popper.
4. Zombies in level 3 walk straight (no fences), fast ones included; crows, pumpkin monsters and the
   boss behave as in level 1 and 2.
5. `buildWeb`: 8 spokes (7 with the gap) and 4 rings, the size and height asked for, its colour and
   opacity, no ray hits, the same for the same seed; the stage builds `web` scenery and disposes it with
   the backdrop.
6. The HUD says `Level 3 · Wave N / 5`, `get_state` says `level` 3, and `llms.txt` mentions level 3.
7. The new files are under 200 lines, and `main.js` and `stage.js` are within their limits.
