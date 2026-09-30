// Spec 29: the stage drawing spiders (against test/fake-three.js), and the sizes.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { level3 } from '../src/levels/level-3.js';
import { BURSTS } from '../src/logic/effects.js';
import { run, kill } from './helpers.js';
import { started } from './fast-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

const all = (root, test) => { const found = []; root.traverse((o) => { if (test(o)) found.push(o); }); return found; };
const named = (root, name) => all(root, (o) => o.name === name);

describe('6. the stage', () => {
  function stageFor(game) {
    const stage = createStage({ appendChild() {} }, game.level);
    const renderer = THREE.renderers.at(-1);
    const draw = () => {
      stage.sync(game, 0.01);
      return renderer.scene;
    };
    return { stage, draw };
  }
  const spidersIn = (scene) => scene.children.filter((c) => c.name === 'spider');

  test('spiders are built, placed and removed like other enemies', () => {
    const game = started(level3, { waves: [{ spider: 2 }], random: () => 1 });
    const { stage, draw } = stageFor(game);
    run(game, 1.5);
    let scene = draw();
    assert.equal(spidersIn(scene).length, 2);
    game.enemies.forEach((e) => {
      const obj = spidersIn(scene).find((s) => s.userData.entityId === e.id);
      assert.deepEqual([obj.position.x, obj.position.y, obj.position.z], [e.x, 0, e.z]);
      assert.equal(obj.rotation.y, 0, 'facing forward before the road');
    });
    assert.equal(stage.pick({ x: 0, y: 0 }), game.enemies[0].id, 'the sphere is aimed at');
    kill(game, game.enemies[0]);
    scene = draw();
    assert.equal(spidersIn(scene).length, 1);
    assert.equal(scene.children.filter((c) => c.name === 'chunk').length, BURSTS.spider.count);
  });

  test('on the road a spider turns toward the player, as a zombie does', () => {
    const game = started(level3, { waves: [{ spider: 1 }], random: () => 1 });
    const { draw } = stageFor(game);
    run(game, 6);
    const [obj] = spidersIn(draw());
    assert.equal(obj.rotation.y, Math.sign(game.player.x - game.enemies[0].x) * 0.9);
  });

  test('its gait is drawn from the game clock: still when paused, and the same under reduced motion', () => {
    const pose = (reducedMotion) => {
      const game = started(level3, { waves: [{ spider: 1 }], random: () => 0.5, reducedMotion });
      const { draw } = stageFor(game);
      run(game, 1.3);
      return { game, draw, legs: () => named(spidersIn(draw())[0], 'leg').map((l) => l.rotation.y) };
    };
    const a = pose(false);
    const b = pose(true);
    assert.ok(a.legs().some((angle) => angle !== 0));
    assert.deepEqual(a.legs(), b.legs());
    const z = a.game.enemies[0].z;
    const before = a.legs();
    a.game.pressEsc();
    run(a.game, 2);
    assert.equal(a.game.enemies[0].z, z);
    assert.deepEqual(a.legs(), before);
    assert.equal(spidersIn(a.draw())[0].position.z, z);
    a.game.pressEsc();
    run(a.game, 0.5);
    assert.ok(a.game.enemies[0].z > z);
  });

  test('with reduced motion a fallen spider fades out as the same model, with no chunks', () => {
    const game = started(level3, { waves: [{ spider: 1 }], random: () => 0.5, reducedMotion: true });
    const { draw } = stageFor(game);
    const [alive] = spidersIn(draw());
    const shape = (root) => all(root, () => true).length;
    kill(game, game.enemies[0]);
    run(game, 0.1);
    const scene = draw();
    assert.equal(scene.children.filter((c) => c.name === 'chunk').length, 0);
    const fades = scene.children.filter((c) => c.name === 'fade');
    assert.equal(fades.length, 1);
    assert.equal(shape(fades[0]), shape(alive));
    assert.equal(named(fades[0], 'eye').length, 8);
  });

  test('defeat freezes the spiders, still drawn; Try again starts with none', () => {
    const game = started(level3, { waves: [{ spider: 2 }], random: () => 0.5 });
    const { draw } = stageFor(game);
    run(game, 1.2);
    assert.equal(spidersIn(draw()).length, 2);
    game.player.hearts = 1;
    run(game, 12);
    assert.equal(game.screen, 'defeat');
    assert.equal(spidersIn(draw()).length, 2, 'frozen and still drawn behind the card');
    const z = game.enemies.map((e) => e.z);
    run(game, 2);
    assert.deepEqual(game.enemies.map((e) => e.z), z);
    game.restart();
    assert.equal(spidersIn(draw()).length, 0);
  });
});

describe('7. sizes', () => {
  const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
  test('spider.js, effects.js and the tests are under 200 lines; the game files grew by at most 12', () => {
    for (const path of ['src/view/models/spider.js', 'src/logic/effects.js', 'src/levels/level-3.js', 'test/spiders.test.js', 'test/spiders-model.test.js', 'test/spiders-gait.test.js', 'test/spiders-view.test.js']) {
      assert.ok(lines(path) < 200, `${path}: ${lines(path)}`);
    }
    assert.ok(lines('src/logic/game-enemies.js') <= 101 + 12);
    assert.ok(lines('src/logic/game-time.js') <= 115 + 12);
    assert.ok(lines('src/logic/game-waves.js') <= 71 + 12);
  });
});
