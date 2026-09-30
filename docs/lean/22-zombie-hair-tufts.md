---
lean_status: pr_open
lean_pr: https://github.com/cocodedk/zombie-panic-wonderland/pull/22
---
# 22: zombie hair tufts

Run this after spec 21 is merged.

## What the owner wants

A small refinement of the zombies, one of five small bits made one after another (specs 22 to 26):
hair tufts on the head. The owner asked on 30 September 2026 and left the details to us; these are the defaults we
propose. It is small: nothing else about the zombie changes.

## The bit

The reference is today's zombie (`buildZombie` in `src/view/models/zombie.js`, with the small parts
in `src/view/models/zombie-details.js`).

**Hair tufts.** Three dark tufts stand up on the head: cones of radius 0.03 and height 0.12 (4 sides),
colour `#2a241c`, with their centres at [−0.07, 0.2, 0.0], [0.0, 0.22, −0.04] and [0.08, 0.19, 0.02]
(head-local) and leaning outward by 0.35, 0 and −0.4 radians about z. They are parts of the head, so
they tilt and twitch with it. The flag is `tufts`, on in `ZOMBIE_EXTRAS`.

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

- `src/view/models/zombie-details.js`: `ZOMBIE_EXTRAS`, the `extras` mechanism and the tufts.
- `src/view/models/zombie.js`: the `extras` parameter and one call.
- `src/view/stage.js`: passes `extras: ZOMBIE_EXTRAS` to zombies (and only to them), at most 4 lines longer than today.

New files stay under 200 lines. `zombie.js` (174 lines) stays under 200: put the bit's code in
`zombie-details.js` and call it. The Pages workflow copies `src` whole, so it needs no change.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the zombie is
the supervisor's step. The builder may add and edit test files. It changes no earlier test, except
that a test asserting the exact list of a zombie's parts (a count of meshes) may be updated to count
the parts named here, and only that number. This first bit of the five also adds the `extras` mechanism: `ZOMBIE_EXTRAS` (an object of flags, all `false` except this bit's) exported from `zombie-details.js`, and the `extras` parameter of `buildZombie` (default: every flag `false`).

## Done when

`node --test` passes, and its tests prove:

1. With `tufts` off (no `extras`) a zombie has no tufts and is exactly today's; with it on, the head has three tufts with the sizes, colour, places and leans above.
2. The tufts are children of the head, so they turn with its twitch; the Zombie King, built without `extras`, has none.
3. The stage builds every ordinary and fast zombie with `ZOMBIE_EXTRAS` and the fading copy under reduced motion likewise; the King is built without it.
4. Nothing else about the zombie changed: its `tick` gives the same rotations as before, its colours are the same.
5. `zombie.js` stays under 200 lines, `stage.js` is at most 4 lines longer than today, and any new file is under 200 lines.
