// Spec 31: the wolf's run, its strike, its fall, level 3's waves, and the balance bounds in the data.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';
import { BURSTS } from '../src/logic/effects.js';
import { run } from './helpers.js';
import { started, sendWave, arrival, near } from './fast-helpers.js';

const W = level3.enemies.wolf;
const cues = (game, name) => game.cues.filter((c) => c.name === name).length;

// A game of level 3 with one wolf (x = 0 for random 0.5, x = 8 for 1), and that wolf.
function oneWolf(random = () => 0.5, level = level3) {
  const game = started(level, { waves: [{ wolf: 1 }], random });
  return { game, wolf: game.enemies[0] };
}

describe('1. a wolf runs straight to the road, closes in and strikes 2 hearts', () => {
  test('its data', () => {
    assert.deepEqual(W, { hits: 4, points: 200, speed: 3, reach: 1.6, closeIn: 1, strikeEvery: 1.5, hearts: 2 });
    const { wolf } = oneWolf();
    assert.equal(wolf.kind, 'wolf');
    assert.equal(wolf.health, 4);
    assert.equal(wolf.strike, 1.5);
    assert.equal(wolf.z, -12);
    assert.equal(wolf.fast, undefined);
  });

  test('12 units to the road in 4 seconds, in a straight line', () => {
    const { game, wolf } = oneWolf(() => 1);
    const x = wolf.x;
    let took = 0;
    while (wolf.z < game.level.roadZ - 1e-6 && took < 30) {
      game.update(0.01);
      took += 0.01;
      if (wolf.z < game.level.roadZ - 1e-6) assert.equal(wolf.x, x);
    }
    assert.ok(Math.abs(took - 4) <= 0.1, `arrived after ${took}`);
    assert.equal(game.player.hearts, 999, 'no strike before the road');
  });

  test('on the road it strikes 2 hearts every 1.5 seconds within reach, and makes no groan', () => {
    const { game, wolf } = oneWolf();
    arrival(game, wolf);
    assert.equal(wolf.x, game.player.x);
    run(game, 1.45);
    assert.equal(game.player.hearts, 999);
    run(game, 0.1);
    assert.equal(game.player.hearts, 997);
    run(game, 1.4);
    assert.equal(game.player.hearts, 997);
    run(game, 0.1);
    assert.equal(game.player.hearts, 995);
    assert.equal(cues(game, 'groan'), 0);
    assert.equal(cues(game, 'hurt'), 2);
  });

  test('it closes in to 1 of the player, and strikes 1.5 seconds after coming within 1.6', () => {
    const { game, wolf } = oneWolf(() => 1);
    const gap = wolf.x - game.player.x;
    arrival(game, wolf);
    const wait = (gap - W.reach) / W.speed + W.strikeEvery;
    run(game, wait - 0.1);
    assert.equal(game.player.hearts, 999);
    run(game, 0.2);
    assert.equal(game.player.hearts, 997);
    run(game, 0.5);
    near(Math.abs(wolf.x - game.player.x), W.closeIn, 1e-6);
  });

  test('it strikes only within reach of the player', () => {
    const { game, wolf } = oneWolf();
    arrival(game, wolf);
    game.player.x = 5;
    run(game, 0.05);
    run(game, 1);
    assert.equal(game.player.hearts, 999);
    assert.ok(Math.abs(wolf.x - game.player.x) < 5);
  });

  test('a zombie\'s strike is still 1 heart, and a spider\'s', () => {
    for (const [kind, every] of [['zombie', 1.5], ['spider', 1.2]]) {
      const game = started(level3, { waves: [{ [kind]: 1 }], random: () => 0.5 });
      arrival(game, game.enemies[0]);
      run(game, every + 0.05);
      assert.equal(game.player.hearts, 998, kind);
    }
  });

  test('a strike that takes the last hearts ends the game', () => {
    const { game, wolf } = oneWolf();
    arrival(game, wolf);
    game.player.hearts = 2;
    run(game, 1.6);
    assert.equal(game.player.hearts, 0);
    assert.equal(game.screen, 'defeat');
  });
});

describe('2. fences hold a wolf as a zombie, and level 3 has none', () => {
  const fenced = { ...level2, enemies: { ...level2.enemies, wolf: W } };

  test('in level 2\'s fences a wolf is led to a gap, at its own speed, and level 3 runs it straight', () => {
    const game = started(fenced, { waves: [{ wolf: 1 }], random: () => 0 });
    const [wolf] = game.enemies;
    assert.deepEqual([wolf.kind, wolf.x], ['wolf', -8]);
    let moved = false;
    let speed = 0;
    for (let t = 0; t < 1200; t++) {
      const [x, z] = [wolf.x, wolf.z];
      game.update(0.01);
      if (wolf.z < 0 && wolf.x !== -8) moved = true;
      speed = Math.max(speed, Math.hypot(wolf.x - x, wolf.z - z) / 0.01);
    }
    assert.ok(moved, 'led to a gap');
    assert.equal(wolf.z, 0);
    assert.ok(speed <= W.speed + 1e-6 && speed >= W.speed - 1e-6, `speed ${speed}`);
    assert.equal(cues(game, 'groan'), 0);

    const free = oneWolf(() => 0, level3);
    const x = free.wolf.x;
    arrival(free.game, free.wolf);
    assert.equal(free.wolf.x, x);
    assert.equal(level3.scenery.some((s) => s.model === 'fence'), false);
  });

  test('a wolf has no fast rule and no groan', () => {
    assert.equal(W.fast, undefined);
    const game = started(level3, { waves: [{ wolf: 4 }], spacing: 0 });
    assert.ok(game.enemies.every((e) => e.fast === undefined));
    run(game, 5);
    assert.equal(cues(game, 'groan'), 0);
  });
});

describe('3. a wolf falls after 4 hits', () => {
  test('200 points and a burst in its own colours', () => {
    const { game, wolf } = oneWolf();
    const score = game.score;
    game.setAim(wolf.id);
    for (let i = 1; i <= 3; i++) {
      game.shoot();
      assert.equal(wolf.health, 4 - i);
      assert.equal(game.enemies.length, 1);
    }
    game.shoot();
    assert.equal(game.enemies.length, 0);
    assert.equal(game.score, score + 200);
    const b = BURSTS.wolf;
    assert.deepEqual(b, { count: 12, life: 1, size: 0.18, colors: ['#6e6e78', '#9a9aa4', '#5a5a64'], puff: '#8a8a94', puffSize: 1 });
    assert.equal(game.effects.chunks.length, 12);
    assert.deepEqual([...new Set(game.effects.chunks.map((c) => c.color))].sort(), [...b.colors].sort());
    assert.deepEqual(game.effects.puffs.map((p) => p.color), ['#8a8a94']);
    assert.equal(game.snapshot().enemies, 0);
  });

  test('get_state counts wolves', () => {
    const game = started(level3, { waves: [{ zombie: 1, wolf: 2 }], spacing: 0 });
    assert.equal(game.snapshot().enemies, 3);
  });
});

describe('4. level 3\'s waves gain wolves', () => {
  test('0, 0, 1, 2 and 2, after the spiders and before the pumpkin monsters, a second apart', () => {
    const game = started(level3);
    [0, 0, 1, 2, 2].forEach((wolves, i) => {
      const wave = sendWave(game, i + 1).map((e) => e.kind);
      assert.equal(wave.filter((k) => k === 'wolf').length, wolves, `wave ${i + 1}`);
      if (wolves) {
        assert.equal(wave.indexOf('wolf'), wave.lastIndexOf('spider') + 1, `wave ${i + 1}`);
        assert.equal(wave[wave.lastIndexOf('wolf') + 1] === 'crow' || wave[wave.lastIndexOf('wolf') + 1] === 'pumpkinMonster', true);
      }
    });
    assert.equal(level3.timing.spacing, 1);
  });

  test('the boss fight has no wolves: the Zombie King summons zombies', () => {
    assert.equal(level3.boss.summons, 'zombie');
  });
});
