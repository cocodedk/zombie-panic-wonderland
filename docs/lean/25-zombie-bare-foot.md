# 25: zombie bare foot

Run this after spec 24 is merged.

## What the owner wants

A small refinement of the zombies, one of five small bits made one after another (specs 22 to 26):
one bare foot. The owner asked on 30 September 2026 and left the details to us; these are the defaults we
propose. It is small: nothing else about the zombie changes.

## The bit

The reference is today's zombie (`buildZombie` in `src/view/models/zombie.js`, with the small parts
in `src/view/models/zombie-details.js`).

**One bare foot.** The foot of the zombie's limping side (the same leg as the limp in spec 23,
`side = Math.round(seed / 1.7) % 2`, with the default seed 0 the left) has no shoe: its box
(0.16 × 0.08 × 0.26) is the zombie's skin colour, tint included, in place of the shoe's `#2a2622`.
The other foot keeps its shoe. The flag is `bareFoot`, on in `ZOMBIE_EXTRAS`.

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

- `src/view/models/zombie-details.js`: the flag and the choice of side (shared with the limp's).
- `src/view/models/zombie.js`: uses it when it builds the feet; at most 6 lines longer than today.

New files stay under 200 lines. `zombie.js` (174 lines) stays under 200: put the bit's code in
`zombie-details.js` and call it. The Pages workflow copies `src` whole, so it needs no change.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the zombie is
the supervisor's step. The builder may add and edit test files. It changes no earlier test, except
that a test asserting the exact list of a zombie's parts (a count of meshes) may be updated to count
the parts named here, and only that number. 

## Done when

`node --test` passes, and its tests prove:

1. With `bareFoot` off both feet are `#2a2622`; with it on, the foot of the side `Math.round(seed / 1.7) % 2` has the skin colour (an ordinary zombie's `#7d9a6a`, a fast one's darker skin, both with their tint) and the other is `#2a2622`.
2. The same seed always has the same bare foot; seeds 1.7 and 3.4 have different ones.
3. The feet's size and place are as before, and the legs, pants and walk are as before.
4. The stage builds every ordinary and fast zombie with the bare foot on; the King has both shoes.
5. `zombie.js` stays under 200 lines and any new file is under 200 lines.
