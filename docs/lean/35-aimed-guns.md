# 35: guns that point at the aim

The first of three specs on the hero and the guns: this one makes the gun point where the player
aims; spec 36 improves the hero's look and spec 37 the guns' looks.

## What the owner wants

The guns must point at the aim: when the crosshair moves, the gun in the hero's hands turns to point at
the place aimed at, and the shot leaves the muzzle along the barrel. The owner asked on 30 September 2026
and left the details to us; these are the defaults we propose. Today the gun points straight ahead
(along −z) whatever the crosshair does, and the bullet's streak starts at a fixed muzzle and bends to the
aim point.

## The rule

The game's `aimPoint` is where the crosshair's ray lands (on a thing aimed at, or the ground or the
backdrop, or 60 units far along the ray); `setAim` already sets it every frame. The hero's aimed arm
and gun turn so that **the barrel points at that point**:

- **Angles:** a yaw `θ` about the vertical axis (0 straight ahead, positive to the left) and a pitch `φ`
  (0 level, positive up). The barrel direction is `(−cos φ · sin θ, sin φ, −cos φ · cos θ)`.
- **The pivot:** the turn is about the hero's shoulder, at `PIVOT = { x: 0.05, y: 0.3, z: −0.1 }`
  from the waist pivot of the body (the same frame as `MUZZLES`, which stay as they are). The muzzle of
  the weapon in hand is at `MUZZLES[weapon]` when the angles are 0, and turns with the gun about the pivot.
- **Solving for the aim point:** in a new pure module `src/logic/aim.js` (no three.js, so Node can test
  it), `aimAngles(x, roadZ, pose, target)` finds `θ` and `φ` so that the barrel line through the turned
  muzzle passes through `target`: start from the direction of `target` from the pivot, then 4 times
  place the muzzle with the current angles and take the direction from that muzzle to `target`. Then it
  limits `θ` to ±80° (1.396 radians) and `φ` to −30° to +40° (−0.524 to 0.698 radians). For a target 5 or more
  units from the muzzle inside those limits, the barrel line passes within 0.5° of it.
- **No aim:** with no `target` (none yet), or off the screens below, the angles are 0 and the gun points
  straight ahead as today.
- **A dodge:** the hero rolls through a dodge; the gun's aim fades out and back with it: the angles are
  multiplied by `1 − sin(roll × π)`, which is 1 outside a dodge and 0 at its middle.
- **Instant, not smoothed:** the angles follow the crosshair in the same frame. A shot and the picture
  use the same angles, so the streak leaves exactly along the barrel.

## Where it plugs in

- `game.pose()` (in `game.js`) also returns `yaw` and `pitch`: from `aimAngles` with the player's x, the
  level's `roadZ`, the pose and `this.aimPoint`; both 0 unless the screen is `intro`, `play` or `paused`
  (the screens where the crosshair shows). On victory, defeat, the title, loading and error the gun points
  straight ahead.
- `muzzleAt(x, roadZ, pose)` (in `effects.js`) places the muzzle turned by `pose.yaw` and `pose.pitch`
  (0 when absent, which is today's result exactly), and so does every shot that reads it: the Popper's
  streak, the Scattergun's pellets, the Gatling's tracers, the launcher's shell and their flash.
- **The model** (`player.js`): the hero's arms, the guns and the muzzle flash move into one group, the
  **aim rig**, whose origin is the pivot (so the arms stay on the gun), with Euler order `YXZ`: `rotation.y`
  is `yaw` and `rotation.x` is `pitch`, set by `tick(t, pose)` each frame from `pose.yaw` and `pose.pitch`.
  The head and body do not turn. Nothing else about the model changes here: its shapes, sizes and colours
  are as today (specs 36 and 37 change them).

## What the player sees

The reference is today's hero and guns: the same figure with the same gun. It only turns: the barrel
follows the crosshair, left and right, up and down, and the arms go with it. Dodging, walking, the
Gatling's spin, reloading and the flash work as today. No new text, no HUD change, no new sound.

## Every screen

- Loading, error and title: the gun points straight ahead; the title's pointer is an ordinary cursor.
- Intro card and play, the gaps between waves and the boss fight: the gun follows the crosshair.
- Paused: the aim holds still (the crosshair does), so the gun holds its angles and goes on after.
- Victory and defeat: the crosshair is gone and the gun points straight ahead, in the frozen scene.
- Each level start, Try again, Play again, Next level and Back to title start with the gun straight.

## Nothing else changes

What a shot hits, damage, weapons, ammo, reloads, scoring, the camera, the crosshairs, `get_state`,
`llms.txt`. Where a shot lands is still the aim point; only the muzzle it starts from moves.

## Files

- `src/logic/aim.js` (new), under 200 lines.
- `src/logic/effects.js` (`muzzleAt`) and `src/logic/game.js` (`pose`): at most 10 lines longer each.
- `src/view/models/player.js`: the aim rig and `tick`; at most 20 lines longer; if it would pass 200
  lines, move the guns into `src/view/models/guns.js` (new, under 200 lines) and import them.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the hero aiming is
the supervisor's step. The builder may add and edit test files, and the fake three.js. It may change an
earlier test only where that test compares `pose()` or `muzzleAt`'s answer exactly (they gain `yaw` and
`pitch`, 0 when nothing is aimed), and only that.

## Done when

`node --test` passes, and its tests prove:

1. `aimAngles` for targets straight ahead, to the left, to the right, above and below, at distances 5,
   10 and 40 units: the barrel line through the turned muzzle passes within 0.5° of the target (for
   those inside the limits), with the barrel direction given above.
2. The limits: a target far to the side gives `θ` of ±1.396 at most, one far above `φ` of 0.698 at most,
   one far below −0.524 at least; no target gives 0 and 0.
3. The dodge: at `roll` 0 and 1 the angles are whole, at 0.5 they are 0, and in between they follow
   `1 − sin(roll × π)`.
4. `muzzleAt` with no `yaw` or `pitch` returns exactly what it does today for every weapon and pose; with
   them it returns the muzzle turned about the pivot, and for the aim point it is on the barrel line.
5. `pose()` gives `yaw` and `pitch` from the aim point on `intro`, `play` and `paused`, and 0 on the title,
   loading, error, victory and defeat; paused, they do not change.
6. A shot: the Popper's streak starts at the turned muzzle and ends at the aim point, along the barrel; the
   Scattergun's pellets and the Gatling's tracers start there too; the flash is at the muzzle.
7. The model (with the fake three.js): the arms, the gun in hand and the flash are children of the aim
   rig; its `rotation.y` and `rotation.x` equal `yaw` and `pitch` with order `YXZ`; the head and body
   do not turn; with angles 0 the model is as before.
8. The new file is under 200 lines; the others are within their limits.
