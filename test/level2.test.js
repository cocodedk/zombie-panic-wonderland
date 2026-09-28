import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { screenView } from '../src/logic/screens.js';
import { registerWebMcp } from '../src/logic/webmcp.js';
import { level2 } from '../src/levels/level-2.js';
import { newGame, playing, run, kill, clearWave, kinds, click, level1 } from './helpers.js';
import { withWaves, short1, short2, journey, win } from './journey.js';

const oneCrow = withWaves(level2, [{ crow: 1 }]);

describe('level 2: waves follow its data', () => {
  test('counts, kinds, order and one-second spacing, wave by wave', () => {
    const game = newGame(level2);
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
    assert.equal(game.player.hearts, 5);
    const expected = [[5, 0, 2], [6, 1, 3], [6, 2, 3], [8, 2, 4], [8, 3, 5]];
    assert.equal(level2.waves.length, 5);
    expected.forEach(([zombie, pumpkinMonster, crow], i) => {
      const wave = log.filter((s) => s.wave === i + 1);
      const order = [...Array(zombie).fill('zombie'), ...Array(pumpkinMonster).fill('pumpkinMonster'), ...Array(crow).fill('crow')];
      assert.deepEqual(wave.map((s) => s.kind), order, `wave ${i + 1}`);
      assert.deepEqual(wave.map((s) => s.kind), Object.entries(level2.waves[i]).flatMap(([k, n]) => Array(n).fill(k)));
      wave.forEach((s, j) => assert.ok(Math.abs(s.t - wave[0].t - j) < 1e-6, `wave ${i + 1} spawn ${j} at ${s.t}`));
    });
    assert.equal(log.length, 7 + 10 + 11 + 14 + 16);
  });
});

describe('level 2: the crow', () => {
  test('circles for 2 seconds, then dives at where the player is then', () => {
    const game = playing(oneCrow);
    const crow = game.enemies[0];
    game.setMove(1);
    run(game, 0.5);
    game.setMove(0);
    run(game, 1.49);
    assert.equal(crow.diveX, null);
    run(game, 0.01);
    assert.equal(crow.diveX, game.player.x);
    assert.ok(Math.abs(crow.diveX - 3) < 1e-6);
  });

  test('reaches the road 1 second after the dive and costs 1 heart within 1 unit', () => {
    const game = playing(oneCrow);
    run(game, 2);
    game.setMove(1);
    run(game, 0.15); // 0.9 units from where it lands
    game.setMove(0);
    run(game, 0.84);
    assert.equal(game.player.hearts, 5);
    assert.equal(game.enemies.length, 1);
    run(game, 0.01);
    assert.equal(game.player.hearts, 4);
    assert.equal(game.enemies.length, 0);
  });

  test('a dodge when it lands takes no damage', () => {
    const game = playing(oneCrow, () => 1); // it circles over x = 8
    game.setMove(1);
    run(game, 2);
    game.setMove(0);
    assert.equal(game.enemies[0].diveX, 8);
    run(game, 0.8);
    assert.ok(game.dodge());
    run(game, 0.2);
    assert.equal(game.player.x, 8); // the roll is stopped at the edge: only the dodge saves it
    assert.equal(game.enemies.length, 0);
    assert.equal(game.player.hearts, 5);
  });

  test('a miss: it flies away, leaves the field and the wave counts as cleared', () => {
    const game = playing(oneCrow);
    run(game, 2);
    game.setMove(1);
    run(game, 0.2); // 1.2 units away
    game.setMove(0);
    run(game, 0.8);
    assert.equal(game.player.hearts, 5);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.flyaways.length, 1);
    assert.equal(game.banner, 'Wave 1 cleared');
    assert.equal(game.score, 0);
    run(game, 1.49);
    assert.equal(game.flyaways.length, 1);
    run(game, 0.01);
    assert.equal(game.flyaways.length, 0);
  });

  test('a hit also flies away after its dive', () => {
    const game = playing(oneCrow);
    run(game, 3);
    assert.equal(game.player.hearts, 4);
    assert.equal(game.flyaways.length, 1);
    assert.equal(game.phase, 'cleared');
  });

  test('falls after 1 hit for 50 points, circling or diving', () => {
    for (const at of [1, 2.5]) {
      const game = playing(oneCrow);
      run(game, at);
      const crow = game.enemies[0];
      game.setAim(crow.id);
      game.shoot();
      assert.ok(!game.enemies.includes(crow));
      assert.equal(game.score, 50);
      assert.equal(game.flyaways.length, 0);
      run(game, 1);
      assert.equal(game.player.hearts, 5);
    }
  });
});

// Level 2 with one short wave, then the Scarecrow King, who has just appeared.
function toKing() {
  const game = playing(withWaves(level2, [{ zombie: 1 }]));
  clearWave(game);
  run(game, level2.timing.gap);
  assert.equal(game.banner, 'The Scarecrow King rises!');
  run(game, level2.timing.bossBanner);
  assert.deepEqual(kinds(game), { boss: 1 });
  return game;
}

describe('level 2: the Scarecrow King', () => {
  test('falls after 240 hits for 3000 points', () => {
    const game = toKing();
    const king = game.enemies[0];
    assert.equal(game.snapshot().boss_health, 240);
    const before = game.score;
    game.setAim(king.id);
    for (let i = 0; i < 239; i++) game.shoot();
    assert.equal(game.snapshot().boss_health, 1);
    assert.equal(game.screen, 'play');
    game.shoot();
    assert.equal(game.score, before + 3000);
    run(game, 1.5);
    assert.equal(game.screen, 'victory');
  });

  test('throws a flaming pumpkin 2 seconds after it appears, still walking, then summons 3 crows and throws in turn every 3 seconds', () => {
    const game = toKing();
    const king = game.enemies[0];
    run(game, 1.99);
    assert.equal(game.pumpkins.length, 0);
    run(game, 0.01);
    assert.equal(game.pumpkins.length, 1);
    assert.equal(game.pumpkins[0].flaming, true);
    assert.ok(king.z < -3, `still walking at z = ${king.z}`);
    run(game, 1.19);
    assert.equal(game.player.hearts, 5);
    run(game, 0.01);
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.player.hearts, 3); // a flaming pumpkin costs 2 hearts
    run(game, 1.79);
    assert.deepEqual(kinds(game), { boss: 1 });
    run(game, 0.01);
    assert.deepEqual(kinds(game), { boss: 1, crow: 3 });
    assert.equal(game.pumpkins.length, 0);
    for (const e of game.enemies.filter((e) => e.kind === 'crow')) kill(game, e);
    run(game, 2.99);
    assert.equal(game.pumpkins.length, 0);
    run(game, 0.01);
    assert.equal(game.pumpkins.length, 1);
    assert.deepEqual(kinds(game), { boss: 1 });
    assert.ok(Math.abs(king.z + 3) < 1e-6); // meanwhile it walked to 3 units behind the road
  });

  test('a flaming pumpkin can be shot down for 25 points', () => {
    const game = toKing();
    run(game, 2);
    const before = game.score;
    game.setAim(game.pumpkins[0].id);
    game.shoot();
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.score, before + 25);
    run(game, 1.5);
    assert.equal(game.player.hearts, 5);
  });
});

describe('level 2: getting in and out, hearts and score', () => {
  test('Next level on level 1\'s victory starts level 2\'s intro card, hearts back to 5, the score carried over', () => {
    const game = journey();
    run(game, 11.5); // the zombie strikes once
    assert.equal(game.player.hearts, 4);
    win(game);
    assert.deepEqual(screenView(game).band, { title: 'Wonderland is safe — for now.', lines: ['Final score 2100'], button: 'Play again', second: 'Next level' });
    game.nextLevel();
    assert.equal(game.screen, 'intro');
    assert.equal(game.level, short2);
    assert.equal(game.player.hearts, 5);
    assert.equal(game.score, 2100);
    assert.deepEqual(screenView(game).band, { lines: ['The yellow brick road is crumbling. Keep going!'] });
    assert.equal(screenView(game).hud.wave, 'Level 2 · Wave 1 / 1');
  });

  test('level 2\'s victory: Play again replays level 2 from its intro card with the score it began with', () => {
    const game = journey();
    win(game);
    game.nextLevel();
    click(game);
    win(game);
    assert.equal(game.score, 2100 + 50 + 100 + 3000);
    assert.deepEqual(screenView(game).band, { title: 'The road is clear — for now.', lines: ['Final score 5250'], button: 'Play again', second: 'Back to title' });
    game.nextLevel(); // there is none
    assert.equal(game.screen, 'victory');
    game.restart();
    assert.equal(game.screen, 'intro');
    assert.equal(game.level, short2);
    assert.equal(game.score, 2100);
    assert.equal(game.player.hearts, 5);
  });

  test('level 2\'s victory: Back to title, whose next start begins level 1 with score 0', () => {
    const game = journey();
    win(game);
    game.nextLevel();
    click(game);
    win(game);
    game.toTitle();
    assert.equal(game.screen, 'title');
    assert.equal(game.snapshot().level, 1);
    game.pointerDown();
    assert.equal(game.screen, 'intro');
    assert.equal(game.level, short1);
    assert.equal(game.score, 0);
    assert.equal(game.player.hearts, 5);
    assert.deepEqual(screenView(game).band, { lines: ['Zombies have risen in Wonderland. Hold the ruined road!'] });
  });

  test('level 2\'s defeat: Game over and Try again, which restarts level 2 with the score it began with', () => {
    const game = journey();
    win(game);
    game.nextLevel();
    click(game);
    kill(game, game.enemies[0]); // the crow, for 50
    assert.equal(game.score, 2150);
    run(game, 20); // the zombie strikes five times
    assert.equal(game.screen, 'defeat');
    assert.deepEqual(screenView(game).band, { title: 'Game over', lines: ['Final score 2150'], button: 'Try again' });
    game.restart();
    assert.equal(game.screen, 'intro');
    assert.equal(game.level, short2);
    assert.equal(game.score, 2100);
    assert.equal(game.player.hearts, 5);
  });

  test('Next level and Back to title do nothing elsewhere', () => {
    const game = journey();
    game.nextLevel();
    game.toTitle();
    assert.equal(game.screen, 'play');
    assert.equal(game.level, short1);
  });
});

describe('level 2: the HUD and the words', () => {
  test('the right side reads "Level 2 · Wave N / 5", "Wave N cleared" between waves, the boss bar in the fight', () => {
    const game = playing(level2);
    assert.equal(screenView(game).hud.wave, 'Level 2 · Wave 1 / 5');
    clearWave(game);
    assert.deepEqual(screenView(game).band, { lines: ['Wave 1 cleared'] });
    run(game, 3);
    assert.equal(screenView(game).hud.wave, 'Level 2 · Wave 2 / 5');

    const king = toKing();
    assert.equal(screenView(king).hud.wave, null);
    assert.equal(screenView(king).hud.boss, 1);
    assert.equal(king.level.boss.name, 'Scarecrow King');
    assert.equal(level1.boss.name, 'Zombie King');
  });
});

describe('level 2: get_state reports the level', () => {
  test('1 in level 1, 2 in level 2, through the WebMCP tool', async () => {
    const tools = new Map();
    const game = journey();
    await registerWebMcp({ registerTool: (t) => { tools.set(t.name, t); } }, game);
    const getState = tools.get('get_state');
    assert.equal((await getState.execute({})).level, 1);
    win(game);
    game.nextLevel();
    assert.deepEqual(await getState.execute({}), { level: 2, screen: 'intro', wave: 1, score: 2100, hearts: 5, enemies: 0, boss_health: null });
  });
});

test('every model level 2 names has a builder on the stage', () => {
  const stage = readFileSync(new URL('../src/view/stage.js', import.meta.url), 'utf8');
  for (const { model } of level2.scenery) assert.match(stage, new RegExp(`\\b${model}: build`), model);
  assert.match(stage, /\bcrow: \(e\) => buildCrow/);
  assert.match(stage, /\bscarecrowKing: buildScarecrowKing/);
});
