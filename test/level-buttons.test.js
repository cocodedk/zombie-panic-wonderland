// Spec 27: one button per level on the title. The page's side (tests 5 and 6, the keyboard) is in level-buttons-page.test.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { screenView } from '../src/logic/screens.js';
import { click } from './helpers.js';
import { short1, short2, journey, win } from './journey.js';
import { titled, screens } from './level-buttons-helpers.js';

const LEVELS = [{ text: 'Level 1', index: 0 }, { text: 'Level 2', index: 1 }];
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const lines = (path) => read(path).split('\n').length - 1;

test('1. the title band carries the levels; no other screen does; title and lines are today\'s', () => {
  const all = screens();
  for (const [name, game] of Object.entries(all)) {
    assert.equal(game.screen, name);
    const band = screenView(game).band;
    if (name === 'title') {
      assert.deepEqual(band.levels, LEVELS);
      assert.equal(band.title, 'Zombie Panic in Wonderland');
      assert.equal(band.lines[0], 'Click to start');
      assert.equal(band.lines.length, 2);
    } else assert.ok(!band || !('levels' in band), name);
  }
});

test('2. startAt(1) begins level 2 from its intro card; startAt(0) begins level 1 as the title click does', () => {
  const game = titled();
  game.startAt(1);
  assert.equal(game.screen, 'intro');
  assert.equal(game.level, short2);
  assert.equal(game.score, 0);
  assert.equal(game.player.hearts, 5);
  assert.equal(game.owns('popper'), true);
  for (const w of ['scattergun', 'launcher', 'gatling']) assert.equal(game.owns(w), false, w);
  assert.equal(game.wave, 1);
  assert.equal(game.enemies.length, 0);

  const zero = titled();
  zero.startAt(0);
  const clicked = titled();
  clicked.pointerDown();
  assert.equal(zero.screen, 'intro');
  assert.equal(zero.level, clicked.level);
  assert.equal(zero.score, clicked.score);
  assert.equal(zero.wave, clicked.wave);
});

test('3. startAt does nothing off the title, and for a bad index on the title', () => {
  for (const [name, game] of Object.entries(screens())) {
    if (name === 'title') continue;
    const level = game.level;
    const score = game.score;
    game.startAt(1);
    game.startAt(0);
    assert.equal(game.screen, name);
    assert.equal(game.level, level, name);
    assert.equal(game.score, score, name);
  }
  for (const bad of [-1, 2, 1.5, '1', null, undefined]) {
    const game = titled();
    game.startAt(bad);
    assert.equal(game.screen, 'title', String(bad));
    assert.equal(game.level, short1);
  }
});

test('4. the title click still starts level 1, and Back to title brings the levels back', () => {
  const game = titled();
  game.pointerDown();
  assert.equal(game.screen, 'intro');
  assert.equal(game.level, short1);

  const won = journey();
  win(won);
  won.nextLevel();
  click(won);
  win(won);
  won.toTitle();
  assert.equal(won.screen, 'title');
  assert.deepEqual(screenView(won).band.levels, LEVELS);
  won.startAt(1);
  assert.equal(won.level, short2);
  assert.equal(won.score, 0);
});

test('7. game.js, hud.js and style.css grow within the limits, and index.html has one new container', () => {
  assert.ok(lines('../src/logic/game.js') <= 853 + 8);
  assert.ok(lines('../src/view/hud.js') <= 68 + 16);
  assert.ok(lines('../style.css') <= 170 + 8);
  const html = read('../index.html');
  assert.equal(html.match(/<div class="levels" hidden><\/div>/g).length, 1);
  assert.match(html, /<div class="lines"><\/div>\s*<div class="levels" hidden><\/div>\s*<div class="buttons">/);
});
