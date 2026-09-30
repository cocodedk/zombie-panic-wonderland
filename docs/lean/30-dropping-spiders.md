# 30: dropping spiders

Run this after spec 29 is merged. The third of the six level 3 specs (see `docs/level-3-plan.md`).

## What the owner wants

Spiders that come down from above on a thread, now and then among the ones that scuttle in. The owner
asked on 30 September 2026 and left the details to us; these are the defaults we propose.

## The rule

A fixed rule in the data, never chance (the game's `random` is not used for it): level 3's spider entry
gains `drop: { fromWave: 2, every: 3, at: -5, from: 5, time: 1.2 }`. From wave 2 on, in each wave, every
`every`th spider that wave sends (the 3rd, the 6th, counting spiders only, from 1 at the start of each
wave) is a **dropper**: instead of appearing at z −12 it appears at z `at` (−5), at its usual random x,
hanging `from` (5) units above the ground on a thread, and lowers to the ground over `time` (1.2)
seconds at an even speed. Then it is an ordinary spider (spec 29) and walks from there.

- **While it lowers** it does not walk and does not strike; it can be hit (2 hits, 150 points) as
  any spider can, by aiming at it in the air; if it falls while hanging its thread goes with it.
- **Where it is hit:** a hanging dropper's centre is its body's, at the height of its root plus 0.3
  (`from × (drop / time) + 0.3`), so a launcher's blast, a gas canister's fireball, the burst, the score
  bubble and a reduced-motion fade all use that airborne place; a landed one is at 0.3, as any spider.
  (`centre(e)` in `game-outcome.js` reads the dropper's `drop`.)
- **The rest is a spider's:** its speed, reach, strike, points and burst. From z −5 it needs about 2.3
  seconds to reach the road (5 / 2.2) once landed.
- **Wave counts do not change:** a dropper is one of the wave's spiders, not an extra one.

## What the player sees

The reference is spec 29's spider. A dropper is that spider model, plus a **thread**: a thin box 0.012 across, `#d8e0ea` at 0.7 opacity,
unlit, from the spider's back (0.5 above its root) straight up to a **fixed top** at `from + 0.5` (5.5)
above the ground. The spider hangs from that point: at the start of the drop the thread is as short as
the spider's back is close to the top (its length is 0) and it lengthens as the spider lowers, to 5 at
the ground, where the thread is removed in the same update as the spider lands (its `drop` becomes absent), so no
frame is ever drawn with a full-length thread and a landed spider. The thread ignores rays. Nothing
else about the picture changes. No new text, no new sound.

## Every screen

- Loading, error and title: no droppers or threads, as no enemy shows there.
- Intro card: none yet.
- Play: droppers and their threads show, lower and then walk, as above.
- The gap between waves: none (a wave is cleared when all its enemies have fallen).
- Paused: a hanging dropper and its thread freeze where they are, drawn behind the paused band, and go on
  from there.
- Victory and defeat: the scene freezes as it is, so a hanging dropper and its thread stay drawn,
  frozen, behind the card, and do nothing.
- Each level start, Try again, Play again, Next level and Back to title start fresh, with none, and the
  count of spiders starting again each wave.

## Nothing else changes

Ordinary spiders, zombies, every other enemy, levels 1 and 2, the weapons, `get_state` (`enemies` counts
droppers), `llms.txt` (unchanged).

## Files

- `src/logic/game-waves.js`: marks droppers when a wave's queue is spawned and places them (at most 14
  lines longer than today); `src/logic/game-time.js` or `game-enemies.js`: lowers them (at most 10
  lines longer). An enemy gets a `drop` field, the seconds it still has to lower (`time` at first,
  absent once landed).
- `src/view/stage-entities.js`: the height of a dropper's root is `from × (drop / time)` above the ground and
  the thread with it; at most 12 lines longer, or a new file `src/view/stage-thread.js` under 200 lines.
- `src/levels/level-3.js`: the `drop` data.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of a spider on its
thread is the supervisor's step. The builder may add and edit test files. It changes no earlier test
except where one asserts the exact fields of a spawned spider or the exact data of level 3's spider (a new
`drop` field, as `test/spiders.test.js` does), and only that. It may also update, in `test/level3.test.js`, the assertion that level 3's `enemies` equal the earlier level's plus the kinds already added (they now include this spec's), and only that assertion.

## Done when

`node --test` passes, and its tests prove:

1. In level 3, from wave 2 on, exactly every 3rd spider of each wave is a dropper; wave 1 has none; the
   counts restart each wave; the wave's totals and order are unchanged; the game's `random` is not
   called for it.
2. A dropper appears at z −5 at height 5, lowers evenly to 0 in 1.2 seconds, is not walking or
   striking while it lowers, and then walks as a spider from z −5 (reaching the road about 2.3 seconds
   after it lands).
3. A dropper can be hit and felled while hanging (2 hits, 150 points), with its thread; its centre, so
   the launcher's blast, the burst, the score bubble and the reduced-motion fade, is at its airborne
   height plus 0.3; a landed one is an ordinary spider at 0.3.
4. The stage: a dropper's height follows `drop`; its thread runs from the spider's back to the fixed top
   at 5.5, is 0 long at the start and 5 long at the ground, is 0.012 across, ignores rays, and is removed
   on landing and when the spider falls; nothing is left after a level change.
5. Paused, a dropper hangs still and goes on; a fading copy under reduced motion has no thread.
6. Files within the limits; any new file under 200 lines.
