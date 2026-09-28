# 01: Zombie Panic in Wonderland, in low-poly: one level

## What the owner wants

A browser game like Zombie Panic in Wonderland (Wii):
https://elkinfencer10.weebly.com/home/zombie-panic-in-wonderland-wii

- Low-poly 3D, built with three.js.
- Just one level, playing as much like the original as possible without overkill. Keep it simple.
- Built from reusable components, so later levels and features reuse them.
- Every model is our own, made in code. The owner decided on 28 September 2026: no asset files
  are downloaded or copied from anywhere. The flat-shaded low-poly look of the models on
  https://threejsassets.com/ is a style reference only; nothing of theirs is used. Each model
  should be good enough to stand on its own, because the owner may later offer them as assets.

## What the reference page says the game is

An arcade shooter, not a rail shooter: in each level the backdrop stays still and enemies spawn in
front of you. You move your character only left and right, dodge attacks with a button at the right
moment, and shoot with a gun that never runs out. Zombies roam a fairy-tale Wonderland.

## The journey, from opening the page to the end

The owner had no design and asked for the original's flow, kept simple; these decisions follow that.

1. **Loading.** While three.js loads, the page shows `Loading…` centred on a dark background.
2. **Errors.** If three.js cannot load, the page shows `The game could not load. Check your
   connection and reload the page.` If the browser has no WebGL, it shows `Your browser cannot show
   3D graphics (WebGL). Try another browser.` Nothing else is shown in either case.
3. **Title screen.** The scene is visible behind a dark overlay with the title `Zombie Panic in
   Wonderland`, the line `Click to start`, and the controls:
   `A / D or ← / → move · mouse aims · hold the left button to shoot · Space dodges · Esc pauses`.
   A click starts the level; the mouse pointer is hidden during play and a crosshair follows it.
4. **Intro card.** For 3 seconds, or until a click: `Zombies have risen in Wonderland. Hold the
   ruined road!` Then wave 1 starts.
5. **Play.** The camera is fixed behind and above the player (see the sketch). The heads-up display
   (HUD) shows hearts top left, the score top centre and `Wave N / 5` top right; during the boss, a
   boss health bar replaces the wave text.
6. **Between waves.** When a wave is cleared, `Wave N cleared` shows for 2 seconds, and the next wave
   starts 3 seconds after the clear.
7. **Pause.** Esc pauses everything and shows `Paused — press Esc to go on`. Esc again resumes.
8. **Boss.** After wave 5: `The Zombie King is here!` for 2 seconds, then the boss fight.
9. **Victory.** When the boss falls: `Wonderland is safe — for now.`, the final score, and a
   `Play again` button that restarts the level from the intro card.
10. **Defeat.** When the last heart is lost: `Game over`, the final score, and a `Try again` button
    that restarts the level from the intro card.

## The design reference: a sketch of the play screen

```
+------------------------------------------------------------------+
| ♥ ♥ ♥ ♥ ♥             SCORE 001250                 WAVE 3 / 5    |
|                                                                  |
|   twisted trees     leaning crypt     crooked clock tower        |
|   giant mushrooms   (the backdrop never moves)   hedges, fences  |
|                                                                  |
|        zombies and monsters appear here and come forward         |
|                           ( + )   <- crosshair follows the mouse |
| ================= the ruined brick road ========================== |
|                      [the player, seen from behind]              |
+------------------------------------------------------------------+
```

Colours: a dusk sky from deep purple (#2b1d3f) at the top to dull orange (#c46a3b) at the horizon;
the road is faded yellow brick (#b89a4e); zombies are grey-green (#7d9a6a) with ragged clothes;
every material is flat-shaded, with no textures.

## The models, all made in code from three.js primitives

- **Player:** a small hero in a red hood and cape, holding a stubby gun, seen from behind.
- **Zombie:** a hunched figure with long arms, a tilted head and torn clothes; it shambles.
- **Pumpkin monster:** a body made of vines under a carved pumpkin head; it throws small pumpkins.
- **Zombie King (boss):** a zombie three times the size, wearing a bent crown.
- **Backdrop:** twisted trees, giant mushrooms, a leaning crypt, a crooked clock tower, hedges and
  a picket fence around the ruined road.

Each model is a function that builds it and takes its colours and sizes as parameters, so other
levels can reuse it.

## The rules of the level

- **Player:** 5 hearts. Moves along the road at 6 units a second, between x = -8 and x = 8.
  **Dodge** (Space) is a 0.5 second roll along the direction of travel, with no damage taken during
  it, and a 1 second cooldown. The gun fires 8 shots a second while the left button is held, never
  runs out, and hits the first enemy or pumpkin under the crosshair.
- **Zombie:** appears at a random x in the backdrop and walks to the road at 1.2 units a second. On
  the road, it strikes when within 1.5 units of the player: 1 heart every 1.5 seconds. It falls
  after 3 hits. 100 points.
- **Pumpkin monster:** appears in the backdrop and stays there. Every 2.5 seconds it throws a
  pumpkin at the player's x at that moment; the pumpkin arcs for 1.2 seconds and costs 1 heart if
  the player is within 1 unit of where it lands and is not dodging. Shooting a pumpkin in the air
  destroys it (25 points). The monster falls after 5 hits. 250 points.
- **Waves:** 1: 4 zombies. 2: 6 zombies. 3: 5 zombies and 1 pumpkin monster. 4: 6 zombies and
  2 pumpkin monsters. 5: 8 zombies and 2 pumpkin monsters. Each wave's enemies arrive one second
  apart.
- **Zombie King:** walks to 3 units behind the road and fights from there. It falls after 60 hits
  (2000 points). Every 4 seconds it does one of two things, in turn: a **stomp**, a shockwave along
  the road that costs 1 heart unless the player is dodging when it arrives 1 second later; or a
  **summon** of 2 zombies.
- **Level data:** the waves, counts, timings and the boss are data in one level file, so a new level
  is a new data file that uses the same components.

## Components, for reuse

The game logic (state, waves, enemies, damage, score, dodge, pause) lives in modules that do not use
three.js, so Node can test them. Rendering, models and input are separate modules that use it.
three.js is loaded from https://cdn.jsdelivr.net/npm/three@0.170.0/ through an import map; there are
no other dependencies and no build step. The game runs from a static web server. Opening
`index.html` straight from disk is not required, because ES modules need a server.

## WebMCP (the owner's rule for every page)

When `document.modelContext` exists, the page registers two read-only tools:
- `describe`: one sentence saying what the page is.
- `get_state`: `{ screen, wave, score, hearts, enemies, boss_health }`. `screen` is one of `loading`,
  `error`, `title`, `intro`, `play`, `paused`, `victory` or `defeat`; `boss_health` is `null` until
  the boss appears.

A registry that refuses a tool never stops the game. Where there is no registry, the page does
nothing about WebMCP.

## Done when

`node --test` passes, and its tests prove, without a browser:

1. The waves follow the level data: counts, kinds, the one-second spacing, the 3-second gap.
2. Hits, hearts, scores and the falling of each enemy kind, as the rules say.
3. Dodge: no damage from a strike, a pumpkin or a stomp during it; its cooldown.
4. The boss: it appears after wave 5, and alternates stomp and summon every 4 seconds.
5. Victory when the boss falls, defeat at zero hearts, and a restart that resets everything.
6. Pause stops all timers, and resuming carries on where it stopped.
7. The screens follow the journey above, from loading to victory or defeat.
8. The two WebMCP tools answer as described, with a fake registry, and a refusing or missing one
   changes nothing.

## Answers to the grill

The owner delegated these to the flow of the original, kept simple.

- **Between waves and during the boss announcement,** the player keeps full control: moving,
  shooting, dodging and pausing all work. No enemy is on the field then, so nothing can cause
  damage. When an enemy falls, any pumpkin it threw vanishes with it. After `Wave N cleared`
  disappears, only the HUD and the scene show until the next wave's first enemy arrives, one second
  later.
- **Space while standing still** dodges toward the direction of the player's last movement, or to
  the right if the player has not moved yet in this level. A roll stops at the edge of the road
  (x = -8 or x = 8), and it still counts as a dodge.

## Out of scope

Sound and music, touch and mobile controls, more levels, cutscenes beyond the intro card, saving
scores, and publishing to GitHub Pages (a later spec).
