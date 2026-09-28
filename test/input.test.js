import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindInput } from '../src/view/input.js';
import { newGame, playing } from './helpers.js';

function fakeWindow() {
  const win = new EventTarget();
  win.innerWidth = 800;
  win.innerHeight = 600;
  win.fire = (type, props) => win.dispatchEvent(Object.assign(new Event(type), props));
  return win;
}

function bind(game) {
  const win = fakeWindow();
  const crosshair = [];
  const aim = bindInput(win, game, { crosshairAt: (x, y) => crosshair.push([x, y]) });
  return { win, crosshair, aim };
}

test('the crosshair follows the pointer from the title on, and the starting click places it', () => {
  const game = newGame();
  const { win, crosshair, aim } = bind(game);
  assert.deepEqual(crosshair, [[400, 300]]);
  win.fire('mousemove', { clientX: 200, clientY: 150 });
  assert.deepEqual(crosshair.at(-1), [200, 150]);
  assert.deepEqual(aim, { x: -0.5, y: 0.5 });
  win.fire('mousedown', { button: 0, clientX: 600, clientY: 450 });
  assert.equal(game.screen, 'intro');
  assert.deepEqual(crosshair.at(-1), [600, 450]);
  assert.deepEqual(aim, { x: 0.5, y: -0.5 });
});

test('while paused, the mouse moves neither the crosshair nor the aim; on resume they catch up', () => {
  const game = playing();
  const { win, crosshair, aim } = bind(game);
  win.fire('mousemove', { clientX: 400, clientY: 300 });
  const shown = crosshair.length;

  win.fire('keydown', { code: 'Escape' });
  assert.equal(game.screen, 'paused');
  win.fire('mousemove', { clientX: 800, clientY: 0 });
  win.fire('mousedown', { button: 0, clientX: 800, clientY: 0 });
  assert.equal(crosshair.length, shown);
  assert.deepEqual(aim, { x: 0, y: 0 });
  assert.equal(game.firing, false);

  win.fire('mouseup', { button: 0 });
  win.fire('keydown', { code: 'Escape' });
  assert.equal(game.screen, 'play');
  assert.deepEqual(crosshair.at(-1), [800, 0]);
  assert.deepEqual(aim, { x: 1, y: 1 });
});
