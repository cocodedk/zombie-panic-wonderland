// A geometric ray against the boxes of a drawn model (fake-three's Raycaster ignores both). Each box is
// tested in its own space: the ray is carried through every ancestor's position, rotation (XYZ) and scale.

const rot = (a, i, j, s, v) => { // turns v by angle s in the plane of axes i, j
  const [c, n] = [Math.cos(s), Math.sin(s)];
  const w = [...v];
  w[i] = c * v[i] - n * v[j];
  w[j] = n * v[i] + c * v[j];
  return w;
};
const chain = (o) => { const up = []; for (let p = o; p; p = p.parent) up.push(p); return up; }; // mesh first

// The point v (world) in o's own space.
function local(o, v) {
  for (const p of chain(o).reverse()) {
    let w = rot(p, 1, 2, -p.rotation.x, [v[0] - p.position.x, v[1] - p.position.y, v[2] - p.position.z]);
    w = rot(p, 2, 0, -p.rotation.y, w);
    w = rot(p, 0, 1, -p.rotation.z, w);
    v = [w[0] / p.scale.x, w[1] / p.scale.y, w[2] / p.scale.z];
  }
  return v;
}
// The direction d (world) in o's own space (no translation).
function localDir(o, d) {
  for (const p of chain(o).reverse()) {
    let w = rot(p, 1, 2, -p.rotation.x, d);
    w = rot(p, 2, 0, -p.rotation.y, w);
    w = rot(p, 0, 1, -p.rotation.z, w);
    d = [w[0] / p.scale.x, w[1] / p.scale.y, w[2] / p.scale.z];
  }
  return d;
}

// The distance along the ray (origin, dir) at which it enters the box mesh, or null.
export function hitBox(mesh, origin, dir) {
  const o = local(mesh, origin);
  const d = localDir(mesh, dir);
  const half = mesh.geometry.params.slice(0, 3).map((s) => s / 2);
  let [near, far] = [0, Infinity];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (Math.abs(o[i]) > half[i]) return null;
      continue;
    }
    const [a, b] = [(-half[i] - o[i]) / d[i], (half[i] - o[i]) / d[i]];
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
  }
  return near <= far ? near : null;
}

// Every box mesh under `root` the ray crosses, nearest first.
export function raycastBoxes(root, origin, dir, isBox) {
  const hits = [];
  root.traverse((m) => {
    if (!m.geometry || !isBox(m.geometry)) return;
    const t = hitBox(m, origin, dir);
    if (t != null) hits.push({ object: m, t });
  });
  return hits.sort((a, b) => a.t - b.t);
}

// A box mesh's centre in the world.
export function worldCentre(mesh) {
  let v = [0, 0, 0];
  for (const p of chain(mesh)) {
    let w = [v[0] * p.scale.x, v[1] * p.scale.y, v[2] * p.scale.z];
    w = rot(p, 0, 1, p.rotation.z, w);
    w = rot(p, 2, 0, p.rotation.y, w);
    w = rot(p, 1, 2, p.rotation.x, w);
    v = [w[0] + p.position.x, w[1] + p.position.y, w[2] + p.position.z];
  }
  return v;
}
