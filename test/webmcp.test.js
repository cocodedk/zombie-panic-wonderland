import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { registerWebMcp, DESCRIPTION } from '../src/logic/webmcp.js';
import { playing, run, click, level1 } from './helpers.js';

function fakeRegistry() {
  const tools = new Map();
  return {
    tools,
    registerTool(tool) {
      if (tools.has(tool.name)) return Promise.reject(new Error('InvalidStateError'));
      tools.set(tool.name, tool);
      return Promise.resolve();
    },
  };
}

test('8. registers describe and get_state, both read-only', async () => {
  const registry = fakeRegistry();
  const names = await registerWebMcp(registry, new Game(level1));
  assert.deepEqual(names, ['describe', 'get_state']);
  for (const tool of registry.tools.values()) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.ok(tool.description.length > 0);
  }
});

test('8. describe says in one sentence what the page is', async () => {
  const registry = fakeRegistry();
  await registerWebMcp(registry, new Game(level1));
  const answer = await registry.tools.get('describe').execute({});
  assert.deepEqual(answer, { description: DESCRIPTION });
  assert.equal(answer.description.split(/[.!?](\s|$)/).filter((s) => s && s.trim()).length, 1);
});

test('8. get_state answers from the game at call time', async () => {
  const registry = fakeRegistry();
  const game = new Game(level1, { random: () => 0.5 });
  await registerWebMcp(registry, game);
  const getState = registry.tools.get('get_state');
  assert.deepEqual(await getState.execute({}), { level: 1, screen: 'loading', wave: 1, score: 0, hearts: 5, enemies: 0, boss_health: null, weapon: 'popper', ammo: null, reloading: false });
  game.loaded();
  click(game);
  click(game);
  run(game, 1);
  assert.deepEqual(await getState.execute([]), { level: 1, screen: 'play', wave: 1, score: 0, hearts: 5, enemies: 2, boss_health: null, weapon: 'popper', ammo: null, reloading: false });
  game.pressEsc();
  assert.equal((await getState.execute({ junk: 1 })).screen, 'paused');
});

test('8. a refusing registry never stops the game', async () => {
  const game = playing();
  const before = JSON.stringify(game.snapshot());
  const throwing = { registerTool() { throw new Error('refused'); } };
  const rejecting = { registerTool: () => Promise.reject(new Error('refused')) };
  assert.deepEqual(await registerWebMcp(throwing, game), []);
  assert.deepEqual(await registerWebMcp(rejecting, game), []);
  const half = { n: 0, registerTool() { if (this.n++ === 0) throw new Error('refused'); } };
  assert.deepEqual(await registerWebMcp(half, game), ['get_state']);
  assert.equal(JSON.stringify(game.snapshot()), before);
  run(game, 1);
  assert.equal(game.enemies.length, 2);
});

test('8. no registry: nothing happens', async () => {
  const game = playing();
  for (const registry of [undefined, null, {}, { registerTool: 'no' }]) {
    assert.deepEqual(await registerWebMcp(registry, game), []);
  }
  assert.equal(game.screen, 'play');
});
