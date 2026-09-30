// Spec 29: the spider's walk, its fall, and level 3's waves.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';
import { BURSTS } from '../src/logic/effects.js';
import { run } from './helpers.js';
import { started, sendWave, arrival, near } from './fast-helpers.js';

const S = level3.enemies.spider;
const cues = (game, name) => game.cues.filter((c) => c.name === name).length;

// A game of level 3 with one spider (x = 0 for random 0.5, x = 8 for 1), and that spider.
function oneSpider(random = () => 0.5) {
  const game = started(level3, { waves: [{ spider: 1 }], random });
  return { game, spider: game.enemies[0] };
}

describe('1. a spider walks straight to the road, closes in and strikes', () => {
  test('its data', () => {
    assert.deepEqual(S, { hits: 2, points: 150, speed: 2.2, reach: 1.2, closeIn: 0.8, strikeEvery: 1.2 });
    const { spider } = oneSpider();
    assert.equal(spider.kind, 'spider');
    assert.equal(spider.health, 2);
    assert.equal(spider.strike, 1.2);
    assert.equal(spider.z, -12);
  });

  test('12 units to the road in about 5.45 seconds, in a straight line', () => {
    const { game, spider } = oneSpider(() => 1);
    const x = spider.x;
    let took = 0;
    while (spider.z < game.level.roadZ - 1e-6 && took < 30) {
      game.update(0.01);
      took += 0.01;
      if (spider.z < game.level.roadZ - 1e-6) assert.equal(spider.x, x);
    }
    assert.ok(Math.abs(took - 12 / 2.2) <= 0.1, `arrived after ${took}`);
    assert.equal(game.player.hearts, 999, 'no strike before the road');
  });

  test('on the road it strikes every 1.2 seconds while within reach, and makes no groan', () => {
    const { game, spider } = oneSpider();
    arrival(game, spider);
    assert.equal(spider.x, game.player.x);
    run(game, 1.15);
    assert.equal(game.player.hearts, 999);
    run(game, 0.1);
    assert.equal(game.player.hearts, 998);
    run(game, 1.1);
    assert.equal(game.player.hearts, 998);
    run(game, 0.1);
    assert.equal(game.player.hearts, 997);
    assert.equal(cues(game, 'groan'), 0);
    assert.equal(cues(game, 'hurt'), 2);
  });

  test('it closes in to 0.8 of the player, and strikes 1.2 seconds after coming within 1.2', () => {
    const { game, spider } = oneSpider(() => 1);
    const gap = spider.x - game.player.x;
    arrival(game, spider);
    const wait = (gap - S.reach) / S.speed + S.strikeEvery;
    run(game, wait - 0.1);
    assert.equal(game.player.hearts, 999);
    run(game, 0.2);
    assert.equal(game.player.hearts, 998);
    run(game, 3);
    near(Math.abs(spider.x - game.player.x), S.closeIn, 1e-6);
  });

  test('it strikes only within reach of the player', () => {
    const { game, spider } = oneSpider();
    arrival(game, spider);
    game.player.x = 3;
    run(game, 0.05); // the spider starts closing in from 3 away
    run(game, 0.8);
    assert.equal(game.player.hearts, 999);
    assert.ok(Math.abs(spider.x - game.player.x) < 3);
  });
});

describe('2. fences hold zombies, not spiders', () => {
  const fenced = { ...level2, enemies: { ...level2.enemies, spider: S } };

  test('in level 2\'s fences a spider goes straight to the road while the zombie is still held', () => {
    const game = started(fenced, { waves: [{ zombie: 1, spider: 1 }], random: () => 0, spacing: 0 });
    const [zombie, spider] = game.enemies;
    assert.deepEqual([zombie.kind, spider.kind, zombie.x, spider.x], ['zombie', 'spider', -8, -8]);
    let moved = false;
    for (let t = 0; t < 560; t++) {
      game.update(0.01);
      if (spider.z < 0) assert.equal(spider.x, -8); // on the road it closes in on the player
      moved ||= zombie.x !== -8;
    }
    assert.equal(spider.z, 0);
    assert.ok(moved && zombie.z < -2, `the zombie was led to a gap and is at z = ${zombie.z}`);
  });

  test('a zombie walks, groans and strikes as it did', () => {
    const game = started(level3, { waves: [{ zombie: 1 }], random: () => 0.5 });
    const zombie = game.enemies[0];
    const took = arrival(game, zombie);
    assert.ok(Math.abs(took - 10) <= 0.05, `arrived after ${took}`);
    assert.equal(cues(game, 'groan'), 1);
    run(game, 1.45);
    assert.equal(game.player.hearts, 999);
    run(game, 0.1);
    assert.equal(game.player.hearts, 998);
  });
});

describe('3. a spider falls after 2 hits', () => {
  test('150 points and a burst in its own colours', () => {
    const { game, spider } = oneSpider();
    const score = game.score;
    game.setAim(spider.id);
    game.shoot();
    assert.equal(spider.health, 1);
    assert.equal(game.enemies.length, 1);
    game.shoot();
    assert.equal(game.enemies.length, 0);
    assert.equal(game.score, score + 150);
    const b = BURSTS.spider;
    assert.deepEqual(b, { count: 10, life: 1, size: 0.14, colors: ['#2a1f2e', '#3a2c3f', '#c0182b'], puff: '#3a2c3f', puffSize: 1 });
    assert.equal(game.effects.chunks.length, 10);
    assert.deepEqual([...new Set(game.effects.chunks.map((c) => c.color))].sort(), [...b.colors].sort());
    assert.deepEqual(game.effects.puffs.map((p) => p.color), ['#3a2c3f']);
    // It bursts where its body is, 0.3 up, not a zombie's 1.
    assert.ok(game.effects.chunks.every((c) => c.pos.y === 0.3 && c.pos.x === spider.x && c.pos.z === spider.z));
    assert.ok(game.effects.puffs.every((p) => p.pos.y === 0.3));
    assert.equal(game.snapshot().enemies, 0);
  });

  test('get_state counts spiders', () => {
    const game = started(level3, { waves: [{ zombie: 1, spider: 2 }], spacing: 0 });
    assert.equal(game.snapshot().enemies, 3);
  });
});

describe('4. level 3\'s waves', () => {
  test('the counts and the order', () => {
    const expected = [[4, 2, 0, 1], [5, 3, 0, 2], [5, 3, 1, 2], [6, 4, 2, 3], [6, 5, 2, 3]];
    const game = started(level3);
    expected.forEach(([zombie, spider, pumpkinMonster, crow], i) => {
      const kinds = [['zombie', zombie], ['spider', spider], ['pumpkinMonster', pumpkinMonster], ['crow', crow]].flatMap(([k, n]) => Array(n).fill(k));
      assert.deepEqual(sendWave(game, i + 1).map((e) => e.kind), kinds, `wave ${i + 1}`);
    });
  });

  test('the fast rule counts zombies only', () => {
    const game = started(level3);
    for (let n = 1; n <= 5; n++) {
      const wave = sendWave(game, n);
      const zombies = wave.filter((e) => e.kind === 'zombie');
      assert.deepEqual(zombies.map((z) => z.fast), zombies.map((_, i) => n >= 2 && i === 3), `wave ${n}`);
      assert.ok(wave.filter((e) => e.kind !== 'zombie').every((e) => !e.fast), `wave ${n}`);
    }
  });
});

describe('a paused game and a fresh start', () => {
  test('paused, a spider stands still and goes on from there', () => {
    const { game, spider } = oneSpider();
    run(game, 2);
    const z = spider.z;
    game.pressEsc();
    run(game, 3);
    assert.equal(spider.z, z);
    game.pressEsc();
    run(game, 1);
    near(spider.z, z + 2.2, 1e-6);
  });

  test('after defeat, Try again starts with no spiders', () => {
    const { game, spider } = oneSpider();
    arrival(game, spider);
    game.player.hearts = 1;
    run(game, 1.3);
    assert.equal(game.screen, 'defeat');
    game.restart();
    assert.deepEqual(game.enemies, []);
  });
});
