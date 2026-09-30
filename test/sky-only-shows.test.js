// Spec 21, on the stage: the sky ignores rays, goes and is disposed with the backdrop, draws no
// random of the game's, and the new files stay small.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journey, win } from './journey.js';
import { TABLE, THREE, setUp, skyIn } from './sky-helpers.js';
import { createStage } from './weather-stage-helpers.js';

const skyFor = (n) => skyIn(setUp({ level: TABLE[n].level }).draw());

describe('7. they only show', () => {
  test('every mesh of the clouds and the moon ignores rays', () => {
    for (const n of [1, 2]) {
      const sky = skyFor(n);
      let meshes = 0;
      for (const part of [...sky.clouds, sky.moon]) {
        part.traverse((m) => {
          if (!(m instanceof THREE.Mesh)) return;
          meshes += 1;
          assert.ok(Object.hasOwn(m, 'raycast'), 'a raycast of its own');
          const hits = [];
          m.raycast({}, hits);
          assert.deepEqual(hits, []);
        });
      }
      assert.ok(meshes > 21 * 3);
    }
  });

  test('on a level change they are removed with the backdrop and disposed, and none is left in the scene', () => {
    const game = journey();
    const stage = createStage({ appendChild() {} }, game.level);
    const renderer = THREE.renderers.at(-1);
    const draw = () => { stage.sync(game, 0.01); return renderer.scene; };
    const before = skyIn(draw());
    const parts = new Set();
    const gone = new Set();
    for (const obj of [...before.clouds, before.moon]) {
      obj.traverse((m) => {
        parts.add(m);
        for (const part of [m.geometry, m.material]) {
          if (!part) continue;
          const dispose = part.dispose.bind(part);
          part.dispose = () => { gone.add(part); dispose(); };
        }
      });
    }
    win(game);
    game.nextLevel();
    const scene = draw();
    assert.equal(game.level.number, 2);
    assert.notEqual(skyIn(scene), before);
    const left = [];
    scene.traverse((o) => left.push(o));
    assert.ok(left.every((o) => !parts.has(o)), 'nothing of level 1\'s sky is left in the scene');
    for (const m of parts) {
      for (const part of [m.geometry, m.material]) if (part) assert.ok(gone.has(part), 'disposed');
    }
    assert.equal(scene.children.length, 2, 'the backdrop and the player');
  });
});

describe('8. the code', () => {
  test('the sky calls no random of the game\'s or the page\'s: its own seeded one', async () => {
    const { makeSky } = await import('../src/view/sky.js');
    const real = Math.random;
    Math.random = () => { throw new Error('the sky drew from Math.random'); };
    try {
      for (const n of [1, 2]) makeSky(TABLE[n].level.sky);
    } finally {
      Math.random = real;
    }
    let drawn = 0;
    const { game, draw } = setUp({ level: TABLE[1].level, random: () => { drawn += 1; return 0.5; } });
    const seen = drawn;
    draw();
    game.weather.update(5);
    draw();
    assert.equal(drawn, seen);
  });

  test('the new files are under 200 lines and stage.js grew by at most 6', () => {
    const lines = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n').length - 1;
    for (const file of ['src/view/sky.js', 'src/view/models/sky-details.js', 'test/sky-helpers.js', 'test/sky-build.test.js', 'test/sky-colours.test.js', 'test/sky-drift.test.js', 'test/sky-only-shows.test.js']) {
      assert.ok(lines(file) < 200, file);
    }
    assert.ok(lines('src/view/stage.js') <= 322 + 6);
  });
});
