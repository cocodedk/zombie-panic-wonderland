import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const js = (dir) => readdirSync(new URL(dir, root)).filter((f) => f.endsWith('.js')).map((f) => `${dir}/${f}`);

test('the game logic and level data do not use three.js', () => {
  for (const file of [...js('src/logic'), ...js('src/levels'), 'src/main.js', 'src/view/hud.js', 'src/view/input.js']) {
    assert.doesNotMatch(read(file), /from ['"]three['"]/, file);
  }
});

test('three.js 0.170.0 comes from jsDelivr through the import map', () => {
  const map = JSON.parse(read('index.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  assert.equal(map.imports.three, 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
});

test('the overlay band stacks above the stage', () => {
  const css = read('style.css');
  const z = (sel) => Number(css.match(new RegExp(`${sel} \\{[^}]*z-index: (\\d+)`))[1]);
  assert.ok(z('#band') > z('#stage, #stage canvas'));
  assert.ok(z('#hud') > z('#band') && z('#crosshair') > z('#hud') && z('#plain') > z('#crosshair'));
});

test('every scenery model in the level has a builder on the stage', async () => {
  const { level1 } = await import('../src/levels/level-1.js');
  const stage = read('src/view/stage.js');
  for (const { model } of level1.scenery) assert.match(stage, new RegExp(`\\b${model}: build`), model);
});
