// Draws the game's point bubbles: one translucent sprite each, over the scene (no depth test) and
// under the HUD, which is the page over the canvas. A bubble only shows: no ray hits it and it is
// never in what a shot can hit. Each value's texture is drawn on a canvas once and kept.

import * as THREE from 'three';
import { BUBBLE, bubbleSize, bubbleColor, bubbleLook } from '../logic/effects.js';

const PIXELS = 128; // the texture's width and height
const FONT = '"Trebuchet MS", system-ui, sans-serif'; // the page's, as the score's
const RIM = 3;

// The bubble with `+points` in its middle, the number filling BUBBLE.text of the width.
function drawBubble(points) {
  const canvas = document.createElement('canvas');
  canvas.width = PIXELS;
  canvas.height = PIXELS;
  const g = canvas.getContext('2d');
  const r = PIXELS / 2;
  g.beginPath();
  g.arc(r, r, r - RIM, 0, Math.PI * 2);
  g.globalAlpha = BUBBLE.fillOpacity;
  g.fillStyle = BUBBLE.fill;
  g.fill();
  g.globalAlpha = 1;
  g.lineWidth = RIM;
  g.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  g.stroke();
  const text = `+${points}`;
  g.font = `bold 100px ${FONT}`;
  const size = (100 * BUBBLE.text * PIXELS) / g.measureText(text).width;
  g.font = `bold ${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = size * 0.16; // a dark outline, so the number reads on any sky
  g.strokeStyle = 'rgba(20, 10, 30, 0.9)';
  g.strokeText(text, r, r);
  g.fillStyle = bubbleColor(points);
  g.fillText(text, r, r);
  return canvas;
}

export function createBubbleView(scene) {
  const textures = new Map(); // points -> texture, shared by every bubble of that value
  const shown = new Map(); // bubble id -> sprite

  const textureFor = (points) => {
    if (!textures.has(points)) {
      const texture = new THREE.CanvasTexture(drawBubble(points));
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.set(points, texture);
    }
    return textures.get(points);
  };

  const make = (b) => {
    const material = new THREE.SpriteMaterial({ map: textureFor(b.points), transparent: true, depthTest: false, depthWrite: false, fog: false });
    const sprite = new THREE.Sprite(material);
    sprite.name = 'bubble';
    sprite.renderOrder = 10;
    sprite.raycast = () => {};
    scene.add(sprite);
    return sprite;
  };

  const remove = (id, sprite) => {
    scene.remove(sprite);
    sprite.material.dispose();
    shown.delete(id);
  };

  return {
    // Makes a sprite for each bubble in `bubbles` and removes those no longer in it.
    sync(bubbles) {
      const live = new Set();
      for (const b of bubbles) {
        live.add(b.id);
        if (!shown.has(b.id)) shown.set(b.id, make(b));
        const sprite = shown.get(b.id);
        const look = bubbleLook(b);
        const size = bubbleSize(b.points) * look.scale;
        sprite.position.set(b.pos.x + look.drift, b.pos.y + look.rise, b.pos.z);
        sprite.scale.set(size, size, 1);
        sprite.material.opacity = look.opacity;
      }
      for (const [id, sprite] of shown) if (!live.has(id)) remove(id, sprite);
    },

    // Nothing left: every sprite and texture goes, as the scene is rebuilt for a new level.
    clear() {
      for (const [id, sprite] of shown) remove(id, sprite);
      for (const texture of textures.values()) texture.dispose();
      textures.clear();
    },
  };
}
