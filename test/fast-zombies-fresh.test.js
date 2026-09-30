// Spec 18: paused, a fast zombie freezes; every kind of fresh start begins the count for "every 4th"
// again; and the files stay within their limits.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/logic/game.js';
import { level2 } from '../src/levels/level-2.js';
import { run, click, calm, level1 } from './helpers.js';
import { sendWave, fastAmongFour, arrival } from './fast-helpers.js';

const zombiesOf = (order) => order.filter((e) => e.kind === 'zombie');

describe('6. pause and fresh starts', () => {
  test('paused, a fast zombie stands still and goes on from the same place', () => {
    const { game, fast } = fastAmongFour(level1, () => 0.5);
    run(game, 2);
    const at = fast.z;
    game.pressEsc();
    run(game, 5);
    assert.equal(fast.z, at);
    game.pressEsc();
    assert.ok(Math.abs(arrival(game, fast) - (6.25 - 2)) <= 0.05, 'it still has 4.25 seconds to go');
  });

  // A game of both levels in the middle of wave 3, three zombies sent.
  const midWave = () => {
    const game = new Game(level1, { random: () => 0.5, levels: [level1, calm(level2)] });
    game.loaded();
    click(game);
    click(game);
    game.player.hearts = 999;
    sendWave(game, 3);
    game.sent = 3;
    return game;
  };
  // After a fresh start, at the card or the title: nothing is left over, wave 1 has no fast zombie and
  // wave 2 its 4th. `clicks` go from here to the play.
  const fresh = (game, why, clicks = 1) => {
    assert.equal(game.sent, 0, why);
    assert.deepEqual(game.enemies, [], why);
    for (let i = 0; i < clicks; i++) click(game);
    game.player.hearts = 999;
    run(game, 8); // wave 1 sends itself
    const zombies = game.enemies.filter((e) => e.kind === 'zombie');
    assert.equal(zombies.length, game.level.waves[0].zombie, why);
    assert.deepEqual(zombies.filter((e) => e.fast), [], `${why}: wave 1`);
    const n = game.level.waves[1].zombie;
    assert.deepEqual(zombiesOf(sendWave(game, 2)).map((z) => z.fast), Array.from({ length: n }, (_, k) => (k + 1) % 4 === 0), `${why}: wave 2`);
  };

  test('each of Try again, Play again, Next level and Back to title starts fresh', () => {
    let game = midWave();
    game.end('defeat');
    game.restart(); // Try again
    assert.equal(game.screen, 'intro');
    fresh(game, 'try again');

    game = midWave();
    game.end('victory');
    game.restart(); // Play again
    assert.equal(game.screen, 'intro');
    fresh(game, 'play again');

    game = midWave();
    game.end('victory');
    game.nextLevel();
    assert.equal(game.level.number, 2);
    fresh(game, 'next level');

    game = midWave();
    game.end('victory');
    game.toTitle();
    assert.equal(game.screen, 'title');
    fresh(game, 'back to title', 2); // the title starts the level, then the card starts the play
  });

  test('a level start, from the title, is fresh too', () => {
    const game = new Game(level1, { random: () => 0.5 });
    game.loaded();
    fresh(game, 'level start', 2);
  });
});

describe('8. sizes', () => {
  const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;

  test('game.js is at most 25 lines longer than before (834), stage.js at most 10 (316)', () => {
    assert.ok(lines('src/logic/game.js') <= 834 + 25, `${lines('src/logic/game.js')}`);
    assert.ok(lines('src/view/stage.js') <= 316 + 10, `${lines('src/view/stage.js')}`);
  });

  test('the new files are under 200 lines', () => {
    for (const path of ['src/view/models/zombie.js', 'test/fast-helpers.js', 'test/fast-zombies.test.js', 'test/fast-zombies-fresh.test.js', 'test/fast-zombies-view.test.js']) {
      assert.ok(lines(path) < 200, `${path}: ${lines(path)}`);
    }
  });
});
