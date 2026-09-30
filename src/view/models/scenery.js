// The backdrop: sky, ground, the ruined brick road, twisted trees, giant mushrooms, a leaning crypt,
// a crooked clock tower, hedges and a picket fence. Each builder takes its colours and sizes.

import * as THREE from 'three';
import { flat, glow, ignoreRays, part, group, seeded } from './parts.js';

export function buildSky({ top = '#2b1d3f', horizon = '#c46a3b', radius = 160 } = {}) {
  const geo = new THREE.SphereGeometry(radius, 16, 12);
  const a = new THREE.Color(horizon);
  const b = new THREE.Color(top);
  const pos = geo.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const c = a.clone().lerp(b, Math.min(1, Math.max(0, pos.getY(i) / (radius * 0.55))));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
}

export function buildGround({ color = '#2d3526', size = 120 } = {}) {
  return part(new THREE.PlaneGeometry(size, size), color, [0, 0, 0], [-Math.PI / 2, 0, 0]);
}

// Yellow brick along x, with bricks missing and rubble: the ruined road.
export function buildRoad({ color = '#b89a4e', mortar = '#6d5a33', length = 26, width = 2.6, missing = 0.07, seed = 7 } = {}) {
  const rand = seeded(seed);
  const road = group(part(new THREE.BoxGeometry(length, 0.06, width), mortar, [0, 0.03, 0]));
  const bw = 0.62;
  const bd = 0.3;
  const cols = Math.floor(length / bw);
  const rows = Math.floor(width / bd);
  const bricks = new THREE.InstancedMesh(new THREE.BoxGeometry(bw - 0.05, 0.08, bd - 0.05), flat('#ffffff'), cols * rows);
  const m = new THREE.Matrix4();
  const base = new THREE.Color(color);
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < missing) continue; // a missing brick
      const x = -length / 2 + (c + (r % 2 ? 1 : 0.5)) * bw;
      if (x > length / 2 - bw / 2) continue;
      m.makeRotationY((rand() - 0.5) * 0.08);
      m.setPosition(x, 0.07 + rand() * 0.02, -width / 2 + (r + 0.5) * bd);
      bricks.setMatrixAt(n, m);
      bricks.setColorAt(n, base.clone().offsetHSL(0, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.12));
      n++;
    }
  }
  bricks.count = n;
  road.add(bricks);
  const rubble = new THREE.DodecahedronGeometry(0.14, 0);
  for (let i = 0; i < 14; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const piece = part(rubble, rand() < 0.5 ? color : '#8a7a5a', [(rand() - 0.5) * length, 0.08, side * (width / 2 + rand() * 0.4)], [rand(), rand(), rand()]);
    piece.scale.setScalar(0.6 + rand());
    road.add(piece);
  }
  return road;
}

// A bare, twisted tree: a trunk of bent segments, two crooked branches and a few dark leaf clumps.
export function buildTree({ trunk = '#3b2a2a', leaves = '#2f3d2a', height = 6, seed = 1 } = {}) {
  const rand = seeded(seed);
  const bark = flat(trunk);
  const foliage = flat(leaves);
  const limb = (length, r0, r1, segments, bend) => {
    const root = group();
    let parent = root;
    for (let i = 0; i < segments; i++) {
      const seg = group();
      seg.position.y = i ? length / segments : 0;
      seg.rotation.z = bend * (i % 2 ? -0.7 : 1) + (rand() - 0.5) * 0.2;
      seg.rotation.x = (rand() - 0.5) * 0.3;
      const ra = r0 + ((r1 - r0) * i) / segments;
      const rb = r0 + ((r1 - r0) * (i + 1)) / segments;
      seg.add(part(new THREE.CylinderGeometry(rb, ra, length / segments, 5), bark, [0, length / segments / 2, 0]));
      parent.add(seg);
      parent = seg;
    }
    const tip = group();
    tip.position.y = length / segments;
    parent.add(tip);
    return { root, tip, parent };
  };
  const main = limb(height, height * 0.06, height * 0.015, 5, 0.22);
  const tree = group(main.root);
  const clump = new THREE.IcosahedronGeometry(height * 0.14, 0);
  main.tip.add(part(clump, foliage));
  for (const side of [-1, 1]) {
    const branch = limb(height * 0.4, height * 0.025, height * 0.008, 3, side * 0.35);
    branch.root.position.y = height * (0.35 + rand() * 0.25);
    branch.root.rotation.z = side * 0.9;
    tree.add(branch.root);
    branch.tip.add(part(clump, foliage, [0, 0, 0], [rand(), rand(), 0]));
  }
  // Roots at the foot.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rand();
    tree.add(part(new THREE.ConeGeometry(height * 0.04, height * 0.2, 4), bark, [Math.cos(a) * height * 0.06, height * 0.03, Math.sin(a) * height * 0.06], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]));
  }
  return tree;
}

export function buildMushroom({ cap = '#a13d5a', spots = '#f1e3c8', stem = '#e8dcc0', size = 1, seed = 1 } = {}) {
  const rand = seeded(seed);
  const lean = (rand() - 0.5) * 0.3;
  const top = part(new THREE.SphereGeometry(0.6, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2), cap, [lean * 0.9, 0.95, 0]);
  top.scale.y = 0.65;
  const mushroom = group(
    part(new THREE.CylinderGeometry(0.12, 0.2, 1, 7), stem, [lean * 0.5, 0.5, 0], [0, 0, -lean]),
    part(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 9), '#c9b99a', [lean * 0.9, 0.95, 0]),
    top,
  );
  const dot = new THREE.IcosahedronGeometry(0.07, 0);
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2;
    const p = 0.3 + rand() * 0.9; // polar angle on the cap
    const r = Math.sin(p) * 0.6;
    mushroom.add(part(dot, spots, [lean * 0.9 + Math.cos(a) * r, 0.95 + Math.cos(p) * 0.6 * 0.65, Math.sin(a) * r]));
  }
  mushroom.scale.setScalar(size);
  return mushroom;
}

export function buildCrypt({ stone = '#6e6a78', roof = '#4a4655', door = '#1d1a24', lean = 0.1, size = 1 } = {}) {
  const roofShape = new THREE.Shape([new THREE.Vector2(-1.9, 0), new THREE.Vector2(1.9, 0), new THREE.Vector2(0, 1.3)]);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 3.4, bevelEnabled: false });
  const building = group(
    part(new THREE.BoxGeometry(3.2, 2.6, 3), stone, [0, 1.3, 0]),
    part(roofGeo, roof, [0, 2.6, -1.7]),
    part(new THREE.BoxGeometry(1, 1.7, 0.1), door, [0, 0.85, 1.51]),
    part(new THREE.BoxGeometry(3.6, 0.2, 0.8), stone, [0, 0.1, 1.8]),
    part(new THREE.BoxGeometry(0.12, 0.7, 0.12), stone, [0, 4.2, 0.3]),
    part(new THREE.BoxGeometry(0.45, 0.12, 0.12), stone, [0, 4.35, 0.3]),
  );
  for (const x of [-1.35, 1.35]) building.add(part(new THREE.CylinderGeometry(0.16, 0.2, 2.6, 6), '#817c8c', [x, 1.3, 1.6]));
  building.add(part(new THREE.DodecahedronGeometry(0.3, 0), stone, [1.9, 0.2, 1.2]));
  building.rotation.z = lean;
  building.scale.setScalar(size);
  return group(building);
}

export function buildClockTower({ stone = '#5d5670', roof = '#3a2f4a', face = '#e8dfb0', hands = '#222222', lean = 0.08, size = 1 } = {}) {
  const tower = group(part(new THREE.BoxGeometry(2, 5, 2), stone, [0, 2.5, 0]));
  const upper = group(
    part(new THREE.BoxGeometry(1.7, 3, 1.7), stone, [0, 1.5, 0]),
    part(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 12), face, [0, 1.8, 0.86], [Math.PI / 2, 0, 0]),
    part(new THREE.BoxGeometry(0.06, 0.45, 0.04), hands, [0.08, 1.95, 0.93], [0, 0, -0.4]),
    part(new THREE.BoxGeometry(0.05, 0.32, 0.04), hands, [-0.1, 1.72, 0.93], [0, 0, -2.1]),
    part(new THREE.ConeGeometry(1.5, 2.4, 4), roof, [0, 4.2, 0], [0, Math.PI / 4, 0.12]),
  );
  // A lit window under the roof.
  upper.add(part(new THREE.BoxGeometry(0.35, 0.5, 0.05), glow('#f5b04a'), [0, 0.6, 0.86]));
  upper.position.set(0.15, 5, 0);
  upper.rotation.z = -lean * 1.5; // crooked: the top bends back the other way
  tower.add(upper);
  tower.rotation.z = lean;
  tower.scale.setScalar(size);
  return group(tower);
}

export function buildHedge({ color = '#2f4a2c', length = 4, height = 1, seed = 1 } = {}) {
  const rand = seeded(seed);
  const hedge = group(part(new THREE.BoxGeometry(length, height, 0.9), color, [0, height / 2, 0]));
  const bump = new THREE.IcosahedronGeometry(0.4, 0);
  for (let x = -length / 2 + 0.4; x < length / 2; x += 0.7) {
    hedge.add(part(bump, color, [x, height + (rand() - 0.6) * 0.2, (rand() - 0.5) * 0.3], [rand(), rand(), 0]));
  }
  return hedge;
}

export function buildFence({ color = '#d8d0c0', length = 6, height = 1, missing = 0.1, seed = 1 } = {}) {
  const rand = seeded(seed);
  const wood = flat(color);
  const fence = group();
  for (const y of [0.35, 0.75]) fence.add(part(new THREE.BoxGeometry(length, 0.08, 0.05), wood, [0, y * height, -0.05]));
  const board = new THREE.BoxGeometry(0.14, height, 0.05);
  const tip = new THREE.ConeGeometry(0.1, 0.18, 4);
  for (let x = -length / 2 + 0.1; x < length / 2; x += 0.3) {
    if (rand() < missing) continue; // a missing picket
    const picket = group(part(board, wood, [0, height / 2, 0]), part(tip, wood, [0, height + 0.09, 0], [0, Math.PI / 4, 0]));
    picket.position.x = x;
    picket.rotation.z = (rand() - 0.5) * 0.25;
    fence.add(picket);
  }
  fence.traverse((m) => { if (m.geometry) ignoreRays(m); }); // shots and aim pass through
  return fence;
}
