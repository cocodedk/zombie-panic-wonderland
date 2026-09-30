---
lean_status: pr_open
lean_pr: https://github.com/cocodedk/zombie-panic-wonderland/pull/20
---
# 20: refined zombies

Run this after spec 19 is merged.

## What the owner wants

The zombies' look refined a little bit, no more. The owner asked on 30 September 2026 and left the
details to us; these are the defaults we propose: four small touches, each a few small shapes made in
code. The zombie stays the same figure: the same size, silhouette, colours, walk, twitch and
proportions.

## The four touches

The reference is today's zombie (`buildZombie` in `src/view/models/zombie.js`): hunched, long arms,
tilted head, torn shirt, glowing eyes. Only these parts are added, to every zombie, ordinary or fast,
and to the Zombie King, which is the same figure made bigger.

1. **Eye sockets.** A dark box behind each eye, so the eye glows out of a shadow: `0.11 × 0.075 × 0.03`,
   colour `#1a1512`, at the eye's x, y 0.03, z 0.172 (just behind the eye, which is at z 0.18). The
   eyes and the fast zombie's halos are exactly as they are.
2. **Claws.** Three short dark claws on each hand: cones of radius 0.015 and length 0.09 (3 sides),
   colour `#2a2622`, at x −0.035, 0 and 0.035 across the hand, pointing on along the arm, just past
   the fist. They move with the arm.
3. **A stain.** One dried dark-red patch on the shirt: a flat box `0.16 × 0.14 × 0.02`, colour
   `#4a1f24`, on the torso's front at x −0.08, y 0.2, z 0.151 (level with the torn patches that show
   the skin today), turned 0.3 radians about z.
4. **A little variety.** No two zombies have exactly the same skin. The model takes a `tint`, a number
   from −0.06 to 0.06, defaulting to 0, which lightens (positive) or darkens (negative) the skin and
   the shirt colours by that fraction of their lightness, in HSL. With `tint` 0 the colours are exactly
   today's. The stage passes each zombie a tint drawn from its id, so the same zombie always has the
   same tint, and a crowd differs. It never uses the game's `random`.

## What does not change

The zombie's size, proportions, silhouette (except that the claws reach 0.09 past each fist, the one
change to the outline), walk, arm swing, head twitch and jaw; the base colours,
including the fast zombie's darker ones and its eyes, halos and speed; how a zombie is picked and hit
(a zombie's parts are parts of the zombie, so a shot at a claw is a shot at the zombie); the burst
chunks and their colours; the fading copy under reduced motion, which is the same refined model with
the same tint; the boss's crown; every other model, sound and rule.

## Every screen

The zombies show where they do today, and nowhere else: loading, error, title and the intro card show
none; play, the gaps between waves and the boss fight show them; paused freezes them as today; victory
and defeat freeze the scene as it is. There is no new text, no HUD change and no new sound.

## Files

- `src/view/models/zombie-details.js` (new): the sockets, the claws and the stain, and the tint.
  Under 200 lines.
- `src/view/models/zombie.js`: calls it; it stays under 200 lines (it is 171 today).
- `src/view/stage.js`: passes each zombie's tint (drawn from its id) with the other model parameters,
  at most 5 lines longer than today.
- `src/logic/game.js`: a fading copy gets a new effect id, so the fade data also carries the fallen
  zombie's own id (`enemyId`), from which the stage draws the same tint; at most 5 lines longer than
  today. `src/logic/effects.js` may carry the field through, at most 3 lines.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the refined
zombie is the supervisor's step. The builder may add and edit test files. `tint` defaults to
0, so a colour an earlier test reads from the model itself is unchanged. The stage's zombies get a
nonzero tint, so the builder **may update the exact colour assertions** that read a zombie's colours
from the stage or from a fading copy (`test/fast-zombies-view.test.js` has them) to allow for the tint
(for example by asserting the colour with `tint` 0, or within ±6% of the base). It changes only those
colour assertions, and nothing else in any earlier test.

## Done when

`node --test` passes, and its tests prove:

1. A zombie has two eye sockets, six claws (three on each hand) and one stain, with the sizes, colours
   and places above; a fast zombie and the Zombie King have them too; the eyes and halos are as before.
2. The claws move with the arms: when an arm swings, its three claws move with it, and none stays
   behind.
3. With `tint` 0 a zombie's skin and shirt colours are exactly today's, for an ordinary and a fast
   zombie; a positive tint makes them lighter and a negative one darker, by at most 6% of their
   lightness; a `tint` beyond 0.06 is limited to it.
4. The stage gives the same zombie the same tint every time and different zombies different tints
   (ids 1 to 50 give at least 10 different ones), all within ±0.06, and the game's `random` is not
   called for it.
5. The size, the walk, the twitch, the jaw and the head's angle are exactly as before: a zombie's tick
   gives the same rotations as today.
6. The fading copy under reduced motion has the same tint as the zombie it copies.
7. Any new file is under 200 lines, `zombie.js` stays under 200, and `stage.js` is at most 5 lines
   longer than today.
