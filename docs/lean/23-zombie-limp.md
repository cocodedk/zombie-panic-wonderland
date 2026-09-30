---
lean_status: questions
lean_rounds: 1
lean_asked: May the builder update the exact `ZOMBIE_EXTRAS` and unchanged-rotation assertions in `test/zombie-hair-tufts.test.js`,
  which the new limp makes fail but the spec’s earlier-test exception does not permit?; May the builder
  edit `src/view/stage.js` to seed a reduced-motion fading copy from `enemyId`, so it keeps the fallen
  zombie’s fixed limping side despite the spec listing only two model files?
---
# 23: zombie limp

Run this after spec 22 is merged.

## What the owner wants

A small refinement of the zombies, one of five small bits made one after another (specs 22 to 26):
a limp: one leg that swings less. The owner asked on 30 September 2026 and left the details to us; these are the defaults we
propose. It is small: nothing else about the zombie changes.

## The bit

The reference is today's zombie (`buildZombie` in `src/view/models/zombie.js`, with the small parts
in `src/view/models/zombie-details.js`).

**A limp.** One leg of each zombie swings only 60% as far as the other, so it walks with a limp.
Which leg is the zombie's own and never changes: `side = Math.round(seed / 1.7) % 2` (the stage's
`seed` is the zombie's id times 1.7, so even ids limp on the left leg, `legs[0]`, and odd ids on the
right, `legs[1]`; with the default seed 0 it is the left). `tick` sets that leg's `rotation.x` to
`0.6 ×` what it sets today, and the other leg is as today. Standing (`walk` 0) nothing changes: both
legs are at 0. The flag is `limp`, on in `ZOMBIE_EXTRAS`. With reduced motion (`twitch` false) the
limp stays: it is the walk's own shape, not extra motion.

It applies to ordinary and fast zombies, and not to the Zombie King. The stage passes the flags in
`ZOMBIE_EXTRAS` (in `zombie-details.js`) to zombies only; `buildZombie` takes them as `extras` and
defaults every flag to off, so a model built without `extras` is exactly today's, and so is every
earlier test. A fading copy under reduced motion is built the same way as its zombie, so it has the
bit too.

## What does not change

The zombie's size, proportions, colours, tint, walk, arm swing, head twitch, jaw, eyes, halos, claws,
sockets and stain (unless named above); its speed, points, hits and the way it is picked and hit; the
burst chunks; the Zombie King, every other model, every rule, sound and screen text; `get_state`
and `llms.txt`.

## Every screen

The zombies show where they do today, and nowhere else: loading, error, title and the intro card show
none; play, the gaps between waves and the boss fight show them; paused freezes them, and anything that
moves goes on from where it was; victory and defeat freeze the scene as it is. No new text, no HUD
change and no new sound. Each level start, **Try again**, **Play again**, **Next level** and **Back to
title** start fresh, as today.

## Files

- `src/view/models/zombie-details.js`: the flag, and the function that says which leg limps.
- `src/view/models/zombie.js`: `tick` uses it; at most 6 lines longer than today.
- `src/view/stage.js`: a zombie's fading copy under reduced motion is seeded from the fallen zombie's own id (`enemyId`, which the fade data carries since spec 20) and not from the fade's effect id, so its limping side (and every later bit that depends on `seed`) is the zombie's; at most 3 lines longer than today.

New files stay under 200 lines. `zombie.js` (174 lines) stays under 200: put the bit's code in
`zombie-details.js` and call it. The Pages workflow copies `src` whole, so it needs no change.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the zombie is
the supervisor's step. The builder may add and edit test files. It changes no earlier test, except
that a test asserting the exact list of a zombie's parts (a count of meshes) may be updated to count
the parts named here, and only that number. It may also update the earlier zombie tests' exact assertions that this bit makes fail: the exact `ZOMBIE_EXTRAS` object, and the assertions that a zombie's `tick` gives today's exact rotations or colours when built with the stage's extras (`test/zombie-hair-tufts.test.js` and the other zombie model tests). It changes only those flags and numbers, and nothing else in them. 

## Done when

`node --test` passes, and its tests prove:

1. With `limp` off a zombie's `tick` gives exactly today's leg rotations; with it on, at walk 1 the limping leg's rotation is 0.6 of today's and the other is today's, at several times `t`.
2. The limping side is `Math.round(seed / 1.7) % 2`: seeds 1.7 and 5.1 (ids 1 and 3) limp on the right leg, 3.4 (id 2) on the left, the default 0 on the left; the same seed always limps the same leg.
3. Standing (`walk` 0) both legs are at rotation 0, limp or not; the arms, torso, head and jaw are as before.
4. The stage builds every ordinary and fast zombie with the limp on; the King is built without it and walks as today.
5. `zombie.js` stays under 200 lines and any new file is under 200 lines.
