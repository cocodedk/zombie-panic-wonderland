# 33: the Spider Queen

Run this after spec 32 is merged. The last of the six level 3 specs (see `docs/level-3-plan.md`): it
replaces level 3's boss, until now level 1's Zombie King, with the level's own.

## What the owner wants

A boss for the Spider Wood: the Spider Queen, and a spider model for her made in code. The owner asked on
30 September 2026 and left the details to us; these are the defaults we propose. She plays like the Zombie
King and the Scarecrow King (spec 06, spec 03): she walks in, stands behind the road, and every 3 seconds
does one of two things in turn.

## The boss

Level 3's `boss` data becomes:
`{ name: 'Spider Queen', model: 'spiderQueen', hits: 260, points: 4000, speed: 1.2, standZ: -3.5,
firstAction: 2, actionEvery: 3, windup: 0.6, actions: ['spit', 'summon'], spit: { hearts: 1, points: 25,
flight: 1.2, splash: 1, slow: 0.5, slowTime: 2 }, summon: 3, summons: 'spider', summonNear: 2, summonBack:
2 }`. Level 3's `text.boss` becomes `The Spider Queen descends!`. The Zombie King's stomp fields go from
level 3's data (the queen does not stomp). Everything else about the boss fight is as the other bosses':
she appears after wave 5, stands `standZ` behind the road, winds up for `windup` seconds before each action
(the `windup` cue and the hint as today), and when she falls everything else on the field bursts for no
points, then the victory card comes.

- **Spit** (the first action, then every other): she throws a **web ball** that flies like a pumpkin
  monster's pumpkin (the same throw: `throwPumpkin` with a `web` flag) to the player's x at the throw,
  landing after `flight` (1.2) seconds. If the player is within `splash` (1) unit of it when it lands and is
  not dodging, it costs 1 heart and **webs** the player for `slowTime` (2) seconds. A web ball can be
  shot down in the air (25 points, as the flaming pumpkin can, and it then webs no one).
- **Webbed:** while `player.webbed` is above 0, the player's sideways speed is multiplied by `slow` (0.5)
  and dodging is refused (`dodge()` returns false, as during its cooldown); the counter runs down with
  the game's time and stands still while paused. Being webbed again while webbed sets it to `slowTime`
  again, it does not add up. A level start, Try again and Play again clear it.
- **Summon** (the other action): 3 spiders (spec 29's, not droppers) appear within `summonNear` (2)
  of her x, `summonBack` (2) behind her z, and walk in as spiders do.
- **She falls after 260 hits** (4000 points). The boss health bar reads `Spider Queen`.

## The model

`buildSpiderQueen({ tint = 0 })` in a new file `src/view/models/spider-queen.js`, registered in the
stage's `BOSSES` table as `spiderQueen`: spec 29's spider, larger and grander, built from `buildSpider`
with two new opt-in options (`abdomen` and `mark` colours, defaulting to the spider's own) so the
spider builder stays one function: size 3.2, the abdomen `#5a1f3a`, the hourglass `#d8e0ea`, eight glowing red
eyes, and a crown of five small gold spikes (`#d9a520`, cones of radius 0.03 and length 0.1) around the
head. Its `tick(t, { walk, windup })` is the spider's gait (the legs swing while she walks in, still once
she stands), and during the wind-up her two front legs rise (their rotation goes 0 to −1.0 as `windup`
goes 0 to 1) and her abdomen tilts back 0.15. The stage draws the web ball as a sphere of radius 0.25,
`#d8e0ea`, unlit, with a short trailing thread; it ignores rays except that it is a target for a shot
(so it can be shot down). `BURSTS.spiderQueen`: `{ count: 40, life: 1.5, size: 0.35, colors: ['#5a1f3a',
'#2a1f2e', '#d8e0ea', '#d9a520'], puff: '#3a2c3f', puffSize: 3 }`; `BURSTS.web`: `{ count: 10, life: 0.8,
size: 0.16, colors: ['#d8e0ea'], puff: '#d8e0ea', puffSize: 1 }` at a web ball's landing or shot down.

## Every screen

As the other boss fights: the intro card, the boss announcement, play, paused (the web ball, the
counter and the wind-up freeze), victory and defeat (the scene freezes). Each level start, Try again,
Play again, Next level and Back to title start fresh. The new texts are `The Spider Queen descends!` and the
bar's label; no new sound (the throw reuses the pumpkin throw's cue, the windup its cue), no HUD change.

## Nothing else changes

The Zombie King and the Scarecrow King, levels 1 and 2, spiders, wolves, bats and the rest of level 3,
the weapons, `get_state` (`boss_health` covers her), `llms.txt` (a sentence: level 3's boss is the
Spider Queen, who throws webs that slow the player, and summons spiders).

## Files

- `src/view/models/spider-queen.js` (new) and `src/view/models/spider.js` (the two options), each under 200
  lines.
- `src/logic/game-enemies.js` (the `spit` action), `game-time.js` or wherever the pumpkin lands (the web
  ball's landing), `game-journey.js` (`dodge` refuses while webbed), `game-time.js` (`movePlayer`
  slows and counts down the web), `game.js` or `reset()` (the field): each at most 14 lines longer than
  today.
- `src/view/stage.js` (the `BOSSES` entry) and the pumpkin drawing (the web ball): a few lines each;
  `src/logic/effects.js` or `bursts.js` (`BURSTS.spiderQueen`, `BURSTS.web`).
- `src/levels/level-3.js`: the boss data and text. `llms.txt`: one sentence.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the queen is the
supervisor's step. The builder may add and edit test files. It may change an earlier test only where it
asserts level 3's boss (spec 28's test says the Zombie King), and only that.

## Done when

`node --test` passes, and its tests prove:

1. Level 3's boss data and text are as above; she appears after wave 5, winds up 0.6 seconds before each
   action, alternates spit then summon every 3 seconds (the first after 2), falls after 260 hits for
   4000 points, and the victory card follows; everything else bursts for no points.
2. A web ball flies 1.2 seconds to the player's x at the throw; if the player is within 1 of it and not
   dodging it costs 1 heart and sets `webbed` to 2; dodging, or being farther, costs nothing and webs
   no one; a web ball shot down gives 25 points and webs no one.
3. Webbed, the sideways speed is half and `dodge()` returns false; it runs out after 2 seconds of game
   time, restarts (not adds) when webbed again, stands still while paused, and is cleared by a level
   start, Try again and Play again.
4. Summon: 3 spiders within 2 of her x and 2 behind her z, ordinary walkers (not droppers).
5. The model: size 3.2, the colours, the crown of five spikes, the eight eyes; the gait as the spider's;
   the front legs and abdomen follow `windup`; the stage builds her through `BOSSES`, the web ball as
   described, and `BURSTS.spiderQueen` and `BURSTS.web` exist.
6. The Zombie King's and the Scarecrow King's fights are unchanged (their stomp, throw and summon).
7. Files within the limits; any new file under 200 lines.
