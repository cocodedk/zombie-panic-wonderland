// The sky's builders: a cloud, and the crescent moon. Both are flat-coloured, unlit and unfogged like
// the sky dome, and neither can be aimed at. Their colours are set by src/view/sky.js.

import * as THREE from 'three';

const lerp = (a, b, k) => a + (b - a) * k;
const ignoreRays = (mesh) => { mesh.raycast = () => {}; return mesh; };
const unlit = () => new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });

// How far an icosahedron's mesh reaches along an axis, of its radius: its corners are not on the axes.
export const REACH = 1 / Math.sqrt(1 + ((1 + Math.sqrt(5)) / 2) ** 2) * ((1 + Math.sqrt(5)) / 2);

// Where a cloud may be, how it is made, how fast it drifts (units a second) and how far along the
// colour cycle it may be shifted (a part of it).
export const CLOUD = {
  puffs: [3, 5],
  length: [4, 9], // the row, from its first puff's edge to its last's
  size: [0.8, 1.2], // a puff's radius, before the row is scaled to its length
  overlap: 0.6, // centres of neighbours are this much of their radii together apart: under 0.85, they overlap
  squash: 0.6, // a puff's height, of its width
  x: [-70, 70],
  y: [16, 38],
  z: [-110, -60],
  speed: [0.4, 1.2],
  shift: 0.25,
};

// The moon: a disc, with a bite out of one side by a disc `bite` of its radius, centred `offset` of the
// radius to the right. Tilted, so its horns point a little up.
export const CRESCENT = { bite: 0.85, offset: 0.45, tilt: 0.35 };

// A lumpy row of 3 to 5 flattened puffs about the origin, one material for all of them.
export function buildCloud(rand) {
  const cloud = new THREE.Group();
  cloud.name = 'cloud';
  const material = unlit();
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const count = Math.floor(lerp(CLOUD.puffs[0], CLOUD.puffs[1] + 1, rand()));
  const length = lerp(...CLOUD.length, rand());
  // Each puff's centre is CLOUD.overlap of the two radii from the last, so neighbours always overlap;
  // the row is then scaled as a whole so its mesh edges, first to last, are `length` apart.
  const radii = Array.from({ length: count }, () => lerp(...CLOUD.size, rand()));
  const lifts = radii.map((r) => lerp(-0.2, 0.2, rand()) * r);
  const xs = radii.map((_, i) => radii.slice(1, i + 1).reduce((x, r, j) => x + CLOUD.overlap * (radii[j] + r), 0));
  const left = Math.min(...xs.map((x, i) => x - REACH * radii[i]));
  const k = length / (Math.max(...xs.map((x, i) => x + REACH * radii[i])) - left);
  const half = { x: length / 2, y: 0, z: 0 }; // how far the meshes reach from the cloud's origin
  for (let i = 0; i < count; i++) {
    const r = radii[i] * k;
    const puff = ignoreRays(new THREE.Mesh(geometry, material));
    puff.position.set((xs[i] - left) * k - length / 2, lifts[i] * k, 0);
    puff.scale.set(r, r * CLOUD.squash, r);
    half.y = Math.max(half.y, Math.abs(puff.position.y) + REACH * puff.scale.y);
    half.z = Math.max(half.z, REACH * r);
    cloud.add(puff);
  }
  Object.assign(cloud.userData, { material, half });
  return cloud;
}

// The crescent's outline as one closed path with no hole: the disc's outer arc, anticlockwise from the
// upper point where the two circles cross to the lower one, then the bite's arc back up to the first.
export function crescentShape(r) {
  const { bite, offset } = CRESCENT;
  const x = ((1 - bite * bite + offset * offset) / (2 * offset)) * r;
  const y = Math.sqrt(r * r - x * x);
  const outer = Math.atan2(y, x);
  const inner = Math.atan2(y, x - offset * r);
  const shape = new THREE.Shape();
  shape.moveTo(r * Math.cos(outer), r * Math.sin(outer));
  shape.absarc(0, 0, r, outer, 2 * Math.PI - outer, false);
  shape.absarc(offset * r, 0, bite * r, 2 * Math.PI - inner, inner, true);
  return shape;
}

// The crescent of `radius` at `at` ([x, y, z]), facing the camera.
export function buildCrescent({ radius, at }) {
  const moon = ignoreRays(new THREE.Mesh(new THREE.ShapeGeometry(crescentShape(radius)), unlit()));
  moon.name = 'crescent';
  moon.position.set(...at);
  moon.rotation.z = CRESCENT.tilt;
  return moon;
}
