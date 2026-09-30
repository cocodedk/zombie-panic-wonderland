# 32: bats

Run this after spec 31 is merged. The fifth of the six level 3 specs (see `docs/level-3-plan.md`).

## What the owner wants

Bats in level 3, a second flyer next to the crows, and a bat model made in code. The owner asked on 30
September 2026 and approved bats for level 3; the details are the defaults we propose. The reference for
behaviour is the crow (spec 03 and `crow(e, dt)`): a bat circles, then dives, like a crow, only quicker
and smaller.

## The bat

A new enemy kind, `bat`, with its data in level 3's `enemies`, the same shape as the crow's:
`bat: { hits: 1, points: 75, z: -6, height: 3, circle: 1.2, dive: 0.6, splash: 1, leave: 1.2 }`.

- **It behaves like a crow, on its own numbers:** it flies in from the backdrop at `height` 3, circles
  for 1.2 seconds, then dives at the player's x at that moment and reaches the road 0.6 seconds later; it
  costs 1 heart if the player is within `splash` (1) unit of where it lands and is not dodging; after its
  dive, hit or miss, it is removed from the enemies at its landing (which is when it counts as cleared) and flies
  away as a drawing for 1.2 seconds, exactly as a crow does. It falls after 1
  hit (75 points).
- **Sharing the code:** every place that treats a crow specially treats a bat the same way, reading the
  numbers of its own kind: `crow(e, dt)` reads `this.level.enemies[e.kind]`; `crowAt(e, level)` and the
  circle it flies take the kind's own `circle`, `dive`, `height` and `z`; the spawn's crow block, the dive
  point `s.from`, the height of a fallen flyer's burst, `game-outcome.js`'s centre, and the stage's crow
  branch (`placeCrow`) all cover both kinds. A flying kind is `crow` or `bat`. Crows do not change.
- **Waves in level 3** gain bats, each wave's enemies one second apart in this order (zombie, spider,
  wolf, pumpkin monster, crow, bat): wave 2 gains 1 bat, wave 3 gains 2, wave 4 gains 2, wave 5 gains 3;
  wave 1 has none. Their other counts are those of specs 29 and 31.

## The model

`buildBat({ seed = 0, size = 1 })` in a new file `src/view/models/bat.js`, made in code, flat-lit, facing
+z, the way `buildCrow` is (read it and match its interface: what `tick` takes, how it flaps): a small
body (an icosahedron of radius 0.12, detail 0, `#2b1b3a`), a head with two pointed ears (cones, radius
0.03, length 0.08) and two small red unlit eyes `#ff2a1a`, two fangs (`#e8e0c8`), and two wings, each a
flat fan of three triangles from the shoulder, `#5a3f6b`, about 0.5 long. The wings flap faster than a
crow's: each wing's rotation about the body's axis is `sin(t × 18 + seed) × 0.9`, mirrored. Its size is
about 1.1 across with the wings out. It is as easy to hit as it looks (its meshes are the target).

The reference is the crow (`buildCrow`) for the interface and the flat-shaded, low-poly style, and this
front view for the shape:

```
     /\ __ /\          two ears, red eyes, two fangs
   __/  (oo)  \__       wings: a flat fan of three triangles each,
  /_ _ /\vv/\ _ _\      held out and flapping
```

## Where it plugs in

`ENEMIES.bat` in the stage's table; `BURSTS.bat`: `{ count: 10, life: 1, size: 0.14, colors: ['#2b1b3a',
'#5a3f6b', '#ff2a1a'], puff: '#3a2a4a', puffSize: 1 }`; the points come from the level's data;
`get_state`'s `enemies` counts bats; the boss's summoned crows (level 2) are unchanged. No new sound.

## Every screen

- Loading, error and title: no bats (the title's scene is level 1's), as no enemy shows there.
- Intro card: none yet.
- Play: bats fly in with the wave, circle, dive and leave, as above.
- The gap between waves: no bat is an enemy on the field. A wave is cleared, as with crows today, when its
  last enemy has fallen or has landed from its dive (an enemy is removed at its landing); the bat that
  dived then flies away as a `flyaway` for `leave` seconds, a drawing only, and may still be seen leaving
  as the banner and the gap begin. It does nothing and is not hit.
- Paused: every bat freezes where it is, drawn behind the paused band, and goes on from there.
- Victory and defeat: the scene freezes as it is, so a bat in the air stays drawn, frozen, behind the
  card; it does nothing.
- Each level start, Try again, Play again, Next level and Back to title start fresh, with none. No new text
  and no HUD change.

## Nothing else changes

Crows, every other enemy, levels 1 and 2, the weapons, `get_state`, `llms.txt` (one clause: level 3
has bats).

## Files

- `src/view/models/bat.js` (new), under 200 lines.
- `src/logic/game-enemies.js`, `game-time.js`, `game-waves.js`, `game-outcome.js`: the flying kinds; at
  most 10 lines longer each. `src/view/stage.js` and `stage-entities.js`: the table entry and the crow
  branch made kind-general; a few lines each. `src/logic/effects.js` (`BURSTS.bat`): if it would pass 200
  lines, the table has moved to `bursts.js` (spec 31), so add it there.
- `src/levels/level-3.js`: the bat's data and the waves. `llms.txt`: one clause.

## Balance

There is no bot play-test for this spec: balance is bounded by the data, and how it feels to play is the
supervisor's step. The bounds (the tests check them): no wave has more than 3 bats; a bat falls to 1 hit
and takes 1.8 seconds from arriving to landing (1.2 circling, 0.6 diving), costs at most 1 heart, and the
Popper hits at 8 a second.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of a bat is the
supervisor's step. The builder may add and edit test files. It may change an earlier test only where it
asserts level 3's waves, or where it calls `crow` or `crowAt` with the level's crow data, and only those
numbers or names. It may also update, in `test/level3.test.js`, the assertion that level 3's `enemies` equal the earlier level's plus the kinds already added (they now include this spec's), and only that assertion.

## Done when

`node --test` passes, and its tests prove:

1. A bat circles 1.2 seconds, dives at the player's x then and lands 0.6 seconds later; it costs 1 heart
   within 1 unit of the landing when not dodging and nothing when dodging or farther; after the dive,
   hit or miss, it leaves in 1.2 seconds and counts as cleared.
2. A bat falls after 1 hit (75 points) and bursts with `BURSTS.bat` at its own height; a crow behaves and
   scores exactly as before (its 2-second circle, 1-second dive, 50 points).
3. Level 3's waves follow the counts and the order above, one second apart; a wave is cleared when its
   last bat has fallen or landed, as with crows, and the leaving bat is a drawing only.
4. The model: the parts, sizes and colours above; the flap follows the formula within ±0.9, mirrored,
   and is the same under reduced motion; the stage builds and removes bats like crows, and a fading
   copy under reduced motion is the same model.
5. Paused, bats hang still and go on; a level start starts fresh.
6. The balance bounds above hold in the data: at most 3 bats a wave, 1 hit, 1.8 seconds from arrival to
   landing, 1 heart at most.
7. Files within the limits; any new file under 200 lines.
