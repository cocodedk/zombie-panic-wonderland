// Spec 35: guns that point at the aim. The angles (src/logic/aim.js) and the muzzle they turn.
// The screens and the shots are in aimed-guns-shots.test.js, the model in aimed-guns-model.test.js.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { aimAngles, LIMITS } from '../src/logic/aim.js';
import { MUZZLES, PIVOT, WAIST, bodyPose, muzzleAt } from '../src/logic/effects.js';
import { level1 } from './helpers.js';

const ROAD = level1.roadZ;
const WEAPONS = Object.keys(MUZZLES);
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) < eps, `${msg} ${a} ≈ ${b}`);
const deg = (r) => (r * 180) / Math.PI;

// The barrel direction for a yaw and a pitch.
const barrel = (yaw, pitch) => [-Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw)];
const angleBetween = (a, b) => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.min(1, dot / (Math.hypot(...a) * Math.hypot(...b))));
};
const toward = (from, to) => [to.x - from.x, to.y - from.y, to.z - from.z];

// How far (degrees) the barrel line through the turned muzzle passes from `target`.
function miss(x, pose, target, yaw, pitch) {
  const muzzle = muzzleAt(x, ROAD, { ...pose, yaw, pitch });
  return deg(angleBetween(barrel(yaw, pitch), toward(muzzle, target)));
}

// Targets `d` units out from a muzzle 0.9 up: straight ahead, left, right, above and below.
const targets = (d, x = 0) => ({
  ahead: { x, y: 0.9, z: ROAD - d },
  left: { x: x - d * 0.6, y: 0.9, z: ROAD - d * 0.8 },
  right: { x: x + d * 0.6, y: 0.9, z: ROAD - d * 0.8 },
  above: { x, y: 0.9 + d * 0.5, z: ROAD - d * 0.86 },
  below: { x, y: 0.9 - d * 0.45, z: ROAD - d * 0.89 },
});

describe('1. aimAngles points the barrel line at the target', () => {
  for (const weapon of WEAPONS) {
    test(`the ${weapon}: straight ahead, left, right, above and below at 5, 10 and 40 units`, () => {
      for (const d of [5, 10, 40]) {
        for (const [where, target] of Object.entries(targets(d, 2))) {
          const pose = { weapon };
          const { yaw, pitch } = aimAngles(2, ROAD, pose, target);
          assert.ok(miss(2, pose, target, yaw, pitch) < 0.5, `${where} at ${d}: ${miss(2, pose, target, yaw, pitch)}°`);
        }
      }
    });
  }

  test('the signs: positive yaw to the left, positive pitch up, 0 and 0 straight ahead', () => {
    const t = targets(10);
    const at = (target) => aimAngles(0, ROAD, {}, target);
    assert.ok(at(t.left).yaw > 0.3);
    assert.ok(at(t.right).yaw < -0.3);
    assert.ok(at(t.above).pitch > 0.3);
    assert.ok(at(t.below).pitch < -0.3);
    near(at({ x: 0.1, y: 0.9, z: -40 }).yaw, 0, 1e-3);
  });
});

describe('2. the limits', () => {
  test('a target far to the side, above or below is limited; no target gives 0 and 0', () => {
    const left = aimAngles(0, ROAD, {}, { x: -100, y: 1, z: ROAD - 1 });
    const right = aimAngles(0, ROAD, {}, { x: 100, y: 1, z: ROAD - 1 });
    near(left.yaw, LIMITS.yaw);
    near(right.yaw, -LIMITS.yaw);
    assert.equal(LIMITS.yaw, 1.396);
    near(aimAngles(0, ROAD, {}, { x: 0, y: 100, z: ROAD - 5 }).pitch, 0.698);
    near(aimAngles(0, ROAD, {}, { x: 0, y: -100, z: ROAD - 5 }).pitch, -0.524);
    assert.deepEqual(aimAngles(0, ROAD, {}, null), { yaw: 0, pitch: 0 });
    assert.deepEqual(aimAngles(0, ROAD, {}, undefined), { yaw: 0, pitch: 0 });
  });
});

describe('3. a dodge fades the aim', () => {
  const target = { x: -200, y: 40, z: ROAD - 350 }; // far, so the body's lift and roll hardly move the solution
  const base = aimAngles(0, ROAD, { roll: 0 }, target);

  test('whole at roll 0 and 1, 0 at 0.5', () => {
    assert.ok(Math.abs(base.yaw) > 0.3 && Math.abs(base.pitch) > 0.05);
    for (const roll of [0, 1]) {
      const a = aimAngles(0, ROAD, { roll, dir: 1 }, target);
      near(a.yaw, base.yaw, 0.01);
      near(a.pitch, base.pitch, 0.01);
    }
    const mid = aimAngles(0, ROAD, { roll: 0.5, dir: 1 }, target);
    assert.deepEqual([mid.yaw, mid.pitch], [0, 0]);
  });

  test('in between they follow 1 − sin(roll × π)', () => {
    for (const roll of [0.1, 0.25, 0.4, 0.6, 0.75, 0.9]) {
      const fade = 1 - Math.sin(roll * Math.PI);
      const a = aimAngles(0, ROAD, { roll, dir: 1 }, target);
      near(a.yaw, base.yaw * fade, 0.01, `yaw at ${roll}`);
      near(a.pitch, base.pitch * fade, 0.01, `pitch at ${roll}`);
    }
  });
});

describe('4. muzzleAt turns the muzzle about the pivot', () => {
  const poses = [{}, { roll: 0.3, dir: 1 }, { roll: 0.8, dir: -1 }, { walk: 1, t: 0.4 }];

  test('without yaw or pitch it is exactly what it was, for every weapon and pose', () => {
    for (const weapon of WEAPONS) {
      for (const pose of poses) {
        const { y, turn } = bodyPose(pose);
        const m = MUZZLES[weapon];
        const today = { x: 3 + m.x * Math.cos(turn) - m.y * Math.sin(turn), y: y + m.x * Math.sin(turn) + m.y * Math.cos(turn), z: ROAD + m.z };
        assert.deepEqual(muzzleAt(3, ROAD, { ...pose, weapon }), today);
        assert.deepEqual(muzzleAt(3, ROAD, { ...pose, weapon, yaw: 0, pitch: 0 }), today);
      }
    }
    assert.deepEqual(muzzleAt(0, ROAD), muzzleAt(0, ROAD, { weapon: 'popper' }));
  });

  test('a quarter turn left or straight up puts the muzzle where the geometry says', () => {
    const m = MUZZLES.popper;
    const left = muzzleAt(1, ROAD, { yaw: Math.PI / 2 });
    near(left.x, 1 + PIVOT.x + (m.z - PIVOT.z));
    near(left.y, WAIST + m.y);
    near(left.z, ROAD + PIVOT.z - (m.x - PIVOT.x));
    const up = muzzleAt(1, ROAD, { pitch: Math.PI / 2 });
    near(up.x, 1 + m.x);
    near(up.y, WAIST + PIVOT.y - (m.z - PIVOT.z));
    near(up.z, ROAD + PIVOT.z);
  });

  test('a turn keeps the muzzle as far from the pivot as it was', () => {
    const at = (pose) => muzzleAt(0, ROAD, pose);
    const pivot = { x: PIVOT.x, y: WAIST + PIVOT.y, z: ROAD + PIVOT.z };
    const dist = (p) => Math.hypot(p.x - pivot.x, p.y - pivot.y, p.z - pivot.z);
    for (const [yaw, pitch] of [[0.4, 0.2], [-1, 0.6], [1.3, -0.5]]) near(dist(at({ yaw, pitch })), dist(at({})));
  });

  test('for targets inside the limits, outside a dodge, the barrel line passes within 0.5° of the aim point', () => {
    for (const weapon of WEAPONS) {
      for (const d of [5, 10, 40]) {
        for (const target of Object.values(targets(d, -3))) {
          const pose = { weapon, roll: 0 };
          const { yaw, pitch } = aimAngles(-3, ROAD, pose, target);
          assert.ok(Math.abs(yaw) < LIMITS.yaw && pitch > -0.524 && pitch < 0.698);
          assert.ok(miss(-3, pose, target, yaw, pitch) < 0.5);
        }
      }
    }
  });
});
