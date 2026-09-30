// Level 3's backdrop: an orb web standing upright, thin flat-lit strands that shots pass through.

import * as THREE from 'three';
import { ignoreRays, group, seeded } from './parts.js';

const SPOKES = 8;
const RINGS = 4;
const THICK = 0.02;

// One strand, a thin box, named `name`, placed at [x, y] in the web's plane and turned by `turn`.
function strand(geometry, material, name, [x, y], turn) {
  const mesh = ignoreRays(new THREE.Mesh(geometry, material));
  mesh.name = name;
  mesh.position.set(x, y, 0);
  mesh.rotation.z = turn;
  return mesh;
}

// Its centre is `height` above the ground and its radius `size`; one spoke, chosen by `seed`, is missing.
export function buildWeb({ size = 2, height = 3, color = '#d8e0ea', seed = 1 } = {}) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false });
  const gap = Math.floor(seeded(seed)() * SPOKES);
  const web = group();
  web.name = 'web';
  const step = (Math.PI * 2) / SPOKES;

  const spoke = new THREE.BoxGeometry(size, THICK, THICK);
  for (let i = 0; i < SPOKES; i++) {
    if (i === gap) continue; // the ragged gap
    const a = i * step;
    web.add(strand(spoke, material, 'spoke', [Math.cos(a) * size / 2, height + Math.sin(a) * size / 2], a));
  }
  for (let r = 1; r <= RINGS; r++) {
    const radius = (size * r) / RINGS;
    const chord = new THREE.BoxGeometry(2 * radius * Math.sin(step / 2), THICK, THICK);
    const ring = group();
    ring.name = 'ring';
    for (let i = 0; i < SPOKES; i++) {
      const mid = (i + 0.5) * step; // between spoke i and the next: at the chord's midpoint, turned square to it
      const inner = radius * Math.cos(step / 2);
      ring.add(strand(chord, material, 'chord', [Math.cos(mid) * inner, height + Math.sin(mid) * inner], mid + Math.PI / 2));
    }
    web.add(ring);
  }
  return web;
}
