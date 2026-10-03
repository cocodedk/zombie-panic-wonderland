# 41: machine zombies, the details

The last of the specs that make the zombies part machine (spec 38 gave them steel limbs, joints and a brass
chest; spec 39 the knee walk and brighter colours; spec 40 lifted them onto the road). This one swaps the
body's three cloth-and-skin details for machine ones: the dangling rag becomes a hanging cable, the bare foot
becomes a piston foot, and the dried stain becomes a rust patch.

## What the owner wants

On 3 October 2026 the owner asked for mechanical zombies like the Spider Wood's spiders, and agreed to the plan:
a rotting zombie head on a machine body. The head and its details (eyes, sockets, jaw, teeth, tufts, twitch,
flicker) stay a zombie's. The body's details should be a machine's.

## The reference

Today's zombie (`buildZombie` in `src/view/models/zombie.js`, details in `src/view/models/zombie-details.js`,
the machine in `src/view/models/zombie-machine.js`), facing +z. The stage builds every zombie with
`ZOMBIE_EXTRAS`, so all of these show:

- **the stain** (`STAIN`): a box 0.16 × 0.14 × 0.02 in `#4a1f24` on the torso at (−0.08, 0.2, 0.151), turned
  0.3 about z;
- **the rag** (the `rag` flag, `RAG`): a pivot group on the torso at (0.2, −0.02, 0.13), swinging by
  `ragSway` (still under reduced motion), holding one strip, a box 0.05 × 0.16 × 0.012 in the shirt's material,
  at (0, −0.08, 0) in the pivot; the strip ignores rays;
- **the bare foot** (the `bareFoot` flag, `footColor`): the foot of the limping side (`limpSide(seed)`) is the
  same box as the other foot (0.16 × 0.08 × 0.26) but in the skin's material instead of the shoe's `#2a2622`.
  Since spec 39 each foot is in its leg's knee group at (0, −0.4, 0.05); the knee group also holds the lower leg
  (radius 0.09 at the top, 0.08 at the bottom, length 0.4, 5 sides, at (0, −0.2, 0)) and the knee ball.

`MACHINE` is steel `#c4c0b6`, dark steel `#34373d` and brass `#e0a838`.

## The changes

1. **A rust patch.** The stain's colour becomes rust, `#8a4a1e`. Its shape, size, place and rotation stay.
2. **A hanging cable.** In the rag's pivot, the strip is replaced by a cable and its plug, both ignoring rays:
   - the cable: a cylinder of radius 0.012 and length 0.16, 5 sides, in `#1c1c1f`, at (0, −0.08, 0) in the
     pivot, so it hangs from the pivot as the strip did;
   - the plug: a box 0.03 × 0.04 × 0.03 in brass (`MACHINE.brass`), at (0, −0.18, 0) in the pivot, its top at the
     cable's end.
   The pivot keeps its place and its sway (`ragSway`), so the cable swings as the rag did. The cable comes
   first among the pivot's children, the plug second.
3. **A piston foot.** On the limping side (the leg whose foot was bare), the foot takes the steel colour
   (`MACHINE.steel`, untinted) instead of the skin, and a piston is added to that leg: a cylinder of radius 0.025
   and length 0.16, 6 sides, in brass, a child of that leg's knee group at (0, −0.3, −0.115), upright, ignoring
   rays. It runs behind the heel from y −0.38 to −0.22 in the knee's frame: its front (z −0.09) is behind the
   lower leg's back (at most z −0.083 there) and its foot end is behind the foot's back face (z −0.08), so it
   touches neither. It moves with the knee. The other foot keeps the shoe's colour, as today.

The flags keep their names (`rag` now switches the cable on, `bareFoot` the piston foot), and a zombie built
without `extras` still has neither, as today. Only the parts named here change.

## Who gets it

Ordinary and fast zombies on all three levels and their fading copies get all three, since the stage builds them
with `ZOMBIE_EXTRAS`. The Zombie King is built without extras (`BOSSES` in `src/view/stage.js` passes only a
tint), so today he has no rag and no bare foot; he gets the rust patch only, and stays without a cable or a
piston. The rust, cable and piston look the same on every zombie that has them (no tint).

## What does not change

The head and all on it, the arms, elbows, hands and claws, the shirt, hem, sleeves, pelvis, chest plate and
gear, the legs, knees and the walk (spec 39), the lift onto the road (spec 40), which side limps and how much,
the shoe on the other foot, sizes, what a shot can hit (the foot is the same box; the new parts ignore rays,
as the strip did), every rule, the sounds and every other model.

## Every screen

Zombies show where they show today, with the new details: play, the gaps between waves, the boss fight (the
Zombie King and his summoned zombies), paused (frozen, as today: the cable does not swing), victory and defeat
(the scene freezes, as today). Loading and error show no 3D scene. The title and the intro card show no zombies,
as today. Each level start, Try again, Play again, Next level and Back to title build them fresh. No new text, no
HUD change, no new sound and no new animation: the cable swings as the rag did, and is still under reduced motion
as the rag was.

## Files

- `src/view/models/zombie-machine.js` and `src/view/models/zombie-details.js`: each under 200 lines (68 and 113
  today).
- `src/view/models/zombie.js`: at most 183 lines (180 today; four earlier tests cap it, the lowest at 183, and
  those caps stay).

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the zombies is the
supervisor's step. The builder may add and edit test files (each under 200 lines). It may change an earlier test
only in these ways, and nothing else in them:

- where it expects the stain's colour `#4a1f24` (for example `test/refined-zombies.test.js`,
  `test/zombie-machine.test.js` and the copy of the old zombie in `test/zombie-machine-keeps.test.js`), it
  expects the rust `#8a4a1e`;
- in `test/zombie-dangling-rag.test.js`, where it checks the strip (its geometry, place, rotation and the shirt's
  material), it checks the cable and the plug of change 2 instead; its checks of the pivot's place, sway and
  reduced motion stay;
- in `test/zombie-bare-foot.test.js`, where it expects the bare foot in the skin's colour (with its tint), it
  expects the steel colour, untinted; its checks of which foot and of the other foot's shoe stay;
- where it counts the children or meshes of a zombie, its torso, the rag's pivot, a leg or a knee group, or the
  meshes that ignore rays (for example `test/fast-zombies-view.test.js`), only that number;
- in `test/zombie-machine.test.js`, where it expects the bare foot in the skin's tinted colour, it expects the
  steel colour, untinted;
- in `test/zombie-bare-foot.test.js` and `test/zombie-dangling-rag.test.js`, where a test compares two models
  part by part (shapes, places, rotations, colours) to prove nothing else changed, it leaves the new piston and
  the plug out of that comparison (or compares them as the new parts they are); every other part is compared as
  before.

## Done when

`node --test` passes, and its tests prove:

1. The stain is rust, with its old shape, size, place and rotation.
2. The rag's pivot holds the cable and then the plug, with their shapes, sizes, places and colours, both ignoring
   rays; the pivot's place and sway are as before, and still under reduced motion.
3. With `bareFoot`, the limping side's foot is steel and untinted, the other foot keeps the shoe; the piston is
   in the limping leg's knee group with its shape, size, place, colour and no rotation, ignores rays, and touches
   neither the lower leg nor the foot; the piston follows the knee's bend; without `bareFoot` there is no piston
   and both feet have the shoe.
4. Without `extras`, a zombie has no cable, no plug and no piston.
5. The meshes a ray can hit on a standing zombie are the same, with the same shapes and world places, as before
   this spec.
6. The stage's zombies and fading copies on all three levels have the rust, the cable and the piston foot; the
   Zombie King has the rust and no cable or piston.
7. The file sizes in Files.
