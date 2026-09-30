// Spec 32: the stage drawing bats (against test/fake-three.js), and the sizes.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { level3 } from '../src/levels/level-3.js';
import { BURSTS } from '../src/logic/effects.js';
import { run, kill, click } from './helpers.js';
import { started } from './fast-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

const all = (root, test) => { const found = []; root.traverse((o) => { if (test(o)) found.push(o); }); return found; };
const named = (root, name) => all(root, (o) => o.name === name);
const close = (a, b, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} ≈ ${b}`);

describe('4. the stage', () => {
  function stageFor(game) {
    const stage = createStage({ appendChild() {} }, game.level);
    const renderer = THREE.renderers.at(-1);
    const draw = () => {
      stage.sync(game, 0.01);
      return renderer.scene;
    };
    return { stage, draw };
  }
  const batsIn = (scene) => scene.children.filter((c) => c.name === 'bat');
  const batGame = (options = {}) => started(level3, { waves: [{ bat: 1 }], random: () => 0.5, ...options });

  test('a bat is built, circles at height 3, dives at the road and flies away as a drawing only', () => {
    const game = batGame();
    const { stage, draw } = stageFor(game);
    run(game, 1);
    let [bat] = batsIn(draw());
    assert.equal(batsIn(draw()).length, 1);
    close(bat.position.y, level3.enemies.bat.height);
    assert.equal(bat.userData.entityId, game.enemies[0].id);
    assert.equal(stage.pick({ x: 0, y: 0 }), game.enemies[0].id, 'its meshes are aimed at');

    run(game, 0.5); // diving
    [bat] = batsIn(draw());
    assert.ok(bat.position.y > 0.5 && bat.position.y < 3);
    assert.ok(bat.position.z > level3.enemies.bat.z && bat.position.z < 0);

    run(game, 0.3); // landed and turned away
    assert.equal(game.enemies.length, 0);
    assert.equal(batsIn(draw()).length, 1);
    assert.equal(stage.pick({ x: 0, y: 0 }), null, 'a leaving bat is no target');
    run(game, 0.6);
    assert.ok(batsIn(draw())[0].position.y > 3);
    run(game, 0.6);
    assert.equal(batsIn(draw()).length, 0);
  });

  test('a fallen bat bursts into BURSTS.bat chunks', () => {
    const game = batGame();
    const { draw } = stageFor(game);
    run(game, 1);
    draw();
    kill(game, game.enemies[0]);
    const scene = draw();
    assert.equal(batsIn(scene).length, 0);
    assert.equal(scene.children.filter((c) => c.name === 'chunk').length, BURSTS.bat.count);
  });

  test('with reduced motion a fallen bat fades out as the same model, and its wings beat the same', () => {
    const game = batGame({ reducedMotion: true });
    const { draw } = stageFor(game);
    run(game, 1);
    const [alive] = batsIn(draw());
    const shape = (root) => all(root, () => true).length;
    const wings = (root) => named(root, 'wing').map((w) => w.rotation.z);
    assert.ok(wings(alive).some((angle) => angle !== 0));
    const full = batGame();
    const other = stageFor(full);
    run(full, 1);
    assert.deepEqual(wings(batsIn(other.draw())[0]), wings(alive), 'the same as without reduced motion');
    kill(game, game.enemies[0]);
    const scene = draw();
    assert.equal(scene.children.filter((c) => c.name === 'chunk').length, 0);
    const fades = scene.children.filter((c) => c.name === 'fade');
    assert.equal(fades.length, 1);
    assert.equal(shape(fades[0]), shape(alive));
    assert.equal(named(fades[0], 'eye').length, 2);
  });

  test('paused, a bat hangs still, drawn, and goes on from there', () => {
    const game = batGame();
    const { draw } = stageFor(game);
    run(game, 0.5);
    const at = () => { const [b] = batsIn(draw()); return [b.position.x, b.position.y, b.position.z, ...named(b, 'wing').map((w) => w.rotation.z)]; };
    const before = at();
    game.pressEsc();
    run(game, 2);
    assert.deepEqual(at(), before);
    game.pressEsc();
    run(game, 0.5);
    assert.notDeepEqual(at(), before);
    assert.equal(game.enemies.length, 1);
  });

  test('defeat freezes a bat in the air, still drawn; Try again and a level start begin with none', () => {
    const game = batGame();
    const { draw } = stageFor(game);
    run(game, 1);
    game.end('defeat');
    const [frozen] = batsIn(draw());
    const y = frozen.position.y;
    run(game, 2);
    assert.equal(batsIn(draw()).length, 1);
    assert.equal(batsIn(draw())[0].position.y, y);
    assert.equal(game.enemies.length, 1);
    game.restart();
    assert.equal(batsIn(draw()).length, 0);
    click(game); // skips the intro card
    run(game, 1);
    assert.equal(batsIn(draw()).length, 1);
    game.begin(game.level, 0);
    assert.equal(batsIn(draw()).length, 0);
  });
});

describe('7. sizes', () => {
  const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
  test('the new files are under 200 lines; the game files grew by at most 10', () => {
    const files = ['src/view/models/bat.js', 'src/logic/effects.js', 'src/levels/level-3.js', 'test/bats.test.js', 'test/bats-fresh.test.js', 'test/bats-model.test.js', 'test/bats-view.test.js'];
    for (const path of files) assert.ok(lines(path) < 200, `${path}: ${lines(path)}`);
    assert.ok(lines('src/logic/game-enemies.js') <= 113 + 10);
    assert.ok(lines('src/logic/game-time.js') <= 115 + 10);
    assert.ok(lines('src/logic/game-waves.js') <= 82 + 10);
    assert.ok(lines('src/logic/game-outcome.js') <= 96 + 10);
  });

  test('the stage table has the bat, and llms.txt says level 3 has bats', () => {
    assert.match(readFileSync(new URL('../src/view/stage.js', import.meta.url), 'utf8'), /\bbat: \(e\) => buildBat/);
    assert.match(readFileSync(new URL('../llms.txt', import.meta.url), 'utf8'), /crows and bats through a webbed twilight forest/);
  });
});
