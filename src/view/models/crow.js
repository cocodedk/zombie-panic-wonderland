// A black crow with a pointed beak, glinting eyes and wings that beat, facing +z.

import * as THREE from 'three';
import { flat, glow, part, group } from './parts.js';

export function buildCrow({ feathers = '#16161c', beak = '#c99a2e', eyes = '#e8ecd1', size = 1, seed = 0 } = {}) {
  const black = flat(feathers);
  const body = part(new THREE.OctahedronGeometry(0.28, 0), black);
  body.scale.set(0.8, 0.7, 1.4);
  const head = group(
    part(new THREE.IcosahedronGeometry(0.16, 0), black),
    part(new THREE.ConeGeometry(0.06, 0.24, 4), beak, [0, -0.02, 0.2], [Math.PI / 2, 0, 0]),
    part(new THREE.BoxGeometry(0.04, 0.04, 0.02), glow(eyes), [-0.08, 0.05, 0.1]),
    part(new THREE.BoxGeometry(0.04, 0.04, 0.02), glow(eyes), [0.08, 0.05, 0.1]),
  );
  head.position.set(0, 0.1, 0.38);
  const tail = part(new THREE.ConeGeometry(0.16, 0.4, 3), black, [0, 0, -0.45], [-Math.PI / 2, 0, 0]);
  tail.scale.y = 0.3;

  // Each wing pivots at the shoulder.
  const feather = new THREE.BoxGeometry(0.7, 0.04, 0.34);
  const wings = [-1, 1].map((side) => {
    const shoulder = group(part(feather, black, [side * 0.38, 0, 0], [0, side * 0.2, 0]));
    shoulder.add(part(new THREE.ConeGeometry(0.15, 0.4, 3), black, [side * 0.85, 0, -0.08], [0, 0, side * Math.PI / 2]));
    shoulder.position.x = side * 0.12;
    return shoulder;
  });

  const root = group(body, head, tail, ...wings);
  root.name = 'crow';
  root.scale.setScalar(size);
  root.userData = {
    // diving: 1 with the wings swept back, 0 beating.
    tick(t, { diving = 0 } = {}) {
      const beat = diving ? -0.9 : Math.sin(t * 14 + seed) * 0.7;
      wings[0].rotation.z = -beat;
      wings[1].rotation.z = beat;
    },
  };
  return root;
}
