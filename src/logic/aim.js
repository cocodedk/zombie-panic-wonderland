// Where the hero's gun points: the yaw and pitch that put the barrel's line through the aim point.
// Pure, so Node can test it; the model and the shots both read the angles from `game.pose()`.

import { PIVOT, bodyPose, muzzleAt } from './effects.js';

export const LIMITS = { yaw: 1.396, pitchMin: -0.524, pitchMax: 0.698 }; // radians: ±80°, −30° to +40°
const ITERATIONS = 4;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// The barrel direction is (−cos φ sin θ, sin φ, −cos φ cos θ): the angles of a line from `from` to `to`.
const anglesOf = (from, to) => {
  const [dx, dy, dz] = [to.x - from.x, to.y - from.y, to.z - from.z];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
};

// The shoulder pivot in the world for a player at `x`, in the body's pose.
function pivotAt(x, roadZ, pose) {
  const { y, turn } = bodyPose(pose);
  return {
    x: x + PIVOT.x * Math.cos(turn) - PIVOT.y * Math.sin(turn),
    y: y + PIVOT.x * Math.sin(turn) + PIVOT.y * Math.cos(turn),
    z: roadZ + PIVOT.z,
  };
}

// The yaw and pitch for a player at `x` in `pose` (see bodyPose, plus `weapon`) aiming at `target`;
// 0 and 0 with none. Starts from the pivot's line, then 4 times aims from the muzzle the angles so far
// put in place, so the barrel's line, not the pivot's, passes through `target`. The angles are limited,
// and fade out and back through a dodge: they are whole at `roll` 0 and 1, and 0 at 0.5.
export function aimAngles(x, roadZ, pose, target) {
  if (!target) return { yaw: 0, pitch: 0 };
  let a = anglesOf(pivotAt(x, roadZ, pose), target);
  for (let i = 0; i < ITERATIONS; i++) a = anglesOf(muzzleAt(x, roadZ, { ...pose, ...a }), target);
  const fade = 1 - Math.sin((pose.roll ?? 0) * Math.PI);
  return {
    yaw: clamp(a.yaw, -LIMITS.yaw, LIMITS.yaw) * fade + 0, // + 0: never −0
    pitch: clamp(a.pitch, LIMITS.pitchMin, LIMITS.pitchMax) * fade + 0,
  };
}
