// Small helpers every model uses: flat-shaded materials, placed meshes, a seeded random.

import * as THREE from 'three';

export function flat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0, ...extra });
}

export function glow(color) {
  return new THREE.MeshBasicMaterial({ color });
}

// Returns a function that brightens `materials` toward `color` by k, from 0 (as built) to 1.
export function glowing(materials, color) {
  const base = materials.map((m) => m.color.clone());
  const to = new THREE.Color(color);
  return (k) => materials.forEach((m, i) => {
    m.color = base[i].clone().lerp(to, k);
    m.emissive = new THREE.Color('#000000').lerp(to, k);
  });
}

// Makes a mesh invisible to shots and aim: rays pass through it. Returns it.
export const ignoreRays = (o) => { o.raycast = () => {}; return o; };

// A mesh with a position and rotation; `material` is a colour or a material.
export function part(geometry, material, [x = 0, y = 0, z = 0] = [], [rx = 0, ry = 0, rz = 0] = []) {
  const mesh = new THREE.Mesh(geometry, material instanceof THREE.Material ? material : flat(material));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

// Points `obj`, a unit length along z, from `a` to `b`.
export function span(obj, a, b) {
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const len = Math.hypot(d.x, d.y, d.z);
  obj.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  obj.rotation.order = 'YXZ';
  obj.rotation.set(-Math.atan2(d.y, Math.hypot(d.x, d.z)), Math.atan2(d.x, d.z), 0);
  obj.scale.set(1, 1, len);
}

export function group(...children) {
  const g = new THREE.Group();
  if (children.length) g.add(...children);
  return g;
}

// A seeded random in [0, 1), so a model with the same seed is built the same each time.
export function seeded(seed = 1) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
