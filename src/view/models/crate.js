// A weapon crate: a wooden box of planks with a dark emblem of its weapon on each side.

import * as THREE from 'three';
import { flat, part, group, glowing } from './parts.js';

// Each emblem is drawn on a side facing +z, then turned to the other three.
const EMBLEMS = {
  // Two barrels side by side.
  scattergun: (mat) => [
    part(new THREE.BoxGeometry(0.46, 0.08, 0.02), mat, [0, 0.07, 0]),
    part(new THREE.BoxGeometry(0.46, 0.08, 0.02), mat, [0, -0.07, 0]),
  ],
  // A round pumpkin with its stem.
  launcher: (mat) => [
    part(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 8), mat, [0, -0.03, 0], [Math.PI / 2, 0, 0]),
    part(new THREE.BoxGeometry(0.05, 0.12, 0.02), mat, [0, 0.19, 0]),
  ],
};

export function buildCrate({ weapon = 'scattergun', wood = '#8b5a2b', emblem = '#2a1a0e', size = 0.9 } = {}) {
  const root = group();
  root.name = 'crate';
  const woodMat = flat(wood);
  const plankMat = flat(wood);
  const emblemMat = flat(emblem);
  const h = size / 2;
  root.add(part(new THREE.BoxGeometry(size, size, size), woodMat));
  // Planks: a raised frame along every edge.
  const edge = new THREE.BoxGeometry(0.08, size + 0.02, 0.08);
  for (const [x, z] of [[-h, -h], [-h, h], [h, -h], [h, h]]) {
    root.add(part(edge, plankMat, [x, 0, z]));
    root.add(part(edge, plankMat, [x, z, 0], [Math.PI / 2, 0, 0]));
    root.add(part(edge, plankMat, [0, x, z], [0, 0, Math.PI / 2]));
  }
  for (let i = 0; i < 4; i++) {
    const side = group(...EMBLEMS[weapon](emblemMat));
    const a = (i * Math.PI) / 2;
    side.position.set(Math.sin(a) * (h + 0.011), 0, Math.cos(a) * (h + 0.011));
    side.rotation.y = a;
    root.add(side);
  }
  const white = glowing([woodMat, plankMat], '#ffffff');
  root.userData = {
    // flash: 1 while it flashes white from a hit.
    tick(t, { flash = 0 } = {}) {
      white(flash);
    },
  };
  return root;
}
