// Spec 33: the stage drawing the Queen and her web ball on every screen (against test/fake-three.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { run, kill } from './helpers.js';
import { fight, untilSpit } from './spider-queen-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

const named = (scene, name) => scene.children.filter((c) => c.name === name);

// A stage over `game`, and a way to draw a frame.
function stageFor(game) {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  const draw = () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
  return { stage, draw };
}
const at = (o) => [o.position.x, o.position.y, o.position.z];

describe('the stage: the Queen', () => {
  test('she is built through the BOSSES table, and her front legs rise as she winds up', () => {
    const game = fight();
    const { draw } = stageFor(game);
    const [queen] = named(draw(), 'spiderQueen');
    assert.ok(queen);
    assert.equal(queen.scale.x, 3.2);
    assert.deepEqual(at(queen), [0, 0, game.enemies[0].z]);
    const front = () => {
      const legs = [];
      queen.traverse((o) => { if (o.name === 'leg') legs.push(o.rotation.x); });
      return [legs[0], legs[4]];
    };
    assert.deepEqual(front(), [0, 0]);
    run(game, 1.7); // 0.3 s into the wind-up of 0.6
    draw();
    assert.ok(front().every((x) => x < -0.4 && x > -0.6), `${front()}`);
  });

  test('her legs swing while she walks in and are still once she stands', () => {
    const game = fight();
    game.player.hearts = 999;
    const { draw } = stageFor(game);
    const swing = () => {
      const [queen] = named(draw(), 'spiderQueen');
      const turns = [];
      queen.traverse((o) => { if (o.name === 'leg') turns.push(o.rotation.y); });
      return turns;
    };
    run(game, 1);
    assert.ok(game.enemies[0].z < -3.5);
    assert.ok(swing().some((y) => y !== 0), 'walking in');
    run(game, 6.2);
    assert.equal(game.enemies[0].z, -3.5);
    for (let i = 0; i < 3; i++) {
      assert.ok(swing().every((y) => y === 0), 'standing');
      run(game, 0.03);
    }
  });

  test('a web ball is drawn as a ball with a thread behind it; the ball takes a shot, the thread does not', () => {
    const game = fight();
    const { stage, draw } = stageFor(game);
    const ball = untilSpit(game);
    run(game, 0.5);
    const scene = draw();
    const [drawn] = named(scene, 'webBall');
    const [thread] = named(scene, 'webThread');
    assert.deepEqual(drawn.geometry.params, [0.25, 1]);
    assert.equal(named(scene, 'pumpkin').length, 0);
    assert.ok(Math.abs(thread.scale.z - 0.6) < 1e-9);
    assert.ok(thread.position.z < drawn.position.z, 'it trails behind, toward the thrower');
    game.enemies = [];
    draw();
    assert.equal(stage.pick({ x: 0, y: 0 }), ball.id);
  });

  test('a web ball landing, or shot down, bursts into 10 pale chunks', () => {
    for (const shot of [false, true]) {
      const game = fight();
      const ball = untilSpit(game);
      if (shot) {
        game.setAim(ball.id);
        game.shoot();
      } else {
        run(game, 1.2);
      }
      assert.equal(game.pumpkins.length, 0);
      assert.equal(game.effects.chunks.length, 10);
      assert.ok(game.effects.chunks.every((c) => c.color === '#d8e0ea' && c.size === 0.16 && c.life === 0.8));
    }
  });

  test('paused, she, her web ball and her spiders freeze and stay drawn; they go on after', () => {
    const game = fight();
    game.player.hearts = 999;
    const { draw } = stageFor(game);
    game.spawn('spider');
    untilSpit(game);
    run(game, 0.5);
    game.pressEsc();
    const before = draw();
    const frozen = ['spiderQueen', 'webBall', 'webThread', 'spider'].map((n) => at(named(before, n)[0]));
    run(game, 3);
    const after = draw();
    assert.deepEqual(['spiderQueen', 'webBall', 'webThread', 'spider'].map((n) => at(named(after, n)[0])), frozen);
    game.pressEsc();
    run(game, 0.3);
    assert.notDeepEqual(at(named(draw(), 'webBall')[0]), frozen[1]);
  });

  test('on the victory card the field is empty: no queen, web ball or spider', () => {
    const game = fight();
    game.spawn('spider');
    run(game, 2.5);
    const { draw } = stageFor(game);
    assert.equal(named(draw(), 'webBall').length, 1);
    kill(game, game.enemies.find((e) => e.kind === 'boss'));
    run(game, 1.6);
    assert.equal(game.screen, 'victory');
    const scene = draw();
    for (const n of ['spiderQueen', 'webBall', 'webThread', 'spider']) assert.equal(named(scene, n).length, 0, n);
  });

  test('on the defeat card the scene freezes as it is: the Queen, the web ball and the spiders stay drawn', () => {
    const game = fight();
    game.spawn('spider');
    const { draw } = stageFor(game);
    untilSpit(game);
    game.end('defeat');
    const first = draw();
    const frozen = ['spiderQueen', 'webBall', 'spider'].map((n) => at(named(first, n)[0]));
    run(game, 2);
    const later = draw();
    assert.deepEqual(['spiderQueen', 'webBall', 'spider'].map((n) => at(named(later, n)[0])), frozen);
  });

  test('Try again and a level start begin with none', () => {
    const game = fight();
    const { draw } = stageFor(game);
    untilSpit(game);
    game.end('defeat');
    assert.equal(named(draw(), 'spiderQueen').length, 1);
    game.restart();
    for (const n of ['spiderQueen', 'webBall', 'webThread']) assert.equal(named(draw(), n).length, 0, n);
  });
});

describe('sizes', () => {
  test('the new files are under 200 lines and the old ones grew by little', async () => {
    const { readFileSync } = await import('node:fs');
    const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
    for (const path of ['src/view/models/spider-queen.js', 'src/view/models/spider.js', 'src/view/models/web-ball.js', 'src/view/web-shell.js', 'src/logic/game-boss.js', 'src/logic/effects.js']) {
      assert.ok(lines(path) < 200, `${path}: ${lines(path)}`);
    }
    for (const path of ['test/spider-queen.test.js', 'test/spider-queen-web.test.js', 'test/spider-queen-model.test.js', 'test/spider-queen-view.test.js', 'test/spider-queen-shell.test.js']) {
      assert.ok(lines(path) < 200, `${path}: ${lines(path)}`);
    }
    assert.ok(lines('src/logic/game-enemies.js') <= 113 + 14);
    assert.ok(lines('src/logic/game-time.js') <= 115 + 14);
    assert.ok(lines('src/logic/game-journey.js') <= 131 + 14);
    assert.ok(lines('src/view/stage.js') <= 166 + 14);
    assert.match(readFileSync(new URL('../src/view/stage.js', import.meta.url), 'utf8'), /spiderQueen: buildSpiderQueen/);
    assert.match(readFileSync(new URL('../llms.txt', import.meta.url), 'utf8'), /Spider Queen, who throws webs that slow the player, and summons spiders/);
  });
});
