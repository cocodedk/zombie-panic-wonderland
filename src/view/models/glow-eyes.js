// A glow in front of each eye of a flyer: an additive sprite that always faces the camera.

import * as THREE from 'three';
import { ignoreRays } from './parts.js';

const PIXELS = 64; // the glow texture's width and height
const MIDDLE = 12; // the radius, in pixels, where the glow is still at 0.45

let texture = null;

// One soft round glow, white fading to nothing at the edge, shared by every glow and halo (the stage
// does not dispose textures). Drawn on a canvas the first time it is asked for.
export function glowTexture() {
  if (!texture) {
    const canvas = document.createElement('canvas');
    canvas.width = PIXELS;
    canvas.height = PIXELS;
    const g = canvas.getContext('2d');
    const r = PIXELS / 2;
    const gradient = g.createRadialGradient(r, r, 0, r, r, r);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(MIDDLE / r, 'rgba(255, 255, 255, 0.45)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, PIXELS, PIXELS);
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  return texture;
}

// Adds to `head` a glow of `size` in `color` just in front of each of `eyes` (meshes in the head's frame).
export function glowEyes(head, eyes, color, size) {
  for (const eye of eyes) {
    const material = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const sprite = ignoreRays(new THREE.Sprite(material));
    sprite.position.set(eye.position.x, eye.position.y, eye.position.z + 0.01);
    sprite.scale.set(size, size, 1);
    head.add(sprite);
  }
}
