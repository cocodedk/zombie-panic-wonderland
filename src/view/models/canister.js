// A gas canister: an upright red cylinder with a yellow band around its middle and a dark valve
// on top, standing on the ground at its origin.

import * as THREE from 'three';
import { flat, part, group, glowing } from './parts.js';

export function buildCanister({ body = '#c0392b', band = '#f1c40f', valve = '#444444', width = 0.5, height = 1 } = {}) {
  const root = group();
  root.name = 'canister';
  const bodyMat = flat(body);
  const bandMat = flat(band);
  const valveMat = flat(valve);
  const r = width / 2;
  const tall = height * 0.9; // the valve takes the rest
  root.add(part(new THREE.CylinderGeometry(r, r, tall, 10), bodyMat, [0, tall / 2, 0]));
  root.add(part(new THREE.CylinderGeometry(r * 1.05, r * 1.05, tall * 0.18, 10), bandMat, [0, tall / 2, 0]));
  root.add(part(new THREE.CylinderGeometry(r * 0.3, r * 0.3, height - tall, 6), valveMat, [0, (tall + height) / 2, 0]));
  const white = glowing([bodyMat, bandMat, valveMat], '#ffffff');
  root.userData = {
    // flash: 1 while it flashes white from a hit.
    tick(t, { flash = 0 } = {}) {
      white(flash);
    },
  };
  return root;
}
