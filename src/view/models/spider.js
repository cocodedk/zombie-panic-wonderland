// A giant yard spider: a domed cephalothorax with eight red eyes and two fangs, a bulbous abdomen
// with a red hourglass, and eight jointed legs, flat-lit and facing +z. It scuttles.

import * as THREE from 'three';
import { flat, glow, ignoreRays, part, group } from './parts.js';

const BODY = '#2a1f2e';
const HEAD = '#3a2c3f';
const HOURGLASS = '#c0182b';
const EYES = '#ff2a1a';
const FANGS = '#e8e0c8';

const HEIGHT = 0.3; // the body stands this high
const HIT_RADIUS = 0.45; // the invisible sphere shots hit
const SWING = 0.35; // how far a leg swings about its hip, radians
const BOB = 0.02;

// Each leg: two segments in a vertical plane, the upper rising outward to the knee, the lower falling
// from it to the ground (its angle is the one that puts the foot exactly on the ground).
const UPPER = { length: 0.32, angle: 0.22 };
const LOWER = { length: 0.38, angle: Math.asin((HEIGHT + 0.32 * Math.sin(0.22)) / 0.38) };
const HIP_X = 0.08;
const HIP_Z = [0.2, 0.12, 0.04, -0.06]; // front to back
const YAW = [0.55, 0.2, -0.2, -0.55]; // radians toward the front (+) or back (-)
const IN_STEP = new Set([0, 3, 4, 7]); // legs 0 to 3 are on the right, 4 to 7 on the left

// A leg from its hip outward: the swinging hip group holds a fixed group that sets the side and yaw.
function buildLeg(i, mat) {
  const side = i < 4 ? 1 : -1;
  const j = i % 4;
  const upper = new THREE.CylinderGeometry(0.025, 0.025, UPPER.length, 5);
  const lower = new THREE.CylinderGeometry(0.025, 0.025, LOWER.length, 5);
  const kneeX = Math.cos(UPPER.angle) * UPPER.length;
  const kneeY = Math.sin(UPPER.angle) * UPPER.length;
  const segments = group(
    ignoreRays(part(upper, mat, [kneeX / 2, kneeY / 2, 0], [0, 0, UPPER.angle - Math.PI / 2])),
    ignoreRays(part(lower, mat, [kneeX + (Math.cos(LOWER.angle) * LOWER.length) / 2, kneeY - (Math.sin(LOWER.angle) * LOWER.length) / 2, 0], [0, 0, -LOWER.angle - Math.PI / 2])),
  );
  segments.rotation.y = side > 0 ? -YAW[j] : Math.PI + YAW[j];
  const hip = group(segments);
  hip.name = 'leg';
  hip.position.set(side * HIP_X, HEIGHT, HIP_Z[j]);
  return hip;
}

export function buildSpider({ seed = 0, size = 1 } = {}) {
  const dark = flat(BODY);
  const abdomen = ignoreRays(part(new THREE.IcosahedronGeometry(0.28, 0), dark, [0, HEIGHT, -0.3]));
  abdomen.scale.set(1, 0.8, 1.2);
  abdomen.name = 'abdomen';
  const head = ignoreRays(part(new THREE.IcosahedronGeometry(0.17, 0), HEAD, [0, HEIGHT, 0.1]));
  head.name = 'cephalothorax';

  // The hourglass on the abdomen's back: two cones, tip to tip.
  const cone = new THREE.ConeGeometry(0.05, 0.1, 4);
  const hourglass = [1, -1].map((k) => {
    const c = ignoreRays(part(cone, HOURGLASS, [0, 0.5, -0.3 - k * 0.05], [(k * Math.PI) / 2, 0, 0]));
    c.name = 'hourglass';
    return c;
  });

  // Eight eyes in two rows of four, and two fangs, on the front of the cephalothorax.
  const eyeGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
  const eyes = [0.34, 0.3].flatMap((y) => [-0.06, -0.02, 0.02, 0.06].map((x) => {
    const eye = ignoreRays(part(eyeGeo, glow(EYES), [x, y, 0.25]));
    eye.name = 'eye';
    return eye;
  }));
  const fangGeo = new THREE.ConeGeometry(0.02, 0.08, 4);
  const fangs = [-0.04, 0.04].map((x) => {
    const fang = ignoreRays(part(fangGeo, FANGS, [x, 0.22, 0.28], [Math.PI - 0.3, 0, 0]));
    fang.name = 'fang';
    return fang;
  });

  const legs = Array.from({ length: 8 }, (_, i) => buildLeg(i, dark));

  const body = group(abdomen, head, ...hourglass, ...eyes, ...fangs, ...legs);
  body.name = 'body';

  // The invisible sphere at the body's centre that counts for the aim; the rest ignores rays.
  const hit = part(new THREE.SphereGeometry(HIT_RADIUS, 8, 6), new THREE.MeshBasicMaterial({ visible: false }), [0, HEIGHT, -0.1]);
  hit.visible = false;
  hit.name = 'hit';

  const root = group(body, hit);
  root.name = 'spider';
  root.scale.setScalar(size);
  root.userData = {
    // walk: 1 scuttling, 0 standing (the legs are still); the two groups of legs swing in turn.
    tick(t, { walk = 1 } = {}) {
      legs.forEach((leg, i) => {
        leg.rotation.y = walk ? Math.sin(t * 10 + (IN_STEP.has(i) ? 0 : Math.PI)) * SWING * walk : 0;
      });
      body.position.y = walk ? Math.sin(t * 20 + seed) * BOB * walk : 0;
    },
  };
  return root;
}
