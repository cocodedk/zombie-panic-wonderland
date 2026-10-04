// Spec 43: the one round glow texture, on the flyers' glows and the fast zombies' halos (against test/fake-three.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { level2 } from '../src/levels/level-2.js';
import { run } from './helpers.js';
import { started } from './fast-helpers.js';
import { lines, sprites, hittable } from './flyers-machine-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { glowTexture, glowEyes } = await import('../src/view/models/glow-eyes.js');
const { buildCrow } = await import('../src/view/models/crow.js');
const { buildBat } = await import('../src/view/models/bat.js');
const { buildZombie, FAST_EYES } = await import('../src/view/models/zombie.js');
const { createStage } = await import('../src/view/stage.js');

const halosOf = (model) => model.userData.head.children.filter((m) => m.name === 'halo');
const hex = (m) => `#${m.material.color.getHexString()}`;

describe('1. the glow texture', () => {
  test('importing the module makes no canvas', () => {
    assert.equal(THREE.canvases.length, 0);
    assert.equal(THREE.canvasTextures.length, 0);
  });

  test('a 64 x 64 canvas with a radial gradient of three stops, in sRGB, the same every time', () => {
    const texture = glowTexture();
    assert.ok(texture instanceof THREE.CanvasTexture);
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
    const canvas = texture.image;
    assert.deepEqual([canvas.width, canvas.height], [64, 64]);
    const [gradient] = canvas.ctx.gradients;
    assert.deepEqual(gradient.circle, [32, 32, 0, 32, 32, 32]);
    assert.deepEqual(gradient.stops, [
      [0, 'rgba(255, 255, 255, 1)'],
      [12 / 32, 'rgba(255, 255, 255, 0.45)'],
      [1, 'rgba(255, 255, 255, 0)'],
    ]);
    assert.equal(canvas.ctx.gradients.length, 1);
    assert.deepEqual(canvas.ctx.fillRects, [{ rect: [0, 0, 64, 64], style: gradient }], 'the gradient fills the canvas');
    assert.equal(glowTexture(), texture);
    buildCrow();
    buildZombie({ fast: true });
    assert.equal(glowTexture(), texture);
    assert.equal(THREE.canvases.length, 1);
    assert.equal(THREE.canvasTextures.length, 1);
  });
});

describe('2. the flyers\' glows', () => {
  for (const [name, build, size] of [['crow', buildCrow, 0.22], ['bat', buildBat, 0.14]]) {
    test(`every glow of a ${name} has the texture, at ${size}, and the rest of its material as before`, () => {
      const glows = sprites(build());
      assert.equal(glows.length, 2);
      for (const g of glows) {
        assert.equal(g.material.map, glowTexture());
        assert.deepEqual([g.scale.x, g.scale.y, g.scale.z], [size, size, 1]);
        assert.equal(g.material.transparent, true);
        assert.equal(g.material.opacity, 0.6);
        assert.equal(g.material.blending, THREE.AdditiveBlending);
        assert.equal(g.material.depthWrite, false);
      }
    });
  }

  test('glowEyes of any size and colour takes the texture', () => {
    const head = new THREE.Group();
    glowEyes(head, [{ position: new THREE.Vector3(0.1, 0.2, 0.3) }], '#00ff00', 0.5);
    assert.equal(head.children[0].material.map, glowTexture());
  });
});

describe('3. the fast zombies\' halos', () => {
  test('each halo has the texture, at 0.24, and its colour, opacity and place as before', () => {
    assert.equal(FAST_EYES.halo.size, 0.24);
    const model = buildZombie({ fast: true });
    const halos = halosOf(model);
    assert.equal(halos.length, 2);
    for (const h of halos) {
      assert.equal(h.material.map, glowTexture());
      assert.deepEqual(h.geometry.params, [0.24, 0.24]);
      assert.equal(hex(h), '#ff3b30');
      assert.equal(h.material.opacity, 0.55);
      assert.deepEqual([h.position.y, h.position.z], [0.03, 0.18 + 0.03]);
    }
    assert.deepEqual(halos.map((h) => h.position.x).sort((a, b) => a - b), [-0.07, 0.07]);
  });

  test('an ordinary zombie has no halo, and no map anywhere', () => {
    const model = buildZombie();
    assert.equal(halosOf(model).length, 0);
    model.traverse((m) => assert.equal(m.material?.map, undefined));
  });
});

describe('4. rays', () => {
  test('the glows and halos ignore rays, and nothing a ray can hit has the texture', () => {
    const fast = buildZombie({ fast: true });
    const glowsOf = (model) => (model === fast ? halosOf(model) : sprites(model));
    for (const model of [buildCrow(), buildBat(), fast]) {
      const glows = glowsOf(model);
      assert.equal(glows.length, 2);
      for (const g of glows) {
        assert.equal(g.raycast(), undefined);
        assert.ok(!hittable(model).includes(g));
      }
      for (const m of hittable(model)) assert.notEqual(m.material.map, glowTexture());
    }
  });
});

describe('5. the stage', () => {
  test('dropping a crow disposes its materials, not the shared texture, and the next crow still has it', () => {
    const game = started(level2, { waves: [{ crow: 1 }], random: () => 0.5 });
    const stage = createStage({ appendChild() {} }, game.level);
    const renderer = THREE.renderers.at(-1);
    const crows = () => renderer.scene.children.filter((c) => c.name === 'crow');
    run(game, 1);
    stage.sync(game, 0.01);
    assert.equal(crows().length, 1);
    const [first] = crows();
    const [glow] = sprites(first);
    const before = { ...THREE.disposed };
    for (let i = 0; i < 300 && (crows().length || game.enemies.length); i++) {
      run(game, 0.1);
      stage.sync(game, 0.01);
    }
    assert.equal(crows().length, 0, 'the crow is gone');
    assert.ok(THREE.disposed.materials >= before.materials + 2, 'its materials were disposed');
    assert.equal(THREE.disposed.textures, before.textures, 'the texture was not');
    assert.equal(glow.material.map, glowTexture());
    for (const g of sprites(buildCrow())) assert.equal(g.material.map, glowTexture());
  });
});

describe('6. file sizes', () => {
  test('the glow, crow and bat files are under 200 lines, the zombie at most 183', () => {
    for (const f of ['glow-eyes.js', 'crow.js', 'bat.js']) assert.ok(lines(`../src/view/models/${f}`) < 200, f);
    assert.ok(lines('../src/view/models/zombie.js') <= 183);
    assert.ok(lines('./round-glows.test.js') < 200);
  });
});
