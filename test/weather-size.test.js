// Spec 16: the new files stay under 200 lines, and the three big ones grow only by the calls, hooks and data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const lines = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n').length - 1;

test('the new source and test files are under 200 lines', () => {
  const tests = readdirSync(new URL('.', import.meta.url)).filter((f) => f.startsWith('weather')).map((f) => `test/${f}`);
  const files = ['src/logic/weather.js', 'src/view/weather.js', 'src/view/audio-weather.js', ...tests];
  assert.ok(files.length >= 10, files.join());
  for (const file of files) assert.ok(lines(file) < 200, `${file}: ${lines(file)}`);
});

test('game.js, stage.js and audio.js are each at most 25 lines longer than before', () => {
  for (const [file, was] of [['src/logic/game.js', 829], ['src/view/stage.js', 313], ['src/view/audio.js', 235]]) {
    assert.ok(lines(file) <= was + 25, `${file}: ${lines(file)} lines, was ${was}`);
  }
});
