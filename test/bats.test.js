// Spec 32: the bat, a second flyer next to the crow: its data, its flight, its fall, its waves, and the balance bounds.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { level3 } from '../src/levels/level-3.js';
import { BURSTS } from '../src/logic/effects.js';
import { crowAt } from '../src/logic/game.js';
import { run, kill } from './helpers.js';
import { started, sendWave } from './fast-helpers.js';

const B = level3.enemies.bat;
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);
const batGame = (options = {}) => started(level3, { waves: [{ bat: 1 }], random: () => 0.5, ...options });

describe('1. a bat circles, dives and flies away', () => {
  test('its data, the same shape as the crow\'s', () => {
    assert.deepEqual(B, { hits: 1, points: 75, z: -6, height: 3, circle: 1.2, dive: 0.6, splash: 1, leave: 1.2 });
    assert.deepEqual(Object.keys(B), Object.keys(level3.enemies.crow));
    const game = batGame();
    assert.deepEqual([game.enemies[0].kind, game.enemies[0].health, game.enemies[0].z, game.enemies[0].timer], ['bat', 1, -6, 1.2]);
  });

  test('it circles 1.2 seconds, dives at the player\'s x then and lands 0.6 seconds later', () => {
    const game = batGame();
    const bat = game.enemies[0];
    game.player.x = 3;
    run(game, 1.19);
    assert.equal(bat.diveX, null);
    game.player.x = 3.4; // it dives at where the player is when the circling ends
    run(game, 0.01);
    assert.equal(bat.diveX, 3.4);
    game.player.x = 7; // moving away after the dive begins changes nothing
    run(game, 0.59);
    assert.ok(game.enemies.includes(bat));
    run(game, 0.01);
    assert.ok(!game.enemies.includes(bat));
  });

  test('it flies in from the backdrop, circles at height 3 and comes down to the road', () => {
    const game = batGame();
    const bat = game.enemies[0];
    near(crowAt(bat, game.level).y, 6);
    run(game, 0.9);
    near(crowAt(bat, game.level).y, 3);
    run(game, 0.3); // dive begins
    near(crowAt(bat, game.level).y, 3);
    run(game, 0.3); // halfway down
    const mid = crowAt(bat, game.level);
    near(mid.y, 1.75);
    near(mid.z, bat.z + (level3.roadZ - bat.z) / 2);
  });

  test('a hit costs 1 heart within 1 unit of the landing, nothing farther', () => {
    for (const [after, cost] of [[3.4, 1], [4.4, 1], [3.4 + 1.01, 0], [0, 0]]) {
      const game = batGame();
      game.player.x = 3.4;
      run(game, 1.2);
      game.player.x = after;
      run(game, 0.6);
      assert.equal(999 - game.player.hearts, cost, `player at ${after}`);
    }
  });

  test('a dodge when it lands takes no damage', () => {
    const still = batGame({ random: () => 1 }); // over x = 8, the edge: the roll cannot carry the player away
    const dodging = batGame({ random: () => 1 });
    for (const game of [still, dodging]) {
      game.player.x = 8;
      run(game, 1.5);
    }
    assert.ok(dodging.dodge());
    run(still, 0.3);
    run(dodging, 0.3);
    assert.equal(dodging.player.x, 8);
    assert.equal(still.player.hearts, 998);
    assert.equal(dodging.player.hearts, 999);
  });

  test('hit or miss, it flies away for 1.2 seconds as a drawing only, and it counts as cleared at its landing', () => {
    for (const after of [0, 7]) {
      const game = batGame();
      run(game, 1.2);
      game.player.x = after;
      run(game, 0.6);
      assert.equal(game.enemies.length, 0);
      assert.equal(game.snapshot().enemies, 0);
      assert.deepEqual(game.flyaways.map((f) => f.kind), ['bat']);
      assert.equal(game.phase, 'cleared');
      assert.equal(game.banner, 'Wave 1 cleared');
      run(game, 1.19);
      assert.equal(game.flyaways.length, 1);
      const hearts = game.player.hearts;
      run(game, 0.01);
      assert.equal(game.flyaways.length, 0);
      assert.equal(game.player.hearts, hearts, 'the leaving bat does nothing');
    }
  });
});

describe('2. it falls after 1 hit; a crow is as before', () => {
  test('a bat falls after 1 hit for 75 points, circling or diving, and bursts with BURSTS.bat where it is drawn', () => {
    for (const at of [0.9, 1.5]) {
      const game = batGame();
      run(game, at);
      const bat = game.enemies[0];
      const where = crowAt(bat, game.level);
      kill(game, bat);
      assert.equal(game.enemies.length, 0);
      assert.equal(game.flyaways.length, 0);
      assert.equal(game.score, 75);
      assert.equal(game.effects.chunks.length, BURSTS.bat.count);
      assert.deepEqual(game.effects.chunks[0].pos, where);
      assert.deepEqual(game.effects.puffs.map((p) => [p.color, p.size, p.pos]), [['#3a2a4a', 1, where]]);
      for (const c of game.effects.chunks) assert.ok(BURSTS.bat.colors.includes(c.color));
    }
    assert.deepEqual(BURSTS.bat, { count: 10, life: 1, size: 0.14, colors: ['#2b1b3a', '#5a3f6b', '#ff2a1a'], puff: '#3a2a4a', puffSize: 1 });
  });

  test('a fallen bat under reduced motion fades from its own height', () => {
    const game = batGame({ reducedMotion: true });
    run(game, 0.9);
    kill(game, game.enemies[0]);
    assert.equal(game.effects.chunks.length, 0);
    assert.equal(game.effects.fades.length, 1);
    assert.deepEqual([game.effects.fades[0].kind, game.effects.fades[0].y], ['bat', 3]);
  });

  test('a crow circles 2 seconds, dives 1 second, flies away 1.5 and is worth 50 points, on its own numbers', () => {
    const game = started(level3, { waves: [{ crow: 1 }], random: () => 0.5 });
    const crow = game.enemies[0];
    run(game, 1.99);
    assert.equal(crow.diveX, null);
    run(game, 0.01);
    assert.equal(crow.diveX, 0);
    run(game, 0.99);
    assert.ok(game.enemies.includes(crow));
    run(game, 0.01);
    assert.equal(game.enemies.length, 0);
    assert.deepEqual(game.flyaways.map((f) => f.kind), ['crow']);
    run(game, 1.49);
    assert.equal(game.flyaways.length, 1);
    run(game, 0.01);
    assert.equal(game.flyaways.length, 0);
    const other = started(level3, { waves: [{ crow: 1 }], random: () => 0.5 });
    kill(other, other.enemies[0]);
    assert.equal(other.score, 50);
  });

  test('crows and bats fly together, each on its own numbers', () => {
    const game = started(level3, { waves: [{ crow: 1, bat: 1 }], random: () => 0.5, spacing: 0 });
    const [crow, bat] = game.enemies;
    run(game, 1.2);
    assert.equal(bat.diveX, 0);
    assert.equal(crow.diveX, null);
    run(game, 0.6);
    assert.deepEqual([game.enemies.map((e) => e.kind), game.flyaways.map((f) => f.kind)], [['crow'], ['bat']]);
  });
});

describe('3. level 3\'s waves gain bats', () => {
  test('0, 1, 2, 2 and 3 bats, last in each wave, a second after the crows', () => {
    const game = started(level3);
    [0, 1, 2, 2, 3].forEach((bats, i) => {
      const wave = sendWave(game, i + 1).map((e) => e.kind);
      assert.equal(wave.filter((k) => k === 'bat').length, bats, `wave ${i + 1}`);
      assert.equal(wave.at(-1), bats ? 'bat' : 'crow', `wave ${i + 1}`);
      assert.deepEqual(wave.slice(0, wave.length - bats), wave.filter((k) => k !== 'bat'));
    });
  });

  test('a wave is cleared when its last bat has landed, and the leaving one is a drawing only', () => {
    const game = started(level3, { waves: [{ bat: 2 }], random: () => 0.5 });
    run(game, 2.79); // the second bat came in a second after the first
    assert.equal(game.enemies.length, 1);
    assert.equal(game.phase, 'wave');
    run(game, 0.01);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.phase, 'cleared');
    assert.equal(game.flyaways.length, 2);
  });

  test('get_state counts bats', () => {
    const game = started(level3, { waves: [{ bat: 3 }], random: () => 0.5 });
    assert.equal(game.snapshot().enemies, 1);
    run(game, 1.5);
    assert.equal(game.snapshot().enemies, 2);
    run(game, 0.4); // the first has landed: no longer an enemy
    assert.equal(game.snapshot().enemies, 1);
  });
});
