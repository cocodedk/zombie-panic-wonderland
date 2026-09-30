# 36: the hero's look

The second of three specs on the hero and the guns (spec 35 made the guns point at the aim; spec 37
improves the guns' looks). This one improves the hero's look.

## What the owner wants

An improved look for the main character. The owner asked on 30 September 2026 and left the details to us;
these are the defaults we propose. The camera sits behind the hero (the hero faces away from it), so what
the player sees all game is the hero's back: the hood, the cape, the legs and boots. The improvements are
therefore on the back view, and they keep the game's style: flat-shaded, low-poly, made in code, no
textures.

## The reference

Today's hero (`buildPlayer` in `src/view/models/player.js`): a small figure in a red hood and cape, a
tunic, a belt, two boots and two arms holding the gun. This sketch shows the back view and what is added
(marked `+`):

```
        (+ pompom)              a pompom on the hood's tip
        /\  hood  + seam        a seam ridge along the top edge of the hood's point
   + ---||--- shoulder caps     two caps where the arms begin
     /  cape  \\  + strap       a leather strap across the cape
    / +satchel  \\              a satchel on the right hip
   /_/\\_/\\_/\\_/\\_ + trim      a scalloped hem with a gold trim
       |boot|  |boot|  + cuffs  cuffs below the hem, and broad feet with heels that show
```

## The changes

All are made in code in a new file `src/view/models/hero-details.js`, which `buildPlayer` calls once. Places
are in the body's own frame, the one `player.js` uses before its waist shift (for example the hood at y
1.15); every part is a child of the `body` group (the boots' cuffs, feet and soles, of the legs, which are
children of it), so they turn with a dodge. Colours are flat, like the
rest.

1. **A scalloped cape hem.** Seven small points along the hem: cones (radius 0.07, length 0.12, 3 sides),
   colour `#6f1219`, pointing down, at the seven hem vertices of the cape's cone, which has its base at
   y 0.255, radius 0.42, squeezed to 0.7 in z around z 0.08: the point `i` (0 to 6) at x `0.42 sin(2πi/7)`,
   y 0.2, z `0.08 + 0.294 cos(2πi/7)`.
2. **A gold hem trim.** A thin ring (a torus of radius 0.42 and tube 0.012, colour `#d9a520`, lying flat,
   squeezed to 0.7 in z) at the hem, centred (0, 0.255, 0.08).
3. **A cape collar.** A short stand-up collar at the neck: a cone (radius 0.2, length 0.14, open at the
   base, 7 sides) in `#7a1219`, at (0, 1.02, 0.04), double-sided.
4. **A hood seam and pompom.** A ridge along the top edge of the hood's point: a box 0.03 wide, 0.03
   thick and as long as the distance between its ends, in `#8f1820`, laid (with the same between-two-points
   helper as the strap's) from **A = (0, 1.365, 0.17)** to **B = (0, 1.12, 0.43)**, which run along the
   point's top edge (the point is the hood's existing cone, at (0, 1.18, 0.28) tilted back, whose tip is at
   about (0, 1.11, 0.44)); and a pompom, an icosahedron of radius 0.05 (detail 0) in `#f2e3b8`, at that tip,
   (0, 1.11, 0.44).
5. **No hair.** Dropped from this spec: at the nape the hood, the tunic and the collar cover any place a
   hair box could take, so none is added (the sketch's hair line is not built).
6. **Shoulder caps.** Two icosahedrons of radius 0.09 (detail 0) in the `hood` colour (`#b3202a` by default), at
   (±0.22, 0.98, −0.02), where the arms begin.
7. **A satchel.** A leather satchel on the right hip, on the outside of the cape: a box 0.22 × 0.26 × 0.1
   in `#6b4a2b` at (0.22, 0.45, 0.3), a flap (a box 0.22 × 0.1 × 0.11 in `#8a5d33`) on its top at (0.22, 0.55,
   0.3), and a strap across the cape's back: a box 0.03 wide, 0.02 thick and as long as the distance between
   its two ends, laid from its **upper end A = (−0.15, 0.93, 0.16)** to its **lower end B = (0.2, 0.47,
   0.28)** (the stage already has a helper that lays a unit-long object between two points, `span` in
   `stage-helpers.js`; move it to the new file or `parts.js` if it is needed, and keep it importable from where
   it is). A is on the tunic's back at the hero's left shoulder, where the tunic is wider than the cape; B is
   on the cape's back beside the satchel on the right hip (the hero faces −z, so its right is +x, the
   viewer's right). The strap lies on the surfaces: at its middle it is outside the cape's cone by at most
   0.04 (the cone's back surface at height y is at z `0.08 + 0.294 f √(1 − (x / (0.42 f))²)` with
   `f = (1.105 − y) / 0.85`).
8. **Boots.** What the camera sees of the hero's legs, from behind and above, is the part below the cape's
   hem (y under 0.255) and the heel and sole. A cuff on each boot: a torus of radius 0.095 and tube 0.02
   in `#4a3a30` at (±0.12, 0.16, 0) (below the hem, so it shows); and a foot under each: a box 0.2 × 0.06 ×
   0.3 in the `boots` colour (`#2e2420` by default) at (±0.12, 0.03, 0) (wider than the leg, and reaching 0.06
   behind it, so the heel shows from behind) with a sole, a box 0.21 × 0.02 × 0.31 in `#1c1512` under it at
   (±0.12, 0.0, 0). The cuffs, feet and soles are **children of the two leg meshes** (the animated ones,
   `legs[0]` and `legs[1]`, which swing in the walk), so they move with the boots: the places above are in the
   body's frame, so in a leg's own frame they are at x 0 and y reduced by the leg's own y (0.22): the cuff at
   (0, −0.06, 0), the foot at (0, −0.19, 0), the sole at (0, −0.22, 0). `buildPlayer` passes `legs` to the new
   file.

## What does not change

The hero's size, proportions, walk, dodge roll, the colours of the hood, cape, tunic, skin and boots
(the parameters `buildPlayer` takes), the aim rig and everything in it (the arms, the guns, the flash;
spec 35), the guns' looks (spec 37), how the hero is placed, lit and scaled, the camera, the crosshair,
the sounds and every rule. The hero is not a target (it is not in what a shot can hit), as today.

## Every screen

The hero shows where it does today, with the new details, and nowhere else: loading and error show no
3D scene; the title (the hero stands on the road behind the band), the intro card, play, the gaps
between waves, the boss fight, paused (frozen), victory and defeat (the scene freezes) show it. Each
level start, Try again, Play again, Next level and Back to title show it fresh. No new text, no HUD
change, no new sound, and no new animation: the new parts are still, and turn with the body.

## Files

- `src/view/models/hero-details.js` (new), under 200 lines.
- `src/view/models/player.js`: one import and one call; at most 6 lines longer than today.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the hero is the
supervisor's step. The builder may add and edit test files, and the fake three.js. It may change an
earlier test only where that test counts the parts of the hero's body (`body.children.length` or a count of
its meshes), and only that number.

## Done when

`node --test` passes, and its tests prove:

1. The cape hem: 7 points at the positions in change 1, with the size, sides and colour; the trim ring,
   its size and colour; the collar.
2. The hood seam, its two ends within 0.02 of A = (0, 1.365, 0.17) and B = (0, 1.12, 0.43), its size and
   colour; the pompom at (0, 1.11, 0.44); there is no hair; and the two shoulder caps, each with the
   sizes, places and colours above (the caps in the `hood` colour parameter).
3. The satchel, its flap and its strap, with the sizes, places and colours; the strap's two ends within 0.02
   of A = (−0.15, 0.93, 0.16) and B = (0.2, 0.47, 0.28) and its middle outside the cape's cone by between
   −0.01 and 0.04; and the boots' cuffs (at y 0.16, below the hem), feet (0.2 × 0.06 × 0.3, reaching 0.06
   behind the leg) and soles, with the sizes and
   colours above (the feet in the `boots` colour parameter), as children of the two leg meshes at the places
   given in the legs' own frame, so that a leg's swing in the walk moves its cuff, foot and sole.
4. Every other new part is a child of the body group, none is a child of the aim rig, and none changes the
   hero's pose: the walk's leg swing, the dodge's roll, the aim rig's yaw and pitch and the flash are
   exactly as before.
5. The hero's model parameters (`hood`, `cape`, `skin`, `tunic`, `boots`, `gun`, `size`) still colour and
   size it as before; the shoulder caps follow `hood` and the feet follow `boots`; the other new parts
   keep their own fixed colours.
6. The hero is still not pickable, and the new file is under 200 lines; `player.js` is within its limit.
