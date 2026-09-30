# 24: zombie eye flicker

Run this after spec 23 is merged.

## What the owner wants

A small refinement of the zombies, one of five small bits made one after another (specs 22 to 26):
eyes that flicker a little. The owner asked on 30 September 2026 and left the details to us; these are the defaults we
propose. It is small: nothing else about the zombie changes.

## The bit

The reference is today's zombie (`buildZombie` in `src/view/models/zombie.js`, with the small parts
in `src/view/models/zombie-details.js`).

**Eyes that flicker.** The eyes' glow breathes: each eye's colour is its base colour (`#ff3b30`, or a
fast zombie's `#ff2a1a`) multiplied by a brightness `k(t) = 0.85 + 0.15 × (0.5 + 0.5 × sin(2π × t / 1.7 + phase))`,
with `phase = seed × 2.3` radians, so `k` runs between 0.85 and 1 and a crowd does not flicker in
step. `tick(t, …)` sets it on both eyes' materials. With reduced motion (`twitch` false) the
eyes stay steady at `k = 1`, exactly today's colour. The halos, sockets and everything else about
the eyes are as today. The flag is `flicker`, on in `ZOMBIE_EXTRAS`.

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

- `src/view/models/zombie-details.js`: the flag and the brightness function.
- `src/view/models/zombie.js`: keeps each eye's material and `tick` sets it; at most 6 lines longer than today.

New files stay under 200 lines. `zombie.js` (174 lines) stays under 200: put the bit's code in
`zombie-details.js` and call it. The Pages workflow copies `src` whole, so it needs no change.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the zombie is
the supervisor's step. The builder may add and edit test files. It changes no earlier test, except
that a test asserting the exact list of a zombie's parts (a count of meshes) may be updated to count
the parts named here, and only that number. It may also update the earlier zombie tests' exact assertions that this bit makes fail: the exact `ZOMBIE_EXTRAS` object, and the assertions that a zombie's `tick` gives today's exact rotations or colours when built with the stage's extras (`test/zombie-hair-tufts.test.js` and the other zombie model tests). It changes only those flags and numbers, and nothing else in them. 

## Done when

`node --test` passes, and its tests prove:

1. With `flicker` off the eyes' colour is today's at every `t`; with it on, `k` is always between 0.85 and 1, and the eye colour is the base colour times `k`.
2. `k(t)` follows the formula: `k(0)` for seed 0 is 0.925, and it repeats every 1.7 seconds; two seeds differing by 0.5 have different `k` at the same `t`.
3. With reduced motion (`twitch` false) the eyes are exactly their base colour at every `t`.
4. A fast zombie's eyes flicker around `#ff2a1a`, an ordinary zombie's around `#ff3b30`; the halos' colour and opacity do not change.
5. The stage builds every ordinary and fast zombie with the flicker on; the King's eyes are steady.
6. `zombie.js` stays under 200 lines and any new file is under 200 lines.
