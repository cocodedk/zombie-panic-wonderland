// A hunched zombie with long arms, a tilted head and torn clothes, facing +z. It shambles.
// The Zombie King is the same figure, bigger, with a bent crown.

import * as THREE from 'three';
import { flat, glow, glowing, ignoreRays, part, group, seeded } from './parts.js';
import { FAST_ZOMBIE } from '../../logic/effects.js';
import { addDetails, flickering, footColor, legSwing, ragSway, tinted, NO_EXTRAS } from './zombie-details.js';

const TEETH = '#e8e0c8';

// Now and then the head snaps up to `angle` radians to one side and back within `time` seconds,
// every `every` seconds at random.
export const TWITCH = { every: [2, 4], angle: (20 * Math.PI) / 180, time: 0.15 };

// A fast zombie's eyes: larger, a redder glow, and a soft halo (a flat square) in front of each.
export const FAST_EYES = { color: '#ff2a1a', scale: 1.8, halo: { size: 0.16, color: '#ff3b30', opacity: 0.55, z: 0.03 } };

function halo(x) {
  const { size, color, opacity, z } = FAST_EYES.halo;
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = ignoreRays(part(new THREE.PlaneGeometry(size, size), mat, [x, 0.03, 0.18 + z]));
  mesh.name = 'halo';
  return mesh;
}

export function buildZombie({
  fast = false, // darker, with larger, brighter eyes and their halos
  skin = fast ? FAST_ZOMBIE.skin : '#7d9a6a',
  shirt = fast ? FAST_ZOMBIE.shirt : '#5b5270',
  pants = fast ? FAST_ZOMBIE.pants : '#3d3a35',
  eyes = fast ? FAST_EYES.color : '#ff3b30',
  size = 1,
  seed = 0, // shifts the shamble so a crowd does not move in step
  tint = 0, // -0.06 to 0.06: darkens or lightens the skin and shirt by that fraction of their lightness
  extras = {}, // optional bits by flag (see ZOMBIE_EXTRAS); every flag defaults to off
} = {}) {
  const root = group();
  const shirtMat = flat(tinted(shirt, tint));
  const skinMat = flat(tinted(skin, tint));
  const flags = { ...NO_EXTRAS, ...extras };

  // Legs pivot at the hips; the limping side's foot is bare with `bareFoot`.
  const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.8, 5);
  const legs = [-0.13, 0.13].map((x, i) => {
    const foot = part(new THREE.BoxGeometry(0.16, 0.08, 0.26), footColor(i, seed, flags.bareFoot, skinMat), [0, -0.8, 0.05]);
    const hip = group(part(legGeo, pants, [0, -0.4, 0]), foot);
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

  // A torn-open jaw hanging below the face, with a few crooked teeth.
  const jaw = group(part(new THREE.BoxGeometry(0.16, 0.06, 0.1), '#4b5e40'));
  jaw.name = 'jaw';
  const tooth = new THREE.ConeGeometry(0.014, 0.04, 3);
  [-0.05, -0.01, 0.025, 0.055].forEach((x, i) => {
    const t = part(tooth, TEETH, [x, 0.045, 0.035], [0, 0, (i % 2 ? -0.35 : 0.3) + i * 0.05]);
    t.name = 'tooth';
    jaw.add(t);
  });
  jaw.position.set(0, -0.19, 0.1);
  jaw.rotation.x = 0.55;

  // A tilted head with glowing eyes and the jaw.
  const eyeMats = [];
  const eye = (x) => {
    const mesh = part(new THREE.BoxGeometry(0.06, 0.04, 0.02), glow(eyes), [x, 0.03, 0.18]);
    eyeMats.push(mesh.material);
    if (fast) mesh.scale.setScalar(FAST_EYES.scale);
    return mesh;
  };
  const head = group(part(new THREE.IcosahedronGeometry(0.2, 0), skinMat), eye(-0.07), eye(0.07), jaw);
  if (fast) head.add(halo(-0.07), halo(0.07));
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

  const dangle = addDetails({ head, legs, arms, torso, shirtMat }, [-0.07, 0.07], flags); // the rag's pivot, if any
  const swing = legSwing(seed, flags.limp); // how far each leg swings: a limp is one leg less
  const flicker = flags.flicker ? flickering(eyeMats, seed) : null; // the eyes' glow breathes

  // The head's twitch: the next one's start, side and angle, drawn from a seeded random.
  const random = seeded(Math.round(seed * 1000) + 1);
  let next = null;
  let angle = 0;
  const plan = (from) => {
    next = from + TWITCH.every[0] + random() * (TWITCH.every[1] - TWITCH.every[0]);
    angle = (random() < 0.5 ? -1 : 1) * TWITCH.angle * (0.5 + random() * 0.5);
  };
  const twitchAt = (t) => {
    if (next == null || t < next - TWITCH.every[1]) plan(t); // the first tick, or time went back
    while (t >= next + TWITCH.time) plan(next);
    return t < next ? 0 : angle * Math.sin((Math.PI * (t - next)) / TWITCH.time);
  };

  root.scale.setScalar(size);
  root.userData = {
    head,
    arms,
    torso,
    jaw,
    // walk: 1 while it walks, 0 standing; windup: 0 to 1, the arms rising to shoulder height;
    // twitch: false under reduced motion.
    tick(t, { walk = 1, windup = 0, twitch = true } = {}) {
      const s = t * 3.2 + seed;
      const step = Math.sin(s) * 0.35 * walk;
      legs[0].rotation.x = step * swing[0];
      legs[1].rotation.x = -step * swing[1];
      const up = -(Math.PI / 2 + torso.rotation.x); // level with the shoulders, the lean undone
      [0, 2].forEach((phase, i) => {
        const rest = -1.45 + Math.sin(s * 0.7 + phase) * 0.2;
        arms[i].rotation.x = rest + (up - rest) * windup;
      });
      torso.rotation.z = Math.sin(s) * 0.12;
      head.rotation.z = 0.35 + Math.sin(s * 0.5) * 0.1;
      head.rotation.y = twitch ? twitchAt(t) : 0;
      flicker?.(t, !twitch);
      if (dangle) dangle.rotation.z = ragSway(s, !twitch);
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
  king.name = 'zombieKing';
  // Winding up, the crown glows gold.
  const gold = [];
  c.traverse((m) => { if (m.material instanceof THREE.MeshStandardMaterial) gold.push(m.material); });
  const shine = glowing(gold, '#ffd76a');
  const { tick } = king.userData;
  king.userData.crown = gold;
  king.userData.tick = (t, pose = {}) => {
    tick(t, pose);
    shine(pose.windup ?? 0);
  };
  return king;
}
