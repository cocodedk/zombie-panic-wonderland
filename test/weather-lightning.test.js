// Spec 16, on the stage (against test/fake-three.js): a strike's light, sky, fog and bolt, and
// everything back as it was afterwards, also after a pause, a restart and a level change.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { short1, short2, click, untilStrike } from './weather-helpers.js';
import { hex, named, hemisphere, skyOf, setUp, looks } from './weather-stage-helpers.js';

// Exactly the same numbers, and the very same objects in the same order.
function assertSame(now, was, message) {
  assert.deepEqual([now.light, now.fog, now.sky], [was.light, was.fog, was.sky], message);
  for (const list of ['children', 'backdrop']) {
    assert.equal(now[list].length, was[list].length, `${message}: ${list}`);
    assert.ok(now[list].every((c, i) => c === was[list][i]), `${message}: ${list}`);
  }
}

describe('7. the stage: lightning', () => {
  test('a strike raises the hemisphere light and adds a bolt; after it everything is exactly as it was', () => {
    for (const level of [short1, short2]) {
      const { game, draw, run } = setUp({ level });
      const before = looks(draw());
      assert.equal(before.light, 1.2);
      run(3.5);
      assertSame(looks(draw()), before, 'no strike yet: nothing changed');
      untilStrike(game);
      const lit = draw();
      assert.ok(hemisphere(lit).intensity > 1.2 + 2, `lit to ${hemisphere(lit).intensity}`);
      assert.ok(hemisphere(lit).intensity <= 1.2 + 2.5 + 1e-9);
      const [bolt] = named(lit, 'bolt');
      assert.ok(bolt.children.length >= 6 && bolt.children.length <= 9, `${bolt.children.length} segments`);
      assert.equal(hex(bolt.children[0].material.color), '#f4f7ff');
      assert.equal(bolt.children[0].material.fog, false);
      assert.ok(lit.fog.color.r > before.fog[0] && skyOf(lit)[0] > before.sky[0], 'the fog and the sky move toward the flash');
      assert.ok(lit.fog.color.r <= before.fog[0] + 0.6 * (0xdf / 255 - before.fog[0]) + 1e-9, 'by up to 60%');
      run(0.25);
      assert.equal(named(draw(), 'bolt').length, 0, 'the bolt shows for the first 0.2 seconds');
      run(0.5);
      assertSame(looks(draw()), before, `level ${level.number}: after the strike`);
    }
  });

  test('nothing is left changed after a pause, a restart or a level change', () => {
    const { game, draw, run } = setUp({ levels: [short1, short2] });
    const before = looks(draw());
    untilStrike(game);
    run(0.05);
    game.pressEsc();
    const held = looks(draw());
    assert.ok(held.light > 1.2, 'the strike is held while paused');
    run(5);
    assertSame(looks(draw()), held, 'held');
    game.pressEsc();
    run(0.7);
    assertSame(looks(draw()), before, 'after the pause, the strike ends');

    untilStrike(game);
    run(0.05);
    game.end('defeat');
    assert.ok(looks(draw()).light > 1.2, 'the scene freezes with the strike in it');
    game.restart();
    const restarted = draw();
    assertSame(looks(restarted), before, 'Try again: no strike in progress');
    assert.equal(named(restarted, 'bolt').length, 0);

    click(game);
    untilStrike(game);
    run(0.05);
    game.end('victory');
    game.nextLevel();
    const next = draw();
    assert.equal(named(next, 'bolt').length, 0);
    assert.equal(hemisphere(next).intensity, 1.2);
    assert.equal(hex(next.fog.color), '#15302c');
    assert.equal(next.children.filter((c) => c.name === 'backdrop').length, 1);
    assert.equal(next.children.length, 2, 'the backdrop and the player');
  });
});
