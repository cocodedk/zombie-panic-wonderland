# 29: spiders

Run this after spec 28 is merged. The second of the six level 3 specs (see `docs/level-3-plan.md`).

## What the owner wants

Spiders in level 3: quick, low creatures that scuttle in along the ground, and a spider model made in
code. The owner asked on 30 September 2026 and left the details to us; these are the defaults we
propose. The reference for the model is the plan's description of a giant yard spider: a domed
carapace, a bulbous abdomen with a red hourglass, eight jointed legs, red eyes and fangs.

## The spider

A new enemy kind, `spider`, with its data in level 3's `enemies`:
`spider: { hits: 2, points: 150, speed: 2.2, reach: 1.2, closeIn: 0.8, strikeEvery: 1.2 }`.

- **It walks** like a zombie, on its own numbers: from where it spawns (x across the field, z −12) in a
  straight line to the road at 2.2 units a second (12 units in about 5.5 seconds, against the
  zombie's 10), then closes in on the player's x to within `closeIn`, and strikes for 1 heart every
  `strikeEvery` seconds while within `reach` of the player's x, as a zombie does. It has no groan.
- **It ignores fences:** it crawls under and over them, going straight to the road. (Level 3 has no
  fences; a level that had would not hold spiders.)
- **It falls after 2 hits** (150 points), and bursts into dark chunks.
- **Zombies do not change:** their speed, fast rule, fence rule, groan and strike are as today. To share
  the walking code, the zombie's `zombie(e, dt)` becomes `walker(e, dt)`, reading the numbers of its own
  kind (`this.level.enemies[e.kind]`); the fast rule and the fence rule and the groan stay the zombie's
  (`e.kind === 'zombie'`); `game-time.js` calls `walker` for both kinds; `spawn(kind)` gives a spider
  its `strike` timer as it gives a zombie its own.
- **Waves in level 3** become, each wave's enemies one second apart in this order (zombie, spider,
  pumpkin monster, crow): 1: 4 zombies, 2 spiders, 1 crow. 2: 5 zombies, 3 spiders, 2 crows. 3: 5
  zombies, 3 spiders, 1 pumpkin monster, 2 crows. 4: 6 zombies, 4 spiders, 2 pumpkin monsters, 3
  crows. 5: 6 zombies, 5 spiders, 2 pumpkin monsters, 3 crows. The fast-zombie rule counts zombies
  only.

## The model

The reference is the zombie's own look (`buildZombie` and its flat-shaded, low-poly parts, no textures)
for the style, and this sketch, seen from above, for the shape:

```
      \\ \\  ()()  // //          eight legs, four a side,
       \\ \\ (  ) // //           each bent at a knee
   ---- ===[ ()()() ]=== ----      cephalothorax with eight red eyes,
       // //  \\  \\ \\           abdomen behind it with a red hourglass
      // //  (####)  \\ \\
```

`buildSpider({ seed = 0, size = 1 })` in a new file `src/view/models/spider.js`, made in code, flat-lit,
facing +z, the way `buildZombie` is:

- **Body:** an abdomen (an icosahedron of radius 0.28, detail 0, scaled 1 × 0.8 × 1.2) in `#2a1f2e` behind
  a smaller cephalothorax (radius 0.17) in `#3a2c3f`, standing 0.3 above the ground. A red hourglass on the
  abdomen's back: two small cones tip to tip, `#c0182b`.
- **Eyes:** eight small boxes (0.03) in `#ff2a1a` on the front of the cephalothorax in two rows of four
  (unlit, as the zombie's eyes are), and two short fangs (cones, radius 0.02, length 0.08, `#e8e0c8`).
- **Legs:** eight, four each side, each of two cylinders (radius 0.025; the upper 0.32 long, the lower
  0.38) with a knee, pivoting at the body, in `#2a1f2e`; the whole span about 0.9 across.
- **Its gait:** `tick(t, { walk = 1 })` swings the legs in two alternating groups: leg `i` about its
  hip by `sin(t × 10 + phase) × 0.35 × walk`, `phase` 0 for legs 0, 3, 4 and 7 and π for the others; the
  body bobs 0.02. Standing (`walk` 0) the legs are still. Under reduced motion the gait stays (it is
  the walk's own shape).
- **A hit target:** an invisible sphere of radius 0.45 at the body's centre counts for the aim (it is
  a mesh of the model with an unlit material that is not drawn), so a spider is as easy to hit as it
  looks; the legs and the rest ignore rays as the zombie's extras do (`ignoreRays`).
- **Turning:** at the road it turns toward the player as the zombie does (`rotation.y` 0.9 toward the
  player's x); before the road it faces forward.

## Where it plugs in

`ENEMIES.spider` in the stage's table (`seed: id × 1.7`, the fading copy under reduced motion built
the same way from `enemyId`); the stage's `walking` flag and turn treat spiders as they treat zombies;
`BURSTS.spider` in `effects.js`: `{ count: 10, life: 1, size: 0.14, colors: ['#2a1f2e', '#3a2c3f',
'#c0182b'], puff: '#3a2c3f', puffSize: 1 }`; the points come from the level's `enemies.spider.points`
as the others' do; `get_state`'s `enemies` counts spiders.

## Every screen

- Loading, error and title: no spiders (the title's scene is level 1's), as today.
- Intro card: none yet, as with every enemy.
- Play: spiders walk in with the wave, as above; the boss fight in this spec has none (the Zombie King's
  summons are zombies).
- The gap between waves: none on the field (a wave is cleared when all its enemies have fallen).
- Paused: every spider on the field freezes where it is, still drawn behind the paused band, and goes
  on from there.
- Victory and defeat: the scene freezes as it is, so a spider on the field stays drawn, frozen, behind
  the card; it does nothing.
- A level start, Try again, Play again, Next level and Back to title start fresh, with no spiders. No new sound (a spider makes no
groan), no new text, no HUD change.

## Nothing else changes

Levels 1 and 2, the zombies, pumpkin monsters, crows and the boss, the weapons, the fences, the sky and
weather, `get_state`, `llms.txt` (it gains one clause: level 3 has spiders).

## Files

- `src/view/models/spider.js` (new), under 200 lines.
- `src/logic/game-enemies.js` and `game-time.js` and `game-waves.js`: the shared walker and the spider's
  timer; each at most 12 lines longer than today.
- `src/view/stage.js`, `src/view/stage-entities.js` (the `walking` flag and turn), `src/logic/effects.js`
  (`BURSTS.spider`): a few lines each, `effects.js` staying under 200.
- `src/levels/level-3.js`: the spider's data and the waves.
- `llms.txt`: one clause.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of a spider is
the supervisor's step. The builder may add and edit test files. It may change an earlier test only where
that test asserts level 3's waves or counts its enemies, or calls `zombie(e, dt)` by that name, or (in
`test/level3.test.js`) asserts that level 3's `enemies` equal level 2's exactly (they are now level 2's
plus the spider), and only those numbers, that name and that one assertion.

## Done when

`node --test` passes, and its tests prove:

1. A spider spawned free walks straight to the road in about 5.45 seconds (12 / 2.2, ±0.1), then closes
   in to within 0.8 of the player's x, and strikes 1 heart every 1.2 seconds within 1.2 of it, as the
   data says; it does not strike before the road; it makes no groan.
2. A spider ignores fences (in a test level with the fences of level 2) while a zombie there is still
   held; a zombie's walk, fast rule, groan and strike are exactly as before.
3. A spider falls after 2 hits (150 points) and bursts with `BURSTS.spider`; a shot passing through its
   invisible sphere hits it, a shot passing through only a leg does not.
4. Level 3's waves follow the counts and the order above, one second apart; the fast rule counts
   zombies only.
5. The model: 8 legs of two segments, 8 eyes, two fangs, the hourglass, the sizes, colours and the
   invisible sphere; the gait: legs in two alternating groups within ±0.35, still when `walk` is 0, the
   same under reduced motion.
6. The stage builds and removes spiders like other enemies, and a fading copy under reduced motion is
   the same model; paused, the spiders stand still and go on; a level start starts fresh.
7. Files within the limits above; `spider.js` under 200 lines.
