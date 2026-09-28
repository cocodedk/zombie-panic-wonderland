# 15: a Gatling gun

## What the owner wants

A Gatling gun with massive fire power and a suitable sound. The owner asked for it on 28 September
2026 and left the details to us; these are the defaults we proposed.

## The weapon

- **Gatling**, key **4**, after the launcher in the order the mouse wheel steps through.
- Hold the fire button: the barrels spin up for 0.5 seconds, then it fires 20 rounds a second for as
  long as the button is held. Each round is worth 2 hits and hits the first enemy, pumpkin, crate or
  canister under the crosshair, the way a Scattergun pellet does. Releasing the button stops firing
  at once. Every new press spins up for 0.5 seconds again, even during a spin-down.
- A magazine of 100 rounds. It reloads like the Scattergun and the launcher (spec 12): by itself when
  empty, early with R, in 3 seconds; switching away stops the reload.
- It is collected from a **Gatling crate**, which appears in each level 2 seconds after wave 5
  starts. The crate behaves like the other crates (spec 07: its fall, hover, leaving and 3 hits to
  collect), gives a full magazine, and shows its own emblem.
- Once collected it stays until a reset, like the other weapons (spec 12). Points, falls and bursts
  follow the existing rules.

## What the player sees and hears

The references are today's weapons: the weapon line, the crosshairs, the streaks, the gun models and
the pickup notice. Only the parts below are new.

- **The gun in hand:** six dark metal (#3a3a3a) barrels in a ring around one axis, with a brass
  (#b8860b) band and an ammunition box under them, flat-shaded and made in code. The barrels spin up
  to 12 turns a second while it spins up and fires, and slow to a stop over 0.4 seconds after the
  button is released.
- **Each round** draws a thin tracer streak in orange (#ffb347) from the muzzle to where it hits,
  lasting 0.05 seconds, and the muzzle flash flickers while it fires.
- **Its crosshair:** today's ring and colour, 40 px across, with four short ticks outside it at the
  top, bottom, left and right.
- **The weapon line** gains `· 4 Gatling`, with its magazine or `reloading` as the others show theirs,
  for example `1 Popper ∞ · 2 Scattergun — · 3 Launcher 2/2 · 4 Gatling 87/100`.
- **The pickup notice:** `Gatling! Hold fire to spin it up — 20 rounds a second`, for 2.5 seconds,
  where the other pickup notices show.
- **The title's controls line:** `1 2 3 or wheel: weapons` becomes `1 2 3 4 or wheel: weapons`.
- **Sounds**, all following mute and pause like every cue:
  - `spinup`: a rising mechanical whine, 0.5 seconds, when the barrels start to spin up;
  - `gatling`: one short, punchy crack of about 25 ms for every round, each with a slightly different
    pitch (within 5%), so 20 a second sound like a heavy rattle, not a buzz;
  - `spindown`: a falling whine of 0.4 seconds when firing stops.

## Every screen

- Loading, error and title: no weapon line, no crosshair and no firing, as today.
- Intro card: the weapon line lists all four weapons, `4 Gatling —` dimmed, like every weapon not owned.
- Play, the gaps between waves and the boss fight: as above.
- Paused: everything freezes, the spin-up, the spinning barrels, the reload and the sounds included.
- Victory and defeat: the scene and the HUD freeze as they are, and the Gatling stops firing.
- Each level start, **Try again**, **Play again**, **Next level** and **Back to title** leave only the
  Popper, as today.

## WebMCP

`get_state`'s `weapon` can also be `gatling`, with its magazine as `ammo`. Nothing else in it changes.
`llms.txt` names the Gatling among the weapons and in `get_state`'s answer.

## Done when

`node --test` passes, and its tests prove:

1. Key 4 and the wheel reach the Gatling only once it is owned, and the wheel wraps around four
   weapons.
2. The 0.5-second spin-up on every press, then 20 rounds a second while held, each worth 2 hits on the
   first thing under the crosshair as a pellet is, and firing stopping at once on release.
3. The magazine of 100, the 3-second reload by itself or with R, and switching away stopping it.
4. The Gatling crate 2 seconds after wave 5 starts in both levels, collected like the other crates,
   giving a full magazine.
5. Against a durable, zombie-sized target it deals 40 hits a second once spun up, more than the
   Scattergun's best (8 pellets × 2 hits × 2 blasts = 32).
6. The gun model's parts and colours and its barrels' spin, the tracers, the crosshair, the weapon
   line, the notice, the controls line, and the three cues when they should play.
7. Pause and the resets as above; `get_state` and `llms.txt` as above.
8. Every earlier test still passes. The builder may change any earlier test whose expectation this
   spec changes (the weapon order and wheel, the weapon line, the controls line, the crate list,
   `llms.txt`), and nothing else in them. The builder adds or edits test files as the checks above
   need.

## Answers to the grill

- **The intro card** shows `4 Gatling —`, dimmed, in the weapon line: the line always lists all four
  weapons wherever it shows.
- **The crate's emblem:** six small circles in a ring, the barrels seen from the front, in the crates'
  dark emblem colour (#2a1a0e), on each side.
- **Held fire through a reload:** firing stops when the magazine empties, and the barrels spin down
  with `spindown`. When the reload ends with the button still held, the barrels spin up for 0.5
  seconds again, with `spinup`, before firing. Putting the Gatling away stops its barrels at once,
  with no sound; taking it back with the button held spins up for 0.5 seconds again.
- **Releasing fire during the spin-up** fires no round: the `spinup` whine stops at once, and the
  barrels slow to a stop over 0.4 seconds with `spindown`.
- **Victory and defeat** freeze everything at once, the barrels included: no spin-down animation and
  no `spindown` sound.

## Out of scope

Any other weapon, upgrades, and any change to enemies, bosses or levels.
