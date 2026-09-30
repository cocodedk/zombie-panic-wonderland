// Spec 18: fast zombies. Which zombies are fast, how they walk, strike and score, and the balance.
// Their look is in fast-zombies-view.test.js; pause, fresh starts and file sizes in fast-zombies-fresh.test.js.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { entryPoint } from '../src/logic/fences.js';
import { run, kill, level1 } from './helpers.js';
import { seeded } from './weather-helpers.js';
import { LEVELS, near, ordinary, started, sendWave, fastAmongFour, arrival } from './fast-helpers.js';

const RULE = { fromWave: 2, every: 4, speedFactor: 1.6, points: 200 };
const TODAY = [[4, 6, 5, 6, 8], [5, 6, 6, 8, 8]]; // each level's zombies in each wave, as they are today
const zombiesOf = (order) => order.filter((e) => e.kind === 'zombie');

describe('1. which zombies are fast', () => {
  test('the rule is data in both levels', () => {
    for (const level of LEVELS) assert.deepEqual(level.enemies.zombie.fast, RULE);
  });

  test('each level owns its rule: changing level 2\'s leaves level 1\'s alone', () => {
    assert.notEqual(LEVELS[1].enemies.zombie.fast, LEVELS[0].enemies.zombie.fast);
    assert.notEqual(LEVELS[1].enemies.zombie, LEVELS[0].enemies.zombie);
    const harder = { ...LEVELS[1], enemies: { ...LEVELS[1].enemies, zombie: { ...LEVELS[1].enemies.zombie, fast: { ...RULE, every: 2 } } } };
    const game = started(harder);
    assert.deepEqual(zombiesOf(sendWave(game, 2)).map((z) => z.fast), [false, true, false, true, false, true]);
    assert.deepEqual(zombiesOf(sendWave(started(LEVELS[0]), 2)).map((z) => z.fast), [false, false, false, true, false, false]);
  });

  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: none in wave 1; from wave 2 exactly the 4th, 8th zombie, counting zombies only`, () => {
      const game = started(level);
      level.waves.forEach((wave, w) => {
        const order = sendWave(game, w + 1);
        const zombies = zombiesOf(order);
        assert.equal(zombies.length, wave.zombie);
        zombies.forEach((z, k) => assert.equal(z.fast, w > 0 && (k + 1) % 4 === 0, `wave ${w + 1}, zombie ${k + 1}`));
        for (const e of order.filter((o) => o.kind !== 'zombie')) assert.equal(e.fast, false, e.kind);
      });
    });
  }

  test('level 1: one fast zombie in waves 2, 3 and 4, two in wave 5', () => {
    const game = started(level1);
    const counts = level1.waves.map((_, w) => zombiesOf(sendWave(game, w + 1)).filter((z) => z.fast).length);
    assert.deepEqual(counts, [0, 1, 1, 1, 2]);
  });

  test('a wave counts its own zombies: the count begins again with each wave', () => {
    const game = started(level1, { waves: [{ zombie: 3 }, { zombie: 3 }, { zombie: 3 }] });
    for (let n = 1; n <= 3; n++) assert.equal(zombiesOf(sendWave(game, n)).some((z) => z.fast), false, `wave ${n}`);
  });

  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: zombies a boss summons are ordinary, even as the 4th`, () => {
      const game = started({ ...level, boss: { ...level.boss, summons: 'zombie' } }); // level 2's boss summons crows
      game.startWave(5);
      game.enemies = [];
      game.queue = [];
      game.sent = 3; // the next zombie sent would be the 4th
      game.spawnBoss();
      run(game, 8);
      const summoned = game.enemies.filter((e) => e.kind !== 'boss');
      assert.ok(summoned.filter((e) => e.kind === 'zombie').length >= 1, 'the boss summoned zombies');
      for (const e of summoned) assert.equal(e.fast, undefined, e.kind);
    });
  }
});

describe('2. the rule is fixed', () => {
  const flags = (seed, level) => {
    const game = started(level, { random: seeded(seed) });
    return level.waves.map((_, w) => sendWave(game, w + 1).map(({ kind, fast }) => [kind, fast]));
  };

  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: two seeds mark the same zombies`, () => {
      assert.deepEqual(flags(1, level), flags(2, level));
    });

    test(`level ${i + 1}: random is called as often as before, and every enemy appears where it did`, () => {
      const play = (l) => {
        let draws = 0;
        const rand = seeded(5);
        const game = started(l, { random: () => { draws += 1; return rand(); } });
        const xs = l.waves.map((_, w) => sendWave(game, w + 1).map((e) => [e.kind, e.x]));
        return { draws, xs };
      };
      const before = play(ordinary(level));
      const now = play(level);
      assert.ok(before.draws > 0);
      assert.deepEqual(now, before);
    });
  }
});

describe('3. how fast they walk', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: a free fast zombie reaches the road in 6.25 seconds, an ordinary one in 10`, () => {
      const { game, zombies, fast } = fastAmongFour(level, () => 0.5);
      assert.equal(fast.fast, true);
      assert.equal(zombies[0].fast, undefined);
      const quick = arrival(game, fast);
      assert.ok(Math.abs(quick - 6.25) <= 0.05, `${quick}`);
      const slow = quick + arrival(game, zombies[0]);
      assert.ok(Math.abs(slow - 10) <= 0.05, `${slow}`);
    });

    test(`level ${i + 1}: one that must shift to a gap moves at 1.92 along its line`, () => {
      const { game, zombies, fast } = fastAmongFour(level, () => 0.25); // x -4, behind a fence
      const from = { x: fast.x, z: fast.z };
      const to = entryPoint(game.level, fast.x);
      game.update(0.1);
      const step = Math.hypot(fast.x - from.x, fast.z - from.z);
      near(step, 0.192, 1e-9, 'fast');
      near(Math.hypot(zombies[0].x - from.x, zombies[0].z - from.z), 0.12, 1e-9, 'ordinary');
      near((fast.x - from.x) / step, (to.x - from.x) / Math.hypot(to.x - from.x, to.z - from.z), 1e-9, 'along the line to the gap');
    });
  }

  test('on the road it closes in at its own speed', () => {
    const { game, fast } = fastAmongFour(level1, () => 0.5);
    arrival(game, fast);
    game.player.x = 6;
    const before = fast.x;
    game.update(0.1);
    near(fast.x - before, 0.192, 1e-9);
  });
});

describe('4. hits, points, reach and rhythm', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: 3 hits, 200 points; an ordinary zombie is worth 100`, () => {
      const { game, fast, zombies } = fastAmongFour(level, () => 0.5);
      assert.equal(fast.health, 3);
      const before = game.score;
      kill(game, fast);
      assert.equal(game.shots, 3);
      assert.equal(game.score, before + 200);
      kill(game, zombies[0]);
      assert.equal(game.score, before + 300);
    });
  }

  // The seconds after `e` reaches the road at which the player loses a heart, up to `seconds`.
  function hurts(game, e, seconds, playerX = 0) {
    arrival(game, e);
    game.player.x = playerX;
    const offsets = [];
    for (let t = 0.01; t <= seconds + 1e-9; t += 0.01) {
      const hearts = game.player.hearts;
      game.update(0.01);
      if (game.player.hearts < hearts) offsets.push(Math.round(t * 100) / 100);
    }
    return offsets;
  }

  test('it strikes every 1.5 seconds from the road, as an ordinary zombie does', () => {
    const { game, fast } = fastAmongFour(level1, () => 0.5);
    const first = hurts(game, fast, 3.1);
    const alone = started(level1, { waves: [{ zombie: 1 }] });
    const plain = hurts(alone, alone.enemies[0], 3.1);
    assert.equal(first.length, 2);
    for (const [a, b] of first.map((t, k) => [t, plain[k]])) assert.ok(Math.abs(a - b) <= 0.02, `${a} against ${b}`);
    assert.ok(Math.abs(first[0] - 1.5) <= 0.02 && Math.abs(first[1] - 3) <= 0.02, `${first}`);
  });

  test('its reach is 1.5: from further off it closes in first, at its own speed', () => {
    const { game, fast } = fastAmongFour(level1, () => 0.5);
    const [first] = hurts(game, fast, 2, 1.6); // 0.1 to close, 1.5 to strike
    assert.ok(Math.abs(first - (1.5 + 0.1 / 1.92)) <= 0.02, `${first}`);
  });

  test('it groans on reaching the road, as any zombie does', () => {
    const { game, fast } = fastAmongFour(level1, () => 0.5);
    game.cues.length = 0;
    arrival(game, fast);
    assert.ok(game.cues.some((c) => c.name === 'groan'));
  });
});

describe('7. balance is bounded by the data', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: no wave has more than 2 fast zombies, more zombies than today, or a fast one over 1.6 times as quick`, () => {
      const z = level.enemies.zombie;
      assert.ok(z.fast.speedFactor <= 1.6);
      level.waves.forEach((wave, w) => {
        assert.ok(wave.zombie <= TODAY[i][w], `wave ${w + 1} keeps its zombies`);
        const fast = w + 1 >= z.fast.fromWave ? Math.floor(wave.zombie / z.fast.every) : 0;
        assert.ok(fast <= 2 && fast <= Math.floor(wave.zombie / 4), `wave ${w + 1}: ${fast} fast`);
      });
      const game = started(level);
      level.waves.forEach((_, w) => assert.ok(zombiesOf(sendWave(game, w + 1)).filter((e) => e.fast).length <= 2));
    });
  }
});
