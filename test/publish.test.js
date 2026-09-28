import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const pages = read('.github/workflows/pages.yml');

test('pages.yml deploys on push to main and on demand', () => {
  assert.match(pages, /^name: Deploy Pages$/m);
  assert.match(pages, /^on:\n  push:\n    branches: \[main\]\n  workflow_dispatch:$/m);
});

test('pages.yml has the Pages permissions and a non-cancelling concurrency group', () => {
  assert.match(pages, /^permissions:\n  contents: read\n  pages: write\n  id-token: write$/m);
  assert.match(pages, /^concurrency:\n  group: pages\n  cancel-in-progress: false$/m);
  assert.match(pages, /^jobs:\n  deploy:\n[\s\S]*?environment:\n      name: github-pages$/m);
});

test('pages.yml uses the pinned actions in order', () => {
  const uses = [...pages.matchAll(/uses: (\S+ # \S+)/g)].map((m) => m[1]);
  assert.deepEqual(uses, [
    'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
    'actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0',
    'actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0',
    'actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1',
  ]);
  assert.match(pages, /upload-pages-artifact@\S+ # v5\.0\.0\n        with:\n          path: _site$/m);
  assert.match(pages, /- id: deployment\n        uses: actions\/deploy-pages@/);
});

test('pages.yml copies exactly CNAME, index.html, style.css, llms.txt and src/ into _site', () => {
  const copies = [...pages.matchAll(/^\s*cp .*$/gm)].map((m) => m[0].trim());
  assert.deepEqual(copies, ['cp -r CNAME index.html style.css llms.txt src _site/']);
});

test('README.md has the play link, the local command and the test command', () => {
  const readme = read('README.md');
  assert.match(readme, /^Play it: https:\/\/wonderland\.cocode\.dk\/$/m);
  assert.match(readme, /python3 -m http\.server/);
  assert.match(readme, /node --test/);
});
