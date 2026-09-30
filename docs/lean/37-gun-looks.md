# 37: the guns' looks

The last of three specs on the hero and the guns (spec 35 made the guns point at the aim, spec 36 improved
the hero's look). This one improves the four guns' looks.

## What the owner wants

Improved looks for the guns: the Popper, the Scattergun, the Pumpkin launcher and the Gatling. The owner
asked on 30 September 2026 and left the details to us; these are the defaults we propose. The camera sits
behind and above the hero (at (0, 3.6, 9)), and the gun is held out in front of the hero, so the player sees
each gun from behind and above: its top, its rear and its sides. The additions are on those, and keep the
game's style: flat-shaded, low-poly, made in code, no textures.

## The reference

Today's four guns in `buildPlayer` (`src/view/models/player.js`): a boxy Popper with a short barrel, a
Scattergun with two barrels, a launcher that is a tube with an orange ring, and the Gatling with six barrels,
a brass band and an ammunition box. Every gun is a group in the gun's own frame: x to the right, y up, and the
muzzle toward −z. The guns' positions in the hero, their muzzle tips (`MUZZLES`), the flash, the aim rig
and the Gatling's spin are not changed. This spec changes only what each gun is made of.

## The changes

The guns move out of `player.js` into a new file `src/view/models/guns.js`, which exports `buildGuns({ gun })`
returning `{ guns, spinner }` (the four groups by weapon, and the Gatling's spinner) exactly as `player.js`
builds them today, plus the additions below; `player.js` imports it. The existing parts keep their shapes,
sizes, places and colours (the `gun` parameter colours the bodies and barrels as today). Every new part is a child
of its gun's group, in the gun's frame, in a flat colour. **No new part reaches in front of the gun's muzzle
tip** (z −0.34 for the Popper, −0.50 for the Scattergun, −0.46 for the launcher, −0.66 for the Gatling: each
`MUZZLES[weapon].z` minus the gun group's z of −0.42).

**The Popper** (body 0.12 × 0.14 × 0.26, barrel radius 0.045 from z −0.3 to −0.1 at y 0.02, grip tilted 0.3):

1. A rib along the top: a box 0.04 × 0.02 × 0.24 in `#55555f` at (0, 0.08, −0.02).
2. A front sight: a box 0.015 × 0.03 × 0.015 in `#2a2a30` at (0, 0.08, −0.28).
3. A rear sight: a box 0.04 × 0.025 × 0.015 in `#2a2a30` at (0, 0.0825, 0.1).
4. A brass muzzle ring: a torus of radius 0.048 and tube 0.012 in `#b8860b` at (0, 0.02, −0.29), its hole
   along z.
5. A brass butt cap: a box 0.075 × 0.02 × 0.085 in `#b8860b` as a child of the grip mesh, at its local (0, −0.075,
   0), so it tilts with the grip.

**The Scattergun** (body 0.16 × 0.14 × 0.26, two barrels of radius 0.035 at x ±0.038 from z −0.5 to −0.12):

1. A rib joining the barrels: a box 0.014 × 0.014 × 0.36 in `#55555f` at (0, 0.058, −0.31).
2. A brass bead sight: an icosahedron of radius 0.012 (detail 0) in `#b8860b` at (0, 0.068, −0.47) (its
   front, z −0.482, is behind the tip).
3. A wooden forend under the barrels: a box 0.1 × 0.06 × 0.16 in `#7a5230` at (0, −0.045, −0.3).
4. A short wooden stock behind the body: a box 0.09 × 0.11 × 0.095 in `#7a5230` at (0, −0.02, 0.1675), from
   z 0.12 to 0.215 in the gun's frame, so that its back face stops at the hero's tunic (the tunic's front face
   is at about body z −0.205, which is z 0.215 in the gun's frame) and no part of it is sunk into the chest.
5. Two brass side plates: boxes 0.005 × 0.08 × 0.1 in `#b8860b` at (±0.0825, 0, −0.02).

**The launcher** (a tube of radius 0.09 from z −0.46 to 0.1 at y 0.02, an orange ring at its mouth):

1. A flared muzzle: an open cylinder of top radius 0.125, bottom radius 0.09 and length 0.08 in `#e07b24`, its axis
   along z, centred at (0, 0.02, −0.42), the wide end forward.
2. A flared rear: an open cylinder of radius 0.09 at the front and 0.12 at the back, length 0.08 in `#3b3b44`,
   its axis along z, centred at (0, 0.02, 0.14).

Both flares are open cylinders, so their material is **double-sided** (`side: THREE.DoubleSide`, as the cape's
and collar's are): from the camera behind and above, the rear flare's inside faces it.
3. A sight rail on top: a box 0.03 × 0.03 × 0.3 in `#55555f` at (0, 0.125, −0.15).
4. A pumpkin-stem sight: a cone of radius 0.015 and length 0.05 (5 sides) in `#3f6b2a` at (0, 0.16, −0.27).

**The Gatling** (a body 0.2 × 0.2 × 0.14, six barrels of radius 0.028 from z −0.66 to −0.06 on the spinner, a
brass band at z −0.5, an ammunition box below):

1. A second brass band: a cylinder of radius 0.115 and length 0.05, its axis along z, in `#b8860b` at
   (0, 0.02, −0.3).
2. A carry handle: half a torus (`arc` π, radius 0.07, tube 0.012, 6 × 8 segments) in `#55555f`, arching over the
   body from x −0.07 to 0.07, at (0, 0.125, −0.02).
3. A crank: a cylinder of radius 0.012 and length 0.1 along x in `#55555f` at (0.15, 0.02, 0.02), and a brass knob,
   an icosahedron of radius 0.03 (detail 0) in `#b8860b` at (0.2, 0.02, 0.02).
4. A front sight bar: a box 0.02 × 0.04 × 0.02 in `#2a2a30` at (0, 0.14, −0.3).

The Gatling's new parts do not spin with the barrels: only the spinner's own parts turn, as today.

## What does not change

The hero's look (spec 36), the guns' places, sizes and muzzle tips, the flash, the aim rig and its angles (spec
35), which gun shows (only the one in hand), the Gatling's spin, reloads, damage, sounds and every rule. The
hero is not a target; the guns are not targets, as today.

## Every screen

The guns show where the hero shows, the one in hand only, with the new details: the title (the Popper, in the
hero's hands), the intro card, play, the gaps between waves and the boss fight (the weapon in hand), paused
(frozen), victory and defeat (the scene freezes, the gun straight ahead by spec 35). Loading and error show no 3D
scene. Each level start, Try again, Play again, Next level and Back to title start with the Popper, as today. No
new text, no HUD change, no new sound, no new animation.

## Files

- `src/view/models/guns.js` (new), under 200 lines: if the four guns with their additions would pass 200 lines,
  split them into `src/view/models/guns.js` (the Popper and Scattergun) and `src/view/models/guns-heavy.js` (the
  launcher and the Gatling), each under 200 lines.
- `src/view/models/player.js`: the guns are built by the import, at least 25 lines shorter than today.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of each gun is the
supervisor's step. The builder may add and edit test files (each under 200 lines), and the fake three.js. It
may change an earlier test only where that test counts the parts or children of a gun or of the hero's rig,
and only that number.

## Done when

`node --test` passes, and its tests prove:

1. The Popper's five additions, the Scattergun's five, the launcher's four and the Gatling's four (with its
   half-torus `arc` of π), each with the shape, size, place and colour above.
2. No **new** part reaches in front of its gun's muzzle tip (the frontmost point of each new part, with its
   own size, is at or behind the tip's z); the existing parts are exactly as before (the launcher's orange
   ring, which already reaches to z −0.488, stays as it is and is not part of this check); both launcher
   flares are double-sided.
3. `buildGuns({ gun })` returns the four groups by weapon and the spinner; the `gun` parameter still colours the
   bodies and barrels; only the weapon in hand is visible.
4. The Gatling's spin turns only the spinner's own parts; the new Gatling parts stay still.
5. The aim rig, the flash, the muzzle tips and the hero are exactly as before.
6. The new files are under 200 lines and `player.js` is at least 25 lines shorter than today.
