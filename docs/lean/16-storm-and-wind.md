# 16: storm and wind

## What the owner wants

Atmospheric improvements to the game: thunder, lightning and wind. The owner asked for them on
29 September 2026 and left the details to us; these are the defaults we propose. They change how the
game looks and sounds, and nothing about how it plays.

## The weather

Each level has its own weather, as data in the level file (`weather`), like its `light` and `music`.
A pure module `src/logic/weather.js` (no three.js, no Web Audio, so Node can test it) holds it: a
`Weather` object made from the level's data and a `random` function, defaulting to `Math.random`. The
game owns one, made in `reset()`. **The weather has its own random stream: it never calls the game's
`random`**, so a seeded game plays out exactly as it does today.

| | Level 1 (dusk) | Level 2 (moonlit corn) |
|---|---|---|
| Time between strikes | 10 to 22 seconds | 7 to 16 seconds |
| Wind at rest (0 to 1) | 0.3 | 0.5 |
| Gusts add up to | 0.5 | 0.5 |

- **Its clock** is the game's `clock`: it runs while the game is live (intro card and play, as
  `update` does today), and stands still on every other screen, paused included. The first strike is
  due 4 to 8 seconds after the level starts, counted on that clock; after it, the wait is drawn again
  from the level's range each time.
- **Wind strength** is a number from 0 to 1 that drifts: the wind at rest plus a gust that swells and
  dies over 6 to 14 seconds, its size drawn again for each gust, never above 1. It is a smooth
  function of the clock, so it does not jump.
- **Reduced motion** (`game.reducedMotion`, from `prefers-reduced-motion`): see each part below.

## Lightning

- **A strike** lights the whole sky at once, then a smaller second flash: a peak at once, dark again
  after 0.1 seconds, a second peak at 60% of the first 0.18 seconds after the start, fading out by
  0.5 seconds. Never more than 3 flashes in any second, and strikes are at least 7 seconds apart
  (the shortest wait is 7), so nothing ever flickers faster than that.
- **What it lights:** the hemisphere light's intensity rises from 1.2 by up to 2.5 at the peak, and the
  sky dome and the fog shift up to 60% of the way toward `#dfe8ff`; then everything eases back to the
  level's own values. Nothing is left changed once a strike has ended, including after a pause, a
  restart or a level change.
- **The bolt:** a thin jagged line of 6 to 9 segments, `#f4f7ff`, from a height of 40 down to 8 in the
  sky, at a distance (z) between −90 and −50 and across (x) between −45 and 45, drawn in code, shown
  for the first 0.2 seconds of the strike. It only shows: it hits nothing and blocks nothing.
- **With reduced motion** there is no bolt, no second flash and no colour shift: one gentle
  brightening of at most 0.8 on the hemisphere light, rising and falling over 0.6 seconds. Thunder
  still sounds.

## Thunder

- **A `thunder` cue** goes on the game's cues `distance / 50` seconds after the strike, where
  `distance` is the bolt's distance (z) from the player: 1 to 1.8 seconds. One per strike.
- **The sound** (in a new file, see Files): a sharp crack of about 80 ms (noise through a highpass
  around 2 kHz), then a deep rumble of 2.5 seconds (noise through a lowpass sweeping from 220 Hz down
  to 40 Hz, with two slow swells), and a low sine at 40 Hz under it. Like every cue it follows mute,
  and while paused it waits and is not lost, as `mix()` does today.
- Thunder sounds on the screens where the wind does (below), and the cue is dropped on the others:
  one already due when the game leaves play (victory or defeat) is not played.

## Wind

- **Sway:** trees, corn rows, hedges and scarecrows lean and return, each about its own base: a
  rotation about the z axis of up to 0.03 radians at wind 1 (0.06 for the tall trees), with a phase of
  its own so they do not move together, at a rate of 0.6 to 1.2 swings a second. Their position does
  not change, so where they stand, and what the crosshair picks, is as today. The scarecrows' arms
  do not change.
- **Leaves:** 30 small flat leaves (`#8a6a2f`, `#a8943e` in level 2's corn), each about 0.15 across,
  drift along +x at 2 to 8 units a second, faster with the wind, tumbling, and wrap around from
  x = 25 to x = −25. They stay above the ground (y between 0.3 and 3) and behind where enemies
  appear (the level's spawn z is −12): z between −30 and −14, so none is ever between the camera
  (z 9) and an enemy; they are never hit, never pickable and never block a pick.
- **The sound:** a `wind` bed, not a cue: noise through a bandpass around 400 Hz (Q 0.8) whose
  volume and centre frequency follow the wind strength (gain 0.05 at 0, 0.35 at 1; the centre from
  300 Hz to 900 Hz). It plays on the same screens as the music (intro, play, paused), through the
  effects bus, is muted when the sound is off, and is held by a pause as the music is.
- **With reduced motion:** no sway, no leaves. The wind still sounds.

## What the player sees and hears

The references are today's stage and audio: the scene, the light, the fog and the music stay as they
are, and only the parts above are added. There is no new text, no HUD change and no new colours in
the HUD. The lightning must not cover the weapon line, the score, the crosshair or any notice: they
are the page's HUD over the canvas, which the strike does not touch.

## Every screen

- Loading, error and title: no weather, no lightning, no leaves, no wind and no thunder, as today.
- Intro card: the weather runs (it is live), behind the card, and its sounds play with the music.
- Play, the gaps between waves and the boss fight: as above, with nothing changed in the fight.
- Paused: everything freezes: the strike, its fade, the gust, the leaves, the sway and any thunder
  still waiting. The wind and the thunder go quiet, as the music does, and go on from where they were.
- Victory and defeat: the scene freezes as it is, including a strike in progress, and the wind and
  thunder stop as the music does.
- Each level start, **Try again**, **Play again**, **Next level** and **Back to title** make a fresh
  `Weather` for the level: no strike in progress, the first one due 4 to 8 seconds after the start,
  the wind at rest, no thunder waiting.

## Nothing else changes

Score, hits, damage, waves, spawns, timers, crosshairs, the weapon line and every existing cue and
sound stay exactly as they are. `get_state` and `llms.txt` do not change: the weather is not part of
the game's state for an agent. The one exception to "everything else stays as it is" is the
files named under Files.

## Files

Each new file is under 200 lines.

- `src/logic/weather.js`: the `Weather` object (strike timing, flash curve, wind strength, thunder
  due) and its constants.
- `src/view/weather.js`: what the stage draws from it: the light and sky change, the bolt, the sway
  and the leaves; called from `stage.sync`, which gains only the calls.
- `src/view/audio-weather.js`: the `thunder` sound and the `wind` bed, wired in from `audio.js`,
  which gains only the hooks. `audio.js` and `stage.js` are already over 200 lines: they must not
  grow by more than the calls.
- `src/logic/sound.js`: `mix()` also returns the wind strength for the bed, or `null` off the music
  screens, and drops a due `thunder` cue when the sound is off, as it does every cue.
- `src/logic/game.js`: makes the `Weather` in `reset()` and advances it in `update`, and adds due
  thunder to the cues.
- `src/levels/level-1.js` and `level-2.js`: the `weather` data.

The Pages workflow copies `src` whole, so it needs no change.

## The tests

The builder may run the suite and node, but not a web server or a browser. A picture of a strike is
the supervisor's step, made after the pull request is open. The builder may add and edit test files,
and changes no earlier test except to add what the new `weather` data and `mix()`'s new field
require (the tests that compare `mix()`'s answer exactly may gain the new field). It changes nothing
else in them.

## Done when

`node --test` passes, and its tests prove:

1. With one seeded `random`, the same weather gives the same strikes; the first is due 4 to 8
   seconds in, each next wait falls inside the level's range (10 to 22 seconds, 7 to 16 in level 2),
   and no two strikes are under 7 seconds apart.
2. The flash curve: 0 before the strike and after 0.5 seconds; the first peak at once, dark at 0.1,
   the second peak at 60% of the first at 0.18; never more than 3 flashes in any second; and with
   reduced motion a single brightening of at most 0.8 over 0.6 seconds with no second flash, bolt or
   colour shift.
3. The wind strength stays between 0 and 1, is never below the level's rest value, is continuous
   (no jump between two 16 ms steps of more than 0.05), and differs between the levels.
4. The `thunder` cue arrives `distance / 50` seconds after its strike, once, after the flash and
   never before; it waits while paused and goes on after; it is dropped when the sound is off, and
   dropped on victory and defeat.
5. The weather stands still on loading, error, title, paused, victory and defeat, and runs on the
   intro card and in play; a level start, Try again, Play again, Next level and Back to title each
   start it afresh.
6. A game with weather and the same seed plays out exactly as one without: after the same inputs its
   `get_state` answers, scores and enemies match, because the weather never reads the game's
   `random`. A bot play-through of level 1 gives the same result with the weather as without it.
7. The stage (with the fake three.js): a strike raises the hemisphere light and adds a bolt, and
   after it the light, the sky, the fog and the scene's children are exactly what they were; sway
   changes a tree's rotation and never its position; the leaves stay inside their box and are not
   in the pickable list; with reduced motion, none of the bolt, sway or leaves exists.
8. The audio (with the stand-in context): the `thunder` sound and the `wind` bed exist; the bed
   plays on intro, play and paused only, its gain follows the wind strength, it is silent when the
   sound is off and held while paused; the thunder is one crack and one rumble; no earlier cue,
   volume or loop changes.
9. The 200-line limit applies only to the new files (`src/logic/weather.js`, `src/view/weather.js`,
   `src/view/audio-weather.js` and the new test files). The existing files (`game.js` at 829 lines,
   `stage.js` at 313, `audio.js` at 235) are not split and are not made to fit: each may grow only by
   the calls, hooks and data this spec names, at most 25 lines each, and the builder does not
   restructure them. A test pins the sizes: the three new files under 200 lines, and `game.js`,
   `stage.js` and `audio.js` each no more than 25 lines longer than today.
