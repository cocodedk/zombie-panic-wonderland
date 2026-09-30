// Spec 28: getting into and out of level 3, and the title's level buttons.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { screenView } from '../src/logic/screens.js';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';
import { kill, run, click, level1 } from './helpers.js';
import { win, short1 } from './journey.js';
import { journey3, atLevel3, short3 } from './level3-helpers.js';

describe('2. playing through', () => {
  test('Next level on level 2\'s victory starts level 3\'s intro card: 5 hearts, the score carried over', () => {
    const game = journey3();
    win(game);
    game.nextLevel();
    click(game);
    run(game, 11.5); // the zombie strikes once
    assert.equal(game.player.hearts, 4);
    win(game);
    const score = game.score;
    assert.deepEqual(screenView(game).band, { title: 'The road is clear — for now.', lines: [`Final score ${score}`], button: 'Play again', second: 'Next level' });
    game.nextLevel();
    assert.equal(game.screen, 'intro');
    assert.equal(game.level, short3);
    assert.equal(game.player.hearts, 5);
    assert.equal(game.score, score);
    assert.deepEqual(screenView(game).band, { lines: ['The wood is silent. Something watches from the webs.'] });
  });

  test('level 3\'s victory offers Play again and Back to title; Next level does nothing', () => {
    const game = atLevel3();
    const begun = game.score;
    click(game);
    win(game);
    assert.deepEqual(screenView(game).band, { title: 'You made it through the wood — for now.', lines: [`Final score ${game.score}`], button: 'Play again', second: 'Back to title' });
    game.nextLevel();
    assert.equal(game.screen, 'victory');
    game.restart();
    assert.equal(game.screen, 'intro');
    assert.equal(game.level, short3);
    assert.equal(game.score, begun);
    assert.equal(game.player.hearts, 5);
  });

  test('level 3\'s defeat offers Try again, which restarts level 3 with the score it began with', () => {
    const game = atLevel3();
    const begun = game.score;
    click(game);
    kill(game, game.enemies.find((e) => e.kind === 'crow'));
    run(game, 20);
    assert.equal(game.screen, 'defeat');
    assert.deepEqual(screenView(game).band, { title: 'Game over', lines: [`Final score ${begun + 50}`], button: 'Try again' });
    game.restart();
    assert.equal(game.screen, 'intro');
    assert.equal(game.level, short3);
    assert.equal(game.score, begun);
    assert.equal(game.player.hearts, 5);
  });

  test('level 3\'s Back to title brings level 1 back, with score 0', () => {
    const game = atLevel3();
    click(game);
    win(game);
    game.toTitle();
    assert.equal(game.screen, 'title');
    assert.equal(game.snapshot().level, 1);
    game.pointerDown();
    assert.equal(game.level, short1);
    assert.equal(game.score, 0);
  });
});

describe('3. the title\'s level buttons', () => {
  const titled = () => {
    const game = new Game(level1, { levels: [level1, level2, level3] });
    game.loaded();
    return game;
  };

  test('three buttons, the third reading Level 3', () => {
    assert.deepEqual(screenView(titled()).band.levels, [{ text: 'Level 1', index: 0 }, { text: 'Level 2', index: 1 }, { text: 'Level 3', index: 2 }]);
  });

  test('startAt(2) starts level 3: score 0, five hearts, the Popper only', () => {
    const game = titled();
    game.score = 900;
    game.startAt(2);
    assert.equal(game.screen, 'intro');
    assert.equal(game.level, level3);
    assert.equal(game.score, 0);
    assert.equal(game.player.hearts, 5);
    assert.equal(game.weapon, 'popper');
    for (const w of ['scattergun', 'launcher', 'gatling']) assert.equal(game.owns(w), false, w);
    game.restart(); // not on a victory or defeat screen
    assert.equal(game.level, level3);
  });
});
