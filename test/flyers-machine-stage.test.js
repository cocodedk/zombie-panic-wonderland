// Spec 42: the stage's crows and bats, and those flying away, have the machine look (against test/fake-three.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';
import { run } from './helpers.js';
import { started } from './fast-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

const all = (root, test) => { const found = []; root.traverse((o) => { if (test(o)) found.push(o); }); return found; };
const hex = (m) => `#${m.material.color.getHexString()}`;

function stageFor(game) {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
}

function checkCrow(crow) {
  assert.equal(hex(crow.children[0]), '#2c3038');
  assert.equal(hex(crow.children[1].children[1]), '#e0a838');
  const glows = all(crow, (o) => o instanceof THREE.Sprite);
  assert.equal(glows.length, 2);
  assert.ok(glows.every((g) => hex(g) === '#ff3b1a' && g.scale.x === 0.22));
  assert.equal(all(crow, (o) => o.geometry instanceof THREE.CylinderGeometry).length, 1, 'the gear');
}

// Plays on until its dive is over and it is gone from the game (only a drawing flies away).
function untilGone(game) {
  for (let i = 0; i < 50 && game.enemies.length; i++) run(game, 0.1);
  assert.equal(game.enemies.length, 0);
}

function checkBat(bat) {
  const [body] = all(bat, (o) => o.name === 'body');
  assert.equal(hex(body), '#34373d');
  assert.equal(all(bat, (o) => o.name === 'spar').length, 6);
  const glows = all(bat, (o) => o instanceof THREE.Sprite);
  assert.equal(glows.length, 2);
  assert.ok(glows.every((g) => hex(g) === '#ff2a1a' && g.scale.x === 0.14));
}

for (const [name, level] of [['2', level2], ['3', level3]]) {
  test(`level ${name}: a crow, in flight and flying away after its dive, is the machine crow`, () => {
    const game = started(level, { waves: [{ crow: 1 }], random: () => 0.5 });
    const draw = stageFor(game);
    run(game, 1);
    const [crow] = draw().children.filter((c) => c.name === 'crow');
    checkCrow(crow);
    untilGone(game);
    const [leaving] = draw().children.filter((c) => c.name === 'crow');
    assert.ok(leaving, 'flying away');
    checkCrow(leaving);
  });
}

test('level 3: a bat, in flight and flying away after its dive, is the machine bat', () => {
  const game = started(level3, { waves: [{ bat: 1 }], random: () => 0.5 });
  const draw = stageFor(game);
  run(game, 1);
  checkBat(draw().children.find((c) => c.name === 'bat'));
  untilGone(game);
  const leaving = draw().children.find((c) => c.name === 'bat');
  assert.ok(leaving, 'flying away');
  checkBat(leaving);
});
