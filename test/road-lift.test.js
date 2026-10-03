// Spec 40: `roadLift`, the height the road's bricks lift an enemy's feet, and the sizes.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { level1 } from '../src/levels/level-1.js';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';
import { ROAD, roadLift } from '../src/logic/road.js';
import { near } from './fast-helpers.js';

const LEVELS = [level1, level2, level3];

describe('1. roadLift', () => {
  test('the constants are the lowest brick top and one row of bricks', () => {
    assert.deepEqual(ROAD, { top: 0.11, edge: 0.3 });
  });

  for (const level of LEVELS) {
    describe(level.name, () => {
      const lift = (d) => roadLift(level.roadZ + d, level);

      test('0.11 on the road\'s middle, from the centre out to 1.0', () => {
        for (const d of [0, 0.25, 0.5, 1.0]) assert.equal(lift(d), 0.11, `d = ${d}`);
      });

      test('0 off the road: its edge, the boss\'s stand and the spawn', () => {
        for (const d of [1.3, 1.5, 3, 3.5, 12]) assert.equal(lift(d), 0, `d = ${d}`);
        assert.equal(roadLift(level.boss.standZ, level), 0);
        assert.equal(roadLift(level.spawn.z, level), 0);
      });

      test('rises in a straight line over the first 0.3: half way it is 0.055', () => {
        near(lift(1.15), 0.055);
        near(lift(1.15 - 0.075), 0.11 * 0.75);
        near(lift(1.15 + 0.075), 0.11 * 0.25);
        let last = 0;
        for (let d = 1.3; d >= 1.0; d -= 0.01) {
          const y = lift(d);
          assert.ok(y >= last - 1e-12, `d = ${d}`);
          near(y, (0.11 * (1.3 - d)) / 0.3, 1e-9, `d = ${d}`);
          last = y;
        }
      });

      test('the same on both sides of the road', () => {
        for (const d of [0, 0.7, 1.05, 1.15, 1.25, 1.4]) assert.equal(lift(d), lift(-d), `d = ${d}`);
      });
    });
  }

  test('the width is read from the level\'s road entry, and its centre from `roadZ`', () => {
    const wide = (width, roadZ = 0) => ({ roadZ, scenery: [{ model: 'tree' }, { model: 'road', width }] });
    near(roadLift(2.35, wide(5)), 0.11 / 2);
    near(roadLift(0.5, wide(1.2)), (0.11 * 0.1) / 0.3);
    assert.equal(roadLift(1.0, wide(1.2)), 0);
    assert.equal(roadLift(3 + 1.0, wide(2.6, 3)), 0.11);
    assert.equal(roadLift(0, { roadZ: 0, scenery: [] }), 0, 'no road, no lift');
  });
});

describe('5. sizes', () => {
  const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
  test('the files keep to the sizes the spec names', () => {
    assert.ok(lines('src/logic/road.js') < 200);
    assert.ok(lines('src/view/stage-entities.js') <= 88);
    assert.ok(lines('src/view/stage-effects.js') < 200);
    for (const path of ['test/road-lift.test.js', 'test/road-lift-stage.test.js']) assert.ok(lines(path) < 200, path);
  });
});
