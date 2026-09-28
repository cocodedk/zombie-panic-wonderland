// A scarecrow on a pole: a sack head under a straw hat, a patched shirt on the crossbar, straw at the
// cuffs. The Scarecrow King is one off its pole, walking on stick legs, with a crown of twigs.

import * as THREE from 'three';
import { flat, glow, part, group, seeded } from './parts.js';

// Head, hat, arms and shirt, shared by both; the head's top is at y = 0.
function figure({ sack, hat, shirt, straw, eyes, seed }) {
  const rand = seeded(seed);
  const shirtMat = flat(shirt);
  const strawMat = flat(straw);
  const body = group(part(new THREE.BoxGeometry(0.55, 0.7, 0.3), shirtMat, [0, -0.75, 0]));
  body.add(part(new THREE.BoxGeometry(0.14, 0.14, 0.02), '#6b4a2a', [0.12, -0.7, 0.16], [0, 0, 0.3])); // a patch
  const sleeve = new THREE.CylinderGeometry(0.1, 0.12, 0.7, 5);
  const tuft = new THREE.ConeGeometry(0.1, 0.22, 4);
  const arms = [-1, 1].map((side) => {
    const arm = group(part(sleeve, shirtMat, [side * 0.35, 0, 0], [0, 0, Math.PI / 2]));
    arm.add(part(tuft, strawMat, [side * 0.78, (rand() - 0.5) * 0.08, 0], [0, 0, -side * Math.PI / 2]));
    arm.position.set(side * 0.25, -0.5, 0);
    body.add(arm);
    return arm;
  });
  for (let i = 0; i < 4; i++) body.add(part(tuft, strawMat, [-0.2 + i * 0.13, -1.14, 0.05], [Math.PI, 0, (rand() - 0.5) * 0.5]));

  const head = group(
    part(new THREE.IcosahedronGeometry(0.24, 0), sack, [0, -0.22, 0]),
    part(new THREE.BoxGeometry(0.07, 0.07, 0.02), glow(eyes), [-0.08, -0.18, 0.22]),
    part(new THREE.BoxGeometry(0.07, 0.07, 0.02), glow(eyes), [0.08, -0.18, 0.22]),
    part(new THREE.BoxGeometry(0.2, 0.03, 0.02), '#3a2a18', [0, -0.32, 0.22], [0, 0, 0.1]), // a stitched mouth
    part(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 8), hat, [0, -0.02, 0]),
    part(new THREE.ConeGeometry(0.22, 0.3, 6), hat, [0, 0.13, 0], [0.1, 0, 0.12]),
  );
  head.rotation.z = (rand() - 0.5) * 0.4;
  body.add(head);
  return { body, head, arms };
}

export function buildScarecrow({
  pole = '#5a4330',
  sack = '#b39a6a',
  hat = '#7a6440',
  shirt = '#6d3a3a',
  straw = '#d8c070',
  eyes = '#2a2018',
  height = 2.6,
  seed = 1,
} = {}) {
  const wood = flat(pole);
  const { body } = figure({ sack, hat, shirt, straw, eyes, seed });
  body.position.y = height;
  body.rotation.z = (seeded(seed + 9)() - 0.5) * 0.15;
  return group(
    part(new THREE.CylinderGeometry(0.06, 0.08, height, 5), wood, [0, height / 2, -0.2]),
    part(new THREE.BoxGeometry(1.7, 0.08, 0.08), wood, [0, height - 0.5, -0.2]),
    body,
  );
}

export function buildScarecrowKing({
  sack = '#9c8456',
  hat = '#3d2f22',
  shirt = '#3f2a4a',
  straw = '#d8c070',
  eyes = '#ff9a2a',
  twigs = '#4a3526',
  size = 2.4,
} = {}) {
  const root = group();
  root.name = 'scarecrowKing';
  const { body, head, arms } = figure({ sack, hat, shirt, straw, eyes, seed: 3 });
  body.position.y = 2.2;
  root.add(body);

  // A crown of twigs on the hat.
  const twig = new THREE.CylinderGeometry(0.015, 0.03, 0.34, 3);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    head.add(part(twig, twigs, [Math.sin(a) * 0.2, 0.3, Math.cos(a) * 0.2], [Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4]));
  }
  // A ragged cloak behind.
  const cloak = part(new THREE.ConeGeometry(0.6, 1.6, 6, 1, true), flat('#22182a', { side: THREE.DoubleSide }), [0, 1.35, -0.15]);
  cloak.scale.z = 0.5;
  root.add(cloak);

  // Stick legs pivot at the hips.
  const leg = new THREE.CylinderGeometry(0.05, 0.05, 1.1, 4);
  const legs = [-0.15, 0.15].map((x) => {
    const hip = group(part(leg, twigs, [0, -0.55, 0]), part(new THREE.ConeGeometry(0.1, 0.25, 4), straw, [0, -1.1, 0], [Math.PI, 0, 0]));
    hip.position.set(x, 1.1, 0);
    root.add(hip);
    return hip;
  });

  root.scale.setScalar(size);
  root.userData = {
    head,
    // walk: 1 while it walks; the arms swing high on every throw or summon.
    tick(t, { walk = 1 } = {}) {
      const step = Math.sin(t * 2.6) * 0.4 * walk;
      legs[0].rotation.x = step;
      legs[1].rotation.x = -step;
      body.rotation.z = Math.sin(t * 1.3) * 0.08;
      arms[0].rotation.z = -0.2 + Math.sin(t * 1.7) * 0.15;
      arms[1].rotation.z = 0.2 - Math.sin(t * 1.7 + 1) * 0.15;
      head.rotation.x = Math.sin(t * 0.9) * 0.1;
    },
  };
  return root;
}
