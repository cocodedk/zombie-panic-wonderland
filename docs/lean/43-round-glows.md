# 43: round glows

A fix to spec 42. The glows in front of the crows' and bats' eyes, and the halos in front of the fast
zombies' eyes (spec 18), draw as flat squares, because they have no texture. This spec gives them one soft,
round glow texture, made in code, so each reads as a glow.

## What the owner wants

On 4 October 2026 the owner asked for glowing eyes on the mechanical crows and bats (spec 42). Seen close up,
each glow is a pale red square around the eye, not a glow. The owner asked for the fix.

## The reference

- `glowEyes(head, eyes, color, size)` in `src/view/models/glow-eyes.js` adds, for each eye, a `THREE.Sprite`
  with a `SpriteMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending,
  depthWrite: false })`, ignoring rays, at the eye's x and y and 0.01 in front, scaled (size, size, 1). The crow
  calls it with size 0.14, the bat with 0.09. A sprite with no `map` draws as a filled square.
- A fast zombie's halos (`halo` in `src/view/models/zombie.js`, `FAST_EYES.halo` = size 0.16, colour `#ff3b30`,
  opacity 0.55, z 0.03): a `PlaneGeometry(size, size)` with a `MeshBasicMaterial` (transparent, additive, no
  depth write), also a filled square.
- The score bubbles (`src/view/bubbles.js`) already draw a canvas in code and use it as a `CanvasTexture`; the
  test suite's fake three.js has `CanvasTexture` and a fake canvas (`document.createElement('canvas')`).
- The stage's `dispose` (`src/view/stage-helpers.js`) disposes a dropped object's geometries and materials, not
  their textures, so one texture can be shared by every glow.

## The changes

1. **One glow texture.** A new function `glowTexture()` in `src/view/models/glow-eyes.js` returns a
   `THREE.CanvasTexture` of a 64 × 64 canvas filled with a radial gradient centred on (32, 32): white at full
   alpha at the centre, white at alpha 0.45 at radius 12, and white at alpha 0 at radius 32 (the edge), so it
   fades to nothing before the canvas's square edge. Its `colorSpace` is `THREE.SRGBColorSpace`. It is made the
   first time it is asked for (not when the module loads, so a page without a canvas can still import the
   module) and then the same texture is returned every time.
2. **The flyers' glows.** Each sprite `glowEyes` makes takes `map: glowTexture()` in its material; everything
   else in the material stays. Because the round glow fills less of its square than a flat square does, the
   sizes grow: the crow's glows to 0.22 and the bat's to 0.14.
3. **The fast zombies' halos.** Each halo's material takes `map: glowTexture()`; `FAST_EYES.halo.size` becomes
   0.24. Its colour, opacity, place and the rest stay. The ordinary zombies have no halo, as today.

The glows and halos still ignore rays, so what a shot can hit is exactly as today. Nothing else changes: the
eyes themselves, the models, the colours, the beat and flight, the flicker of the zombies' eyes, sizes, sounds
and every rule.

## Every screen

The glows show where their crows, bats and fast zombies show, as today: play and the gaps between waves (crows
on levels 2 and 3, bats on level 3, fast zombies on every level), the boss fight (where they show then, as today),
a crow or bat flying away, paused (frozen), victory and defeat (the scene freezes). Loading and error show no 3D
scene; the title and the intro card show none of them. No new animation, so reduced motion is the same. No new
text, no HUD change, no new sound.

## Files

- `src/view/models/glow-eyes.js`: under 200 lines (15 today).
- `src/view/models/zombie.js`: at most 183 lines (180 today; four earlier tests cap it, the lowest at 183, and
  those caps stay).
- `src/view/models/crow.js` and `src/view/models/bat.js`: under 200 lines.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture is the supervisor's step.
The builder may add and edit test files (each under 200 lines), and the fake three.js (for example to record a
radial gradient and its colour stops on the fake canvas). It may change an earlier test only where it expects
the glow sizes 0.14 or 0.09 or the halo size 0.16, or a glow's or halo's material without a `map`; there only that
value or that field.

## Done when

`node --test` passes, and its tests prove:

1. `glowTexture()` returns a `CanvasTexture` of a 64 × 64 canvas with the radial gradient and its three stops
   above, in the sRGB colour space, and returns the same texture on every call; importing the module makes no
   canvas.
2. Every glow sprite of a crow and of a bat has that texture as its `map`, with its other material fields as
   before; the crow's glows are scaled 0.22 and the bat's 0.14.
3. Every halo of a fast zombie has that texture as its `map`, with `FAST_EYES.halo.size` 0.24 and its colour,
   opacity and place as before; an ordinary zombie has no halo.
4. The glows and halos ignore rays; the meshes a ray can hit on a crow, a bat and a fast zombie are the same as
   before.
5. Dropping a crow from the stage disposes its materials but not the shared texture, and the next crow's glows
   still have it.
6. The file sizes in Files.
