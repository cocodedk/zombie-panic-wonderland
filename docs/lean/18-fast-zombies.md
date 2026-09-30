# 18: fast zombies

Run this after spec 17 is merged: it builds on 17's zombie walk (the fences and the gaps).

## What the owner wants

Now and then a faster zombie among the ordinary ones, darker, with more glow in its eyes. The owner
asked on 30 September 2026 and left the details to us; these are the defaults we propose.

## When they come

A fast zombie is an ordinary zombie (kind `zombie`) with `fast: true`. It is chosen by a fixed rule,
never by chance, so the game's `random` is not touched and a seeded game plays out as it does today
apart from the fast zombies themselves:

- From wave 2 on, in every wave, **every 4th zombie** in the order the wave sends them (the 4th, the 8th)
  is fast. Wave 1 has none.
- Zombies a boss summons are ordinary. Pumpkin monsters and crows are not zombies and are not counted.
- The rule is data in each level's zombie entry, `fast: { fromWave: 2, every: 4, speedFactor: 1.6, points: 150 }`,
  in both levels.

With today's waves that is one fast zombie in level 1's waves 2, 3 and 4, and two in its wave 5 (8
zombies); the level 2 waves follow the same rule from their own counts.

## How they play

- **Speed:** 1.6 times the level's zombie speed, so 1.92 where the zombie's speed is 1.2. Everything
  that uses a zombie's speed uses its own, spec 17's walk to a gap included. A fast zombie that
  spawns in a gap reaches the road in 6.25 seconds, against 10.
- **Everything else is a zombie's:** 3 hits, `reach`, `closeIn`, `strikeEvery`, damage, the groan on
  reaching the road, falling and bursting, the explosions and the crosshair.
- **Points:** 150 instead of 100, when it falls to the player's shots. Nothing else about scoring
  changes.

## What the player sees and hears

The reference is today's zombie model (`buildZombie`): the shape, size, walk and twitch do not
change. Only these parts do, for a fast zombie:

- **Darker:** skin `#4a5c40`, shirt `#2e2a3a` and pants `#22201d`, in place of `#7d9a6a`, `#5b5270`
  and `#3d3a35`.
- **More glow in the eyes:** the eyes are 1.8 times larger (in every direction) and `#ff2a1a` in
  place of `#ff3b30`, and each has a soft halo: a small flat square, 0.16 across, additive blending
  in `#ff3b30` at 0.55 opacity, that does not write depth and ignores rays, just in front of the eye
  and facing the camera. An ordinary zombie's eyes are as today, with no halo.
- **When it falls or bursts:** the look it had is kept (the fall, the burst and the fade draw the
  same model).

There is no new sound, no new text and no HUD change. The fast zombie is picked, hit and hurt like
any zombie.

## Every screen

- Loading, error and title: no zombies, as today.
- Intro card: no zombies yet, as today.
- Play, the gaps between waves and the boss fight: as above.
- Paused: everything freezes as today, a fast zombie included, and it goes on from where it was.
- Victory and defeat: the scene freezes as it is, as today.
- Each level start, **Try again**, **Play again**, **Next level** and **Back to title** start fresh,
  as today: the count for "every 4th" begins again with each wave.

## Nothing else changes

Wave sizes, spawn spacing and timing, ordinary zombies, pumpkin monsters, crows, the boss and its
summons, the weapons, the fences, the weather, the sounds, `get_state` (`enemies` is a count and stays
one) and `llms.txt` stay as they are.

## Files

- `src/levels/level-1.js` and `level-2.js`: the `fast` data.
- `src/logic/game.js`: marks the fast zombies when a wave's queue is spawned, and reads its speed and
  points; at most 25 lines longer than today.
- `src/view/models/zombie.js` and `src/view/stage.js`: the fast look, passed from the enemy's `fast`
  flag (including for the falling and fading copies); `stage.js` at most 10 lines longer than today.

New files stay under 200 lines; `game.js` and `stage.js` are not split.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the dark
zombies is the supervisor's step. The builder may add and edit test files. It may change an earlier
test only where that test asserts a wave's points, or a zombie's arrival time or position, and only
those numbers; it changes nothing else in them.

## Done when

`node --test` passes, and its tests prove:

1. In each level, wave 1 has no fast zombie; from wave 2 on, in each wave, exactly the 4th, 8th, …
   zombie spawned is fast, counting zombies only; summoned zombies, pumpkin monsters and crows never are.
2. The rule is fixed: two games with different seeds mark the same zombies, and the game's `random`
   is not called for it (a game with a counting `random` calls it the same number of times as before).
3. A fast zombie that spawns free (x 0.5) reaches the road in 6.25 seconds (±0.05) where an ordinary
   one takes 10; one that must shift to a gap moves at 1.92 along its line.
4. A fast zombie falls to 3 hits, is worth 150 points, and strikes with an ordinary zombie's reach
   and rhythm; an ordinary zombie is worth 100.
5. The model (with the fake three.js): a fast zombie's skin, shirt, pants and eye colours are the
   darker ones, its eyes are 1.8 times larger, and it has two additive halos that are not written to
   depth and ignore rays; an ordinary zombie has none of those, and its model is exactly as before;
   the fade and burst copies of a fast zombie keep the look.
6. Paused, a fast zombie stands still and goes on from the same place; a level start, Try again,
   Play again, Next level and Back to title start fresh.
7. Any new file is under 200 lines, and `game.js` and `stage.js` are no longer than the limits above.
