import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { Game } from '../src/logic/game.js';
import { level1 } from '../src/levels/level-1.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const SITE = 'https://wonderland.cocode.dk/';
const head = read('index.html').match(/<head>([\s\S]*?)<\/head>/)[1];
const meta = (attr, key) => head.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)">`))?.[1];
const link = (rel) => head.match(new RegExp(`<link rel="${rel}"[^>]*href="([^"]*)">`))?.[1];

const DESCRIPTION = 'Play a free low-poly 3D zombie shooter in your browser: hold the ruined road against waves of zombies and pumpkin monsters, then face the Zombie King.';
const SHARE = 'Zombies have risen in Wonderland. Grab a scattergun, blow up gas canisters and hold the road — free, in your browser.';
const ALT = 'The Zombie King and three zombies coming down a ruined road at dusk.';
const TITLE = 'Zombie Panic in Wonderland';

test('1. the head: title, description, robots, canonical, theme colour and favicon', () => {
  assert.match(head, /<title>Zombie Panic in Wonderland — a low-poly zombie shooter<\/title>/);
  assert.equal(meta('name', 'description'), DESCRIPTION);
  assert.equal(meta('name', 'robots'), 'index, follow');
  assert.equal(link('canonical'), SITE);
  assert.equal(meta('name', 'theme-color'), '#2b1d3f');
  assert.equal(link('icon'), `${SITE}favicon.svg`);
});

test('1. Open Graph and Twitter, with absolute addresses', () => {
  assert.equal(meta('property', 'og:type'), 'website');
  assert.equal(meta('property', 'og:site_name'), TITLE);
  assert.equal(meta('property', 'og:title'), TITLE);
  assert.equal(meta('property', 'og:description'), SHARE);
  assert.equal(meta('property', 'og:url'), SITE);
  assert.equal(meta('property', 'og:image'), `${SITE}og.png`);
  assert.equal(meta('property', 'og:image:width'), '1200');
  assert.equal(meta('property', 'og:image:height'), '630');
  assert.equal(meta('property', 'og:image:alt'), ALT);
  assert.equal(meta('property', 'og:locale'), 'en_US');
  assert.equal(meta('name', 'twitter:card'), 'summary_large_image');
  assert.equal(meta('name', 'twitter:title'), TITLE);
  assert.equal(meta('name', 'twitter:description'), SHARE);
  assert.equal(meta('name', 'twitter:image'), `${SITE}og.png`);
  assert.equal(meta('name', 'twitter:image:alt'), ALT);
  for (const [, url] of head.matchAll(/(?:href|content)="(\/[^"]*|\.\/[^"]*|[\w-]+\.(?:png|svg|xml))"/g)) {
    if (url !== 'style.css') assert.fail(`${url} is not absolute`);
  }
});

test('1. the structured data parses as a schema.org VideoGame', () => {
  const scripts = [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.deepEqual(JSON.parse(scripts[0][1]), {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: TITLE,
    description: DESCRIPTION,
    url: SITE,
    image: `${SITE}og.png`,
    genre: ['Shooter', 'Arcade'],
    gamePlatform: 'Web browser',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    inLanguage: 'en',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    codeRepository: 'https://github.com/cocodedk/zombie-panic-wonderland',
    author: {
      '@type': 'Person',
      name: 'Babak Bandpey',
      url: 'https://cocode.dk',
      sameAs: ['https://linkedin.com/in/babakbandpey', 'https://github.com/cocodedk'],
    },
  });
});

test('2. og.png is a 1200 × 630 PNG under 600 KB, made from og.html; favicon.svg is an SVG', () => {
  const png = readFileSync(new URL('og.png', root));
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(statSync(new URL('og.png', root)).size < 600 * 1024);
  assert.ok(existsSync(new URL('og.html', root)));
  assert.match(read('favicon.svg'), /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[\s\S]*<\/svg>\s*$/);
});

test('3. robots.txt allows everything and names the sitemap; sitemap.xml has one url', () => {
  assert.equal(read('robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
  const sitemap = read('sitemap.xml');
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]), [SITE]);
});

test('4. the Pages workflow copies the four new files, and nothing else in it changed', () => {
  assert.equal(read('.github/workflows/pages.yml'), `name: Deploy Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - name: Copy the site
        run: |
          mkdir _site
          cp -r CNAME index.html style.css llms.txt og.png favicon.svg robots.txt sitemap.xml src _site/
      - uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0
      - uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0
        with:
          path: _site
      - id: deployment
        uses: actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1
`);
});

test('5. llms.txt: a title, a quoted summary, the three sections, and every field get_state returns', () => {
  const llms = read('llms.txt');
  assert.match(llms, /^# .+\n\n> .+\n/);
  assert.deepEqual([...llms.matchAll(/^## (.+)$/gm)].map((m) => m[1]), ['Play', 'WebMCP tools', 'Source']);
  assert.match(llms, /https:\/\/github\.com\/cocodedk\/zombie-panic-wonderland/);
  const fields = Object.keys(new Game(level1).snapshot());
  assert.equal(fields.length, 10);
  assert.match(llms, new RegExp(`\\{ ${fields.join(', ')} \\}`));
  for (const f of fields) assert.match(llms, new RegExp(`- \`${f}\` is `), f);
});
