// Gas canisters: `count` stand on the field when each of `waves` starts, in the area between
// minX..maxX and minZ..maxZ, at least `apart` from each other. The second hit, or a launcher's
// blast, blows one up: `hits` to every enemy within `blast`. Plain data, so Node can test it.

export const CANISTER = { waves: [2, 3, 4, 5], count: 2, minX: -6, maxX: 6, minZ: -8, maxZ: -4, apart: 4, height: 1, hits: 2, flash: 0.08, blast: 3, damage: 12 };

// Where a wave's canisters stand. After 20 tries too close, the second stands `apart` along x
// from the first, which the area always has room for.
export function placeCanisters(random) {
  const c = CANISTER;
  const spots = [];
  for (let i = 0; i < c.count; i++) {
    let at = null;
    for (let k = 0; k < 20 && !at; k++) {
      const p = { x: c.minX + random() * (c.maxX - c.minX), z: c.minZ + random() * (c.maxZ - c.minZ) };
      if (spots.every((s) => Math.hypot(s.x - p.x, s.z - p.z) >= c.apart)) at = p;
    }
    spots.push(at ?? { x: spots[0].x >= 0 ? spots[0].x - c.apart : spots[0].x + c.apart, z: spots[0].z });
  }
  return spots;
}

// Its centre, where its blast is measured from.
export const canisterAt = (c) => ({ x: c.x, y: CANISTER.height / 2, z: c.z });
