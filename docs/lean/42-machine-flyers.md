# 42: machine crows and bats, with glowing eyes

The zombies became part machine in specs 38 to 41. This spec does the same for the two flyers, the crows
(levels 2 and 3) and the bats (level 3), and makes their eyes glow.

## What the owner wants

On 4 October 2026 the owner asked: "make the flying things more mechanical, like the crows and the bats and
give them glowing eyes". The look follows the machine zombies: gunmetal and steel bodies, brass parts, flat
colours (the game's `flat` material, roughness 0.9, metalness 0: the scene has no environment map), and
red eyes that glow.

## The reference

- **The crow** (`buildCrow` in `src/view/models/crow.js`, facing +z): a body (an octahedron of radius 0.28,
  scaled (0.8, 0.7, 1.4)); a head group at (0, 0.1, 0.38) holding the head (an icosahedron of radius 0.16), the
  beak (a cone) and two eyes (boxes 0.04 × 0.04 × 0.02 in a `glow` material, at (±0.08, 0.05, 0.1)); a tail; and
  two wings, each a shoulder group at (±0.12, 0, 0) holding a feather (a box 0.7 × 0.04 × 0.34 at (±0.38, 0, 0),
  turned ±0.2 about y) and a wing tip (a cone). Its defaults: `feathers` `#16161c`, `beak` `#c99a2e`, `eyes`
  `#e8ecd1` (pale). The wings beat in `tick`.
- **The bat** (`buildBat` in `src/view/models/bat.js`, facing +z): a body (an icosahedron of radius 0.12, named
  `body`); a head group (`head`) at (0, 0.05, 0.12) holding the head, two ears (cones, `ear`), two eyes (boxes
  0.03 × 0.03 × 0.01 in a `glow` material, `eye`, at (±0.035, 0.02, 0.07)) and two fangs; and two wings, each a
  shoulder group (`wing`) at (±0.06, 0.02, 0) holding a flat fan (`fan`) of three triangles from the shoulder
  out to the points (±0.3, 0.2), (±0.5, 0.08), (±0.42, −0.12) and (±0.16, −0.2), in the plane z = 0. Its
  defaults: `body` `#2b1b3a`, `membrane` `#5a3f6b`, `eyes` `#ff2a1a`, `fang` `#e8e0c8`.
- The stage builds them with their defaults (`src/view/stage.js` and `src/view/stage-entities.js`, which also
  draws a crow or bat flying away after its dive). Every mesh of a flyer can be hit by a shot today.

## The changes

**The glow** (both): in front of each eye, a glow: a `THREE.Sprite` (so it always faces the camera) with a
`SpriteMaterial` in the eye's colour, `transparent`, `opacity` 0.6, `blending: THREE.AdditiveBlending`,
`depthWrite: false`, ignoring rays, a child of the head group at the eye's x and y and 0.01 in front of the
eye's z. Its scale is 0.14 for the crow and 0.09 for the bat (`scale.set(s, s, 1)`). The eyes themselves keep
their shape, size and place.

**The crow:**

1. New default colours: `feathers` gunmetal `#2c3038`, `beak` brass `#e0a838`, `eyes` red `#ff3b1a`. The
   parameters stay, so a caller that passes its own colours still gets them.
2. A brass rod along each wing's front edge: a box 0.7 × 0.03 × 0.03 in brass `#e0a838`, a child of that wing's
   feather mesh at (0, 0.02, 0.16) in the feather's frame, so it turns and beats with the feather. It ignores
   rays.
3. A gear on its back: a cylinder of radius 0.06, length 0.02, 8 sides, in dark steel `#34373d`, its axis upright,
   a child of the crow's root at (0, 0.205, 0), sitting on the body's top (the body reaches y 0.196). It ignores
   rays and does not turn.

**The bat:**

4. New default colours: `body` dark steel `#34373d`, `membrane` steel grey `#7a808a`; the ears become brass
   `#e0a838`. `eyes` stays red `#ff2a1a` and `fang` stays `#e8e0c8`. The parameters stay.
5. Brass spars: in each wing, three thin brass rods from the shoulder (the wing group's origin) to the fan's edge
   points (±0.3, 0.2, 0), (±0.5, 0.08, 0) and (±0.42, −0.12, 0): each a box 0.012 × 0.012 × 1 in brass `#e0a838`,
   laid between the two points with `span` (in `src/view/models/parts.js`), named `spar`, a child of the wing
   group after the fan, ignoring rays. They beat with the wing.

Every new part (the glows, rods, gear and spars) ignores rays, and every existing mesh keeps its geometry, place
and rotation, so what a shot can hit on a crow or a bat is exactly as today. Only the parts named here change:
the wing beat, the dive, the flight paths, the flyaway, sizes, sounds and every rule stay as they are.

## Every screen

Crows and bats show where they show today, with the new look: play and the gaps between waves on levels 2 and 3
(crows) and level 3 (bats), the boss fight (where flyers show then, as today), a crow or bat flying away
after its dive, paused (frozen, as today), victory and defeat (the scene freezes, as today). Loading and error
show no 3D scene; the title and the intro card show no flyers, as today. Under reduced motion they are the same
(the glows are still: no flicker, no new animation). No new text, no HUD change, no new sound.

## Files

- `src/view/models/crow.js` and `src/view/models/bat.js`: each under 200 lines (41 and 52 today). A shared helper
  for the glow may go in a new file `src/view/models/glow-eyes.js`, under 200 lines.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture is the supervisor's step.
The builder may add and edit test files (each under 200 lines), and the fake three.js. It may change an earlier
test only where it expects a crow's or bat's default colour (for example `test/bats-model.test.js`: the body
`#2b1b3a`, the membrane `#5a3f6b`, and the ears where they share the body's colour) or counts the children of a
crow, a bat, a head group or a wing; there only that colour or that number.

## Done when

`node --test` passes, and its tests prove:

1. The crow's and bat's new default colours, and that colours passed as parameters still apply.
2. Each eye of each flyer has its glow: a sprite in the eye's colour with the opacity, blending, depthWrite,
   scale and place above, a child of the head group, ignoring rays.
3. The crow's two wing rods (size, colour, parent, place) and its gear (radius, length, sides, colour, place);
   the bat's six spars (two wings × three), each from the shoulder to its edge point within 0.001, in brass,
   children of their wing, named `spar`.
4. Every new part ignores rays; every existing mesh keeps its geometry, place and rotation; the meshes a ray can
   hit on a crow and on a bat are the same as before.
5. The wing beat and the dive pose the wings exactly as before, and the rods and spars move with their wing.
6. The stage's crows and bats (and those flying away) on levels 2 and 3 have the new look.
7. The file sizes in Files.
