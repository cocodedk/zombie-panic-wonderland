// Spec 33: the web shell, drawn around the player exactly while they are webbed (against test/fake-three.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { run } from './helpers.js';
import { fight } from './spider-queen-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');
const { shellOpacity } = await import('../src/view/web-shell.js');

// A stage over a game with the Queen, and a way to draw a frame; `shell()` is the shell in it, if any.
function shellStage(options) {
  const game = fight(options);
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  const draw = () => stage.sync(game, 0.01);
  const shells = () => renderer.scene.children.filter((c) => c.name === 'webShell');
  const shell = () => shells().find((s) => s.visible);
  return { game, draw, shells, shell };
}

describe('the web shell', () => {
  test('nothing before the web', () => {
    const { draw, shell, shells } = shellStage();
    draw();
    assert.equal(shell(), undefined);
    assert.equal(shells().length, 0);
  });

  test('an icosahedron of radius 0.55 (detail 1), 0.6 up at the player\'s x, pale, unlit and translucent', () => {
    const { game, draw, shell } = shellStage();
    game.player.webbed = 1.5;
    game.player.x = 2;
    draw();
    const s = shell();
    assert.ok(s.geometry instanceof THREE.IcosahedronGeometry);
    assert.deepEqual(s.geometry.params, [0.55, 1]);
    assert.ok(s.material instanceof THREE.MeshBasicMaterial);
    assert.equal(s.material.color.getHexString(), 'd8e0ea');
    assert.equal(s.material.transparent, true);
    assert.equal(s.material.opacity, 0.35);
    assert.equal(s.material.depthWrite, false);
    assert.deepEqual([s.position.x, s.position.y, s.position.z], [2, 0.6, 0]);
    assert.ok(Object.hasOwn(s, 'raycast'), 'rays are ignored');
    game.player.x = -3;
    draw();
    assert.equal(shell().position.x, -3);
  });

  test('it is made once and shown or hidden', () => {
    const { game, draw, shells } = shellStage();
    game.player.webbed = 1;
    draw();
    const [first] = shells();
    game.player.webbed = 0;
    draw();
    assert.equal(first.visible, false);
    game.player.webbed = 1;
    draw();
    assert.equal(shells().length, 1);
    assert.equal(shells()[0], first);
    assert.equal(first.visible, true);
  });

  test('in the last 0.5 s it blinks between 0.35 and 0.15, six times a second', () => {
    assert.equal(shellOpacity(2), 0.35);
    assert.equal(shellOpacity(0.5), 0.35);
    let dims = 0;
    let last = 0.35;
    const seen = new Set();
    for (let webbed = 0.5; webbed > 0; webbed -= 0.0005) {
      const o = shellOpacity(webbed);
      seen.add(o);
      if (o === 0.15 && last === 0.35) dims += 1;
      last = o;
    }
    assert.deepEqual([...seen].sort(), [0.15, 0.35]);
    assert.equal(dims, 3, 'three blinks in half a second');
    assert.deepEqual([0.49, 0.4, 0.3, 0.2, 0.1, 0.01].map((w) => shellOpacity(w)), [0.35, 0.15, 0.35, 0.15, 0.35, 0.15]);
  });

  test('with reduced motion it stays at 0.35 until it goes', () => {
    const { game, draw, shell } = shellStage({ reducedMotion: true });
    game.player.webbed = 0.4;
    for (let i = 0; i < 30; i++) {
      draw();
      assert.equal(shell().material.opacity, 0.35);
      game.update(0.01);
    }
    game.player.webbed = 0;
    draw();
    assert.equal(shell(), undefined);
  });

  test('it blinks in the game: dim at 0.4 s left', () => {
    const { game, draw, shell } = shellStage();
    game.player.webbed = 0.42;
    run(game, 0.02);
    draw();
    assert.equal(shell().material.opacity, 0.15);
  });

  test('it goes in the same update the web runs out', () => {
    const { game, draw, shell } = shellStage();
    game.player.webbed = 0.03;
    run(game, 0.02);
    draw();
    assert.ok(shell());
    run(game, 0.01);
    assert.equal(game.player.webbed, 0);
    draw();
    assert.equal(shell(), undefined);
  });

  test('paused, it freezes as it was; a level start clears it', () => {
    const { game, draw, shell } = shellStage();
    game.player.webbed = 0.42;
    draw();
    game.pressEsc();
    run(game, 3);
    draw();
    assert.equal(game.player.webbed, 0.42);
    assert.equal(shell().material.opacity, 0.35);
    game.pressEsc();
    game.begin(game.level, 0);
    draw();
    assert.equal(shell(), undefined);
  });
});
