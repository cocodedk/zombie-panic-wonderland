// What the stage's weather tests share: the fake three.js loaded in place of the real one, a stage
// on a game, and readers for what the weather touches.

import { register } from 'node:module';
import { storm } from './weather-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
export const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');
export { createStage };

export const CENTRE = { x: 0, y: 0 };
export const hex = (color) => `#${color.getHexString()}`;
export const named = (scene, name) => scene.children.filter((c) => c.name === name);
export const backdropOf = (scene) => named(scene, 'backdrop')[0];
export const leavesOf = (scene) => backdropOf(scene).children.filter((c) => c.userData.leaves);
export const hemisphere = (scene) => backdropOf(scene).children.find((c) => c instanceof THREE.HemisphereLight);
export const skyOf = (scene) => backdropOf(scene).children.find((c) => c.name === 'sky').geometry.attributes.color.array;
export const swayers = (scene) => backdropOf(scene).children.filter((c) => ['tree', 'cornRows', 'hedge', 'scarecrow'].includes(c.name));

// A stormy game and its stage; `draw` shows the game as it is, `run` plays on.
export function setUp(options) {
  const game = storm(options);
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  const draw = () => { stage.sync(game, 0.01); return renderer.scene; };
  const run = (seconds) => { for (let i = 0; i < Math.round(seconds * 100); i++) game.update(0.01); };
  return { game, stage, draw, run };
}

// What a strike changes, as numbers and as the lists of what hangs in the scene and the backdrop.
export const looks = (scene) => ({
  light: hemisphere(scene).intensity,
  fog: [scene.fog.color.r, scene.fog.color.g, scene.fog.color.b],
  sky: [...skyOf(scene)],
  children: scene.children.filter((c) => c.userData.entityId == null), // not the enemies and effects
  backdrop: [...backdropOf(scene).children],
});
