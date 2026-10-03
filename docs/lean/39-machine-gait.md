# 39: machine zombies, the walk and the colours

The second of three specs that make the zombies part machine (spec 38 gave them steel limbs, joints and a
brass chest; spec 40 will swap the rag, the bare foot and the stain for machine ones). This one gives them a
machine's walk, with knees that bend, an even beat and a body bob, and makes the metal read better.

## What the owner wants

The owner likes how the Spider Wood's spiders move: rigid segments turning about joints, on an even beat, with
the body bobbing. On 3 October 2026, after seeing spec 38 in a browser, the owner asked for this walk and for
a colour fix: under level 1's purple dusk light the steel showed lavender rather than steel, and the brass chest
was small and dull brown, its gear hard to see.

## The reference

Today's zombie after spec 38 (`buildZombie` in `src/view/models/zombie.js`, `addMachine` in
`src/view/models/zombie-machine.js`), facing +z:

- each leg is a hip group (`legs[i]`) at (±0.13, 0.84, 0) holding, in order, the leg cylinder (radius 0.1 at the
  top, 0.08 at the bottom, length 0.8, 5 sides, steel) at (0, −0.4, 0), the foot (a box 0.16 × 0.08 × 0.26) at
  (0, −0.8, 0.05), and the knee ball (an icosahedron of radius 0.13, dark steel) at (0, −0.4, 0);
- the walk (`tick`): `s = t × 3.2 + seed`, `step = sin(s) × 0.35 × walk`, `legs[0].rotation.x = step × swing[0]`,
  `legs[1].rotation.x = −step × swing[1]` (`swing` is 1 for each leg, or 0.6 for the limping one), and the
  torso sways `torso.rotation.z = sin(s) × 0.12`;
- `MACHINE` is steel `#8c949e`, dark steel `#34373d` and brass `#b8862e`; the front torn patch (a box
  0.14 × 0.12 × 0.02 at (0.1, 0.36, 0.151), turned 0.4 about z) and the side patch are brass; the gear is a
  cylinder of radius 0.045, length 0.02 and 8 sides at (0.1, 0.36, 0.168).

Only what is named below changes.

## The changes

### The legs get a knee

1. Each leg cylinder is split at its middle into two meshes that together have exactly its shape: an upper
   leg, a cylinder of radius 0.1 at the top and 0.09 at the bottom, length 0.4, 5 sides, steel, a child of the
   hip at (0, −0.2, 0); and a lower leg, a cylinder of radius 0.09 at the top and 0.08 at the bottom, length
   0.4, 5 sides, steel, in a new **knee** group.
2. The knee group (named `knee`) is a child of the hip at (0, −0.4, 0). It holds the lower leg at (0, −0.2, 0),
   the foot (the same mesh, named `foot`) at (0, −0.4, 0.05), and the knee ball (the same mesh) at (0, 0, 0). So
   with the knee straight every part is where it is today, and a standing zombie's hit area is exactly as
   today. The hip holds, in order, the upper leg and the knee group.

### The walk

3. **An even, faster beat.** The legs, the knees and the bob use their own phase `beat = t × 4 + seed` (today the
   legs use `t × 3.2 + seed`). The hips swing as today on that beat: `step = sin(beat) × 0.35 × walk`,
   `legs[0].rotation.x = step × swing[0]`, `legs[1].rotation.x = −step × swing[1]`. Everything else that uses
   `s = t × 3.2 + seed` keeps it: the arms' rest swing, the head's sway, the rag's sway, the windup.
4. **The knees bend.** Each knee bends back while its leg swings forward: `knee₀.rotation.x = 0.5 ×
   max(0, −sin(beat)) × swing[0] × walk` and `knee₁.rotation.x = 0.5 × max(0, sin(beat)) × swing[1] × walk`
   (0.5 radians at most; a limping leg's knee bends as much less as its swing). A bend only lifts the foot.
5. **The body bobs.** `torso.position.y = 0.92 + 0.03 × |sin(beat)| × walk`, so the torso rises 0.03 at most,
   twice a stride. The torso's base (y 0.92, plus at most 0.03) stays below the pelvis box's top (y 0.97), so no
   gap opens between them.
6. **No drunken sway.** `torso.rotation.z` is 0 at all times (today `sin(s) × 0.12`). The head keeps its own
   tilt and sway and the twitch.

Standing (`walk` 0), the hips and knees are straight, the torso at y 0.92 and not tilted. The arms stay
straight, as today: their reach, rest swing, windup and claws do not change.

### The colours

7. `MACHINE` becomes steel `#c4c0b6` (a lighter, warmer steel), dark steel `#34373d` (as today) and brass
   `#e0a838` (a brighter brass), all still the game's `flat` material (roughness 0.9, metalness 0).
8. **A bigger chest plate.** The front torn patch is scaled 1.5 in x and y (its scale.z stays 1), so it shows as
   0.21 × 0.18; its geometry, place and rotation are as today. Scaled, it stays clear of the stain (a box
   0.16 × 0.14 at (−0.08, 0.2, 0.151), turned 0.3): the two rectangles are at least 0.03 apart (in the torso's
   x–y plane). It stays on the shirt's front: its corners span x from about −0.03 to 0.23 and y from about 0.24
   to 0.48, inside the shirt's x ±0.25 and y 0 to 0.62.
9. **A bigger gear.** The gear's radius becomes 0.06 (length 0.02, 8 sides, place and rotation as today), inside
   the plate.
10. **Glowing joints.** The knee balls, the elbow balls and the gear glow faintly: their dark-steel material has
    the emissive colour `#ff7a2a` with `emissiveIntensity` 0.3. Nothing else glows anew.

## Who gets it

Every zombie: ordinary and fast zombies on all three levels, the fading copy of a fallen zombie, and the Zombie
King, who walks the same way at his size. The fast zombies keep their darker skin, shirt and pants, their eyes
and halos; the King keeps his shirt, crown and the crown's glow at the windup.

## What does not change

The head and all on it, the arms (shapes, colours, rest swing, windup, claws, elbows), the shirt, hem, sleeves,
pelvis, stain, rag, feet and the bare foot, the limp's side and size, the twitch, the flicker, sizes, every rule,
how fast a zombie moves over the ground, what a shot can hit on a standing zombie, the sounds and every other
model. Reduced motion stills the twitch, the flicker and the rag as today; the walk, with its knees and bob,
moves under reduced motion as the walk does today.

## Every screen

Zombies show where they show today, with the new walk and colours: play, the gaps between waves, the boss fight
(the Zombie King and his summoned zombies), paused (frozen, as today: no knee or bob moves), victory and defeat
(the scene freezes, as today). Loading and error show no 3D scene. The title and the intro card show no zombies,
as today. Each level start, Try again, Play again, Next level and Back to title build them fresh. No new text, no
HUD change, no new sound.

## Files

- `src/view/models/zombie-machine.js`: the knee structure (made by `addMachine`, which already reaches the
  legs), the gait (an exported function that the tick calls) and the colours; under 200 lines.
- `src/view/models/zombie.js`: at most 183 lines (182 today; four earlier tests cap it, the lowest at 183, and
  those caps stay).
- `src/view/models/zombie-details.js`: under 200 lines.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the zombies is the
supervisor's step. The builder may add and edit test files (each under 200 lines). It may change an earlier test
only in these ways, and nothing else in them:

- where it finds a leg's parts by their place among the hip's children (the cylinder as the first child, the
  foot as the second, the knee ball as a child of the hip), it finds them in the new structure; and where it
  expects the single leg cylinder (`[0.1, 0.08, 0.8, 5]` at (0, −0.4, 0)), it expects the two halves of change 1;
- where it computes the legs' phase as `t × 3.2 + seed` (for example `test/zombie-limp.test.js`), it uses
  `t × 4 + seed`;
- where it expects `torso.rotation.z` to be `sin(s) × 0.12` (`test/refined-zombies.test.js`), it expects 0;
- where it checks a `MACHINE` colour or the gear's radius, it uses the new value;
- where it counts the children or meshes of a zombie, a leg or the torso, only that number.

## Done when

`node --test` passes, and its tests prove:

1. The two leg halves with their sizes, places and colour; the knee group with its place, its three children
   and their places; a standing zombie's legs fill exactly the old cylinder's place, and the meshes a ray can
   hit on a standing zombie have the same shapes and world places as before this spec.
2. At several times and seeds, with `walk` 1, 0.5 and 0: the hips on the new beat, the knees' bend, the bob and
   a torso with no z tilt, with the formulas of changes 3 to 6, for an ordinary zombie, a limping one, a fast one
   and the Zombie King; the arms, head sway, rag sway, windup and twitch exactly as before.
3. With `walk` 0 the knees are straight, the torso at y 0.92 and `rotation.z` 0.
4. `MACHINE` has the new colours; the plate's scale (1.5, 1.5, 1) and that it stays clear of the stain and on
   the shirt's front; the gear's radius 0.06; the glow on the knees, elbows and gear and on nothing else new.
5. The stage's zombies and fading copies on all three levels and the Zombie King have the knees, the walk and the
   colours.
6. The file sizes in Files.
