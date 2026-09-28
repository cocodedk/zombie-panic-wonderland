# 03: level 2

## What the owner wants

The next level of the game, playing like the original's next level, kept simple, and built from
the same reusable components as level 1 (`docs/lean/01-the-game.md`), which is merged and live at
https://wonderland.cocode.dk/. Every model stays our own, made in code.

## The owner's answers to the grill (approved on 28 September 2026)

### 1. The level: the crumbling road

The original's second stage, kept simple: a moonlit, crumbling yellow brick road through a
cornfield, with scarecrows on poles, broken fences, a lonely farmhouse, and the green towers of the
Emerald City far behind. Sky from deep navy (#0f1a33) at the top to dark teal-green (#1f4d3f) at the
horizon, a pale moon (#e8ecd1), the road faded yellow brick (#b89a4e) with gaps, corn in #a8943e.
Every material flat-shaded, no textures, every model our own, made in code.

- **Zombies and pumpkin monsters:** the same components and rules as in level 1.
- **Crow (new):** flies in from the backdrop at a height, circles for 2 seconds, then dives at the
  player's x at that moment and reaches the road 1 second later. It costs 1 heart if the player is
  within 1 unit of where it lands and is not dodging. It falls after 1 hit (50 points). After its
  dive, hit or miss, a crow flies away, leaves the field and counts as cleared.
- **Waves:** 1: 5 zombies and 2 crows. 2: 6 zombies, 1 pumpkin monster and 3 crows. 3: 6 zombies,
  2 pumpkin monsters and 3 crows. 4: 8 zombies, 2 pumpkin monsters and 4 crows. 5: 8 zombies,
  3 pumpkin monsters and 5 crows. Each wave's enemies arrive one second apart, in the order the
  level data lists them.
- **Scarecrow King (boss):** stands 3 units behind the road and falls after 80 hits (3000 points).
  Every 4 seconds it does one of two things, in turn: throws a **flaming pumpkin**, which behaves like
  a pumpkin monster's pumpkin but costs 2 hearts and can be shot down (25 points); or **summons
  3 crows**.
- **Level data:** `src/levels/level-2.js`, using the same components as level 1. The new models are
  a crow, the Scarecrow King, corn rows, a scarecrow on a pole, a farmhouse and the Emerald City
  skyline, each a function taking its colours and sizes, like level 1's.

### 2. Getting in and out

- Level 1's victory screen gains a **Next level** button beside **Play again**; it starts level 2's
  intro card.
- Level 2's victory screen has **Play again** (level 2 again, from its intro card) and **Back to
  title** (the title screen; its next start begins level 1 with score 0).
- Level 2's defeat screen has **Try again**, which restarts level 2 from its intro card.

### 3. Every screen of level 2

The same screens, controls and overlay rules as level 1, with these words:
intro card `The yellow brick road is crumbling. Keep going!`, boss announcement `The Scarecrow King
rises!`, victory `The road is clear — for now.`, defeat `Game over`, and `Wave N cleared` between
waves.

### 4. Hearts and score

Hearts reset to 5 when level 2 starts. The score carries over from level 1. **Try again** and
**Play again** in level 2 reset the score to what it was when level 2 began; **Back to title**
resets it to 0.

### 5. The design reference

Level 1's sketch, HUD and overlays, unchanged, except that during level 2 the HUD's right side
reads `Level 2 · Wave N / 5`; during the boss fight it is replaced by the boss health bar,
labelled `Scarecrow King` as level 1's is labelled `Zombie King`. Only the backdrop and its palette change. The WebMCP tool `get_state`
gains `level` (1 or 2), and nothing else about it changes.

## Done when

`node --test` passes, and its tests prove:

1. Level 2's waves follow its data: counts, kinds, order and one-second spacing.
2. The crow: circle, dive, damage, dodge, the miss that leaves, and the hit that fells it.
3. The Scarecrow King: 80 hits, the alternation every 4 seconds, the flaming pumpkin's 2 hearts,
   and shooting it down.
4. The flow: **Next level**, **Play again**, **Back to title** and **Try again** lead where section 2
   says.
5. Hearts reset and score carry-over as section 4 says.
6. `get_state` reports the level. Level 1's tests still pass; the only change allowed in them is
   adding `level: 1` where they assert `get_state`'s exact answer.

## Out of scope

Sound, touch controls, level 3, saving scores, and any change to level 1 beyond its new **Next
level** button. The builder adds or edits test files as the checks above need.
