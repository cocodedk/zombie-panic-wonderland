// Spec 28: the web model, and the stage building and disposing it with level 3's backdrop.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { level3 } from '../src/levels/level-3.js';
import { Game } from '../src/logic/game.js';
import { click, level1 } from './helpers.js';
import { short1, short2, win } from './journey.js';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');
const { buildWeb } = await import('../src/view/models/webs.js');

const meshes = (web) => {
  const found = [];
  web.traverse((m) => { if (m.geometry) found.push(m); });
  return found;
};
const spokes = (web) => web.children.filter((c) => c.name === 'spoke');
const rings = (web) => web.children.filter((c) => c.name === 'ring');

test('a web has 8 spokes (7 with the gap) and 4 rings, each ring of chords', () => {
  const web = buildWeb({ seed: 3 });
  assert.equal(spokes(web).length, 7);
  assert.equal(rings(web).length, 4);
  for (const ring of rings(web)) assert.equal(ring.children.length, 8);
  assert.equal(web.children.length, 7 + 4);
});

test('one spoke is missing, chosen by the seed, and the same seed builds the same web', () => {
  const angle = (s) => Math.atan2(s.position.y - 3, s.position.x);
  const missing = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const web = buildWeb({ seed });
    const present = spokes(web).map((s) => Math.round(((angle(s) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 4)) % 8);
    assert.equal(new Set(present).size, 7);
    missing.add([0, 1, 2, 3, 4, 5, 6, 7].find((i) => !present.includes(i)));
    const again = buildWeb({ seed });
    assert.deepEqual(meshes(again).map((m) => [m.name, m.position.x, m.position.y, m.rotation.z]), meshes(web).map((m) => [m.name, m.position.x, m.position.y, m.rotation.z]));
  }
  assert.ok(missing.size > 3, 'the seed chooses which spoke');
});

test('the size and the height asked for: the spokes reach `size` from a centre `height` up', () => {
  for (const [size, height] of [[2, 3], [2.6, 4], [1, 0.5]]) {
    const web = buildWeb({ size, height, seed: 2 });
    for (const s of spokes(web)) {
      const { x, y } = s.position;
      assert.ok(Math.abs(Math.hypot(x, y - height) - size / 2) < 1e-9, 'a spoke\'s middle is half the size from the centre');
      const out = Math.atan2(y - height, x);
      assert.ok(Math.abs(Math.cos(s.rotation.z) - Math.cos(out)) < 1e-9 && Math.abs(Math.sin(s.rotation.z) - Math.sin(out)) < 1e-9, 'and it points out from the centre');
    }
    const outer = rings(web).at(-1).children;
    for (const c of outer) {
      const chordMid = Math.hypot(c.position.x, c.position.y - height);
      assert.ok(chordMid < size && chordMid > size * 0.9, `the outer ring's chords sit at the size: ${chordMid}`);
    }
  }
});

test('flat-lit, unfogged, double-sided, in its colour at 0.55 opacity; the default colour is #d8e0ea', () => {
  for (const [args, color] of [[{}, '#d8e0ea'], [{ color: '#112233' }, '#112233']]) {
    const all = meshes(buildWeb(args));
    assert.equal(all.length, 7 + 32);
    for (const m of all) {
      assert.ok(m.material instanceof THREE.MeshBasicMaterial);
      assert.equal(`#${m.material.color.getHexString()}`, color);
      assert.equal(m.material.opacity, 0.55);
      assert.equal(m.material.transparent, true);
      assert.equal(m.material.side, THREE.DoubleSide);
      assert.equal(m.material.fog, false);
    }
  }
});

test('shots pass through it: no mesh takes a ray', () => {
  const all = meshes(buildWeb({ size: 2.4, height: 3.4 }));
  assert.ok(all.length > 30);
  assert.ok(all.every((m) => typeof m.raycast === 'function' && m.raycast() === undefined));
});

test('the stage builds `web` scenery, in the order the level lists it, and disposes it with the backdrop', () => {
  const stageSource = readFileSync(new URL('../src/view/stage.js', import.meta.url), 'utf8');
  assert.match(stageSource, /\bweb: buildWeb\b/);

  const game = new Game(short1, { levels: [short1, short2, { ...level3, waves: [{ zombie: 1 }], weather: null }], random: () => 0.5 });
  game.loaded();
  click(game);
  click(game);
  const stage = createStage({ appendChild() {} }, game.level);
  stage.sync(game, 0.01);
  const scene = THREE.renderers.at(-1).scene;
  const backdrop = () => scene.children.filter((c) => c.name === 'backdrop');
  assert.equal(backdrop()[0].children.filter((c) => c.name === 'web').length, 0);

  win(game);
  game.nextLevel();
  click(game);
  win(game);
  game.nextLevel();
  stage.sync(game, 0.01);
  assert.equal(backdrop().length, 1);
  const [now] = backdrop();
  assert.deepEqual(now.children.filter((c) => c.name).map((c) => c.name), level3.scenery.map((s) => s.model));
  const webs = now.children.filter((c) => c.name === 'web');
  assert.equal(webs.length, 6);
  assert.deepEqual(webs.map((w) => [w.position.x, w.position.z, w.rotation.y]), level3.scenery.filter((s) => s.model === 'web').map((s) => [s.x, s.z, s.turn]));
  assert.equal(meshes(now).filter((m) => m.name === 'chord' || m.name === 'spoke').length, 6 * 39);
  assert.equal(`#${scene.fog.color.getHexString()}`, '#1d2b2a');
  assert.equal(scene.children.length, 2); // the backdrop and the player

  click(game);
  win(game);
  const before = THREE.disposed.geometries;
  game.toTitle();
  stage.sync(game, 0.01);
  assert.equal(game.level, short1);
  assert.equal(backdrop().length, 1);
  assert.equal(backdrop()[0].children.filter((c) => c.name === 'web').length, 0);
  assert.ok(THREE.disposed.geometries > before, 'the webs\' geometries go with the old backdrop');
  assert.equal(level1.scenery.some((s) => s.model === 'web'), false);
});
