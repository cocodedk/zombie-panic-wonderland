// The hero's shoulder, which the aimed arm and gun turn about, and a point turned about it.

export const PIVOT = { x: 0.05, y: 0.3, z: -0.1 }; // in the body's frame, from its waist pivot, like MUZZLES

// `m` turned about PIVOT by `yaw` (about the vertical axis, positive to the left) and `pitch` (positive up),
// Euler order YXZ: pitch first, then yaw. With neither, `m` itself.
export function turned(m, yaw = 0, pitch = 0) {
  if (!yaw && !pitch) return m;
  const [dx, dy, dz] = [m.x - PIVOT.x, m.y - PIVOT.y, m.z - PIVOT.z];
  const y = dy * Math.cos(pitch) - dz * Math.sin(pitch);
  const z = dy * Math.sin(pitch) + dz * Math.cos(pitch);
  return {
    x: PIVOT.x + dx * Math.cos(yaw) + z * Math.sin(yaw),
    y: PIVOT.y + y,
    z: PIVOT.z - dx * Math.sin(yaw) + z * Math.cos(yaw),
  };
}
