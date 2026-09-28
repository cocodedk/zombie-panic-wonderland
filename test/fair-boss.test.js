// Spec 08: a boss fight a person can win. Step aside from a stomp, a hint says so, and summons
// appear further back.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { Game, HINT } from '../src/logic/game.js';
import { screenView } from '../src/logic/screens.js';
import { createHud } from '../src/view/hud.js';
import { level2 } from '../src/levels/level-2.js';
import { run, clearWave, click, kill, level1 } from './helpers.js';
import { withWaves } from './journey.js';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg ?? ''} ${a} ≈ ${b}`);

// One short wave, then the boss, who has just appeared.
function fight(level = level1, random = () => 0.5) {
  const game = new Game(withWaves(level, [{ zombie: 1 }]), { random });
  game.loaded();
  click(game);
  click(game);
  clearWave(game);
  run(game, level.timing.gap + level.timing.bossBanner);
  assert.equal(game.enemies[0]?.kind, 'boss');
  game.cues.length = 0;
  return game;
}

describe('1. step aside from a stomp', () => {
  // The dodge rolls right 1.6 units by the time the shockwave arrives, still within its reach.
  for (const [dx, dodge, hearts] of [[0, false, 4], [2.9, false, 4], [-3, false, 4], [3.1, false, 5], [-5, false, 5], [-2, true, 5]]) {
    test(`${Math.abs(dx)} units from the boss's x${dodge ? ', dodging' : ''}: ${5 - hearts} heart`, () => {
      const game = fight();
      const boss = game.enemies[0];
      boss.x = 1; // wherever it stands
      game.player.x = boss.x + dx;
      run(game, 2); // the stomp
      assert.equal(game.stomps.length, 1);
      boss.x = -4; // where it stomped counts, not where it is when the shockwave arrives
      run(game, 0.8);
      if (dodge) assert.ok(game.dodge());
      run(game, 0.2);      assert.equal(game.stomps.length, 0);
      assert.equal(game.player.hearts, hearts);
    });
  }

  test('the shockwave is drawn from where it stomped, 6 units across at most', () => {
    const game = fight();
    const stage = createStage({ appendChild() {} }, game.level);
    const scene = () => THREE.renderers.at(-1).scene;
    const boss = game.enemies[0];
    boss.x = 2;
    run(game, 2);
    boss.x = -5;
    let widest = 0;
    for (let i = 0; i < 99; i++) {
      stage.sync(game, 0.01);
      const ring = scene().children.find((c) => c.userData.entityId === `s${game.stomps[0].id}`);
      assert.equal(ring.position.x, 2);
      assert.ok(ring.scale.x <= 3 + 1e-9 && ring.scale.y <= 3 + 1e-9, `radius ${ring.scale.x}`);
      widest = Math.max(widest, ring.scale.x);
      run(game, 0.01);
    }
    near(widest, 3, 'it spreads to its full reach');
  });
});

describe('2. the hint, once per boss fight', () => {
  test('at the first wind-up, for 2 seconds, on its own line', () => {
    const game = fight();
    game.player.hearts = 99;
    assert.deepEqual(HINT, { text: 'Space: dodge — or step aside!', life: 2 });
    run(game, 1.39);
    assert.equal(screenView(game).hud.hint, null);
    run(game, 0.01); // the first wind-up
    assert.equal(screenView(game).hud.hint, 'Space: dodge — or step aside!');
    game.notice = 'Scattergun!';
    assert.deepEqual([screenView(game).hud.notice, screenView(game).hud.hint], ['Scattergun!', HINT.text], 'both at once');
    game.notice = null;
    run(game, 1.99);
    assert.equal(screenView(game).hud.hint, HINT.text);
    run(game, 0.01);
    assert.equal(screenView(game).hud.hint, null);
    run(game, 10); // three more wind-ups
    assert.equal(game.hint, null);
  });

  test('it pauses with the game and is not drawn over the pause card', () => {
    const game = fight();
    run(game, 1.4 + 1);
    game.pressEsc();
    assert.equal(screenView(game).hud.hint, null);
    run(game, 5);
    game.pressEsc();
    assert.equal(screenView(game).hud.hint, HINT.text);
    run(game, 0.99);
    assert.equal(game.hint, HINT.text);
    run(game, 0.01);
    assert.equal(game.hint, null);
  });

  test('the boss falling and defeat clear it; Try again gives the next fight its own hint', () => {
    const game = fight();
    run(game, 1.5);
    kill(game, game.enemies[0]);
    assert.equal(game.hint, null);
    run(game, 2);
    assert.equal(game.screen, 'victory');
    game.restart(); // Play again
    assert.equal(game.hint, null);

    const lost = fight();
    run(lost, 1.5);
    lost.player.hearts = 1;
    lost.hurt();
    assert.equal(lost.screen, 'defeat');
    assert.equal(lost.hint, null);
    assert.equal(screenView(lost).hud.hint, null);
    lost.restart(); // Try again
    click(lost);
    clearWave(lost);
    run(lost, 5);
    assert.equal(lost.hint, null);
    run(lost, 1.4);
    assert.equal(lost.hint, HINT.text, 'a new fight, a new hint');
  });

  test('the Scarecrow King gives it too; it never shows on the loading, error or title screens', () => {
    const game = fight(level2);
    run(game, 1.4);
    assert.equal(game.hint, HINT.text);
    const fresh = new Game(level1);
    assert.equal(screenView(fresh).hud, null);
    fresh.loaded();
    assert.equal(screenView(fresh).hud, null);
  });

  test('the page shows it in #hint, below the notice', () => {
    const els = {};
    const el = () => ({ hidden: false, textContent: '', className: '', style: {}, addEventListener() {} });
    const doc = { querySelector: (s) => (els[s] ??= el()), body: { classList: { toggle() {} } } };
    const game = fight();
    const hud = createHud(doc, game);
    hud.render();
    assert.equal(els['#hint'].hidden, true);
    run(game, 1.4);
    hud.render();
    assert.equal(els['#hint'].hidden, false);
    assert.equal(els['#hint'].textContent, 'Space: dodge — or step aside!');
  });
});

describe('3. summons appear 2 units further back', () => {
  for (const level of [level1, level2]) {
    test(`the ${level.boss.name}'s, within 2 units of its x at its z minus 2, even while it walks`, () => {
      const game = fight(level, () => 1);
      game.player.hearts = 99;
      const boss = game.enemies[0];
      run(game, 4.99);
      const z = boss.z;
      assert.ok(z < level.boss.standZ, 'still walking');
      run(game, 0.01);
      const summoned = game.enemies.filter((e) => e.kind === level.boss.summons);
      assert.equal(summoned.length, level.boss.summon);
      for (const s of summoned) {
        assert.ok(Math.abs(s.x - boss.x) <= 2 + 1e-9);
        near(s.z, z + level.boss.speed * 0.01 - 2, 'z');
      }
    });
  }

  test('from a boss standing at z = -3, a zombie takes about 4 seconds to reach the road', () => {
    const game = fight();
    const boss = game.enemies[0];
    boss.z = -3;
    game.player.hearts = 99;
    run(game, 5);
    const zombie = game.enemies.find((e) => e.kind === 'zombie');
    near(zombie.z, -5);
    run(game, 4.1);
    assert.ok(zombie.z < 0);
    run(game, 0.1);
    assert.equal(zombie.z, 0);
  });
});

describe('4. a bot that never dodges but steps aside can beat the Zombie King', () => {
  test('it shoots summoned zombies first, then the King, and wins', () => {
    const game = fight();
    game.pointerDown(); // holds the trigger throughout
    let stomps = 0;
    let t = 0;
    while (game.screen === 'play' && t < 120) {
      const boss = game.enemies.find((e) => e.kind === 'boss');
      const target = game.enemies.find((e) => e.kind === 'zombie') ?? boss;
      game.setAim(target?.id ?? null);
      const s = game.stomps[0];
      const away = s && Math.abs(game.player.x - s.x) <= level1.boss.stompReach + 0.5;
      game.setMove(away ? Math.sign(game.player.x - s.x) || 1 : 0);
      game.update(0.01);
      stomps += game.cues.filter((c) => c.name === 'stomp').length;
      assert.ok(!game.cues.some((c) => c.name === 'dodge'), 'it never dodges');
      game.cues.length = 0;
      t += 0.01;
    }
    assert.equal(game.screen, 'victory', `after ${t.toFixed(1)} s with ${game.player.hearts} hearts`);
    assert.ok(stomps >= 4, `it lived through ${stomps} stomps`);
    assert.ok(game.player.hearts > 0);
  });
});
