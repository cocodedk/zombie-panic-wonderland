// The Spider Queen's web ball, a low-poly pale ball, and the thread it trails along its flight.

import * as THREE from 'three';
import { glow, ignoreRays, part } from './parts.js';
import { span } from '../stage-helpers.js';
import { THREAD } from '../stage-thread.js';

export const WEB_BALL = { radius: 0.25, color: '#d8e0ea', trail: 0.6 };

export function buildWebBall() {
  const ball = part(new THREE.IcosahedronGeometry(WEB_BALL.radius, 1), glow(WEB_BALL.color));
  ball.name = 'webBall';
  return ball;
}

// A thin unlit box, one long along z; `placeWebTrail` stretches it. Rays pass through it.
export function buildWebTrail() {
  const material = new THREE.MeshBasicMaterial({ color: THREAD.color, transparent: true, opacity: THREAD.opacity });
  const trail = ignoreRays(new THREE.Mesh(new THREE.BoxGeometry(THREAD.width, THREAD.width, 1), material));
  trail.name = 'webThread';
  return trail;
}

// Lays `trail` from the ball at `at` back along its flight, `from` being where it was a moment ago.
export function placeWebTrail(trail, at, from) {
  const d = { x: at.x - from.x, y: at.y - from.y, z: at.z - from.z };
  const k = WEB_BALL.trail / (Math.hypot(d.x, d.y, d.z) || 1);
  span(trail, at, { x: at.x - d.x * k, y: at.y - d.y * k, z: at.z - d.z * k });
}
