# 31: wolves

Run this after spec 30 is merged. The fourth of the six level 3 specs (see `docs/level-3-plan.md`).

## What the owner wants

Wolves in level 3: fast, tough runners that hit hard, and a wolf model made in code. The owner asked on
30 September 2026 and left the details to us; these are the defaults we propose (a fast runner, the plan's
answer to its question 2).

## The wolf

A new enemy kind, `wolf`, with its data in level 3's `enemies`:
`wolf: { hits: 4, points: 200, speed: 3, reach: 1.6, closeIn: 1, strikeEvery: 1.5, hearts: 2 }`.

- **It runs** from where it spawns (x across the field, z −12) straight to the road at 3 units a second
  (12 units in 4 seconds), then closes in on the player's x to within `closeIn` and strikes every
  `strikeEvery` seconds while within `reach`, for `hearts` (2) hearts: the walker of spec 29 gains
  `hearts` (default 1) in its strike, `this.hurt(c.hearts ?? 1)`.
- **It is held by fences**, as a zombie is (it follows the zombie's fence rule at its own speed); level
  3 has none, so it runs straight there. It has no fast rule and no groan.
- **It falls after 4 hits** (200 points, double a zombie's) and bursts into grey chunks.
- **Waves in level 3** gain wolves, each wave's enemies one second apart in this order (zombie, spider,
  wolf, pumpkin monster, crow): wave 3 gains 1 wolf, wave 4 gains 2 wolves, wave 5 gains 2 wolves; waves
  1 and 2 have none. Their other counts are spec 29's.

## The model

The reference is the zombie's own look (`buildZombie`: flat-shaded, low-poly, no textures) for the style, and
this side-view sketch for the shape:

```
        /\_/\                     ears up, snout long, tail low and full
   ____/ o  o\__ >                eyes yellow
  (  chest  body  )~~~~~          torso lean, chest patch lighter
   || ||    || ||                 four legs, front pair and hind pair gallop
```

`buildWolf({ seed = 0, size = 1 })` in a new file `src/view/models/wolf.js`, made in code, flat-lit,
facing +z: a lean quadruped about 1.4 long and 0.9 high at the shoulder.

- **Body:** a torso box 0.4 wide, 0.4 high and 0.8 long in `#6e6e78`, a lighter chest patch `#9a9aa4`, a
  head (a box 0.26 × 0.24 × 0.3) with a snout (a cone, radius 0.09, length 0.22, `#5a5a64`) and two
  pointed ears (cones, radius 0.05, length 0.14), a tail (a cone, radius 0.07, length 0.4) trailing
  behind and down, and two eyes (small boxes, unlit) in `#ffd34a`.
- **Legs:** four cylinders (radius 0.05, length 0.5) pivoting at the shoulders and hips, in `#5a5a64`.
- **Its gait:** `tick(t, { walk = 1 })` gallops: front legs `sin(t × 9 + seed) × 0.6 × walk` and hind legs the
  same a quarter turn behind; the body bobs 0.04; the tail swings ±0.2. Standing, the legs are still.
  Under reduced motion the gait stays (it is the run's own shape).
- **A hit target:** it is as large as it looks: the meshes of the model are the target (no extra sphere);
  the tail's cone, the ears and the eyes ignore rays (`ignoreRays`).
- **Turning:** at the road it turns toward the player as the zombie does (`rotation.y` 0.9).

## Where it plugs in

`ENEMIES.wolf` in the stage's table (seeded from the id, the fading copy built the same way from
`enemyId`); the stage's `walking` flag and turn treat wolves as they treat zombies; `BURSTS.wolf`:
`{ count: 12, life: 1, size: 0.18, colors: ['#6e6e78', '#9a9aa4', '#5a5a64'], puff: '#8a8a94',
puffSize: 1 }`; `spawn(kind)` gives a wolf its `strike` timer; `get_state`'s `enemies` counts wolves. No
new sound.

## Every screen

- Loading, error and title: no wolves (the title's scene is level 1's), as no enemy shows there.
- Intro card: none yet.
- Play: wolves run in with the wave, as above; the boss fight in this spec has none (the Zombie King's
  summons are zombies).
- The gap between waves: none on the field (a wave is cleared when all its enemies have fallen).
- Paused: every wolf on the field freezes where it is, drawn behind the paused band, and goes on from
  there.
- Victory and defeat: the scene freezes as it is, so a wolf on the field stays drawn, frozen, behind the
  card; it does nothing.
- Each level start, Try again, Play again, Next level and Back to title start fresh, with none. No new text
  and no HUD change: a wolf's strike takes 2 hearts from the same row of hearts.

## Nothing else changes

Spiders, zombies, every other enemy, levels 1 and 2, the weapons, `get_state`, `llms.txt` (one clause:
level 3 has wolves).

## Files

- `src/view/models/wolf.js` (new), under 200 lines.
- `src/logic/game-enemies.js`, `game-time.js`, `game-waves.js`: the wolf joins the walker (a wolf's
  `hearts`, its timer, its fence rule); at most 10 lines longer each.
- `src/view/stage.js`, `src/view/stage-entities.js`, `src/logic/effects.js` (`BURSTS.wolf`, keeping it
  under 200 lines): a few lines each. If `effects.js` would pass 200 lines, move the `BURSTS` table into a
  new file `src/logic/bursts.js` and re-export it from `effects.js`.
- `src/levels/level-3.js`: the wolf's data and the waves. `llms.txt`: one clause.

## Balance

There is no bot play-test for this spec: balance is bounded by the data, and how it feels to play is the
supervisor's step, made by hand after the pull request opens. The bounds (the tests check them): no wave
has more than 2 wolves; a wolf needs 4 hits, so the Popper (8 shots a second) fells one in at most 0.5
seconds, and a wolf takes 4 seconds to run from its spawn to the road (12 at 3 a second); a wolf's strike
takes 2 of the player's 5 hearts, and it strikes at most once every 1.5 seconds.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of a wolf is the
supervisor's step. The builder may add and edit test files. It may change an earlier test only where it
asserts level 3's waves or counts its enemies, or the exact list of a level's enemy kinds, and only those. It may also update, in `test/level3.test.js`, the assertion that level 3's `enemies` equal the earlier level's plus the kinds already added (they now include this spec's), and only that assertion.

## Done when

`node --test` passes, and its tests prove:

1. A wolf spawned free runs straight to the road in 4 seconds (±0.1), closes in to within 1 of the
   player's x and strikes 2 hearts every 1.5 seconds within 1.6 of it, not before the road; a zombie's
   strike is still 1 heart; a spider's too.
2. A wolf is held by fences as a zombie is and runs on a level with none straight, and has no groan and no
   fast rule.
3. A wolf falls after 4 hits (200 points) and bursts with `BURSTS.wolf`; shots through its body hit it.
4. Level 3's waves follow the counts and the order above, one second apart.
5. The model: the parts, sizes and colours above; the gait: the legs' swing within ±0.6, a quarter turn
   apart, still when `walk` is 0, the same under reduced motion; the extras ignore rays.
6. The stage builds and removes wolves like other enemies; a fading copy under reduced motion is the
   same model; paused, wolves stand still and go on; a level start starts fresh.
7. The balance bounds above hold in the data: at most 2 wolves a wave, 4 hits, a 4-second run, 2 hearts
   every 1.5 seconds, and the Popper fells one in 0.5 seconds or less.
8. Files within the limits; any new file under 200 lines.
