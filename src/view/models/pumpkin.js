// A pumpkin, plain or carved, and the pumpkin monster: a body of vines under a carved pumpkin head.

import * as THREE from 'three';
import { flat, glow, part, group } from './parts.js';

export function buildPumpkin({ color = '#e0762b', stem = '#4d6b2f', face = '#ffd35a', carved = false, size = 1 } = {}) {
  const body = part(new THREE.SphereGeometry(0.5, 9, 6), color);
  body.scale.y = 0.78;
  const pumpkin = group(body, part(new THREE.CylinderGeometry(0.05, 0.08, 0.22, 5), stem, [0.02, 0.45, 0], [0, 0, -0.3]));
  if (carved) {
    const light = glow(face);
    const eye = new THREE.ConeGeometry(0.1, 0.12, 3);
    pumpkin.add(part(eye, light, [-0.17, 0.1, 0.44], [Math.PI / 2, 0, 0]));
    pumpkin.add(part(eye, light, [0.17, 0.1, 0.44], [Math.PI / 2, 0, 0]));
    pumpkin.add(part(new THREE.BoxGeometry(0.4, 0.08, 0.04), light, [0, -0.14, 0.43]));
    const tooth = new THREE.ConeGeometry(0.04, 0.07, 3);
    [-0.12, 0.0, 0.12].forEach((x) => pumpkin.add(part(tooth, light, [x, -0.08, 0.44], [0, 0, Math.PI])));
  }
  pumpkin.scale.setScalar(size);
  return pumpkin;
}

// The Scarecrow King's pumpkin: carved, with a crown of low-poly flames.
export function buildFlamingPumpkin({ flame = '#ff8a1f', core = '#ffe066', size = 1, ...pumpkin } = {}) {
  const lit = buildPumpkin({ carved: true, ...pumpkin });
  lit.name = 'flamingPumpkin';
  const tongue = new THREE.ConeGeometry(0.14, 0.5, 4);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    lit.add(part(tongue, glow(i % 2 ? core : flame), [Math.cos(a) * 0.22, 0.55 + (i % 2) * 0.1, Math.sin(a) * 0.22], [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]));
  }
  lit.add(part(new THREE.ConeGeometry(0.2, 0.75, 5), glow(core), [0, 0.7, 0]));
  lit.scale.setScalar(size);
  return lit;
}

// A vine along a curve, as a thin low-poly tube.
function vine(points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 14, radius, 4), material);
}

export function buildPumpkinMonster({
  vines = '#3f6b2a',
  leaf = '#5f8f3a',
  pumpkin = '#e0762b',
  face = '#ffd35a',
  size = 1,
} = {}) {
  const root = group();
  const vineMat = flat(vines);
  const leafMat = flat(leaf);

  // The body: four vines twisting up around each other.
  const body = group();
  for (let k = 0; k < 4; k++) {
    const points = [];
    for (let i = 0; i <= 6; i++) {
      const y = i * 0.28;
      const r = 0.28 - i * 0.025;
      const a = k * (Math.PI / 2) + i * 0.9;
      points.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    body.add(vine(points, 0.07, vineMat));
  }
  const leafGeo = new THREE.OctahedronGeometry(0.16, 0);
  [[0.3, 0.5, 0.1], [-0.28, 0.9, 0.05], [0.2, 1.3, -0.15], [-0.15, 0.25, 0.25]].forEach((p, i) => {
    const l = part(leafGeo, leafMat, p, [0, i, 0.6]);
    l.scale.set(1, 0.3, 0.6);
    body.add(l);
  });
  root.add(body);

  // Two vine arms; the right one throws.
  const arm = (side) => {
    const a = group(vine([[0, 0, 0], [side * 0.3, 0.1, 0.05], [side * 0.55, 0.35, 0.15], [side * 0.6, 0.65, 0.2]], 0.05, vineMat));
    a.add(part(leafGeo, leafMat, [side * 0.6, 0.7, 0.2]));
    a.position.set(side * 0.15, 1.35, 0);
    root.add(a);
    return a;
  };
  const left = arm(-1);
  const right = arm(1);

  const head = buildPumpkin({ color: pumpkin, face, carved: true, size: 0.9 });
  head.position.y = 1.95;
  root.add(head);

  root.scale.setScalar(size);
  root.userData = {
    // throwing: 0..1 through a throw.
    tick(t, { throwing = 0 } = {}) {
      body.rotation.y = Math.sin(t * 1.5) * 0.15;
      head.position.y = 1.95 + Math.sin(t * 2.4) * 0.05;
      head.rotation.z = Math.sin(t * 1.2) * 0.12;
      left.rotation.z = Math.sin(t * 2) * 0.15;
      right.rotation.x = -Math.sin(throwing * Math.PI) * 1.4;
    },
  };
  return root;
}
