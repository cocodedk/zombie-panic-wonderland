import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { screenView, TEXT } from '../src/logic/screens.js';
import { newGame, playing, levelWith, run, kill, clearWave, click, level1 } from './helpers.js';

// The weapon line with only the Popper, in hand.
const POPPER_ONLY = [
  { weapon: 'popper', text: '1 Popper ∞', state: 'hand' },
  { weapon: 'scattergun', text: '2 Scattergun —', state: 'none' },
  { weapon: 'launcher', text: '3 Launcher —', state: 'none' },
];

test('7. loading shows only "Loading…", then the title screen', () => {
  const game = new Game(level1);
  assert.equal(game.screen, 'loading');
  assert.deepEqual(screenView(game), { plain: 'Loading…', band: null, hud: null, pointer: true });
  game.loaded();
  assert.equal(game.screen, 'title');
});

test('7. the two errors show only their message', () => {
  for (const [kind, text] of [
    ['network', 'The game could not load. Check your connection and reload the page.'],
    ['webgl', 'Your browser cannot show 3D graphics (WebGL). Try another browser.'],
  ]) {
    const game = new Game(level1);
    game.fail(kind);
    assert.equal(game.screen, 'error');
    assert.deepEqual(screenView(game), { plain: text, band: null, hud: null, pointer: true });
    game.pointerDown();
    game.pressEsc();
    game.loaded();
    assert.equal(game.screen, 'error');
  }
});

test('7. the title: name, click to start, controls; no HUD, pointer visible; only the click works', () => {
  const game = newGame();
  const view = screenView(game);
  assert.equal(view.band.title, 'Zombie Panic in Wonderland');
  assert.deepEqual(view.band.lines, [
    'Click to start',
    'A / D or ← / → move · mouse aims · hold the left button to shoot · Space dodges · Esc pauses · 1 2 3 or wheel: weapons · R reloads · M sound: on',
  ]);
  assert.equal(view.hud, null);
  assert.equal(view.pointer, true);
  game.setMove(1);
  assert.equal(game.dodge(), false);
  game.pressEsc();
  run(game, 5);
  assert.equal(game.screen, 'title');
  assert.equal(game.player.x, 0);
  game.setMove(0);
  game.pointerDown();
  assert.equal(game.screen, 'intro');
});

test('7. the intro card: 3 seconds with the HUD, full control, then wave 1', () => {
  const game = newGame();
  game.pointerDown();
  const view = screenView(game);
  assert.deepEqual(view.band, { lines: ['Zombies have risen in Wonderland. Hold the ruined road!'] });
  assert.deepEqual(view.hud, { hearts: 5, score: 'SCORE 000000', wave: 'Wave 1 / 5', boss: null, sound: '♪ on', weapons: POPPER_ONLY, notice: null, hint: null });
  assert.equal(view.pointer, false);
  game.setMove(1);
  run(game, 1);
  assert.ok(game.player.x > 5);
  assert.ok(game.dodge());
  run(game, 1.99);
  assert.equal(game.screen, 'intro');
  run(game, 0.01);
  assert.equal(game.screen, 'play');
  assert.equal(game.enemies.length, 1);
  assert.equal(screenView(game).band, null);
});

test('7. a click skips the intro card and fires no shot', () => {
  const game = newGame();
  click(game);
  assert.equal(game.screen, 'intro'); // releasing the press that started does not skip
  game.pointerDown();
  run(game, 0.2);
  game.pointerUp();
  assert.equal(game.screen, 'play');
  assert.equal(game.firing, false);
  run(game, 1);
  assert.equal(game.shots, 0);
});

test('7. holding the button on the intro card shoots, and does not skip it', () => {
  const game = newGame();
  click(game);
  game.pointerDown();
  run(game, 1.2); // firing from 0.25 s, 8 shots a second
  assert.equal(game.screen, 'intro');
  assert.equal(game.shots, 8);
  game.pointerUp();
  assert.equal(game.screen, 'intro');
  run(game, 0.5);
  assert.equal(game.shots, 8);
  run(game, 1.35); // the card's 3 seconds run out as usual
  assert.equal(game.screen, 'play');
});

test('7. play: the HUD, the cleared banner, the boss bar in place of the wave text', () => {
  const game = playing();
  assert.deepEqual(screenView(game).hud, { hearts: 5, score: 'SCORE 000000', wave: 'Wave 1 / 5', boss: null, sound: '♪ on', weapons: POPPER_ONLY, notice: null, hint: null });
  clearWave(game);
  assert.deepEqual(screenView(game).band, { lines: ['Wave 1 cleared'] });
  assert.equal(screenView(game).hud.score, 'SCORE 000400');
  for (let w = 1; w < 5; w++) {
    run(game, 3);
    clearWave(game);
  }
  run(game, 3);
  assert.deepEqual(screenView(game).band, { lines: ['The Zombie King is here!'] });
  assert.equal(screenView(game).hud.wave, 'Wave 5 / 5');
  run(game, 2);
  const boss = game.enemies[0];
  game.setAim(boss.id);
  for (let i = 0; i < 50; i++) game.shoot();
  assert.equal(screenView(game).hud.wave, null);
  assert.equal(screenView(game).hud.boss, 0.75);
});

test('7. pause: the text, the HUD stays', () => {
  const game = playing();
  game.pressEsc();
  const view = screenView(game);
  assert.deepEqual(view.band, { lines: ['Paused — press Esc to go on'] });
  assert.equal(view.hud.wave, 'Wave 1 / 5');
});

test('7. victory: the line, the final score and Play again, back to the intro card', () => {
  const game = playing(levelWith([{ zombie: 1 }]));
  kill(game, game.enemies[0]);
  run(game, 3 + 2 + 0.05);
  kill(game, game.enemies[0]);
  run(game, 1.5);
  assert.equal(game.screen, 'victory');
  const view = screenView(game);
  assert.deepEqual(view.band, { title: 'Wonderland is safe — for now.', lines: ['Final score 2100'], button: 'Play again' });
  assert.equal(view.pointer, true);
  assert.ok(view.hud);
  game.pointerDown();
  game.pressEsc();
  assert.equal(game.screen, 'victory');
  game.restart();
  assert.equal(game.screen, 'intro');
});

test('7. defeat: Game over, the final score and Try again, back to the intro card', () => {
  const game = playing(levelWith([{ zombie: 1 }]));
  run(game, 10 + 1.5 * 5 + 0.1);
  assert.equal(game.screen, 'defeat');
  const view = screenView(game);
  assert.deepEqual(view.band, { title: 'Game over', lines: ['Final score 0'], button: 'Try again' });
  assert.equal(view.pointer, true);
  assert.equal(view.hud.hearts, 0);
  game.restart();
  assert.equal(game.screen, 'intro');
  assert.equal(TEXT.tryAgain, 'Try again');
});
