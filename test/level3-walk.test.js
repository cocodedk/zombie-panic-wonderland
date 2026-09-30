// Spec 28: level 3's walk and its enemies, the HUD, get_state, llms.txt and the sizes.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { registerWebMcp } from '../src/logic/webmcp.js';
import { screenView } from '../src/logic/screens.js';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';
import { run, clearWave, level1 } from './helpers.js';
import { withWaves } from './journey.js';
import { started, sendWave, arrival } from './fast-helpers.js';
import { seeded } from './weather-helpers.js';
import { atLevel3, read } from './level3-helpers.js';

describe('4. the walk and the others', () => {
  const noFences = (level) => ({ ...level, scenery: level.scenery.filter((s) => s.model !== 'fence') });

  test('zombies walk straight down in level 3, where level 2\'s fences would hold them', () => {
    for (const [level, straight] of [[level3, true], [level2, false]]) {
      const game = started(level, { waves: [{ zombie: 3 }], random: () => 0 }); // x = -8, behind level 2's first fence
      const xs = [];
      for (let t = 0; t < 600; t++) {
        game.update(0.01);
        for (const e of game.enemies) if (e.z > -12) xs.push(e.x);
      }
      assert.ok(xs.length > 100);
      assert.equal(xs.every((x) => x === -8), straight, level.name);
    }
  });

  test('fast zombies walk straight too, and arrive as they do in level 2', () => {
    const wave = (level) => {
      const game = started(level, { waves: [{ zombie: 1 }, { zombie: 4 }], random: () => 0, spacing: 0 });
      game.enemies = [];
      game.startWave(2);
      const zombies = game.enemies.filter((e) => e.kind === 'zombie');
      assert.equal(zombies[3].fast, true);
      return { game, fast: zombies[3] };
    };
    const { game, fast } = wave(level3);
    const took = arrival(game, fast);
    assert.equal(fast.x, -8);
    assert.ok(Math.abs(took - 6.25) < 0.05, `arrived after ${took}`);
    const two = wave(level2);
    arrival(two.game, two.fast);
    assert.notEqual(two.fast.x, -8, 'level 2\'s fence leads it to a gap');
  });

  test('crows and pumpkin monsters move as in level 2 (same seed, level 2 without fences), and a wave of zombies is sent whole', () => {
    const play = (level) => {
      const game = started(level, { waves: [{ zombie: 3, pumpkinMonster: 2, crow: 2 }], random: seeded(7) });
      const seen = [];
      for (let t = 0; t < 1500; t++) {
        game.update(0.01);
        seen.push(JSON.stringify([game.enemies.filter((e) => e.kind !== 'zombie'), game.pumpkins]));
      }
      return seen;
    };
    const [a, b] = [level3, noFences(level2)].map(play);
    assert.deepEqual(a, b);
    assert.ok(a.some((s) => s.includes('"crow"')) && a.some((s) => s.includes('"pumpkinMonster"')));
    assert.equal(sendWave(started(level3), 5).length, 8 + 2 + 3);
  });

  test('the boss behaves as level 1\'s', () => {
    const play = (level) => {
      const game = started(level, { random: seeded(3) });
      game.spawnBoss();
      const seen = [];
      for (let t = 0; t < 1500; t++) {
        game.update(0.01);
        seen.push(JSON.stringify([game.enemies.filter((e) => e.kind === 'boss'), game.shockwaves]));
      }
      return seen;
    };
    assert.deepEqual(play(level3), play(level1));
  });

  test('the boss announcement is level 3\'s text and the Zombie King fights on', () => {
    const game = started(withWaves(level3, [{ zombie: 1 }]));
    clearWave(game);
    run(game, level3.timing.gap);
    assert.equal(game.banner, 'The Zombie King rises!');
    run(game, level3.timing.bossBanner);
    assert.equal(game.enemies[0].kind, 'boss');
    assert.equal(screenView(game).hud.boss, 1);
    assert.equal(game.level.boss.name, 'Zombie King');
  });
});

describe('6. the HUD, get_state and llms.txt', () => {
  test('the HUD says Level 3 · Wave N / 5', () => {
    const game = started(level3);
    assert.equal(screenView(game).hud.wave, 'Level 3 · Wave 1 / 5');
    clearWave(game);
    assert.deepEqual(screenView(game).band, { lines: ['Wave 1 cleared'] });
    run(game, 3);
    assert.equal(screenView(game).hud.wave, 'Level 3 · Wave 2 / 5');
  });

  test('get_state says level 3, through the WebMCP tool, and the tool texts name it', async () => {
    const tools = new Map();
    const game = atLevel3();
    await registerWebMcp({ registerTool: (t) => { tools.set(t.name, t); } }, game);
    const state = await tools.get('get_state').execute({});
    assert.deepEqual(state, { level: 3, screen: 'intro', wave: 1, score: game.score, hearts: 5, enemies: 0, boss_health: null, weapon: 'popper', ammo: null, reloading: false });
    assert.match(tools.get('get_state').description, /level is 1, 2 or 3;/);
    const { description } = await tools.get('describe').execute({});
    assert.match(description, /Spider Wood/);
    assert.ok(!/Scarecrow King, each/.test(description));
  });

  test('llms.txt describes level 3 and says level is 1, 2 or 3', () => {
    const llms = read('llms.txt');
    assert.match(llms, /Level 3, the Spider Wood/);
    assert.match(llms, /`level` is `1`, `2` or `3`/);
    assert.match(llms, /Spider Wood, each after five waves/);
  });
});

describe('7. sizes', () => {
  const lines = (path) => read(path).split('\n').length - 1;
  test('the new files are under 200 lines; main.js and stage.js are within their limits', () => {
    for (const path of ['src/levels/level-3.js', 'src/view/models/webs.js']) assert.ok(lines(path) < 200, path);
    assert.ok(lines('src/main.js') <= 64 + 3, 'main.js');
    assert.ok(lines('src/view/stage.js') <= 164 + 2, 'stage.js');
    assert.match(read('src/main.js'), /levels: \[level1, level2, level3\]/);
  });
});
