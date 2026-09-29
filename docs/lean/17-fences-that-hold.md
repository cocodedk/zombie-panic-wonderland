# 17: fences that hold

## What the owner wants

The fence must stop the zombies, so they walk toward the opening in it, and it must stop bullets. Today
it is only scenery: zombies walk through it, and only a shot that misses everything seems to stop at
it. The owner asked on 29 September 2026 and left the details to us; these are the defaults we
propose.

## What a fence is

Each level's fences are the `fence` entries in its `scenery`, so the picture and the rules share one
source. A fence at `x`, `z` with `length` covers x from `x − length/2` to `x + length/2` at that z.
Today:

| | fences (z −2.2) | the gap between them |
|---|---|---|
| Level 1 | x −9.5 to −2.5, and 3.5 to 9.5 | −2.5 to 3.5: the road |
| Level 2 | x −8.5 to −2.5, and 3.5 to 8.5 | −2.5 to 3.5: the road |

A pure module `src/logic/fences.js` (no three.js, so Node can test it) reads them from the level and
answers the questions below. Fences have a body half-width of 0.3 for a zombie: a zombie at x is
**behind a fence** when x is within 0.3 of the fence's span (x from `x0 − 0.3` to `x1 + 0.3`). So the
gap a zombie can use is x from −2.2 to 3.2 in both levels, and a zombie exactly on an edge counts as
inside the gap. A zombie whose x is behind no fence is not held by anything.

`missing` pickets stay cosmetic: the fence is solid along its whole length. So that a fence looks like
one, level 2's two fences change from `missing: 0.4` and `0.45` to `0.15` (the one exception to
"the scene stays as it is").

## The zombies

Only zombies (and the zombies a boss summons) are held. Pumpkin monsters, crows and the boss are not:
they move, stand, fly and throw exactly as today.

- A fence's **stop line** is 0.4 in front of it: z = −2.6 for fences at z −2.2.
- A zombie behind a fence, above (in z) its stop line, walks in a straight line, at the level's zombie
  speed, toward the entry point: **(the nearest x inside the gap, the stop line)**. That is x −2.2 or
  3.2, whichever is nearer its own x, or its own x when it is already inside the gap. The speed is
  the total speed along that line, not per axis.
- Once at the entry point, or if it was already inside the gap, it walks straight toward the road as
  today, through the gap, and everything after the road (the groan, closing in, reaching, striking)
  is as today. A zombie never crosses a fence's line while its x is behind that fence.
- Numbers, checked against the code (speed 1.2, spawn at z −12, spawn x from −8 to 8, the road at
  z 0): a zombie at x −8 walks 11.04 to the entry point and 2.6 on to the road, about 11.4 seconds
  against today's 10; a zombie already in the gap walks straight and takes 10, as today. No zombie
  needs more than 12 seconds.
- A summoned zombie starts where the summons place it today (within `summonNear` of the boss's x,
  `summonBack` behind its z, wherever that is at the time; its z can be nearer than −12 at the
  first summon) and follows the same rule: if it is above (in z) a fence's stop line and behind that
  fence, it is held; if it is already past the stop line, it is not. If its x falls behind no fence it walks straight.
- A held zombie is too far to strike the player (it is never on the road while held), and nothing
  changes about the road, the player or the reach. It can be hurt like any zombie: by a shot that
  reaches it (over the fence), and by the launcher's and a gas canister's explosions, which the fence
  does not stop.
- **Facing:** zombies keep today's rotation (facing forward before the road); they do not turn to
  face the diagonal.

## The bullets

The fence blocks shots, by its real shape: an invisible solid panel as long as the fence, 1 unit high
(the fence's `height`) and 0.1 thick, at the fence's z, added by the stage. The game rules do not
know it; the stage's aiming does.

- The Popper's shot, each Scattergun pellet and each Gatling round stop at the first thing they meet,
  as they do today, and the panel counts as one: a shot that meets the panel before an enemy, pumpkin,
  crate or canister hits nothing, and its streak or tracer ends on the panel.
- A shot that meets the enemy first, or passes over the panel (the camera looks down from 3.6 units,
  so a shot at a zombie's head passes over a 1-unit fence), is as today.
- The **launcher's** aiming ignores the panels: its shell arcs over the fence and lands where the
  crosshair points, as today. Thrown pumpkins and crows ignore fences too.
- **Which path decides:** the camera's aiming ray through the crosshair alone decides whether the fence
  blocks a shot, as it decides every hit today. If that ray clears the panel, the shot hits what it
  meets, even though the streak drawn from the lower muzzle may cross the panel on its way. A blocked
  shot's streak ends on the panel.
- The panel is not a target: it is not in the list of what a shot can hit, it gives no points, and it
  cannot be destroyed.

## What the player sees

The reference is today's scene: the fence's model, pickets, colour and place do not change (only level
2's fewer missing pickets), and nothing new is drawn. The zombies' walk is the same model and the same
animation, on a new path. No new text, no HUD change, no new sound.

## Every screen

- Loading, error and title: no zombies and no shots, as today.
- Intro card: no zombies yet, as today.
- Play, the gaps between waves and the boss fight: as above.
- Paused: everything freezes as today; a held zombie stays where it was and goes on from there.
- Victory and defeat: the scene freezes as it is, as today.
- Each level start, **Try again**, **Play again**, **Next level** and **Back to title** start fresh,
  as today; fences are the level's, so nothing carries over.

## Nothing else changes

Scoring, damage, spawns, wave sizes and timing, weapons, the weather, the sounds, `get_state` and
`llms.txt` stay as they are. `get_state.enemies` is a count, and stays a count: `get_state` does not change.

## Files

- `src/logic/fences.js`: reading the fences from a level, the gap, and one function that moves a
  zombie a step (given its position, the level, the speed and `dt`).
- `src/logic/game.js`: `zombie()` uses that function to walk before the road; at most 25 lines longer
  than today.
- `src/view/stage.js`: builds the invisible panels with the backdrop, removes them with it, and keeps
  the aiming's ray for shots separate from the launcher's; at most 25 lines longer than today. Put
  the panels' building in a new file, `src/view/fence-panels.js`.
- `src/levels/level-2.js`: the two `missing` values.

New files stay under 200 lines. `game.js` (over 800 lines) and `stage.js` (over 300) are not split.
The Pages workflow copies `src` whole, so it needs no change.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of a zombie
walking to the gap is the supervisor's step. The builder may add and edit test files. It may change an
earlier test only where that test asserts how long a zombie takes to reach the road, or where it
stands, and only those numbers (`fair-boss`, `bosses-attack`, `scarier-zombies`, `level2` and
`game` tests are the likely ones); it changes nothing else in them.

## Done when

`node --test` passes, and its tests prove:

1. Both levels' fences are read from their scenery: the two spans above, and the gap −2.2 to 3.2.
2. A zombie spawned at x −8 walks in a straight line at speed 1.2 to (−2.2, −2.6), is never past
   z −2.6 while behind a fence, then walks straight to the road, arriving in 11.4 seconds (±0.1). A
   zombie spawned at x 0.5 walks straight and arrives in 10 seconds, as today.
3. For spawn x from −8 to 8 in steps of 0.5, in both levels, every zombie reaches the road within 12
   seconds and none is ever past the fence's line with its x behind the fence.
4. A summoned zombie whose x is behind a fence is held and walks to the gap; one whose x is behind no
   fence walks straight.
5. Pumpkin monsters, crows and the boss move exactly as before, given the same seed.
6. The stage (with the fake three.js): a ray that meets a fence's panel before an enemy hits nothing
   and lands on the panel, for a Popper shot, each Scattergun pellet and a Gatling round; a ray that
   meets the enemy first, or passes over the panel's top, hits it; the launcher's ray ignores the
   panels; the panels are not in what a shot can hit, and are removed and rebuilt with the backdrop
   on a level change.
7. Paused, the zombies' walk stands still and goes on from the same place; a level start, Try again,
   Play again, Next level and Back to title start fresh.
8. Balance: a bot written in the test (each frame it fires the weapon in hand at the nearest
   zombie's id, ignoring fences as the suite's other bots do, and does not dodge) plays each level
   with seeds 1 to 20. The builder first measures, on `main` before this change, how many of the 20
   runs of each level the player survives, and the test asserts the fenced game survives at least
   that many minus 2. Fences only delay zombies, so this catches a level made impossible.
9. The new source files (`fences.js`, `fence-panels.js`) and new test files are under 200 lines, and `game.js` and `stage.js` are each at most 25 lines
   longer than today.
