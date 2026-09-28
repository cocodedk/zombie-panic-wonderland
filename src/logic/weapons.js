// The four weapons, the crates that give them and the launcher's flying pumpkins, as plain data
// and plain geometry, so Node can test them; the game uses them and the stage draws them.

const EPS = 1e-9;

// In key order, 1 to 4. `rate` is shots a second held (the Popper's is the level's fireRate);
// `ammo` is the magazine a crate fills, null for never running out; `refill` is the seconds a
// magazine takes to reload; `hits` is what each pellet, round or blast is worth. The Gatling's
// barrels spin up for `spinUp` seconds before it fires, reach `turns` a second, and stop over
// `spinDown` seconds; `pitch` is how far a round's crack may stray from its base pitch.
export const WEAPONS = {
  popper: { key: 1, name: 'Popper', ammo: null },
  scattergun: { key: 2, name: 'Scattergun', notice: 'Scattergun! 8 pellets a blast — best up close', rate: 2, ammo: 4, refill: 1.5, pellets: 8, cone: 4, hits: 2 },
  launcher: { key: 3, name: 'Launcher', notice: 'Pumpkin launcher! Explodes — hits every enemy nearby', rate: 1.5, ammo: 2, refill: 2, flight: 0.35, arc: 1.5, blast: 2.5, hits: 12 },
  gatling: { key: 4, name: 'Gatling', notice: 'Gatling! Hold fire to spin it up — 20 rounds a second', rate: 20, ammo: 100, refill: 3, hits: 2, spinUp: 0.5, spinDown: 0.4, turns: 12, pitch: 0.05 },
};
export const ORDER = Object.keys(WEAPONS);

// Each level drops one crate of each weapon, `delay` seconds after its wave starts.
export const CRATES = [
  { weapon: 'scattergun', wave: 2, delay: 2 },
  { weapon: 'launcher', wave: 4, delay: 2 },
  { weapon: 'gatling', wave: 5, delay: 2 },
];

// Crates appear at a random x at z, fall from `top` to `height`, hover until `stay` seconds after
// they appear, then leave upward over `leave` seconds.
export const CRATE = { minX: -6, maxX: 6, z: -6, top: 9, height: 1.5, fall: 3, stay: 10, leave: 1, hits: 3, flash: 0.08, bob: 0.12 };
export const NOTICE_LIFE = 2.5;

// A crate on its way out cannot be hit.
export const crateLeaving = (c) => c.t >= CRATE.stay - EPS;

export function crateAt(c) {
  const { fall, stay, leave, top, height, bob } = CRATE;
  let y;
  if (c.t < fall) {
    const f = c.t / fall;
    y = top + (height - top) * (1 - (1 - f) ** 2); // slowing as it settles
  } else {
    const hover = height + Math.sin((Math.min(c.t, stay) - fall) * 2) * bob;
    y = hover + Math.max(0, (c.t - stay) / leave) * (top - hover);
  }
  return { x: c.x, y, z: CRATE.z };
}

// A launched pumpkin, from the muzzle to the aim point in an arc.
export function shellAt(s) {
  const { flight, arc } = WEAPONS.launcher;
  const f = Math.min(1, s.t / flight);
  const lerp = (k) => s.from[k] + (s.to[k] - s.from[k]) * f;
  return { x: lerp('x'), y: lerp('y') + Math.sin(f * Math.PI) * arc, z: lerp('z') };
}

// The scattergun's pellets around the unit direction `d`: one along it, the rest evenly around it
// at half the cone's angle.
export function pelletDirs(d) {
  const { pellets, cone } = WEAPONS.scattergun;
  const a = ((cone / 2) * Math.PI) / 180;
  const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z); return { x: v.x / l, y: v.y / l, z: v.z / l }; };
  const cross = (u, v) => ({ x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x });
  const right = norm(Math.abs(d.y) > 0.99 ? { x: 1, y: 0, z: 0 } : cross(d, { x: 0, y: 1, z: 0 }));
  const up = cross(right, d);
  const dirs = [{ ...d }];
  for (let i = 0; i < pellets - 1; i++) {
    const t = (i * Math.PI * 2) / (pellets - 1);
    const s = Math.sin(a);
    dirs.push(norm({
      x: d.x * Math.cos(a) + s * (Math.cos(t) * right.x + Math.sin(t) * up.x),
      y: d.y * Math.cos(a) + s * (Math.cos(t) * right.y + Math.sin(t) * up.y),
      z: d.z * Math.cos(a) + s * (Math.cos(t) * right.z + Math.sin(t) * up.z),
    }));
  }
  return dirs;
}
