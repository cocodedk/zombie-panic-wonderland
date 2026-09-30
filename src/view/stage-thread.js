// A dropper's thread: a thin unlit box from the spider's back straight up to a fixed top, `from` + BACK
// above the ground. Its length is how far the spider has lowered, 0 at first and `from` on the ground.

import * as THREE from 'three';
import { dropHeight } from '../logic/game.js';
import { ignoreRays } from './models/parts.js';

export const THREAD = { width: 0.012, color: '#d8e0ea', opacity: 0.7 };
const BACK = 0.5; // the spider's back, above its root

export function buildThread() {
  const geometry = new THREE.BoxGeometry(THREAD.width, 1, THREAD.width); // one long; scaled to its length
  const material = new THREE.MeshBasicMaterial({ color: THREAD.color, transparent: true, opacity: THREAD.opacity });
  const thread = ignoreRays(new THREE.Mesh(geometry, material));
  thread.name = 'thread';
  return thread;
}

// Hangs `thread` from the top down to the back of the hanging dropper `e`.
export function placeThread(thread, e, rule) {
  const root = dropHeight(e, rule);
  const length = rule.from - root;
  thread.position.set(e.x, root + BACK + length / 2, e.z);
  thread.scale.set(1, length, 1);
}
