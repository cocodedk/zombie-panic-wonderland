// Level 2's backdrop: corn rows, a lonely farmhouse, the Emerald City's green towers far behind
// and a pale moon. Each builder takes its colours and sizes.

import * as THREE from 'three';
import { flat, glow, part, group, seeded } from './parts.js';

// Rows of corn along x, `gap` apart in z: stalks of uneven height with leaves and an ear each.
export function buildCornRows({ color = '#a8943e', leaves = '#6f7a33', ear = '#d8b84a', rows = 3, length = 6, gap = 0.9, seed = 1 } = {}) {
  const rand = seeded(seed);
  const step = 0.45;
  const perRow = Math.floor(length / step);
  const count = rows * perRow;
  const stalks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.05, 1, 4), flat(color), count);
  const blades = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.8, 3), flat(leaves), count * 2);
  const ears = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0), flat(ear), count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < perRow; i++) {
      if (rand() < 0.08) continue; // a gap in the row
      const x = -length / 2 + (i + 0.5) * step + (rand() - 0.5) * 0.15;
      const z = -((rows - 1) * gap) / 2 + r * gap + (rand() - 0.5) * 0.15;
      const h = 1.5 + rand() * 0.7;
      const lean = (rand() - 0.5) * 0.15;
      stalks.setMatrixAt(n, m.compose(v.set(x, h / 2, z), q.setFromEuler(e.set(lean, 0, lean)), s.set(1, h, 1)));
      for (const side of [0, 1]) {
        const a = rand() * Math.PI * 2;
        blades.setMatrixAt(n * 2 + side, m.compose(v.set(x, h * (0.4 + side * 0.25), z), q.setFromEuler(e.set(Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1)), s.set(1, 1, 0.3)));
      }
      ears.setMatrixAt(n, m.compose(v.set(x + 0.06, h * 0.6, z), q.identity(), s.set(1, 2, 1)));
      n++;
    }
  }
  stalks.count = n;
  ears.count = n;
  blades.count = n * 2;
  return group(stalks, blades, ears);
}

export function buildFarmhouse({ walls = '#5e5048', roof = '#2f2a33', trim = '#8a7a66', window = '#f5c16a', size = 1 } = {}) {
  const roofShape = new THREE.Shape([new THREE.Vector2(-2.3, 0), new THREE.Vector2(2.3, 0), new THREE.Vector2(0, 1.8)]);
  const house = group(
    part(new THREE.BoxGeometry(4, 2.8, 3), walls, [0, 1.4, 0]),
    part(new THREE.ExtrudeGeometry(roofShape, { depth: 3.4, bevelEnabled: false }), roof, [0, 2.8, -1.7], [0, 0, 0.03]),
    part(new THREE.BoxGeometry(0.5, 1.2, 0.5), '#4a3b36', [1.1, 4, -0.4]), // the chimney
    part(new THREE.BoxGeometry(0.9, 1.7, 0.08), '#2a211c', [-0.9, 0.85, 1.52]), // the door
    part(new THREE.BoxGeometry(0.7, 0.6, 0.06), glow(window), [0.9, 1.7, 1.52]), // one lit window
    part(new THREE.BoxGeometry(0.7, 0.6, 0.06), '#1d1a20', [-0.5, 3.4, 1.4]), // a dark one in the gable
    part(new THREE.BoxGeometry(4.4, 0.15, 1.1), trim, [0, 0.08, 2]), // the porch
  );
  for (const x of [-2, 2]) house.add(part(new THREE.BoxGeometry(0.12, 1.6, 0.12), trim, [x, 0.8, 2.45], [0, 0, x > 0 ? 0.08 : 0]));
  house.add(part(new THREE.BoxGeometry(4.4, 0.1, 1.2), roof, [0, 1.65, 2], [0.2, 0, 0.05])); // the porch roof, sagging
  house.scale.setScalar(size);
  return group(house);
}

// A cluster of green towers with pointed tops, seen far off.
export function buildEmeraldCity({ towers = '#2f8f55', tops = '#56c47a', light = '#b8ffcc', size = 1, seed = 3 } = {}) {
  const rand = seeded(seed);
  const city = group();
  const wall = flat(towers, { fog: false });
  const cap = flat(tops, { fog: false });
  const lamp = new THREE.MeshBasicMaterial({ color: light, fog: false });
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 2.2 + (rand() - 0.5) * 1.2;
    const h = (i === 4 ? 16 : 5 + rand() * 7) * (1 - Math.abs(i - 4) * 0.06);
    const r = 0.6 + rand() * 0.5;
    city.add(part(new THREE.CylinderGeometry(r * 0.8, r, h, 6), wall, [x, h / 2, (rand() - 0.5) * 3]));
    city.add(part(new THREE.ConeGeometry(r, h * 0.35, 6), cap, [x, h + h * 0.175, city.children.at(-1).position.z]));
    city.add(part(new THREE.OctahedronGeometry(0.25, 0), lamp, [x, h * 0.7, city.children.at(-1).position.z + r]));
  }
  city.scale.setScalar(size);
  return city;
}

export function buildMoon({ color = '#e8ecd1', size = 3, height = 25 } = {}) {
  const moon = group(new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), new THREE.MeshBasicMaterial({ color, fog: false })));
  moon.position.y = height;
  return moon;
}
