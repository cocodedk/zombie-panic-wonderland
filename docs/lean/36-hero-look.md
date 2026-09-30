# 36: the hero's look

The second of three specs on the hero and the guns (spec 35 made the guns point at the aim; spec 37
improves the guns' looks). This one improves the hero's look.

## What the owner wants

An improved look for the main character. The owner asked on 30 September 2026 and left the details to us;
these are the defaults we propose. The camera sits behind and above the hero (at (0, 3.6, 9), looking down
toward z −6), so what the player sees all game is the hero's back: the hood, the shoulders and the cape. The
cape's hem hides the legs and boots from that camera, so they are left as they are. The improvements are on
what shows, and they keep the game's style: flat-shaded, low-poly, made in code, no textures.

## The reference

Today's hero (`buildPlayer` in `src/view/models/player.js`): a small figure in a red hood and cape, a
tunic, a belt, two boots and two arms holding the gun. This sketch shows the back view and what is added
(marked `+`):

```
        (+ pompom)              a pompom on the hood's tip
        /\  hood  + seam        a seam ridge along the top edge of the hood's point
   + ---||--- shoulder caps     two caps where the arms begin
     /  cape  \\                the cape
    / +satchel  \\              a satchel on the right hip
   /_/\\_/\\_/\\_/\\_ + trim      a scalloped hem with a gold trim
```

## The changes

All are made in code in a new file `src/view/models/hero-details.js`, which `buildPlayer` calls once. Places
are in the body's own frame, the one `player.js` uses before its waist shift (for example the hood at y
1.15); every part is a child of the `body` group, so they turn with a dodge. Colours are flat, like the rest.
The hero stands at y 0 on the road, whose bricks top out at y 0.13, so nothing new is placed below y 0.14.

1. **A scalloped cape hem.** Seven small points along the hem: cones (radius 0.07, length 0.12, 3 sides),
   colour `#6f1219`, pointing down, at the seven hem vertices of the cape's cone, which has its base at
   y 0.255, radius 0.42, squeezed to 0.7 in z around z 0.08: the point `i` (0 to 6) at x `0.42 sin(2πi/7)`,
   y 0.2, z `0.08 + 0.294 cos(2πi/7)`.
2. **A gold hem trim.** A thin ring (a torus of radius 0.42 and tube 0.012, colour `#d9a520`, lying flat,
   squeezed to 0.7 in z) at the hem, centred (0, 0.255, 0.08).
3. **A cape collar.** A short stand-up collar at the neck: a cone (radius 0.2, length 0.14, open at the
   base, 7 sides) in `#7a1219`, at (0, 1.02, 0.04), double-sided.
4. **A hood seam and pompom.** A ridge along the top edge of the hood's point: a box 0.03 wide, 0.03 thick
   and as long as the distance between its ends, in `#8f1820`, laid (with the stage's helper that lays a
   unit-long object between two points, `span` in `stage-helpers.js`; move it to `parts.js` if it is
   needed, and keep it importable from where it is) from **A = (0, 1.365, 0.17)** to **B = (0, 1.12, 0.43)**,
   which run along the point's top edge (the point is the hood's existing cone, at (0, 1.18, 0.28) tilted
   back, whose tip is at about (0, 1.11, 0.44)); and a pompom, an icosahedron of radius 0.05 (detail 0) in
   `#f2e3b8`, at that tip, (0, 1.11, 0.44).
5. **Shoulder caps.** Two icosahedrons of radius 0.09 (detail 0) in the `hood` colour (`#b3202a` by
   default), at (±0.22, 0.98, −0.02), where the arms begin.
6. **A satchel.** A leather satchel on the right hip, on the outside of the cape (the hero faces −z, so its
   right is +x, the viewer's right): a box 0.22 × 0.26 × 0.1 in `#6b4a2b` at (0.22, 0.45, 0.37), and a flap
   (a box 0.22 × 0.1 × 0.11 in `#8a5d33`) on its top at (0.22, 0.55, 0.37). It sits at z 0.37 so that its inner
   face (z 0.32) is clear of the cape, which flares out to about z 0.31 at the satchel's lower inner corner.

Left out on purpose, after checking the geometry: hair at the nape (the hood, tunic and collar cover every
place for it), a strap across the cape (it would have to lie on the cape and the tunic's back corner at once),
feet, soles and boot cuffs (the road's bricks bury the feet, and the cape's hem hides the boots from the
camera above and behind).

## What does not change

The hero's size, proportions, walk, dodge roll, legs and boots, the colours of the hood, cape, tunic, skin and
boots (the parameters `buildPlayer` takes), the aim rig and everything in it (the arms, the guns, the flash;
spec 35), the guns' looks (spec 37), how the hero is placed, lit and scaled, the camera, the crosshair, the
sounds and every rule. The hero is not a target (it is not in what a shot can hit), as today.

## Every screen

The hero shows where it does today, with the new details, and nowhere else: loading and error show no 3D scene;
the title (the hero stands on the road behind the band), the intro card, play, the gaps between waves, the boss
fight, paused (frozen), victory and defeat (the scene freezes) show it. Each level start, Try again, Play again,
Next level and Back to title show it fresh. No new text, no HUD change, no new sound, and no new animation: the
new parts are still, and turn with the body.

## Files

- `src/view/models/hero-details.js` (new), under 200 lines.
- `src/view/models/player.js`: one import and one call; at most 6 lines longer than today.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the hero is the
supervisor's step. The builder may add and edit test files, and the fake three.js. It may change an earlier
test only where that test counts the parts of the hero's body (`body.children.length` or a count of its
meshes), and only that number.

## Done when

`node --test` passes, and its tests prove:

1. The cape hem: 7 points at the positions in change 1, with the size, sides and colour; the trim ring, its
   size and colour; the collar.
2. The hood seam, its two ends within 0.02 of A = (0, 1.365, 0.17) and B = (0, 1.12, 0.43), its size and
   colour; the pompom at (0, 1.11, 0.44); and the two shoulder caps, with the sizes, places and colours above
   (the caps in the `hood` colour parameter).
3. The satchel and its flap, with the sizes, places (z 0.37) and colours.
4. There is no hair, no strap, no foot, no sole and no cuff; the legs and boots are exactly as before; and no
   new part is placed below y 0.14 in the body's frame.
5. Every new part is a child of the body group, none is a child of the aim rig or of a leg, and none changes the
   hero's pose: the walk's leg swing, the dodge's roll, the aim rig's yaw and pitch and the flash are exactly as
   before.
6. The hero's model parameters (`hood`, `cape`, `skin`, `tunic`, `boots`, `gun`, `size`) still colour and size
   it as before; the shoulder caps follow `hood`; the other new parts keep their own fixed colours.
7. The hero is still not pickable, and the new file is under 200 lines; `player.js` is within its limit.
