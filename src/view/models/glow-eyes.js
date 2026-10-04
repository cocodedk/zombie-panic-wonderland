// A glow in front of each eye of a flyer: an additive sprite that always faces the camera.

import * as THREE from 'three';
import { ignoreRays } from './parts.js';

// Adds to `head` a glow of `size` in `color` just in front of each of `eyes` (meshes in the head's frame).
export function glowEyes(head, eyes, color, size) {
  for (const eye of eyes) {
    const material = new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const sprite = ignoreRays(new THREE.Sprite(material));
    sprite.position.set(eye.position.x, eye.position.y, eye.position.z + 0.01);
    sprite.scale.set(size, size, 1);
    head.add(sprite);
  }
}
