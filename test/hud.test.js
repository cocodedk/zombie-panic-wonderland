import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHud } from '../src/view/hud.js';
import { run, kill, click, clearWave } from './helpers.js';
import { short1, short2, journey, win } from './journey.js';

const SELECTORS = [
  '#plain', '#hud', '#hearts', '#score', '#wave', '#bossbar', '#bossbar i', '#bossbar span', '#band', '#band h1',
  '#band .lines', '#band button', '#band button + button', '#sound', '#crosshair', '#stage',
];

class FakeElement extends EventTarget {
  hidden = false;
  textContent = '';
  style = {};
  classList = { toggle() {} };
  click() {
    this.dispatchEvent(new Event('click'));
  }
}

// The page's elements, one per selector the HUD asks for.
function page(game) {
  const els = Object.fromEntries(SELECTORS.map((s) => [s, new FakeElement()]));
  const doc = { querySelector: (s) => els[s] ?? null, body: new FakeElement() };
  const hud = createHud(doc, game);
  const first = els['#band button'];
  const second = els['#band button + button'];
  // What a person sees: the buttons that are showing, by their words.
  const buttons = () => {
    hud.render();
    return els['#band'].hidden ? [] : [first, second].filter((b) => !b.hidden).map((b) => b.textContent);
  };
  const press = (words) => {
    hud.render();
    const button = [first, second].find((b) => !b.hidden && b.textContent === words);
    assert.ok(button, `a button "${words}" is showing`);
    button.click();
    hud.render();
  };
  return { els, buttons, press };
}

test('index.html has two buttons side by side in the band, and a label on the boss bar', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<div id="band"[\s\S]*<div class="buttons">\s*<button type="button" hidden><\/button>\s*<button type="button" hidden><\/button>\s*<\/div>/);
  assert.match(html, /<div id="bossbar" hidden><span>Zombie King<\/span>/);
});

test('clicking Next level on level 1\'s victory shows level 2\'s intro card', () => {
  const game = journey();
  const { els, buttons, press } = page(game);
  win(game);
  assert.deepEqual(buttons(), ['Play again', 'Next level']);
  press('Next level');
  assert.equal(game.screen, 'intro');
  assert.equal(game.level, short2);
  assert.equal(els['#band .lines'].textContent, 'The yellow brick road is crumbling. Keep going!');
  assert.equal(els['#wave'].textContent, 'Level 2 · Wave 1 / 1');
  assert.deepEqual(buttons(), []);
});

test('clicking Play again on level 1\'s victory replays level 1', () => {
  const game = journey();
  const { buttons, press } = page(game);
  win(game);
  press('Play again');
  assert.equal(game.screen, 'intro');
  assert.equal(game.level, short1);
  assert.equal(game.score, 0);
  assert.deepEqual(buttons(), []);
});

test('level 2\'s victory: clicking Play again replays level 2 with the score it began with', () => {
  const game = journey();
  const { buttons, press } = page(game);
  win(game);
  press('Next level');
  click(game);
  win(game);
  assert.deepEqual(buttons(), ['Play again', 'Back to title']);
  press('Play again');
  assert.equal(game.screen, 'intro');
  assert.equal(game.level, short2);
  assert.equal(game.score, 2100);
});

test('level 2\'s victory: clicking Back to title shows the title, and its next start is level 1 with score 0', () => {
  const game = journey();
  const { els, buttons, press } = page(game);
  win(game);
  press('Next level');
  click(game);
  win(game);
  press('Back to title');
  assert.equal(game.screen, 'title');
  assert.equal(els['#band h1'].textContent, 'Zombie Panic in Wonderland');
  assert.deepEqual(buttons(), []);
  game.pointerDown();
  assert.equal(game.level, short1);
  assert.equal(game.score, 0);
});

test('level 2\'s defeat: clicking Try again restarts level 2 from its intro card', () => {
  const game = journey();
  const { buttons, press } = page(game);
  win(game);
  press('Next level');
  click(game);
  kill(game, game.enemies[0]);
  run(game, 20);
  assert.equal(game.screen, 'defeat');
  assert.deepEqual(buttons(), ['Try again']);
  press('Try again');
  assert.equal(game.screen, 'intro');
  assert.equal(game.level, short2);
  assert.equal(game.score, 2100);
  assert.equal(game.player.hearts, 5);
});

test('the boss bar is labelled Zombie King in level 1 and Scarecrow King in level 2', () => {
  const game = journey();
  const { els, buttons, press } = page(game);
  win(game);
  buttons();
  assert.equal(els['#bossbar span'].textContent, 'Zombie King');
  press('Next level');
  click(game);
  clearWave(game);
  run(game, 3 + 2 + 0.05); // the fight has begun
  assert.deepEqual(buttons(), []);
  assert.equal(els['#bossbar'].hidden, false);
  assert.equal(els['#wave'].hidden, true);
  assert.equal(els['#bossbar span'].textContent, 'Scarecrow King');
});
