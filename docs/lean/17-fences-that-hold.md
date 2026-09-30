# 17: fences that hold

## What the owner wants

The fence must stop the zombies, and the zombies must walk toward an opening in it. There should be
more openings than today's one. The owner asked on 29 September 2026 and asked us to keep it simple:
zombies are led to a gap, and the fence gets more gaps. Nothing else about the game changes.

## The fences and their gaps

Each level's fences are the `fence` entries in its `scenery`, all at z −2.2, so the picture and the
rules share one source. A fence at `x` with `length` covers x from `x − length/2` to
`x + length/2`. The scenery changes to more, shorter fences with gaps between them:

| | fences (x from – to) | gaps between them |
|---|---|---|
| Level 1 | −9.5 – −7.0, −5.4 – −2.5, 3.5 – 5.6, 7.2 – 9.5 | −7.0 – −5.4, −2.5 – 3.5 (the road), 5.6 – 7.2 |
| Level 2 | −8.5 – −6.5, −4.9 – −2.5, 3.5 – 5.1, 6.7 – 8.5 | −6.5 – −4.9, −2.5 – 3.5 (the road), 5.1 – 6.7 |

As `scenery` entries (`x` is the centre, `z` −2.2):

- Level 1: `x −8.25 length 2.5`, `x −3.95 length 2.9`, `x 4.55 length 2.1`, `x 8.35 length 2.3`, with
  `missing` and seeds as level 1's fences use today.
- Level 2: `x −7.5 length 2`, `x −3.7 length 2.4`, `x 4.3 length 1.6`, `x 7.6 length 1.8`, with
  `missing` 0.15 in place of 0.4 and 0.45, so a fence looks like one.

Those are the only changes to the scenery. A pure module `src/logic/fences.js` (no three.js, so Node
can test it) reads the fences from the level and answers the questions below.

## The zombies

Only zombies (and the zombies a boss summons) are held. Pumpkin monsters, crows and the boss move,
stand, fly and throw exactly as today. A zombie's half-width is 0.3.

- A fence's **span** is its x range widened by 0.3 on each side. A zombie is **behind a fence** when
  its x is strictly inside that span; exactly on the edge it is free. So the gaps a zombie can use
  are the gaps above, narrowed by 0.3 on each side (level 1: −6.7 to −5.7, −2.2 to 3.2 and 5.9 to
  6.9). A zombie in a usable gap, or whose x is behind no fence, is free.
- A fence's **stop line** is z −2.6, 0.4 in front of it. A zombie **before the stop line** has z
  below −2.6 (further from the road); one that has reached or passed it is not held, whatever its x.
- A zombie that is before the stop line and behind a fence walks in a straight line, at the level's
  zombie speed (the total speed along the line, not per axis), toward the **entry point**: the
  nearest usable-gap edge, by distance in x, at the stop line. Only the gaps between two fences are
  routes: no zombie walks around the outside end of the outermost fences, even when that is nearer
  (level 2's zombie at x 8 goes to the gap at 5.4 to 6.4, not round the end at 8.8). When it gets
  there it is free.
- A free zombie before the stop line walks straight toward the road, as today. Everything on and
  after the road (the groan, closing in, reaching, striking) is as today. Zombies keep today's
  rotation; they do not turn to face the diagonal.
- Numbers, checked against the code (speed 1.2, spawn at z −12, spawn x from −8 to 8, the road at z 0):
  a zombie that spawns free takes 10 seconds to the road, as today; one that must shift sideways
  takes a little longer (at most 10.5 seconds in either level).
- Summoned zombies follow the same rule wherever the summons place them; one that starts past the
  stop line is not held.
- A held zombie is nowhere near the road, so it cannot strike the player. It can be hurt like any
  zombie by a shot that reaches it, and by the launcher's and a gas canister's explosions.

## Shots pass through the fence

To match, the fence stops nothing that flies. A shot's aim, each Scattergun pellet and each Gatling
round go through fences, and so do their streaks and tracers: they no longer end on a fence when they
miss. The launcher's shell, thrown pumpkins and crows are as today. The builder does this by making
the fence's meshes ignore rays (each mesh's `raycast` does nothing), so the stage's aiming does not
change.

## What the player sees

The reference is today's scene: the fence model, its pickets and colour do not change; there are
simply more, shorter fences and more gaps. The zombies' model and walk animation are the same, on a
new path. No new text, no HUD change, no new sound.

## Every screen

- Loading, error and title: no zombies and no shots, as today.
- Intro card: no zombies yet, as today.
- Play, the gaps between waves and the boss fight: as above.
- Paused: everything freezes as today; a zombie stays where it was and goes on from there.
- Victory and defeat: the scene freezes as it is, as today.
- Each level start, **Try again**, **Play again**, **Next level** and **Back to title** start fresh,
  as today.

## Nothing else changes

Scoring, damage, spawns, wave sizes and timing, weapons, the weather, the sounds, `get_state` (its
`enemies` is a count and stays one) and `llms.txt` stay as they are.

## Files

- `src/logic/fences.js`: reading the fences from a level, the usable gaps, and one function that
  moves a zombie a step (given its position, the level, the speed and `dt`).
- `src/logic/game.js`: `zombie()` uses it before the road; at most 25 lines longer than today.
- `src/view/models/scenery.js`: the fence's meshes ignore rays; at most 5 lines longer.
- `src/levels/level-1.js` and `level-2.js`: the fence entries above.

New files stay under 200 lines. `game.js` is not split. The Pages workflow copies `src` whole, so it
needs no change.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of a zombie
walking to a gap is the supervisor's step. The builder may add and edit test files. It may change an
earlier test only where that test asserts how long a zombie takes to reach the road, or where it
stands at a given time, or counts the fence entries in a level's scenery, and only those numbers; it
changes nothing else in them.

## Done when

`node --test` passes, and its tests prove:

1. Each level's fences are read from its scenery: the four spans above, and the usable gaps (level 1:
   −6.7 to −5.7, −2.2 to 3.2, 5.9 to 6.9). A zombie exactly on a usable gap's edge is free.
2. A zombie spawned free (x 0.5, in the road's gap) walks straight and reaches the road in 10 seconds
   (±0.05), as today.
3. A zombie spawned at x −8 (behind the first fence) walks in a straight line to the entry point
   (−6.7, −2.6) and then straight to the road, taking the length of that path divided by 1.2
   (about 10.07 seconds, ±0.1); it is never past z −2.6 while behind a fence.
4. For spawn x from −8 to 8 in steps of 0.5, in both levels, every zombie reaches the road within
   10.5 seconds, and none is ever past the stop line with its x strictly behind a fence.
5. A zombie at or past the stop line is not held; a summoned zombie before the line and behind a
   fence is held and walks to a gap, and one whose x is behind no fence walks straight.
6. Pumpkin monsters, crows and the boss move exactly as before, given the same seed.
7. The fence's meshes ignore rays, so the stage's aim and a streak pass through a fence (with the
   fake three.js).
8. Paused, the zombies' walk stands still and goes on from the same place; a level start, Try again,
   Play again, Next level and Back to title start fresh.
9. `fences.js` and any new test file are under 200 lines, and `game.js` is at most 25 lines longer
   than today.
