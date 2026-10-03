# 38: machine zombies, the body

The first of three specs that make the zombies part machine. This one gives them steel limbs, joints and a
brass chest under the torn shirt. Spec 39 will bend the knees and elbows in the walk, and spec 40 will swap
the body's details (the rag, the bare foot, the stain) for machine ones. This spec changes only the look.

## What the owner wants

On 3 October 2026 the owner asked for mechanical zombies, because they like how the Spider Wood's spiders
look and move: rigid, even, straight segments with joints. The owner agreed to the cyborg plan: the head stays
a rotting zombie head, so it still reads as a zombie, and the body turns to machine. The metals are light
(steel and brass), so the zombies do not blend in with the dark spiders in level 3's dark green fog.

## The reference

Today's zombie (`buildZombie` in `src/view/models/zombie.js`), facing +z, the player sees its front:

- two legs, each a hip group at (±0.13, 0.84, 0) holding a cylinder (radius 0.1 at the top, 0.08 at the
  bottom, length 0.8, 5 sides, in `pants`) at (0, −0.4, 0) and a foot at (0, −0.8, 0.05); a pelvis box in
  `pants`;
- a torso group at y 0.92, leaning 0.45, holding the shirt box (0.5 × 0.62 × 0.3 at (0, 0.31, 0)), the torn hem,
  two torn patches that show the skin (a box 0.14 × 0.12 × 0.02 at (0.1, 0.36, 0.151) turned 0.4 about z, and a
  box 0.1 × 0.16 × 0.02 at (−0.26, 0.2, 0.05)), the head, and the two arms;
- each arm a shoulder group at (±0.32, 0.55, 0) holding a sleeve in the shirt's material, the arm cylinder
  (radius 0.07 at the top, 0.055 at the bottom, length 0.85, 5 sides, in the skin) at (0, −0.42, 0), so from
  y 0.005 to −0.845, and the hand (an icosahedron of radius 0.08) at (0, −0.88, 0.02), in the skin.

Only the parts named below change. Every existing mesh keeps its shape, size, place and rotation, and the
order of every group's existing children stays as it is (tests find the foot as a hip's second child and the
shirt as the torso's first). New parts are added after the existing children.

## The changes

Three flat colours, in a new file `src/view/models/zombie-machine.js` that exports them as `MACHINE`:
**steel** `#8c949e`, **dark steel** `#34373d` and **brass** `#b8862e`. They use the game's `flat` material
(roughness 0.9, metalness 0) like every other model: the scene has no environment map, so a metallic
material would show almost black.

1. **Steel arms.** Each arm cylinder and each hand take the steel colour instead of the skin. The sleeves stay
   in the shirt's material.
2. **Steel legs.** Each leg cylinder takes the steel colour instead of `pants`. The pelvis box stays in
   `pants`. The feet are not changed (the shoe, or the bare foot in the skin, until spec 40).
3. **Knees.** On each leg, a ball joint: an icosahedron of radius 0.13 (detail 0) in dark steel, a child of the
   hip group at (0, −0.4, 0), the leg's middle. Its smallest radius (about 0.103) is more than the leg's radius
   there (0.09), so it shows all round.
4. **Elbows.** On each arm, a ball joint: an icosahedron of radius 0.09 (detail 0) in dark steel, a child of the
   shoulder group at (0, −0.42, 0), the arm's middle. Its smallest radius (about 0.071) is more than the arm's
   radius there (about 0.063).
5. **A brass chest.** Both torn patches take the brass colour instead of the skin, so the torn shirt shows the
   machine under it. They are no longer tinted (the brass is the same on every zombie).
6. **A gear.** In the front patch, a gear: a cylinder of radius 0.045 and length 0.02 with 8 sides, in dark
   steel, its axis along z (turned π/2 about x), a child of the torso at (0.1, 0.36, 0.168), so its back face
   (z 0.158) is behind the patch's front face (z 0.161) and its front face (z 0.178) in front of it. It does not
   turn.

Every new part (the knees, the elbows and the gear) ignores rays (`ignoreRays`), and every existing mesh keeps
its geometry, so what a shot can hit on a zombie is exactly as today.

`src/view/models/zombie-machine.js` exports `MACHINE` and a function `addMachine({ legs, arms, torso })` that
makes all six changes: it gives the existing arm cylinders, hands, leg cylinders and torn patches their new
material (the meshes stay the same objects, in the same places among their siblings), and adds the knees,
elbows and gear. It is called once per zombie, from `buildZombie` or from `addDetails` in `zombie-details.js`
(which `buildZombie` already calls once), whichever keeps `zombie.js` within its size (see Files).

## Who gets it

Every zombie: ordinary and fast zombies on all three levels, the fading copy of a fallen zombie, and the Zombie
King (who is a big zombie with a crown). The fast zombies keep their darker skin, shirt and pants and their
eyes and halos; the King keeps his shirt and crown. The machine colours are the same on all of them.

## What does not change

The head and all on it (the skin, eyes, halos, sockets, jaw, teeth, tufts, the twitch and the flicker), the
claws (now on steel hands), the stain, the rag, the feet and the bare foot, the shirt, the torn hem, the
pelvis, the sleeves, the walk, the limp, the windup, the sizes, the hit area, the tint of the skin and shirt,
the `skin`, `shirt`, `pants`, `eyes`, `size`, `seed`, `tint` and `extras` parameters (only that `skin` no
longer colours the arms, hands and patches, and `pants` no longer colours the legs), every other model, the
sounds and every rule.

## Every screen

Zombies show where they show today, with the new body: play, the gaps between waves, the boss fight (the
Zombie King and his summoned zombies), paused (frozen, as today), victory and defeat (the scene freezes, as
today). Loading and error show no 3D scene. The title and the intro card show no zombies, as today. Each
level start, Try again, Play again, Next level and Back to title build them fresh. No new text, no HUD change,
no new sound and no new animation: the new parts are still and move with their limb or the torso.

## Files

- `src/view/models/zombie-machine.js` (new), under 200 lines.
- `src/view/models/zombie.js`: at most 183 lines (182 today). Four earlier tests cap it, the lowest at 183
  (`test/zombie-limp.test.js` and `test/zombie-eye-flicker.test.js`); those caps stay as they are.
- `src/view/models/zombie-details.js`: under 200 lines (108 today).

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the zombies is the
supervisor's step. The builder may add and edit test files (each under 200 lines). It may change an earlier
test only where that test checks the colour of a zombie's arm, hand, leg or torn patch (now steel or brass:
the test in `test/refined-zombies.test.js` that the torn patches take the skin's tint becomes a test that they
are brass and untinted), or counts the children or meshes of a zombie, its torso, a leg or an arm (only that
number). It changes nothing else in them.

## Done when

`node --test` passes, and its tests prove:

1. `MACHINE` has the three colours; the arm cylinders and hands are steel, the leg cylinders steel, both torn
   patches brass, on an ordinary zombie, a fast one, one with a tint and the Zombie King.
2. The two knees and two elbows, with their shape, radius, colour, parent and place; the gear with its
   radius, length, sides, colour, rotation, parent and place.
3. Every existing mesh keeps its geometry, place and rotation, and each group's existing children keep their
   order; the new parts come after them and ignore rays; the meshes a ray can hit are the same as before.
4. The head, eyes, halos, jaw, claws, stain, rag, feet, shirt, pelvis and sleeves keep their colours; the
   skin and shirt keep their tint; `pants` still colours the pelvis.
5. The walk, the windup, the twitch and the limp pose the zombie exactly as before.
6. The stage's zombies and their fading copies on all three levels, and the Zombie King, have the new body.
7. The new file and `zombie-details.js` are under 200 lines and `zombie.js` is at most 183 lines.
