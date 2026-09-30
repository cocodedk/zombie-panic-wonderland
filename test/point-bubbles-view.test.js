// Spec 19: point bubbles, on the stage against test/fake-three.js: a sprite for each bubble, made
// and removed with the list, ignoring rays, sized by points, one texture for each value, and
// nothing left when the level changes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { level2 } from '../src/levels/level-2.js';
import { level1, calm, run, kill } from './helpers.js';
import { started, near } from './fast-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };

const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

const AT = { x: 1, y: 1.5, z: -10 };

function setUp(options = {}) {
  const game = started(level1, { waves: [{ zombie: 1 }], spacing: 0, ...options });
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  const draw = () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
  const sprites = () => draw().children.filter((c) => c.name === 'bubble');
  return { game, stage, draw, sprites };
}

test('6. the stage makes a sprite for each bubble and removes it when it is gone', () => {
  const { game, draw, sprites } = setUp();
  assert.equal(sprites().length, 0);
  game.effects.bubble(100, AT);
  game.effects.bubble(25, AT);
  assert.equal(sprites().length, 2);
  assert.equal(sprites().length, 2, 'not made again each frame');
  const disposed = THREE.disposed.materials;
  run(game, 1.3);
  assert.deepEqual(game.effects.bubbles, []);
  draw();
  assert.equal(sprites().length, 0);
  assert.equal(THREE.disposed.materials - disposed, 2, 'their materials are disposed');
});

test('6. a bubble ignores rays and is not in what a shot can hit', () => {
  const { game, stage, sprites } = setUp();
  kill(game, game.enemies[0]);
  const [sprite] = sprites();
  assert.ok(Object.hasOwn(sprite, 'raycast'));
  assert.equal(sprite.raycast(), undefined);
  assert.equal(stage.pick({ x: 0, y: 0 }), null, 'a shot goes through it');
  assert.equal(stage.aimAt({ x: 0, y: 0 }).id, null);
});

test('6. it is drawn over the scene: translucent, no depth test, unaffected by fog', () => {
  const { game, sprites } = setUp();
  game.effects.bubble(100, AT);
  const [{ material, renderOrder }] = sprites();
  assert.deepEqual([material.transparent, material.depthTest, material.depthWrite, material.fog], [true, false, false, false]);
  assert.ok(renderOrder > 0);
});

test('6. its size is 0.5, 0.65 or 0.9 across by its points, and it starts at 60% and moves', () => {
  const { game, sprites } = setUp();
  const sizes = { 1: 0.5, 25: 0.5, 100: 0.5, 199: 0.5, 200: 0.65, 250: 0.65, 999: 0.65, 1000: 0.9, 2000: 0.9, 3000: 0.9 };
  for (const p of Object.keys(sizes)) game.effects.bubble(Number(p), AT);
  game.effects.bubbles.forEach((b) => { b.age = 0.5; });
  for (const [i, sprite] of sprites().entries()) {
    const points = game.effects.bubbles[i].points;
    near(sprite.scale.x, sizes[points], 1e-9, `${points}`);
    near(sprite.scale.y, sizes[points], 1e-9, `${points}`);
  }
  const fresh = setUp();
  fresh.game.effects.bubble(100, AT);
  const [start] = fresh.sprites();
  near(start.scale.x, 0.5 * 0.6);
  near(start.position.y, 1.5);
  near(start.position.z, -10);
  near(start.position.x, 1, 1e-12, 'at first exactly over where it fell');
  fresh.game.update(0.6);
  const [later] = fresh.sprites();
  assert.ok(later.position.y > 1.5 && later.position.y < 3.1, 'it rises');
});

test('6. with reduced motion it appears full size and stays where it is', () => {
  const { game, sprites } = setUp({ reducedMotion: true });
  game.effects.bubble(100, AT);
  const [sprite] = sprites();
  const at = (s) => [s.position.x, s.position.y, s.position.z];
  const before = at(sprite);
  assert.deepEqual(before, [AT.x, AT.y, AT.z]);
  near(sprite.scale.x, 0.5);
  game.update(0.4);
  const [again] = sprites();
  assert.deepEqual(at(again), before);
  near(again.scale.x, 0.5);
  near(again.material.opacity, 0.5, 1e-9);
});

test('6. the bubble is drawn on a canvas: +points in gold, the 200 in orange, 70% of the width', () => {
  const { game, sprites } = setUp();
  for (const p of [100, 200, 2000]) game.effects.bubble(p, AT);
  const ctxs = sprites().map((s) => s.material.map.image.ctx);
  const [hundred, fast, boss] = ctxs.map((c) => c.texts[0]);
  assert.deepEqual([hundred.text, fast.text, boss.text], ['+100', '+200', '+2000']);
  assert.deepEqual([hundred.style, fast.style, boss.style], ['#ffd24a', '#ff9a2a', '#ffd24a']);
  for (const t of [hundred, fast, boss]) {
    near(t.width, 0.7 * 128, 1e-6, t.text);
    assert.match(t.font, /^bold .*(sans-serif)$/);
  }
  assert.deepEqual(ctxs[0].fills, [{ style: '#cfe8ff', alpha: 0.35 }]);
});

test('6. the textures are made once for each value', () => {
  const { game, draw, sprites } = setUp();
  const before = { canvases: THREE.canvases.length, textures: THREE.canvasTextures.length };
  for (const p of [100, 100, 100, 200, 200, 25]) game.effects.bubble(p, AT);
  draw();
  draw();
  game.update(0.1);
  draw();
  assert.equal(sprites().length, 6);
  assert.equal(THREE.canvases.length - before.canvases, 3);
  assert.equal(THREE.canvasTextures.length - before.textures, 3);
  const maps = sprites().map((s) => s.material.map);
  assert.equal(maps[0], maps[1]);
  assert.equal(maps[3], maps[4]);
  assert.notEqual(maps[0], maps[3]);
});

test('6. nothing is left in the scene after a level change', () => {
  const { game, draw, sprites } = setUp();
  for (const p of [100, 200]) game.effects.bubble(p, AT);
  assert.equal(sprites().length, 2);
  const disposed = { ...THREE.disposed };
  game.begin(calm(level2), 0);
  const scene = draw();
  assert.equal(scene.children.filter((c) => c.name === 'bubble').length, 0);
  assert.equal(scene.children.length, 2, 'the backdrop and the player');
  assert.equal(THREE.disposed.materials - disposed.materials >= 2, true, 'their materials');
  assert.equal(THREE.disposed.textures - disposed.textures, 2, 'and their textures');
});
