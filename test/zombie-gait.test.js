// Spec 39: the machine zombie's knees, even walk and body bob, on the model, against test/fake-three.js.
// The colours and the stage are in zombie-colours.test.js.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { buildZombie } = await import('../src/view/models/zombie.js');
const { MACHINE } = await import('../src/view/models/zombie-machine.js');
const { ZOMBIE_EXTRAS, legSwing, limpSide, ragSway } = await import('../src/view/models/zombie-details.js');
const { buildZombieKing } = await import('../src/view/models/zombie.js');
const { hex, at, close, legsOf, kneeOf, modelsOf, SEEDS, TIMES } = await import('./gait-helpers.js');

const MODELS = modelsOf(buildZombie, buildZombieKing, ZOMBIE_EXTRAS);

const ragOf = (m) => m.userData.torso.children.find((c) => c.position.x === 0.2 && c.position.y === -0.02);

describe('1. the knee structure', () => {
  for (const [name, build] of Object.entries(MODELS)) {
    test(`${name}: an upper leg and a knee group, which holds the lower leg, the foot and the ball`, () => {
      legsOf(build()).forEach((leg, i) => {
        assert.equal(leg.children.length, 2);
        const [upper, knee] = leg.children;
        assert.deepEqual(upper.geometry.params, [0.1, 0.09, 0.4, 5]);
        assert.deepEqual(at(upper), [0, -0.2, 0]);
        assert.equal(hex(upper.material.color), MACHINE.steel);
        assert.ok(knee instanceof THREE.Group);
        assert.equal(knee.name, 'knee');
        assert.deepEqual(at(knee), [0, -0.4, 0]);
        const piston = ['limping', 'fast'].includes(name) && i === limpSide(SEEDS[name]); // the piston is a fourth child
        assert.equal(knee.children.length, piston ? 4 : 3);
        const [lower, foot, ball] = knee.children;
        assert.deepEqual(lower.geometry.params, [0.09, 0.08, 0.4, 5]);
        assert.deepEqual(at(lower), [0, -0.2, 0]);
        assert.equal(hex(lower.material.color), MACHINE.steel);
        assert.equal(foot.name, 'foot');
        assert.deepEqual(foot.geometry.params, [0.16, 0.08, 0.26]);
        assert.deepEqual(at(foot), [0, -0.4, 0.05]);
        assert.deepEqual(ball.geometry.params, [0.13, 0]);
        assert.deepEqual(at(ball), [0, 0, 0]);
      });
    });
  }

  test('standing, the halves fill the old cylinder\'s place: 0 to -0.8 below the hip, radius 0.1 to 0.08, the foot at -0.8', () => {
    for (const leg of legsOf(buildZombie())) {
      const [upper, knee] = leg.children;
      const [lower, foot] = knee.children;
      close(upper.position.y + 0.2, 0, 'the upper leg\'s top at the hip');
      close(upper.position.y - 0.2, knee.position.y, 'the upper leg\'s bottom at the knee');
      close(knee.position.y + lower.position.y + 0.2, knee.position.y, 'the lower leg starts at the knee');
      close(knee.position.y + lower.position.y - 0.2, -0.8, 'the lower leg\'s bottom');
      assert.deepEqual([upper.geometry.params[0], upper.geometry.params[1], lower.geometry.params[0], lower.geometry.params[1]], [0.1, 0.09, 0.09, 0.08]);
      close(knee.position.y + foot.position.y, -0.8, 'the foot');
      close(foot.position.z, 0.05, 'the foot\'s z');
    }
  });
});

describe('2. the walk', () => {
  for (const [name, build] of Object.entries(MODELS)) {
    test(`${name}: hips, knees, bob and torso follow the formulas; arms, head and rag keep the old phase`, () => {
      const seed = SEEDS[name];
      const swing = legSwing(seed, name === 'limping' || name === 'fast');
      for (const walk of [1, 0.5, 0]) {
        const m = build();
        const { torso, head, arms } = m.userData;
        const rag = ragOf(m);
        for (const t of TIMES) {
          const windup = (t % 3) / 3;
          m.userData.tick(t, { walk, windup, twitch: false });
          const beat = t * 4 + seed;
          const s = t * 3.2 + seed;
          const step = Math.sin(beat) * 0.35 * walk;
          const [left, right] = legsOf(m);
          close(left.rotation.x, step * swing[0], 'left hip');
          close(right.rotation.x, -step * swing[1], 'right hip');
          close(kneeOf(left).rotation.x, 0.5 * Math.max(0, -Math.sin(beat)) * swing[0] * walk, 'left knee');
          close(kneeOf(right).rotation.x, 0.5 * Math.max(0, Math.sin(beat)) * swing[1] * walk, 'right knee');
          close(torso.position.y, 0.92 + 0.03 * Math.abs(Math.sin(beat)) * walk, 'bob');
          assert.equal(torso.rotation.z, 0);
          const up = -(Math.PI / 2 + torso.rotation.x);
          [0, 2].forEach((phase, i) => {
            const rest = -1.45 + Math.sin(s * 0.7 + phase) * 0.2;
            close(arms[i].rotation.x, rest + (up - rest) * windup, 'arm');
          });
          close(head.rotation.z, 0.35 + Math.sin(s * 0.5) * 0.1, 'head sway');
          if (rag) close(rag.rotation.z, ragSway(s, true), 'the rag is still without a twitch');
        }
      }
    });
  }

  test('the rag sways on the old phase, and the beat leaves the head twitch alone', () => {
    const m = buildZombie({ seed: 1.7, extras: ZOMBIE_EXTRAS });
    const plain = buildZombie({ seed: 1.7 });
    for (const t of TIMES) {
      m.userData.tick(t, { walk: 1 });
      plain.userData.tick(t, { walk: 1 });
      close(ragOf(m).rotation.z, ragSway(t * 3.2 + 1.7), 'rag');
      close(m.userData.head.rotation.y, plain.userData.head.rotation.y, 'twitch');
    }
  });

  test('a knee bends at most 0.5 and only while its leg swings forward; the torso rises at most 0.03', () => {
    const m = buildZombie({ seed: 0 });
    let topKnee = 0;
    let topBob = 0;
    for (let t = 0; t < 4; t += 0.01) {
      m.userData.tick(t, { walk: 1 });
      const [a, b] = legsOf(m).map((l) => kneeOf(l).rotation.x);
      assert.ok(a >= 0 && b >= 0 && (a === 0 || b === 0));
      topKnee = Math.max(topKnee, a, b);
      const y = m.userData.torso.position.y;
      topBob = Math.max(topBob, y - 0.92);
      assert.ok(y >= 0.92 && y < 0.97, 'the torso stays below the pelvis top');
    }
    assert.ok(topKnee <= 0.5 && topKnee > 0.49 && topBob <= 0.03 && topBob > 0.029);
  });

  test('with walk 0 the knees are straight, the torso at 0.92 and not tilted', () => {
    for (const build of Object.values(MODELS)) {
      const m = build();
      for (const t of TIMES) {
        m.userData.tick(t, { walk: 0 });
        for (const leg of legsOf(m)) assert.deepEqual([Math.abs(leg.rotation.x), kneeOf(leg).rotation.x], [0, 0]);
        assert.deepEqual([m.userData.torso.position.y, m.userData.torso.rotation.z], [0.92, 0]);
      }
    }
  });
});
