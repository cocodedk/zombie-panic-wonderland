// Spec 09: red eyes, a torn jaw with crooked teeth, the head's twitch and the groan.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { Game, GROAN } from '../src/logic/game.js';
import { playing, run, click, levelWith } from './helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { buildZombie, buildZombieKing, TWITCH } = await import('../src/view/models/zombie.js');
const { createStage } = await import('../src/view/stage.js');

const hex = (color) => `#${color.getHexString()}`;
const MODELS = [['zombie', buildZombie], ['Zombie King', buildZombieKing]];

test('every zombie\'s eyes, the Zombie King\'s included, glow #ff3b30', () => {
  for (const [name, build] of MODELS) {
    const eyes = build().userData.head.children.filter((m) => m.material instanceof THREE.MeshBasicMaterial);
    assert.equal(eyes.length, 2, name);
    for (const eye of eyes) assert.equal(hex(eye.material.color), '#ff3b30', name);
  }
});

test('the jaw hangs open below the face with 3 to 5 flat-shaded #e8e0c8 teeth, scaled with the King', () => {
  for (const [name, build] of MODELS) {
    const model = build();
    const { head, jaw } = model.userData;
    assert.equal(jaw.parent, head, name);
    assert.equal(jaw.name, 'jaw');
    const eyeY = Math.min(...head.children.filter((m) => m.material instanceof THREE.MeshBasicMaterial).map((m) => m.position.y));
    assert.ok(jaw.position.y < eyeY - 0.15, `${name}: the jaw hangs below the face`);
    assert.ok(jaw.rotation.x > 0.3, `${name}: torn open`);
    const teeth = jaw.children.filter((m) => m.name === 'tooth');
    assert.ok(teeth.length >= 3 && teeth.length <= 5, `${name}: ${teeth.length} teeth`);
    for (const t of teeth) {
      assert.equal(hex(t.material.color), '#e8e0c8');
      assert.equal(t.material.flatShading, true);
    }
    assert.ok(new Set(teeth.map((t) => t.rotation.z)).size > 1, 'crooked, not in a row');
  }
  assert.equal(buildZombieKing().scale.x, 3 * buildZombie().scale.x);
});

// The twitches seen ticking `model` every 0.01 s for `seconds`: [{ start, end, peak }].
function twitches(model, seconds, pose = {}) {
  const seen = [];
  let now = null;
  for (let i = 0; i <= seconds * 100; i++) {
    const t = i / 100;
    model.userData.tick(t, pose);
    const y = model.userData.head.rotation.y;
    if (y !== 0 && !now) seen.push((now = { start: t, end: t, peak: 0 }));
    if (y !== 0) {
      now.end = t;
      now.peak = Math.max(now.peak, Math.abs(y));
    } else now = null;
  }
  return seen;
}

test('the head twitches every 2 to 4 seconds, up to 20° and back within 0.15 seconds, walking or standing', () => {
  assert.deepEqual(TWITCH, { every: [2, 4], angle: (20 * Math.PI) / 180, time: 0.15 });
  for (const [name, build] of MODELS) {
    for (const walk of [1, 0.2]) {
      for (const seed of [0, 1.7, 3.4]) {
        const seen = twitches(build({ seed }), 60, { walk });
        assert.ok(seen.length >= 14 && seen.length <= 30, `${name}: ${seen.length} twitches in 60 s`);
        for (const [i, s] of seen.entries()) {
          assert.ok(s.end - s.start < TWITCH.time, `${name}: back within 0.15 s`);
          assert.ok(s.peak > 0 && s.peak <= TWITCH.angle + 1e-9, `${name}: ${s.peak} rad`);
          if (i) {
            const gap = s.start - seen[i - 1].start;
            assert.ok(gap >= 2 - 0.011 && gap <= 4 + 0.011, `${name}: ${gap} s apart`);
          }
        }
      }
    }
  }
});

test('reduced motion turns the twitch off; pause freezes it where it is', () => {
  assert.equal(twitches(buildZombie(), 60, { twitch: false }).length, 0);

  const heads = (reducedMotion) => {
    const game = new Game(levelWith([{ zombie: 1 }]), { random: () => 0.5, reducedMotion });
    game.loaded();
    click(game);
    click(game);
    const stage = createStage({ appendChild() {} }, game.level);
    const head = () => THREE.renderers.at(-1).scene.children.find((c) => c.userData.head).userData.head;
    const ys = [];
    for (let i = 0; i < 800; i++) {
      game.update(0.01);
      stage.sync(game, 0.01);
      ys.push(head().rotation.y);
    }
    return { game, stage, head, ys };
  };
  assert.ok(heads(true).ys.every((y) => y === 0), 'no twitch under reduced motion');
  const { game, stage, head, ys } = heads(false);
  assert.ok(ys.some((y) => y !== 0), 'twitches otherwise');

  while (head().rotation.y === 0) {
    game.update(0.01);
    stage.sync(game, 0.01);
  }
  game.pressEsc();
  const frozen = head().rotation.y;
  for (let i = 0; i < 50; i++) {
    game.update(0.01);
    stage.sync(game, 0.01);
  }
  assert.equal(head().rotation.y, frozen);
});

// The game's time at each groan, stepping 0.01 s for `seconds`.
function groans(game, seconds) {
  const at = [];
  for (let i = 0; i < seconds * 100; i++) {
    game.update(0.01);
    for (const c of game.cues.splice(0)) if (c.name === 'groan') at.push(game.clock);
  }
  return at;
}

test('a zombie reaching the road groans, at most once every 1.5 seconds across all zombies', () => {
  assert.equal(GROAN, 1.5);
  const game = playing(levelWith([{ zombie: 1 }]));
  game.player.hearts = 99;
  const walked = game.clock;
  const one = groans(game, 15);
  assert.equal(one.length, 1, 'once, on arrival, not while it stands on the road');
  assert.ok(Math.abs(one[0] - walked - 10) < 0.02, `on reaching the road: ${one[0] - walked} s`);

  // Eight zombies, a quarter second apart, reach the road over 1.75 seconds.
  const crowd = playing(levelWith([{ zombie: 8 }], { timing: { ...levelWith([]).timing, spacing: 0.25 } }));
  crowd.player.hearts = 99;
  const at = groans(crowd, 15);
  assert.equal(at.length, 2);
  assert.ok(at[1] - at[0] >= GROAN - 1e-6, `${at[1] - at[0]} s apart`);
});

test('pause holds the groan; a restart resets its 1.5-second limit', () => {
  const game = playing(levelWith([{ zombie: 1 }]));
  game.player.hearts = 99;
  run(game, 9.9);
  game.pressEsc();
  assert.equal(groans(game, 1).length, 0, 'nothing while paused');
  game.pressEsc();
  assert.equal(groans(game, 0.2).length, 1);

  game.end('defeat');
  game.restart();
  click(game);
  const [e] = game.enemies;
  e.z = game.level.roadZ - 0.001;
  assert.equal(groans(game, 0.01).length, 1, 'groans at once after the restart');
});
