// A hunched zombie with long arms, a tilted head and torn clothes, facing +z. It shambles.
// The Zombie King is the same figure, bigger, with a bent crown.

import * as THREE from 'three';
import { flat, glow, part, group } from './parts.js';

export function buildZombie({
  skin = '#7d9a6a',
  shirt = '#5b5270',
  pants = '#3d3a35',
  eyes = '#f2e36b',
  size = 1,
  seed = 0, // shifts the shamble so a crowd does not move in step
} = {}) {
  const root = group();
  const shirtMat = flat(shirt);
  const skinMat = flat(skin);

  // Legs pivot at the hips.
  const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.8, 5);
  const legs = [-0.13, 0.13].map((x) => {
    const hip = group(part(legGeo, pants, [0, -0.4, 0]), part(new THREE.BoxGeometry(0.16, 0.08, 0.26), '#2a2622', [0, -0.8, 0.05]));
    hip.position.set(x, 0.84, 0);
    return hip;
  });
  root.add(...legs, part(new THREE.BoxGeometry(0.42, 0.22, 0.26), pants, [0, 0.86, 0]));

  // The torso leans forward toward the player.
  const torso = group();
  torso.position.y = 0.92;
  torso.rotation.x = 0.45;
  root.add(torso);
  torso.add(part(new THREE.BoxGeometry(0.5, 0.62, 0.3), shirtMat, [0, 0.31, 0]));
  // Torn clothes: a ragged hem and holes that show the skin.
  const rag = new THREE.ConeGeometry(0.06, 0.18, 3);
  [-0.18, -0.06, 0.08, 0.2].forEach((x, i) => torso.add(part(rag, shirtMat, [x, -0.06 - (i % 2) * 0.04, 0.12], [Math.PI, 0, 0])));
  torso.add(part(new THREE.BoxGeometry(0.14, 0.12, 0.02), skinMat, [0.1, 0.36, 0.151], [0, 0, 0.4]));
  torso.add(part(new THREE.BoxGeometry(0.1, 0.16, 0.02), skinMat, [-0.26, 0.2, 0.05], [0, Math.PI / 2, 0.2]));

  // A tilted head with glowing eyes and a slack jaw.
  const head = group(
    part(new THREE.IcosahedronGeometry(0.2, 0), skinMat),
    part(new THREE.BoxGeometry(0.06, 0.04, 0.02), glow(eyes), [-0.07, 0.03, 0.18]),
    part(new THREE.BoxGeometry(0.06, 0.04, 0.02), glow(eyes), [0.07, 0.03, 0.18]),
    part(new THREE.BoxGeometry(0.16, 0.06, 0.1), '#4b5e40', [0, -0.15, 0.1], [0.3, 0, 0]),
  );
  head.position.set(0.03, 0.76, 0.06);
  head.rotation.z = 0.35;
  torso.add(head);

  // Long arms reach forward from the shoulders.
  const armGeo = new THREE.CylinderGeometry(0.07, 0.055, 0.85, 5);
  const arms = [-0.32, 0.32].map((x) => {
    const shoulder = group(
      part(new THREE.CylinderGeometry(0.1, 0.09, 0.2, 5), shirtMat, [0, -0.08, 0]),
      part(armGeo, skinMat, [0, -0.42, 0]),
      part(new THREE.IcosahedronGeometry(0.08, 0), skinMat, [0, -0.88, 0.02]),
    );
    shoulder.position.set(x, 0.55, 0);
    shoulder.rotation.x = -1.45;
    torso.add(shoulder);
    return shoulder;
  });

  root.scale.setScalar(size);
  root.userData = {
    head,
    // walk: 1 while it walks, 0 standing.
    tick(t, { walk = 1 } = {}) {
      const s = t * 3.2 + seed;
      const step = Math.sin(s) * 0.35 * walk;
      legs[0].rotation.x = step;
      legs[1].rotation.x = -step;
      arms[0].rotation.x = -1.45 + Math.sin(s * 0.7) * 0.2;
      arms[1].rotation.x = -1.45 + Math.sin(s * 0.7 + 2) * 0.2;
      torso.rotation.z = Math.sin(s) * 0.12;
      head.rotation.z = 0.35 + Math.sin(s * 0.5) * 0.1;
    },
  };
  return root;
}

export function buildCrown({ gold = '#d9a520', gem = '#b02a4a', size = 1 } = {}) {
  const crown = group(part(new THREE.CylinderGeometry(0.2, 0.18, 0.1, 8, 1, true), flat(gold, { side: THREE.DoubleSide })));
  const spike = new THREE.ConeGeometry(0.045, 0.16, 4);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    // One spike is bent over: the crown has seen better days.
    const bent = i === 2 ? 0.9 : 0.1 * Math.sin(i * 3);
    crown.add(part(spike, gold, [Math.sin(a) * 0.19, 0.12, Math.cos(a) * 0.19], [Math.cos(a) * bent, 0, -Math.sin(a) * bent]));
  }
  crown.add(part(new THREE.OctahedronGeometry(0.035, 0), glow(gem), [0, 0, 0.2]));
  crown.rotation.set(0.15, 0, -0.3);
  crown.scale.setScalar(size);
  return crown;
}

export function buildZombieKing({ crown = {}, size = 3, shirt = '#5a1f3a', ...zombie } = {}) {
  const king = buildZombie({ shirt, ...zombie, size });
  const c = buildCrown(crown);
  c.position.y = 0.19;
  king.userData.head.add(c);
  return king;
}
