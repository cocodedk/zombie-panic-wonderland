// Spec 17: fences that hold. The fences are read from the level's scenery and zombies are led to a
// gap in them. Everything else it touches (the others, the meshes, pause) is in fences-scene.test.js.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fences, gaps, behindFence, entryPoint, stepZombie, STOP_Z } from '../src/logic/fences.js';
import { level2 } from '../src/levels/level-2.js';
import { playing, run, level1 } from './helpers.js';
import { LEVELS, near, oneZombie } from './fences-helpers.js';

const pairs = (list, a, b) => list.map((f) => [f[a], f[b]]);
const nearAll = (got, want) => got.forEach((p, i) => p.forEach((v, k) => near(v, want[i][k])));
const XS = Array.from({ length: 33 }, (_, i) => -8 + i * 0.5);

// A zombie spawned at x, walked to the road in 0.01 s steps. The line of its walk is `trail`.
function walk(level, x) {
  const game = playing(oneZombie(level), () => (x + 8) / 16);
  const z = game.enemies[0];
  const trail = [{ x: z.x, z: z.z }];
  let steps = 0;
  while (z.z < level.roadZ - 1e-6 && steps < 1300) {
    game.update(0.01);
    steps++;
    trail.push({ x: z.x, z: z.z });
    assert.ok(z.z <= STOP_Z || !behindFence(level, z.x), `x ${x}: past the stop line behind a fence at (${z.x}, ${z.z})`);
  }
  return { time: steps * 0.01, trail };
}

describe('1. the fences are read from the scenery', () => {
  test('level 1: four fences, spans and the usable gaps', () => {
    nearAll(pairs(fences(level1), 'from', 'to'), [[-9.5, -7], [-5.4, -2.5], [3.5, 5.6], [7.2, 9.5]]);
    nearAll(pairs(fences(level1), 'lo', 'hi'), [[-9.8, -6.7], [-5.7, -2.2], [3.2, 5.9], [6.9, 9.8]]);
    nearAll(pairs(gaps(level1), 'lo', 'hi'), [[-6.7, -5.7], [-2.2, 3.2], [5.9, 6.9]]);
  });

  test('level 2: four fences, spans and the usable gaps', () => {
    nearAll(pairs(fences(level2), 'from', 'to'), [[-8.5, -6.5], [-4.9, -2.5], [3.5, 5.1], [6.7, 8.5]]);
    nearAll(pairs(gaps(level2), 'lo', 'hi'), [[-6.2, -5.2], [-2.2, 3.2], [5.4, 6.4]]);
  });

  test('a zombie exactly on a usable gap edge is free; just inside a span it is behind the fence', () => {
    for (const level of LEVELS) {
      for (const g of gaps(level)) {
        for (const x of [g.lo, g.hi]) assert.equal(behindFence(level, x), false);
        const e = { x: g.lo, z: -5 };
        stepZombie(e, level, 1.2, 0.5);
        assert.equal(e.x, g.lo, 'it walks straight');
        near(e.z, -5 + 0.6);
      }
      assert.equal(behindFence(level, fences(level)[0].lo + 0.01), true);
    }
  });

  test('only gaps between two fences are routes, not the outside ends', () => {
    near(entryPoint(level2, 8).x, 6.4);
    near(entryPoint(level1, 9.7).x, 6.9);
    near(entryPoint(level1, -9.7).x, -6.7);
  });
});

describe('2. and 3. the walk', () => {
  test('a zombie spawned free walks straight to the road in 10 seconds', () => {
    const { time, trail } = walk(level1, 0.5);
    near(time, 10, 0.05);
    assert.ok(trail.every((p) => p.x === 0.5));
  });

  test('from x -8 (behind the first fence) it walks a straight line to (-6.7, -2.6), then to the road', () => {
    const { time, trail } = walk(level1, -8);
    near(time, (Math.hypot(1.3, 9.4) + 2.6) / 1.2, 0.1);
    for (const p of trail.filter((q) => q.z <= STOP_Z)) near((p.x + 8) * 9.4 - (p.z + 12) * 1.3, 0, 1e-6, 'on the line');
    assert.ok(trail.some((p) => Math.abs(p.x + 6.7) < 1e-9 && Math.abs(p.z - STOP_Z) < 1e-9), 'it reaches the entry point');
    for (const p of trail.filter((q) => q.z > STOP_Z)) near(p.x, -6.7, 1e-9, 'then straight');
  });

  test('the speed is the total along the line, not per axis', () => {
    const e = { x: -8, z: -12 };
    stepZombie(e, level1, 1.2, 1);
    near(Math.hypot(e.x + 8, e.z + 12), 1.2);
  });
});

describe('4. every spawn x reaches the road, and none is past the stop line behind a fence', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}, x from -8 to 8 in steps of 0.5: within 10.5 seconds`, () => {
      for (const x of XS) assert.ok(walk(level, x).time <= 10.5, `x ${x}`);
    });
  }
});

describe('5. the stop line and summoned zombies', () => {
  test('a zombie at or past the stop line is not held, whatever its x', () => {
    for (const z of [STOP_Z, -2.4, -2]) {
      const e = { x: -8, z };
      stepZombie(e, level1, 1.2, 0.5);
      assert.equal(e.x, -8);
      near(e.z, z + 0.6);
    }
  });

  test('a summoned zombie before the line behind a fence is held and walks to a gap; one behind none walks straight', () => {
    const game = playing(oneZombie(level1), () => 0.5);
    game.enemies.length = 0;
    const held = game.spawn('zombie');
    Object.assign(held, { x: -8, z: -5 });
    const free = game.spawn('zombie');
    Object.assign(free, { x: 0.5, z: -5 });
    run(game, 1);
    assert.ok(held.x > -8 && held.z < -5 + 1.2, `(${held.x}, ${held.z})`);
    assert.equal(free.x, 0.5);
    near(free.z, -5 + 1.2, 1e-6);
    run(game, 3);
    assert.equal(held.x, -6.7);
    assert.ok(held.z >= STOP_Z - 1e-9);
  });

  test('the boss\'s own summons follow the rule', () => {
    const game = playing(oneZombie(level1), () => 0.5);
    game.player.hearts = 99;
    game.enemies.length = 0;
    game.spawnBoss();
    Object.assign(game.enemies[0], { x: -8, next: 1, action: 0.01 }); // its next action is the summon
    run(game, 0.01);
    const zombies = game.enemies.filter((e) => e.kind === 'zombie');
    assert.equal(zombies.length, level1.boss.summon);
    for (const z of zombies) assert.equal(z.x, -8, 'behind the first fence');
    run(game, 10);
    for (const z of zombies) assert.equal(z.x, -6.7, 'led to the gap');
  });
});

describe('9. sizes', () => {
  const lines = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').split('\n').length - 1;
  test('fences.js and the new test files are under 200 lines', () => {
    for (const f of ['../src/logic/fences.js', './fences.test.js', './fences-scene.test.js', './fences-helpers.js']) assert.ok(lines(f) < 200, f);
  });
  test('game.js is at most 25 lines longer than before (833 lines before this spec)', () => {
    assert.ok(lines('../src/logic/game.js') <= 833 + 25);
  });
});
