# 21: clouds and a crescent moon

Run this after spec 20 is merged.

## What the owner wants

21 clouds and a crescent moon, with changing colours. The owner asked on 30 September 2026 and left
the details to us; these are the defaults we propose. It is scenery only: it changes how the sky looks
and nothing about how the game plays.

## The sky data

Each level gets a `sky` entry in its level file, plain data that the stage reads:
`sky: { clouds, moon }`. A new view module `src/view/sky.js` (with the builders in
`src/view/models/sky-details.js`) makes the clouds and the moon with the backdrop and drives them; the
stage only calls it. The reference is today's backdrop: the sky dome, the fog and the light stay as
they are, and nothing about them changes colour.

## The clouds

- **21 clouds per level.** Each is 3 to 5 flattened, low-poly puffs (icosahedrons, detail 0, squashed
  to 60% in y), joined in a lumpy row 4 to 9 units long, flat-lit and unlit by the scene's lights
  (`MeshBasicMaterial`, no fog, as the sky dome and the moon are), one material per cloud.
- **Where:** spread behind the play area, x from −70 to 70, y from 16 to 38, z from −110 to −60, from a
  seeded random (level 1 seed 3, level 2 seed 5), so they are the same every time. No cloud is
  nearer than z −60.
- **Drift:** each cloud drifts along +x at its own speed, 0.4 to 1.2 units a second, and 50% faster
  at wind 1 (at wind `w`, ×(1 + 0.5w)); leaving at x 75, it comes back in at x −75. Drift runs on
  the weather's clock (`game.weather.clock`) and wind (`game.weather.wind`), so it stands still
  whenever the weather does.
- **Its colour** changes over a cycle (below), each cloud a little out of step with the others.

## The crescent moon

- **Shape:** a crescent, made in code: a disc of radius `r` with a circular bite taken out of it by a
  disc of 0.85 `r` centred 0.45 `r` to one side (a `THREE.Shape` with an arc and a hole path, as a
  flat `ShapeGeometry`), facing the camera, tilted 0.35 radians. Unlit and unfogged
  (`MeshBasicMaterial`, `fog: false`). Its thin edge is toward the lower left.
- **Level 1 (dusk):** radius 3, at x −20, y 22, z −75. **Level 2 (moonlit corn):** radius 4, at
  x 18, y 26, z −70. In level 2 the crescent takes the place of today's full moon: the `moon` entry
  in level 2's scenery goes (the one exception to "the backdrop stays as it is").

## The changing colours

One cycle per level, in seconds, on the weather's clock, played over and over. A colour goes from
each entry to the next and from the last back to the first, smoothly (a cosine ease), so there is no
jump at the end.

| | cycle | clouds | moon |
|---|---|---|---|
| Level 1 | 90 s | `#ffd9a8`, `#ff9d6c`, `#d96f9a`, `#8b6fb0` | `#f6ead0`, `#ffd6a0`, `#f3b8c8` |
| Level 2 | 120 s | `#dfe8f5`, `#9fb6d6`, `#6f88b8`, `#a9c4c0` | `#e8ecd1`, `#cfe0ff`, `#f6f2c8` |

Each cloud is shifted along the cycle by a fixed part of it, from 0 to 25% (from its seeded random),
so the clouds are not all one colour at once; the moon has no shift. At clock 0 the moon and the
clouds show the first colour of their list (plus each cloud's shift).

## Reduced motion

With `game.reducedMotion`, the clouds do not drift and the colours do not change: each cloud stays
where it starts, with its colour at clock 0, and the moon shows its first colour.

## Every screen

The clouds and the moon are scenery: they show wherever the scene shows today, and nowhere else.

- Loading, error and title: as the scene shows them today, at the start of the cycle, still.
- Intro card and play, the gaps between waves and the boss fight: drifting and changing.
- Paused: everything freezes where it is, and goes on from there.
- Victory and defeat: the scene freezes as it is, the sky included.
- Each level start, **Try again**, **Play again**, **Next level** and **Back to title** start the
  cycle again from clock 0 (the weather starts afresh with them), with the clouds where they began.

No new text, no HUD change, no new sound. Lightning does not change the clouds or the moon.

## They only show

Nothing in the sky is a target: each cloud's and the moon's meshes ignore rays (their `raycast` does
nothing), so a shot that misses everything lands where it does today. They are built with the
backdrop, and disposed with it on a level change (geometries and materials).

## Nothing else changes

The game's rules, its `random` (the clouds use their own seeded one), the weather, the light, the fog,
the sky dome, every other model, `get_state` and `llms.txt`.

## Files

- `src/view/models/sky-details.js` (new): the cloud and the crescent builders, under 200 lines.
- `src/view/sky.js` (new): builds them from the level's `sky` data, drifts and colours them from the
  weather's clock, and disposes them; under 200 lines.
- `src/view/stage.js`: calls it; at most 6 lines longer than today.
- `src/levels/level-1.js` and `level-2.js`: the `sky` data; level 2 loses its `moon` scenery entry.

`stage.js` (over 300 lines) is not split. The Pages workflow copies `src` whole, so it needs no change.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the sky is
the supervisor's step. The builder may add and edit test files, and the fake three.js as far as a
`ShapeGeometry` and a `Shape` need it. It may change one earlier test only where it must: the one in
`test/stage.test.js` that finds level 2's full `moon`, which now looks for the crescent instead (its
height and colour become the crescent's height and first colour). It changes nothing else in them.

## Done when

`node --test` passes, and its tests prove:

1. Each level makes 21 clouds of 3 to 5 puffs each, in the places above, the same every time, none
   nearer than z −60; and one crescent, at the level's place and radius, with a `Shape` that has a
   hole; level 2's scenery no longer has a `moon`.
2. The colours: at clock 0 each cloud shows its list's first colour shifted by its part of the
   cycle, the moon its first colour; after one whole cycle the colours are the same again; and a
   step of 16 ms never moves a colour channel by more than 2% (no jumps, at the seam included).
3. The clouds' shifts differ (at least 5 different ones among the 21) and are within 0 to 25% of the
   cycle.
4. Drift: a cloud moves along +x at its own speed, faster with the wind by the factor above, leaves at
   x 75 and comes back at −75; it stands still whenever the weather's clock does (paused, and every
   screen where the game is not live).
5. With reduced motion nothing drifts and no colour changes, ever.
6. The start of each level, Try again, Play again, Next level and Back to title restore clock-0
   colours and starting places.
7. Every cloud's and the moon's meshes ignore rays; they are removed and disposed with the backdrop on
   a level change, and nothing of them is left in the scene.
8. The new files are under 200 lines and `stage.js` is at most 6 lines longer than today; the game's
   `random` is not called for the sky.
