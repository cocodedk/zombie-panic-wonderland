// Spec 16: the weather's rules with no game and no stage: when it strikes, the flash, the bolt, the wind.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Weather, LIGHTNING, flashAt, gentleAt } from '../src/logic/weather.js';
import { level1 } from '../src/levels/level-1.js';
import { level2 } from '../src/levels/level-2.js';
import { seeded } from './weather-helpers.js';

const LEVELS = [level1, level2];

// Runs a weather for `seconds` in steps of `dt`, calling `each` after every step.
function run(weather, seconds, dt, each = () => {}) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    weather.update(dt);
    each(weather);
  }
}

// The clock time of every strike in `seconds`.
function strikes(level, seed, seconds = 600, reduced = false) {
  const weather = new Weather(level.weather, seeded(seed), reduced);
  const at = [];
  run(weather, seconds, 0.01, (w) => {
    if (w.strike && at.at(-1) !== w.strike.at) at.push(w.strike.at);
  });
  return at;
}

describe('1. the strikes', () => {
  test('the levels carry their weather as data', () => {
    assert.deepEqual([level1.weather.between, level1.weather.rest, level1.weather.gusts], [[10, 22], 0.3, 0.5]);
    assert.deepEqual([level2.weather.between, level2.weather.rest, level2.weather.gusts], [[7, 16], 0.5, 0.5]);
    assert.deepEqual([level1.weather.leaf, level2.weather.leaf], ['#8a6a2f', '#a8943e']);
  });

  test('with one seeded random the same weather strikes at the same times', () => {
    for (const level of LEVELS) {
      assert.deepEqual(strikes(level, 7), strikes(level, 7));
      assert.notDeepEqual(strikes(level, 7), strikes(level, 8));
    }
  });

  test('the first strike is due 4 to 8 seconds in, each next wait falls in the level\'s range, never under 7', () => {
    for (const level of LEVELS) {
      const [lo, hi] = level.weather.between;
      for (const seed of [1, 2, 3, 4, 5]) {
        const at = strikes(level, seed);
        assert.ok(at.length > 20, `${at.length} strikes`);
        assert.ok(at[0] >= 4 - 1e-9 && at[0] <= 8 + 1e-9, `first at ${at[0]}`);
        for (let i = 1; i < at.length; i++) {
          const wait = at[i] - at[i - 1];
          assert.ok(wait >= lo - 1e-9 && wait <= hi + 1e-9, `level ${level.number}: waited ${wait}`);
          assert.ok(wait >= 7 - 1e-9, 'strikes are at least 7 seconds apart');
        }
      }
    }
  });

  test('a weather without data never strikes and never blows', () => {
    const calm = new Weather(null, seeded(1));
    run(calm, 100, 0.1);
    assert.deepEqual([calm.strike, calm.wind, calm.light, calm.shift, calm.bolt], [null, 0, 0, 0, null]);
  });
});

describe('2. the flash', () => {
  test('0 before the strike and from 0.5 seconds on; a peak at once, dark at 0.1, a second at 60% at 0.18', () => {
    assert.equal(flashAt(-0.01), 0);
    assert.equal(flashAt(0), 1);
    assert.equal(flashAt(0.1), 0);
    assert.equal(flashAt(0.18), 0.6);
    assert.equal(flashAt(0.5), 0);
    assert.equal(flashAt(2), 0);
    for (const t of [0.02, 0.05, 0.09]) assert.ok(flashAt(t) > 0 && flashAt(t) < 1, `falling at ${t}`);
    for (const t of [0.12, 0.15]) assert.ok(flashAt(t) > 0 && flashAt(t) < 0.6, `rising at ${t}`);
    for (const t of [0.25, 0.4, 0.49]) assert.ok(flashAt(t) > 0 && flashAt(t) < 0.6, `fading at ${t}`);
  });

  test('never more than 3 flashes in any second, and the light follows the curve', () => {
    for (const level of LEVELS) {
      const weather = new Weather(level.weather, seeded(3));
      const lights = [];
      run(weather, 300, 0.001, (w) => lights.push([w.clock, w.light]));
      const peaks = lights.filter(([, v], i) => v > 0.5 && v >= (lights[i - 1]?.[1] ?? 0) && v > (lights[i + 1]?.[1] ?? 0)).map(([t]) => t);
      assert.ok(peaks.length > 30, `${peaks.length} peaks`); // two a strike
      peaks.forEach((t, i) => assert.ok(peaks.filter((p) => p >= t && p < t + 1).length <= 3, `flashes from ${t}`));
      assert.ok(lights.every(([, v]) => v <= LIGHTNING.hemisphere + 1e-9));
    }
  });

  test('a strike lights the hemisphere by up to 2.5 and shifts the sky up to 60%, then everything is back', () => {
    const weather = new Weather(level1.weather, seeded(3));
    assert.deepEqual([weather.light, weather.shift], [0, 0]);
    let seen = 0;
    run(weather, 60, 0.001, (w) => {
      if (!w.strike) return assert.deepEqual([w.light, w.shift, w.bolt], [0, 0, null]);
      seen = Math.max(seen, w.light);
      assert.ok(w.light <= 2.5 && w.shift <= 0.6 + 1e-9);
      assert.ok(Math.abs(w.shift - 0.6 * (w.light / 2.5)) < 1e-9, 'the shift follows the light');
    });
    assert.ok(seen > 2.4, `peaked at ${seen}`);
  });

  test('with reduced motion: one brightening of at most 0.8 over 0.6 seconds, no second flash, bolt or colour shift', () => {
    assert.equal(gentleAt(-0.1), 0);
    assert.equal(gentleAt(0.6), 0);
    assert.ok(gentleAt(0.3) <= 1);
    const weather = new Weather(level1.weather, seeded(3), true);
    const lights = [];
    let first = null;
    run(weather, 40, 0.001, (w) => {
      assert.deepEqual([w.shift, w.bolt], [0, null]);
      assert.ok(w.light <= 0.8 + 1e-9);
      if (w.strike) first ??= w.strike.at;
      if (first != null && w.clock - first < 0.7) lights.push(w.light);
    });
    assert.ok(Math.max(...lights) > 0.79);
    const peaks = lights.filter((v, i) => v > 0 && v >= (lights[i - 1] ?? 0) && v > (lights[i + 1] ?? 0));
    assert.equal(peaks.length, 1, 'one brightening');
    assert.equal(lights.at(-1), 0, 'gone after 0.6 seconds');
    assert.ok(lights.filter((v) => v > 0).length <= 600, 'over 0.6 seconds');
  });

  test('the bolt: 6 to 9 segments, from a height of 40 to 8, at z -90 to -50 and x -45 to 45, shown for 0.2 seconds', () => {
    for (const level of LEVELS) {
      const weather = new Weather(level.weather, seeded(9));
      let count = 0;
      run(weather, 300, 0.01, (w) => {
        if (w.strike && w.age >= 0.2) assert.equal(w.bolt, null, 'gone after 0.2 seconds');
        if (!w.bolt) return;
        const { points } = w.bolt;
        assert.ok(points.length - 1 >= 6 && points.length - 1 <= 9, `${points.length - 1} segments`);
        assert.deepEqual([points[0].y, points.at(-1).y], [40, 8]);
        for (const p of points) {
          assert.ok(p.z >= -90 && p.z <= -50 && p.x >= -45 && p.x <= 45, JSON.stringify(p));
          assert.equal(p.z, points[0].z, 'at one distance');
        }
        count += 1;
      });
      assert.ok(count > 20, `${count} steps with a bolt`); // 0.2 seconds a strike: 20 steps of 0.01
      assert.ok(count <= 21 * 43, 'never longer than 0.2 seconds a strike');
    }
  });
});

describe('3. the wind', () => {
  test('between the level\'s rest and 1, smooth, and different in the two levels', () => {
    const means = LEVELS.map((level) => {
      const weather = new Weather(level.weather, seeded(4));
      let last = weather.wind;
      let sum = 0;
      let top = 0;
      assert.equal(last, level.weather.rest, 'at rest to begin with');
      run(weather, 600, 0.016, (w) => {
        const v = w.wind;
        assert.ok(v >= level.weather.rest - 1e-12 && v <= 1, `wind ${v}`);
        assert.ok(Math.abs(v - last) <= 0.05, `a jump of ${Math.abs(v - last)}`);
        last = v;
        sum += v;
        top = Math.max(top, v);
      });
      assert.ok(top > level.weather.rest + 0.2, `gusts reach ${top}`);
      return sum / (600 / 0.016);
    });
    assert.notEqual(means[0], means[1]);
    assert.ok(means[1] > means[0]);
  });
});
