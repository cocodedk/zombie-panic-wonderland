// Spec 33: being webbed: half the speed, no dodging, 2 s of game time, and where it starts and ends.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { level1 } from '../src/levels/level-1.js';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';
import { run } from './helpers.js';
import { started, near } from './fast-helpers.js';
import { fight, untilSpit } from './spider-queen-helpers.js';

// A quiet game on level 3: nothing on the field.
function quiet(options) {
  const game = started(level3, { waves: [{ zombie: 1 }], ...options });
  game.enemies = [];
  game.queue = [];
  return game;
}

describe('the other kings are unchanged', () => {
  const kingFight = (level) => {
    const game = started(level, { waves: [{ zombie: 1 }] });
    game.enemies = [];
    game.spawnBoss();
    run(game, 2.05);
    return game;
  };

  test('the Zombie King stomps, the Scarecrow King throws flaming pumpkins, and neither spits', () => {
    const zombieKing = kingFight(level1);
    assert.equal(zombieKing.stomps.length, 1);
    assert.equal(zombieKing.pumpkins.length, 0);
    const scarecrowKing = kingFight(level2);
    assert.equal(scarecrowKing.pumpkins.length, 1);
    assert.equal(scarecrowKing.pumpkins[0].flaming, true);
    assert.equal(scarecrowKing.pumpkins[0].web, false);
    assert.equal(scarecrowKing.player.webbed, 0);
  });
});

describe('the web ball uses the queen\'s own flight and splash', () => {
  const with_ = (spit) => fight({ level: { ...level3, boss: { ...level3.boss, spit: { ...level3.boss.spit, ...spit } } } });

  test('spit.flight sets how long it flies', () => {
    const game = with_({ flight: 2 });
    const ball = untilSpit(game);
    assert.equal(ball.flight, 2);
    run(game, 1.5);
    assert.equal(game.pumpkins.length, 1);
    run(game, 0.5);
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.player.hearts, 4);
  });

  test('spit.splash sets how near it must land to hurt', () => {
    for (const [splash, dx, hurt] of [[0.5, 0.7, false], [0.5, 0.4, true], [2, 1.5, true]]) {
      const game = with_({ splash });
      const ball = untilSpit(game);
      run(game, 1.19);
      game.player.x = ball.x + dx;
      run(game, 0.01);
      assert.equal(game.player.hearts, hurt ? 4 : 5, `splash ${splash} at ${dx}`);
    }
  });
});

describe('the queen\'s body is about 1 up, not 3', () => {
  test('a launcher blast at her feet reaches her, and her middle is at 0.96', () => {
    const game = fight();
    const boss = game.enemies[0];
    assert.equal(game.centre(boss).y, 0.96);
    game.explode({ x: boss.x, y: 0, z: boss.z });
    assert.equal(boss.health, 260 - 12);
  });

  test('the kings\' middles are still 3 up, out of reach of a blast on the ground', () => {
    for (const level of [level1, level2]) {
      const game = fight({ level });
      const boss = game.enemies[0];
      assert.equal(game.centre(boss).y, 3);
      game.explode({ x: boss.x, y: 0, z: boss.z });
      assert.equal(boss.health, level.boss.hits);
    }
  });
});

describe('the balance bounds, in the data', () => {
  test('260 hits, one action every 3 s, at most 1 heart, a web of 2 s at half speed, 3 spiders of 2 hits', () => {
    const b = level3.boss;
    assert.ok(b.hits > level1.boss.hits && b.hits > level2.boss.hits);
    assert.equal(b.hits, 260);
    assert.equal(b.actionEvery, 3);
    assert.ok(b.spit.hearts <= 1);
    assert.deepEqual([b.spit.slowTime, b.spit.slow], [2, 0.5]);
    assert.deepEqual([b.summon, level3.enemies.spider.hits], [3, 2]);
    assert.equal(level3.player.fireRate, 8);
  });
});

describe('webbed', () => {
  test('the sideways speed is halved', () => {
    for (const [webbed, x] of [[0, 3], [2, 1.5]]) {
      const game = quiet();
      game.player.webbed = webbed;
      game.setMove(1);
      run(game, 0.5);
      near(game.player.x, x, 1e-6, `webbed ${webbed}`);
    }
  });

  test('dodging is refused, and comes back when the web has run out', () => {
    const game = quiet();
    game.player.webbed = 1;
    assert.equal(game.dodge(), false);
    assert.equal(game.dodging, false);
    run(game, 0.99);
    assert.equal(game.dodge(), false);
    run(game, 0.02);
    assert.equal(game.player.webbed, 0);
    assert.equal(game.dodge(), true);
  });

  test('it runs out after 2 s of game time', () => {
    const game = quiet();
    game.player.webbed = 2;
    run(game, 1.99);
    assert.ok(game.player.webbed > 0);
    run(game, 0.02);
    assert.equal(game.player.webbed, 0);
  });

  test('being webbed again while webbed restarts it at 2, it does not add up', () => {
    const game = fight();
    const ball = untilSpit(game);
    game.player.webbed = 1.5;
    run(game, 1.2);
    assert.equal(game.pumpkins.includes(ball), false);
    assert.equal(game.player.webbed, 2);
    game.land({ web: true, x: game.player.x, hearts: 1 });
    assert.equal(game.player.webbed, 2);
  });

  test('it stands still while paused', () => {
    const game = quiet();
    game.player.webbed = 2;
    run(game, 0.5);
    game.pressEsc();
    run(game, 5);
    near(game.player.webbed, 1.5, 1e-6);
    game.pressEsc();
    run(game, 0.5);
    near(game.player.webbed, 1, 1e-6);
  });

  test('a level start, Try again and Play again clear it', () => {
    const game = quiet();
    game.player.webbed = 1.5;
    game.begin(game.level, 0);
    assert.equal(game.player.webbed, 0);
    game.player.webbed = 1.5;
    game.end('defeat');
    game.restart();
    assert.equal(game.player.webbed, 0);
    game.player.webbed = 1.5;
    game.end('victory');
    game.restart();
    assert.equal(game.player.webbed, 0);
  });
});
