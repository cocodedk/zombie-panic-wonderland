// A small purple bat with pointed ears, red eyes, two fangs and flat, fanned wings that beat fast, facing +z.

import * as THREE from 'three';
import { flat, glow, part, group, span, ignoreRays } from './parts.js';
import { glowEyes } from './glow-eyes.js';

const BRASS = '#e0a838';
const EDGE = [[0.3, 0.2], [0.5, 0.08], [0.42, -0.12], [0.16, -0.2]];

const named = (obj, name) => {
  obj.name = name;
  return obj;
};

// A wing is a flat fan of three triangles from the shoulder (the origin), out to `side` * about 0.5, in the
// plane the bat faces (z = 0), so it shows full from the front and flaps about the body's z axis.
function wingGeometry(side) {
  const points = [];
  for (let i = 0; i < 3; i++) {
    for (const [x, y] of [[0, 0], EDGE[i], EDGE[i + 1]]) points.push(x * side || 0, y, 0); // `|| 0` keeps the shoulder's x from being -0
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

export function buildBat({ body = '#34373d', membrane = '#7a808a', eyes = '#ff2a1a', fang = '#e8e0c8', size = 1, seed = 0 } = {}) {
  const dark = flat(body);
  const wingMaterial = flat(membrane, { side: THREE.DoubleSide });
  const brass = flat(BRASS);
  const ear = (x) => named(part(new THREE.ConeGeometry(0.03, 0.08, 3), brass, [x, 0.1, -0.01]), 'ear');
  const eye = (x) => named(part(new THREE.BoxGeometry(0.03, 0.03, 0.01), glow(eyes), [x, 0.02, 0.07]), 'eye');
  const tooth = (x) => named(part(new THREE.ConeGeometry(0.012, 0.05, 3), fang, [x, -0.06, 0.06], [Math.PI, 0, 0]), 'fang');
  const eyeMeshes = [eye(-0.035), eye(0.035)];
  const head = named(group(part(new THREE.IcosahedronGeometry(0.08, 0), dark), ear(-0.05), ear(0.05), ...eyeMeshes, tooth(-0.025), tooth(0.025)), 'head');
  glowEyes(head, eyeMeshes, eyes, 0.14);
  head.position.set(0, 0.05, 0.12);

  // Each wing pivots at the shoulder; a brass spar runs from it to each of the fan's edge points.
  const wings = [-1, 1].map((side) => {
    const shoulder = named(group(named(part(wingGeometry(side), wingMaterial), 'fan')), 'wing');
    for (const [x, y] of EDGE.slice(0, 3)) {
      const spar = named(ignoreRays(part(new THREE.BoxGeometry(0.012, 0.012, 1), brass)), 'spar');
      span(spar, { x: 0, y: 0, z: 0 }, { x: x * side, y, z: 0 });
      shoulder.add(spar);
    }
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
