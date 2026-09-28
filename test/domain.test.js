import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('CNAME holds exactly one line: wonderland.cocode.dk', () => {
  assert.equal(read('CNAME'), 'wonderland.cocode.dk\n');
});

test('llms.txt names https://wonderland.cocode.dk/ as the page address', () => {
  assert.match(read('llms.txt'), /https:\/\/wonderland\.cocode\.dk\//);
});

test('no tracked file names the old Pages address', () => {
  const old = ['cocodedk.github.io', 'zombie-panic-wonderland'].join('/');
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const naming = files.filter((f) => read(f).includes(old));
  assert.deepEqual(naming, []);
});
