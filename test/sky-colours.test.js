// Spec 21, on the stage: the colours of the clouds and the crescent over the level's cycle, on the
// weather's clock — the first colour at clock 0, the cycle over and over, and no jump, the seam included.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TABLE, setUp, skyIn, shades, colours, colourAt, near, spin, hex } from './sky-helpers.js';

const close = (got, want, eps = 1e-6) => got.forEach((c, i) => assert.ok(near(c, want[i], eps), `colour ${i}: ${c} for ${want[i]}`));

describe('2. the colours', () => {
  test('at clock 0 each cloud shows its list\'s first colour shifted by its part of the cycle, the moon its first', () => {
    for (const n of [1, 2]) {
      const table = TABLE[n];
      const sky = skyIn(setUp({ level: table.level }).draw());
      close(shades(sky), colours(table, sky, 0), 1e-9);
      assert.equal(hex(sky.moon.material.color), table.moon[0]);
      assert.notDeepEqual(shades(sky)[0], shades(sky)[1], 'the clouds are not all one colour');
    }
  });

  test('the clock moves them along each colour list, cosine-eased, back to the first from the last', () => {
    for (const n of [1, 2]) {
      const table = TABLE[n];
      const { game, draw } = setUp({ level: table.level });
      const sky = skyIn(draw());
      let clock = 0;
      for (const step of [table.cycle / 8, table.cycle / 8, table.cycle / 3, table.cycle / 4, table.cycle / 4, 7.3, 0.4]) {
        game.weather.update(step);
        clock += step;
        draw();
        close(shades(sky), colours(table, sky, game.weather.clock));
      }
      assert.ok(Math.abs(clock - game.weather.clock) < 1e-9);
      // At the middle of the first segment the moon is half way between its first two colours.
      const half = setUp({ level: table.level });
      const s = skyIn(half.draw());
      half.game.weather.update(table.cycle / table.moon.length / 2);
      half.draw();
      close([shades(s).at(-1)], [colourAt([table.moon[0], table.moon[1]], 0.25)]);
    }
  });

  test('after one whole cycle the colours are the same again', () => {
    for (const n of [1, 2]) {
      const table = TABLE[n];
      const { game, draw } = setUp({ level: table.level });
      const sky = skyIn(draw());
      const first = shades(sky).map((c) => [...c]);
      spin(game, table.cycle, 0.05, draw);
      close(shades(sky), first);
      spin(game, table.cycle, 0.05, draw);
      close(shades(sky), first);
    }
  });

  test('a step of 16 ms never moves a colour channel by more than 2%, the seam and the second cycle included', () => {
    for (const n of [1, 2]) {
      const table = TABLE[n];
      const { game, draw } = setUp({ level: table.level });
      const sky = skyIn(draw());
      let last = shades(sky).map((c) => [...c]);
      let biggest = 0;
      spin(game, table.cycle * 1.5, 0.016, () => {
        draw();
        const now = shades(sky);
        now.forEach((c, i) => c.forEach((v, j) => {
          biggest = Math.max(biggest, Math.abs(v - last[i][j]));
        }));
        last = now.map((c) => [...c]);
      });
      assert.ok(biggest <= 0.02, `moved ${biggest} in a step`);
      assert.ok(biggest > 0, 'they do change');
    }
  });

  test('a strike does not change the clouds or the moon: they stay on the clock\'s colours', () => {
    const table = TABLE[1];
    const { game, draw } = setUp({ level: table.level });
    const sky = skyIn(draw());
    let struck = 0;
    spin(game, 40, 0.01, () => {
      draw();
      if (game.weather.strike) {
        struck += 1;
        close(shades(sky), colours(table, sky, game.weather.clock));
      }
    });
    assert.ok(struck > 0, 'a strike came');
  });
});
