# 05: a lower camera angle

## What the owner wants

The angle of perspective a bit lower: a flatter view, closer to looking over the player's shoulder.

## Behaviour

- The camera moves from (0, 5, 9) looking at (0, 1.2, -6), about 14° down, to (0, 3.6, 9) looking at
  (0, 1.4, -6), about 8° down.
- Nothing else changes: the 55° field of view, the scenes of both levels, the HUD, the overlays, the
  effects, and aiming (a shot still hits what is under the crosshair).
- The camera's position and target live in one small module that does not import three.js;
  `src/view/stage.js` reads them from there, so a test can pin them.

## Done when

`node --test` passes, and its tests prove the camera's position is (0, 3.6, 9) and its target
(0, 1.4, -6), and that `src/view/stage.js` takes both from that module. Every earlier test still
passes.

## Out of scope

Any other change. The builder adds or edits test files as the checks above need.
