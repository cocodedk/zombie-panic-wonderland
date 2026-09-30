// A small purple bat with pointed ears, red eyes, two fangs and flat, fanned wings that beat fast, facing +z.

import * as THREE from 'three';
import { flat, glow, part, group } from './parts.js';

const named = (obj, name) => {
  obj.name = name;
  return obj;
};

// A wing is a flat fan of three triangles from the shoulder (the origin), out to `side` * about 0.5, in the
// plane the bat faces (z = 0), so it shows full from the front and flaps about the body's z axis.
function wingGeometry(side) {
  const edge = [[0.3, 0.2], [0.5, 0.08], [0.42, -0.12], [0.16, -0.2]];
  const points = [];
  for (let i = 0; i < 3; i++) {
    for (const [x, y] of [[0, 0], edge[i], edge[i + 1]]) points.push(x * side || 0, y, 0); // `|| 0` keeps the shoulder's x from being -0
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

export function buildBat({ body = '#2b1b3a', membrane = '#5a3f6b', eyes = '#ff2a1a', fang = '#e8e0c8', size = 1, seed = 0 } = {}) {
  const dark = flat(body);
  const wingMaterial = flat(membrane, { side: THREE.DoubleSide });
  const ear = (x) => named(part(new THREE.ConeGeometry(0.03, 0.08, 3), dark, [x, 0.1, -0.01]), 'ear');
  const eye = (x) => named(part(new THREE.BoxGeometry(0.03, 0.03, 0.01), glow(eyes), [x, 0.02, 0.07]), 'eye');
  const tooth = (x) => named(part(new THREE.ConeGeometry(0.012, 0.05, 3), fang, [x, -0.06, 0.06], [Math.PI, 0, 0]), 'fang');
  const head = named(group(part(new THREE.IcosahedronGeometry(0.08, 0), dark), ear(-0.05), ear(0.05), eye(-0.035), eye(0.035), tooth(-0.025), tooth(0.025)), 'head');
  head.position.set(0, 0.05, 0.12);

  // Each wing pivots at the shoulder.
  const wings = [-1, 1].map((side) => {
    const shoulder = named(group(named(part(wingGeometry(side), wingMaterial), 'fan')), 'wing');
    shoulder.position.set(side * 0.06, 0.02, 0);
    return shoulder;
  });

  const root = group(named(part(new THREE.IcosahedronGeometry(0.12, 0), dark), 'body'), head, ...wings);
  root.name = 'bat';
  root.scale.setScalar(size);
  root.userData = {
    // The wings beat the same whether the bat circles or dives.
    tick(t) {
      const beat = Math.sin(t * 18 + seed) * 0.9;
      wings[0].rotation.z = -beat;
      wings[1].rotation.z = beat;
    },
  };
  return root;
}
