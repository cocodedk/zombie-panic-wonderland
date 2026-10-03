# 40: the enemies stand on the road, not in it

A fix. On 3 October 2026 the owner saw that the zombies sink into the pavement. They do: the road's bricks
stand up out of the ground, but every enemy that walks onto the road is still drawn at the ground's height, so
its feet are under the bricks. This spec lifts them onto the bricks. (It comes before the planned spec on the
zombies' machine details, which moves to 41.)

## The reference

- The ground is a plane at y 0 (`buildGround` in `src/view/models/scenery.js`).
- The road (`buildRoad`, same file) is drawn at the level's `roadZ` (0 on all three levels), 26 long along x
  and 2.6 wide along z, so it spans z from `roadZ − 1.3` to `roadZ + 1.3` and x from −13 to 13. On a mortar bed
  0.06 high lie the bricks: boxes 0.08 high with their centres at y 0.07 to 0.09, so their tops are at y 0.11
  to 0.13. Levels 2 and 3 leave 20% of the bricks out, level 1 leaves 7% out.
- `syncEntities` (`src/view/stage-entities.js`) draws every enemy that is not a flyer at
  `(e.x, dropHeight(e, rule), e.z)`: `dropHeight` is a dropping spider's height on its thread, else 0. So a
  zombie's feet (their soles at y 0) are 0.11 to 0.13 under the bricks' tops once it is on the road. The same
  holds for every other enemy drawn there: fast zombies, spiders, wolves, pumpkin monsters and the bosses.
- The fading copy of a fallen enemy (shown instead of a burst when motion is reduced, `burst` in
  `src/logic/effects.js`) is drawn at `(f.x, f.y, f.z)` (`src/view/stage-effects.js`), at the height the game
  gave it.
- Zombies, spiders and wolves come from the backdrop (z −12) toward the road and stop on it at `roadZ`
  (`game-enemies.js`); pumpkin monsters throw from where they appear and do not walk; the bosses stand behind
  the road (z −3 or −3.5), off it.

## The change

1. A new pure function, `roadLift(z, level)`, in a new file `src/logic/road.js` (no three.js, so Node tests
   it), with the constants `ROAD = { top: 0.11, edge: 0.3 }`:
   - `top` 0.11 is the lowest brick top, so a foot never hangs in the air above a brick; on the highest bricks
     it is at most 0.02 into them;
   - the lift is `top` where `|z − roadZ| ≤ half − edge` (`half` is half the level's road width: 1.3, read from
     the level's `road` scenery entry), 0 where `|z − roadZ| ≥ half`, and in between it rises in a straight
     line over the road's first 0.3 (one row of bricks), so an enemy steps up onto the road over its first row
     and does not jump.
2. `syncEntities` draws every enemy that is not a flyer at `(e.x, dropHeight(e, rule) + roadLift(e.z, level),
   e.z)`. A spider dropping onto the road lands on the bricks.
3. The fading copy of a fallen enemy is drawn at `(f.x, f.y + roadLift(f.z, level), f.z)`, so it fades where its
   enemy stood.

Only where things are drawn changes. The game's rules and state (every enemy's x, y and z, its speed, where it
stops, what reaches the player, every hit and every distance) do not change; `get_state` answers as today.

## Who gets it

Every enemy drawn by that branch of `syncEntities`, on all three levels: zombies and fast zombies, spiders
(walking and dropped) and wolves; pumpkin monsters and the bosses (the Zombie King, the Scarecrow King and
the Spider Queen) go through the same code, but they stand off the road, so their lift is 0; and the fading
copies of all of them. Not
changed: the flyers (crows and bats), the pumpkins, web balls and launched pumpkins in flight, the crates, the
canisters, and the hero (its cape's hem hides its feet, and its aim and guns are measured from where it stands
today; spec 35).

## Every screen

Enemies show where they show today, on the bricks when on the road: play, the gaps between waves, the boss
fight, paused (frozen, as today), victory and defeat (the scene freezes, as today). Loading and error show no 3D
scene. The title and the intro card show no enemies, as today. No new text, no HUD change, no new sound and no
new animation; under reduced motion it is the same (the lift is where they stand, not a motion).

## Files

- `src/logic/road.js` (new), under 200 lines.
- `src/view/stage-entities.js`: at most 88 lines (84 today; `test/dropping-spiders-view.test.js` caps it at 88).
- `src/view/stage-effects.js`: under 200 lines (83 today).

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture is the supervisor's step.
The builder may add and edit test files (each under 200 lines). It may change an earlier test only where it
expects an enemy's or a fading copy's drawn y (`position.y`) while that enemy is on the road, and there only by
adding the lift; it changes nothing else in them.

## Done when

`node --test` passes, and its tests prove:

1. `roadLift` is 0.11 on the road's middle (z = `roadZ`, and anywhere with `|z − roadZ| ≤ 1.0`), 0 off the road
   (`|z − roadZ| ≥ 1.3`, for example at the spawn, z −12, and at a boss's stand, z −3), rises in a straight line
   between (half way, at `|z − roadZ|` 1.15, it is 0.055), is the same on both sides of the road, and reads the
   width from each level's road entry (all three levels).
2. On the stage, a zombie, a fast zombie, a wolf and a walking spider on the road are drawn at y 0.11, and off
   the road at y 0; a pumpkin monster where it appears and a boss at its stand are drawn at y 0; a spider
   dropping onto the road is drawn at its drop height plus the lift; with reduced motion, the fading copy of a
   zombie that fell on the road is drawn at its `f.y` plus 0.11.
3. The flyers, pumpkins, crates, canisters and the hero are drawn where they are today.
4. `get_state` and the game's state answer exactly as before for the same play.
5. The file sizes in Files.
