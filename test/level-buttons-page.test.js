// Spec 27: the page's side of the level buttons, with a fake page: the HUD's buttons, the mouse and the keyboard.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHud } from '../src/view/hud.js';
import { bindInput } from '../src/view/input.js';
import { short1, short2 } from './journey.js';
import { titled, screens } from './level-buttons-helpers.js';

class FakeElement extends EventTarget {
  hidden = false;
  textContent = '';
  style = {};
  classList = { toggle() {} };
  children = [];
  disabled = false;
  tabIndex = 0;
  constructor(tagName = 'DIV') {
    super();
    this.tagName = tagName;
  }
  replaceChildren(...nodes) {
    this.children = nodes;
    this.made = (this.made ?? 0) + 1;
  }
  click() {
    this.dispatchEvent(new Event('click'));
  }
}

function page(game) {
  const els = {};
  const doc = {
    querySelector: (s) => (els[s] ??= new FakeElement(s.endsWith('button') ? 'BUTTON' : 'DIV')),
    body: new FakeElement(),
    createElement: (tag) => new FakeElement(tag.toUpperCase()),
  };
  const hud = createHud(doc, game);
  const levels = doc.querySelector('#band .levels');
  const others = [doc.querySelector('#band button'), doc.querySelector('#band button + button')];
  // What Tab reaches on the page as it shows: real, enabled buttons that are not hidden.
  const tabOrder = () => [...levels.children, ...others].filter((b) => b.tagName === 'BUTTON' && !b.disabled && b.tabIndex >= 0 && !b.hidden && !levels.hidden);
  return { hud, levels, tabOrder };
}

function fakeWindow() {
  const win = new EventTarget();
  win.innerWidth = 800;
  win.innerHeight = 600;
  return win;
}

// An event as the browser sends it to `target`; `defaultPrevented` tells whether the page cancelled it.
function send(win, type, target, props) {
  const e = Object.assign(new Event(type, { cancelable: true }), { clientX: 1, clientY: 1, ...props });
  Object.defineProperty(e, 'target', { value: target });
  win.dispatchEvent(e);
  return e;
}

// A mouse press on `target`: down, up, then the click a browser sends to a button.
function mouse(win, target) {
  send(win, 'mousedown', target, { button: 0 });
  send(win, 'mouseup', target, { button: 0 });
  if (target.tagName === 'BUTTON') target.click();
}

// A key pressed on the focused `target`, as a browser treats a button: Enter clicks on keydown, Space on
// keyup, and only if the page did not cancel the keydown.
function key(win, target, code) {
  const down = send(win, 'keydown', target, { code });
  if (code === 'Enter' && !down.defaultPrevented && target.tagName === 'BUTTON') target.click();
  send(win, 'keyup', target, { code });
  if (code === 'Space' && !down.defaultPrevented && target.tagName === 'BUTTON') target.click();
  return down;
}

test('5. the HUD makes two real buttons on the title, hides them elsewhere, and does not remake them', () => {
  const game = titled();
  const { hud, levels, tabOrder } = page(game);
  hud.render();
  assert.equal(levels.hidden, false);
  assert.deepEqual(levels.children.map((b) => b.textContent), ['Level 1', 'Level 2']);
  for (const b of levels.children) {
    assert.equal(b.tagName, 'BUTTON');
    assert.equal(b.type, 'button');
  }
  const [one, two] = levels.children;
  assert.deepEqual(tabOrder(), [one, two]);
  hud.render();
  hud.render();
  assert.equal(levels.made, 1);
  assert.deepEqual(levels.children, [one, two]);

  two.click();
  assert.equal(game.level, short2);
  assert.equal(game.screen, 'intro');
  hud.render();
  assert.equal(levels.hidden, true);
  assert.deepEqual(tabOrder(), []);

  for (const other of Object.values(screens()).filter((g) => g.screen !== 'title')) {
    const fresh = page(other);
    fresh.hud.render();
    assert.equal(fresh.levels.hidden, true, other.screen);
  }

  const back = titled();
  const again = page(back);
  again.hud.render();
  again.levels.children[0].click();
  assert.equal(back.level, short1);
  assert.equal(back.screen, 'intro');
});

test('6. pressing a level button starts that level and not level 1; a press elsewhere still starts level 1', () => {
  for (const [pick, level] of [[0, short1], [1, short2]]) {
    const game = titled();
    const { hud, levels } = page(game);
    const win = fakeWindow();
    bindInput(win, game, hud);
    hud.render();
    send(win, 'mousedown', levels.children[pick], { button: 0 });
    assert.equal(game.screen, 'title', 'the press alone starts nothing');
    send(win, 'mouseup', levels.children[pick], { button: 0 });
    levels.children[pick].click();
    assert.equal(game.screen, 'intro');
    assert.equal(game.level, level);
    assert.equal(game.press, null);
  }
  const game = titled();
  const win = fakeWindow();
  bindInput(win, game, page(game).hud);
  mouse(win, new FakeElement('CANVAS'));
  assert.equal(game.screen, 'intro');
  assert.equal(game.level, short1);
});

test('8. the keyboard: Tab reaches each level button, Enter starts its level, Space does not press it', () => {
  const game = titled();
  const { hud, levels, tabOrder } = page(game);
  const win = fakeWindow();
  bindInput(win, game, hud);
  hud.render();
  const [one, two] = tabOrder();
  assert.deepEqual([one, two], levels.children);

  const space = key(win, two, 'Space');
  assert.equal(space.defaultPrevented, true, 'Space is the dodge key');
  assert.equal(game.screen, 'title');
  key(win, one, 'Space');
  assert.equal(game.screen, 'title');

  const enter = key(win, two, 'Enter');
  assert.equal(enter.defaultPrevented, false);
  assert.equal(game.screen, 'intro');
  assert.equal(game.level, short2);
  assert.equal(game.score, 0);

  const first = titled();
  const again = page(first);
  again.hud.render();
  const win2 = fakeWindow();
  bindInput(win2, first, again.hud);
  key(win2, again.levels.children[0], 'Enter');
  assert.equal(first.level, short1);
  assert.equal(first.screen, 'intro');
});
