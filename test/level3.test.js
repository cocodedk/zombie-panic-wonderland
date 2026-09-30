// Spec 28: level 3, the Spider Wood: its data.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';
import { newGame, run, kill, click, level1 } from './helpers.js';

describe('1. level 3\'s data', () => {
  test('number, name and texts', () => {
    assert.equal(level3.number, 3);
    assert.equal(level3.name, 'The Spider Wood');
    assert.deepEqual(level3.text, {
      intro: 'The wood is silent. Something watches from the webs.',
      boss: 'The Zombie King rises!',
      victory: 'You made it through the wood — for now.',
    });
  });

  test('five waves, in this order and a second apart', () => {
    const expected = [[4, 2, 0, 0, 1], [5, 3, 0, 0, 2], [5, 3, 1, 1, 2], [6, 4, 2, 2, 3], [6, 5, 2, 2, 3]];
    assert.equal(level3.waves.length, 5);
    assert.equal(level3.timing.spacing, 1);
    const game = newGame(level3);
    const log = [];
    let time = 0;
    const update = game.update.bind(game);
    game.update = (dt) => { time += dt; update(dt); };
    const spawn = game.spawn.bind(game);
    game.spawn = (kind) => { log.push({ wave: game.wave, kind, t: time }); return spawn(kind); };
    click(game);
    click(game);
    while (game.phase !== 'announce') {
      run(game, 0.5);
      for (const e of [...game.enemies]) kill(game, e);
    }
    expected.forEach(([zombie, spider, wolf, pumpkinMonster, crow], i) => {
      const wave = log.filter((s) => s.wave === i + 1);
      const order = [...Array(zombie).fill('zombie'), ...Array(spider).fill('spider'), ...Array(wolf).fill('wolf'), ...Array(pumpkinMonster).fill('pumpkinMonster'), ...Array(crow).fill('crow')];
      assert.deepEqual(wave.map((s) => s.kind), order, `wave ${i + 1}`);
      wave.forEach((s, j) => assert.ok(Math.abs(s.t - wave[0].t - j) < 1e-6, `wave ${i + 1} spawn ${j} at ${s.t}`));
    });
  });

  test('level 2\'s enemies plus the spider and the wolf, level 1\'s boss and shape', () => {
    const { spider, wolf, ...others } = level3.enemies;
    assert.deepEqual(others, level2.enemies);
    assert.deepEqual(spider, { hits: 2, points: 150, speed: 2.2, reach: 1.2, closeIn: 0.8, strikeEvery: 1.2, drop: { fromWave: 2, every: 3, at: -5, from: 5, time: 1.2 } });
    assert.deepEqual(level3.boss, level1.boss);
    assert.equal(level3.boss.name, 'Zombie King');
    assert.equal(level3.boss.model, 'zombieKing');
    for (const key of ['player', 'spawn', 'timing']) assert.deepEqual(level3[key], level1[key], key);
    assert.equal(level3.roadZ, 0);
  });

  test('the palette: music, light, weather, sky', () => {
    assert.deepEqual([level3.music.key, level3.music.bpm, level3.music.bars, level3.music.root], ['E minor', 92, 8, 52]);
    assert.deepEqual(level3.music.bass, [0, 3, 0, 4, 5, 3, 4, 4]);
    assert.equal(level3.music.melody.length, 32);
    assert.deepEqual(level3.music.melody.slice(0, 8), [2, null, 4, 3, 2, null, 0, null]);
    assert.deepEqual(level3.music.melody.slice(-4), [-1, null, 0, null]);
    assert.deepEqual(level3.light, { fog: '#1d2b2a', fogFar: 100, sky: '#6b7fa8', ground: '#1a231e', key: '#c9d6ff', keyAt: [-10, 14, -20], fill: '#8f7fc0' });
    assert.deepEqual(level3.weather, { between: [8, 18], rest: 0.4, gusts: 0.6, leaf: '#6f7f4a' });
    assert.deepEqual(level3.sky, {
      cycle: 100,
      clouds: { seed: 7, colors: ['#c7d2e8', '#8fa3c9', '#7d6fa3', '#b9c7d6'] },
      moon: { radius: 3.5, at: [-16, 24, -72], colors: ['#e6f0d8', '#cfe0ff', '#d9d2f0'] },
    });
  });

  test('the scenery: sky, ground, road, ten trees, four mushrooms, six webs, and no fence', () => {
    const { scenery } = level3;
    assert.deepEqual(scenery.slice(0, 3).map((s) => s.model), ['sky', 'ground', 'road']);
    assert.deepEqual(scenery[0], { model: 'sky', top: '#1b1533', horizon: '#3d5a4e' });
    assert.deepEqual(scenery[1], { model: 'ground', color: '#1f2a24' });
    assert.deepEqual(scenery[2], { model: 'road', color: '#8f9a7a', length: 26, width: 2.6, missing: 0.2, seed: 21 });
    const of = (model) => scenery.filter((s) => s.model === model);
    assert.equal(scenery.length, 3 + 10 + 4 + 6);
    assert.ok(!scenery.some((s) => s.model === 'fence'));
    const trees = of('tree');
    assert.deepEqual(trees.map((t) => [t.x, t.z]), [[-18, -8], [-13, -14], [-9, -18], [-5, -22], [5, -20], [9, -16], [13, -12], [18, -9], [-15, -26], [16, -25]]);
    assert.deepEqual(trees.map((t) => t.seed), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.ok(trees.every((t) => t.height >= 7 && t.height <= 9));
    const mushrooms = of('mushroom');
    assert.deepEqual(mushrooms.map((m) => [m.x, m.z]), [[-11, -4], [11.5, -3], [-6.5, -15], [7, -17]]);
    assert.ok(mushrooms.every((m) => m.cap === '#4a6fa5' && m.size >= 1.6 && m.size <= 3));
    const webs = of('web');
    assert.deepEqual(webs.map((w) => [w.x, w.z]), [[-9, -7], [9.5, -8], [-3, -19], [4, -21], [-14, -13], [14, -14]]);
    assert.ok(webs.every((w) => w.size >= 2 && w.size <= 2.6 && w.height >= 2.8 && w.height <= 4 && Math.abs(w.turn) <= 0.5));
  });
});
