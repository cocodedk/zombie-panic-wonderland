// Spec 30: the stage drawing a dropper and its thread (against test/fake-three.js), and the sizes.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';
import { run, kill } from './helpers.js';
import { started, near } from './fast-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');
const { buildThread, placeThread, THREAD } = await import('../src/view/stage-thread.js');

const D = level3.enemies.spider.drop;
const named = (scene, name) => scene.children.filter((c) => c.name === name);
const top = (t) => t.position.y + t.scale.y / 2;
const bottom = (t) => t.position.y - t.scale.y / 2;

// A stage over a game of wave 2 with one hanging dropper at x = 0, z = -5, and a way to draw a frame.
function hangingStage(options = {}) {
  const game = started(level3, { waves: [{ spider: 1 }, { spider: 3 }], random: () => 0.5, spacing: 0, ...options });
  game.enemies = [];
  game.startWave(2);
  const dropper = game.enemies[2];
  game.enemies = [dropper];
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  const draw = () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
  return { game, dropper, stage, draw };
}

describe('4. the stage: a dropper and its thread', () => {
  test('a dropper hangs 5 up at first with a thread of no length from its back to the top at 5.5', () => {
    const { dropper, draw } = hangingStage();
    const scene = draw();
    const [spider] = named(scene, 'spider');
    assert.deepEqual([spider.position.x, spider.position.y, spider.position.z], [0, 5, -5]);
    const [thread] = named(scene, 'thread');
    assert.equal(thread.scale.y, 0);
    assert.equal(bottom(thread), 5.5);
    assert.equal(top(thread), 5.5);
    assert.deepEqual([thread.position.x, thread.position.z], [dropper.x, dropper.z]);
  });

  test('its height follows `drop`, and the thread stays fixed at the top, 5 long by the ground', () => {
    const { game, dropper, draw } = hangingStage();
    for (let step = 1; step < 120; step++) {
      game.update(0.01);
      const scene = draw();
      const root = 5 * (dropper.drop / 1.2);
      const [spider] = named(scene, 'spider');
      const [thread] = named(scene, 'thread');
      near(spider.position.y, root, 1e-9, `step ${step}`);
      near(top(thread), 5.5, 1e-9, `step ${step}`);
      near(bottom(thread), root + 0.5, 1e-9, `step ${step}`);
      near(thread.scale.y, 5 - root, 1e-9, `step ${step}`);
    }
  });

  test('the thread is 5 long at the ground', () => {
    const thread = buildThread();
    placeThread(thread, { x: 1, z: -5, drop: 1e-9 }, D);
    near(thread.scale.y, 5, 1e-6);
    near(top(thread), 5.5, 1e-6);
    assert.deepEqual([thread.position.x, thread.position.z], [1, -5]);
  });

  test('it is a thin, pale, unlit box that ignores rays', () => {
    const thread = named(hangingStage().draw(), 'thread')[0];
    assert.deepEqual(thread.geometry.params, [0.012, 1, 0.012]);
    assert.equal(THREAD.width, 0.012);
    assert.ok(thread.material instanceof THREE.MeshBasicMaterial);
    assert.equal(thread.material.color.getHexString(), 'd8e0ea');
    assert.equal(thread.material.opacity, 0.7);
    assert.equal(thread.material.transparent, true);
    assert.ok(Object.hasOwn(thread, 'raycast'), 'rays pass through it');
  });

  test('a hanging dropper\'s legs and body hang still; landed, it scuttles', () => {
    const { game, draw } = hangingStage();
    const gait = () => { const g = []; named(draw(), 'spider')[0].traverse((o) => { if (o.name === 'leg') g.push(o.rotation.y); if (o.name === 'body') g.push(o.position.y); }); return g; };
    for (let i = 0; i < 100; i++, game.update(0.01)) assert.ok(gait().every((v) => v === 0), 'still while it hangs');
    run(game, 0.5);
    assert.ok(gait().some((v) => v !== 0), 'landed, its legs swing');
  });

  test('the aim finds the dropper in the air, never its thread', () => {
    const { dropper, stage, draw } = hangingStage();
    draw();
    assert.equal(stage.pick({ x: 0, y: 0 }), dropper.id);
  });

  test('the thread is removed in the frame the spider lands, so no frame has both a full thread and a landed spider', () => {
    const { game, dropper, draw } = hangingStage();
    for (let step = 0; step < 130; step++) {
      game.update(0.01);
      const scene = draw();
      const threads = named(scene, 'thread');
      assert.equal(threads.length, dropper.drop === undefined ? 0 : 1, `step ${step}`);
      assert.equal(named(scene, 'spider')[0].position.y, dropper.drop === undefined ? 0 : 5 * (dropper.drop / 1.2), `step ${step}`);
    }
  });

  test('a felled dropper takes its thread with it', () => {
    const { game, dropper, draw } = hangingStage();
    run(game, 0.5);
    assert.equal(named(draw(), 'thread').length, 1);
    kill(game, dropper);
    const scene = draw();
    assert.equal(named(scene, 'thread').length, 0);
    assert.equal(named(scene, 'spider').length, 0);
  });

  test('defeat and victory freeze a hanging dropper and its thread, still drawn behind the card', () => {
    for (const screen of ['defeat', 'victory']) {
      const { game, dropper, draw } = hangingStage();
      run(game, 0.5);
      game.end(screen);
      const drop = dropper.drop;
      run(game, 2);
      assert.equal(dropper.drop, drop);
      const scene = draw();
      assert.equal(named(scene, 'thread').length, 1, screen);
      assert.equal(named(scene, 'spider').length, 1, screen);
    }
  });

  const fresh = {
    'Try again': (g) => { g.end('defeat'); g.restart(); },
    'Play again': (g) => { g.end('victory'); g.restart(); },
    'Next level': (g) => { g.levels = [g.level, level2]; g.end('victory'); g.nextLevel(); },
    'Back to title': (g) => { g.end('victory'); g.toTitle(); },
  };
  for (const [name, act] of Object.entries(fresh)) {
    test(`nothing is left after ${name}`, () => {
      const { game, draw } = hangingStage();
      run(game, 0.5);
      assert.equal(named(draw(), 'thread').length, 1);
      act(game);
      assert.equal(named(draw(), 'thread').length, 0);
      assert.equal(named(draw(), 'spider').length, 0);
    });
  }
});

describe('5. paused, and a fading copy', () => {
  test('paused, a dropper and its thread hang still, drawn, and go on from there', () => {
    const { game, draw } = hangingStage();
    run(game, 0.4);
    const pose = () => {
      const scene = draw();
      const [thread] = named(scene, 'thread');
      return [named(scene, 'spider')[0].position.y, thread.position.y, thread.scale.y];
    };
    const before = pose();
    game.pressEsc();
    run(game, 2);
    assert.deepEqual(pose(), before);
    game.pressEsc();
    run(game, 0.2);
    assert.ok(pose()[0] < before[0]);
  });

  test('under reduced motion a fallen dropper fades out from its root in the air, with no thread', () => {
    const { game, dropper, draw } = hangingStage({ reducedMotion: true });
    run(game, 0.6);
    draw();
    kill(game, dropper);
    run(game, 0.1);
    const scene = draw();
    assert.equal(named(scene, 'thread').length, 0);
    const [fade] = named(scene, 'fade');
    near(fade.position.y, 2.5, 1e-9);
    let threads = 0;
    fade.traverse((o) => { if (o.name === 'thread') threads += 1; });
    assert.equal(threads, 0);
    assert.equal(named(scene, 'chunk').length, 0);
  });
});

describe('6. sizes', () => {
  const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
  test('the files grew by no more than the spec allows, and the new ones are under 200 lines', () => {
    for (const path of ['src/view/stage-thread.js', 'test/dropping-spiders.test.js', 'test/dropping-spiders-view.test.js', 'src/levels/level-3.js']) {
      assert.ok(lines(path) < 200, `${path}: ${lines(path)}`);
    }
    assert.ok(lines('src/logic/game-waves.js') <= 71 + 14);
    assert.ok(lines('src/logic/game-enemies.js') <= 105 + 10);
    assert.ok(lines('src/logic/game-time.js') <= 115);
    assert.ok(lines('src/view/stage-entities.js') <= 76 + 12);
  });
});
