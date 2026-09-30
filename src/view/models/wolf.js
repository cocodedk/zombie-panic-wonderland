// A lean grey wolf: about 1.4 long and 0.9 high at the shoulder, with a lighter chest, pointed ears,
// a long snout, yellow eyes and a low, full tail, flat-lit and facing +z. It gallops.

import * as THREE from 'three';
import { flat, glow, ignoreRays, part, group } from './parts.js';

const COAT = '#6e6e78';
const CHEST = '#9a9aa4';
const DARK = '#5a5a64'; // snout and legs
const EYES = '#ffd34a';

const LEG = { radius: 0.05, length: 0.5 };
const SHOULDER = 0.9; // the torso's top, and the height of the shoulder
const SWING = 0.6; // how far a leg swings about its shoulder or hip, radians
const BOB = 0.04;
const TAIL = { radius: 0.07, length: 0.4, down: 0.7, swing: 0.2 }; // `down`: radians below level
const STRIDE = 9; // radians a second; the body bobs twice a stride

// A leg: a pivot at the shoulder or hip, the cylinder hanging from it.
function buildLeg(x, z, mat) {
  const shaft = part(new THREE.CylinderGeometry(LEG.radius, LEG.radius, LEG.length, 5), mat, [0, -LEG.length / 2, 0]);
  shaft.name = 'shaft';
  const leg = group(shaft);
  leg.name = 'leg';
  leg.position.set(x, LEG.length, z);
  return leg;
}

export function buildWolf({ seed = 0, size = 1 } = {}) {
  const torso = part(new THREE.BoxGeometry(0.4, 0.4, 0.8), COAT, [0, SHOULDER - 0.2, 0]);
  torso.name = 'torso';
  const chest = part(new THREE.BoxGeometry(0.3, 0.3, 0.1), CHEST, [0, SHOULDER - 0.25, 0.38]);
  chest.name = 'chest';

  const head = part(new THREE.BoxGeometry(0.26, 0.24, 0.3), COAT, [0, SHOULDER - 0.05, 0.4]);
  head.name = 'head';
  const snout = part(new THREE.ConeGeometry(0.09, 0.22, 5), DARK, [0, SHOULDER - 0.08, 0.63], [Math.PI / 2, 0, 0]);
  snout.name = 'snout';
  const earGeo = new THREE.ConeGeometry(0.05, 0.14, 4);
  const ears = [-0.07, 0.07].map((x) => {
    const ear = ignoreRays(part(earGeo, COAT, [x, SHOULDER + 0.14, 0.36]));
    ear.name = 'ear';
    return ear;
  });
  const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.03);
  const eyes = [-0.09, 0.09].map((x) => {
    const eye = ignoreRays(part(eyeGeo, glow(EYES), [x, SHOULDER, 0.55]));
    eye.name = 'eye';
    return eye;
  });

  // The tail hangs from a pivot at the torso's rear, trailing back and down, and swings side to side.
  const back = [0, -Math.sin(TAIL.down), -Math.cos(TAIL.down)];
  const cone = ignoreRays(part(new THREE.ConeGeometry(TAIL.radius, TAIL.length, 5), COAT, back.map((v) => (v * TAIL.length) / 2), [-(Math.PI / 2 + TAIL.down), 0, 0]));
  cone.name = 'tailCone';
  const tail = group(cone);
  tail.name = 'tail';
  tail.position.set(0, SHOULDER - 0.1, -0.4);

  const dark = flat(DARK); // the legs share one material
  const legs = [[-0.13, 0.28], [0.13, 0.28], [-0.13, -0.28], [0.13, -0.28]].map(([x, z]) => buildLeg(x, z, dark));

  const body = group(torso, chest, head, snout, ...ears, ...eyes, tail, ...legs);
  body.name = 'body';

  const root = group(body);
  root.name = 'wolf';
  root.scale.setScalar(size);
  root.userData = {
    // walk: 1 galloping, 0 standing (everything still). Front legs swing by sin(t × 9 + seed), the hind a
    // quarter turn behind; reduced motion does not touch it.
    tick(t, { walk = 1 } = {}) {
      const front = Math.sin(t * STRIDE + seed);
      const hind = Math.sin(t * STRIDE + seed - Math.PI / 2);
      legs.forEach((leg, i) => {
        leg.rotation.x = walk ? (i < 2 ? front : hind) * SWING * walk : 0;
      });
      body.position.y = walk ? Math.sin(t * STRIDE * 2 + seed) * BOB * walk : 0;
      tail.rotation.y = walk ? front * TAIL.swing * walk : 0;
    },
  };
  return root;
}
