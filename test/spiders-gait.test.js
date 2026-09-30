// Spec 29: the spider's gait.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./three-hooks.js', import.meta.url);
const { buildSpider } = await import('../src/view/models/spider.js');

const named = (root, name) => { const found = []; root.traverse((o) => { if (o.name === name) found.push(o); }); return found; };

describe('5. the gait', () => {
  const swings = (t, options) => {
    const spider = buildSpider();
    spider.userData.tick(t, options);
    return named(spider, 'leg').map((l) => l.rotation.y);
  };

  test('legs 0, 3, 4 and 7 swing against the others by sin(t × 10 + phase) × 0.35', () => {
    for (const t of [0, 0.05, 0.13, 0.4, 1, 2.71]) {
      swings(t).forEach((angle, i) => {
        const phase = [0, 3, 4, 7].includes(i) ? 0 : Math.PI;
        assert.ok(Math.abs(angle - Math.sin(t * 10 + phase) * 0.35) < 1e-9, `t ${t} leg ${i}: ${angle}`);
        assert.ok(Math.abs(angle) <= 0.35 + 1e-9);
      });
    }
    const angles = swings(0.13);
    assert.ok(Math.abs(angles[0] + angles[1]) < 1e-9, 'the two groups alternate');
    assert.ok(Math.abs(angles[0] - angles[7]) < 1e-9);
  });

  test('walk scales the swing, and 0 stands still', () => {
    for (const t of [0.13, 0.4, 1]) {
      assert.ok(swings(t, { walk: 0.2 }).every((a, i) => Math.abs(a - swings(t)[i] * 0.2) < 1e-9));
      assert.ok(swings(t, { walk: 0 }).every((a) => a === 0));
    }
    const spider = buildSpider();
    spider.userData.tick(0.4, { walk: 0 });
    assert.equal(named(spider, 'body')[0].position.y, 0);
  });

  test('the body bobs by 0.02 at most', () => {
    const spider = buildSpider();
    const [body] = named(spider, 'body');
    const ys = [];
    for (let t = 0; t < 2; t += 0.01) {
      spider.userData.tick(t);
      ys.push(body.position.y);
    }
    assert.ok(Math.max(...ys) <= 0.02 + 1e-9 && Math.min(...ys) >= -0.02 - 1e-9);
    assert.ok(Math.max(...ys) > 0.019);
  });
});
