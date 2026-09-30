// Spec 35: pose() gives the gun's angles where the crosshair shows, and a shot starts at the turned muzzle.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { aimAngles, LIMITS } from '../src/logic/aim.js';
import { MUZZLES, muzzleAt } from '../src/logic/effects.js';
import { level1, newGame, playing, levelWith, run } from './helpers.js';

const ROAD = level1.roadZ;
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const barrel = (yaw, pitch) => [-Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw)];
// How far (degrees) the line from `from` to `to` is from the barrel's direction.
function along(from, to, { yaw, pitch }) {
  const a = barrel(yaw, pitch);
  const b = [to.x - from.x, to.y - from.y, to.z - from.z];
  return (Math.acos(Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / Math.hypot(...b))) * 180) / Math.PI;
}

describe('5. pose() gives the angles where the crosshair shows', () => {
  const aimed = (game) => {
    game.setAim(null, { x: -5, y: 3, z: -10 });
    return game.pose();
  };

  test('on the intro card, in play and paused; 0 on the title, loading, error, victory and defeat', () => {
    const loading = new Game(levelWith([{ zombie: 1 }]));
    const error = new Game(levelWith([{ zombie: 1 }]));
    error.fail('network');
    const game = newGame(levelWith([{ zombie: 1 }]));
    const seen = { loading: aimed(loading), error: aimed(error), title: aimed(game) };
    game.pointerDown();
    game.pointerUp();
    assert.equal(game.screen, 'intro');
    seen.intro = aimed(game);
    game.pointerDown();
    game.pointerUp();
    assert.equal(game.screen, 'play');
    seen.play = aimed(game);
    game.pressEsc();
    assert.equal(game.screen, 'paused');
    seen.paused = aimed(game);
    game.pressEsc();
    game.end('victory');
    seen.victory = aimed(game);
    game.restart();
    game.end('defeat');
    seen.defeat = aimed(game);

    for (const screen of ['loading', 'error', 'title', 'victory', 'defeat']) assert.deepEqual([seen[screen].yaw, seen[screen].pitch], [0, 0], screen);
    for (const screen of ['intro', 'play', 'paused']) {
      assert.ok(seen[screen].yaw > 0.3, `${screen} yaw ${seen[screen].yaw}`);
      assert.ok(Math.abs(seen[screen].pitch) > 0.01);
    }
    assert.deepEqual(seen.paused, seen.play, 'paused, they hold');
  });

  test('pausing while walking or dodging, the gun holds its angles, and goes on after', () => {
    for (const dodge of [false, true]) {
      const game = playing(levelWith([{ zombie: 1 }]));
      game.setMove(1);
      if (dodge) assert.ok(game.dodge());
      run(game, 0.13);
      aimed(game);
      const before = game.pose();
      game.pressEsc();
      const paused = game.pose();
      assert.deepEqual([paused.yaw, paused.pitch], [before.yaw, before.pitch]);
      game.setMove(0);
      assert.deepEqual([game.pose().yaw, game.pose().pitch], [before.yaw, before.pitch]);
      game.pressEsc();
      assert.equal(game.screen, 'play');
      game.setMove(1);
      assert.deepEqual([game.pose().yaw, game.pose().pitch], [before.yaw, before.pitch]);
    }
  });

  test('a level start, Try again and Play again begin with the gun straight, till the aim is set again', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    aimed(game);
    game.end('defeat');
    game.restart();
    assert.equal(game.screen, 'intro');
    assert.deepEqual([game.pose().yaw, game.pose().pitch], [0, 0]);
    assert.ok(aimed(game).yaw > 0.3, 'the first intro frame follows the crosshair');
  });

  test('the angles are the solution for the player, the pose and the aim point, in the same frame', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    game.setMove(1);
    run(game, 0.3);
    const to = { x: 4, y: 2, z: -12 };
    game.setAim(null, to);
    const { yaw, pitch, ...pose } = game.pose();
    assert.deepEqual({ yaw, pitch }, aimAngles(game.player.x, game.level.roadZ, pose, to));
    game.setAim(null, { x: -4, y: 2, z: -12 });
    assert.ok(game.pose().yaw > 0, 'it follows at once');
  });
});

describe('6. a shot starts at the turned muzzle', () => {
  const armed = (weapon, to) => {
    const game = playing(levelWith([{ zombie: 1 }]));
    game.owned[weapon] = true;
    game.ammo[weapon] = 99;
    game.weapon = weapon;
    game.setAim(null, to);
    return game;
  };
  const muzzle = (game) => muzzleAt(game.player.x, game.level.roadZ, game.pose());

  test('the Popper\'s streak runs from the muzzle to the aim point, along the barrel inside the limits', () => {
    const to = { x: -6, y: 1.2, z: -14 };
    const game = armed('popper', to);
    game.shoot();
    const [s] = game.effects.streaks;
    assert.deepEqual([s.from, s.to], [muzzle(game), to]);
    assert.ok(game.pose().yaw > 0.3);
    assert.ok(along(s.from, s.to, game.pose()) < 0.5, 'along the barrel');
  });

  test('past a limit the streak bends from the muzzle, turned as far as the limit, to the aim point', () => {
    const to = { x: -80, y: 1, z: ROAD - 2 };
    const game = armed('popper', to);
    game.shoot();
    const [s] = game.effects.streaks;
    near(game.pose().yaw, LIMITS.yaw);
    assert.deepEqual([s.from, s.to], [muzzle(game), to]);
  });

  test('in a dodge the muzzle is turned as far as the fade allows, and the streak still ends at the aim point', () => {
    const to = { x: -6, y: 1.2, z: -14 };
    const game = armed('popper', to);
    assert.ok(game.dodge());
    run(game, 0.1);
    game.shoot();
    const [s] = game.effects.streaks;
    assert.deepEqual([s.from, s.to], [muzzle(game), to]);
    assert.ok(Math.abs(game.pose().yaw) < LIMITS.yaw * 0.6);
  });

  test('the Scattergun\'s pellets and the Gatling\'s tracers start there, each pellet flying to its own point', () => {
    const to = { x: 5, y: 1, z: -12 };
    const scatter = armed('scattergun', to);
    const lines = Array.from({ length: 8 }, (_, i) => ({ id: null, point: { x: i - 3, y: 1, z: -12 } }));
    scatter.setAim(null, to, lines);
    scatter.shoot();
    assert.deepEqual(scatter.effects.streaks.map((s) => s.from), Array(8).fill(muzzle(scatter)));
    assert.deepEqual(scatter.effects.streaks.map((s) => s.to), lines.map((p) => p.point));
    assert.ok(scatter.pose().yaw < -0.1);

    const gatling = armed('gatling', to);
    gatling.shoot();
    const [s] = gatling.effects.streaks;
    assert.deepEqual([s.from, s.to], [muzzle(gatling), to]);
    assert.ok(along(s.from, s.to, gatling.pose()) < 0.5, 'along the barrel');
  });

  test('the launcher\'s shell starts at the turned muzzle and lands at the aim point', () => {
    const to = { x: 3, y: 0, z: -8 };
    const game = armed('launcher', to);
    game.shoot();
    const [shell] = game.shells;
    assert.deepEqual([shell.from, shell.to], [muzzle(game), to]);
    assert.ok(Math.abs(shell.from.x - (game.player.x + MUZZLES.launcher.x)) > 0.01, 'turned');
  });

  test('what a shot hits does not change: the aim id decides, not the barrel', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    const z = game.enemies[0];
    game.setAim(z.id, { x: -70, y: 1, z: ROAD - 2 });
    game.shoot();
    assert.equal(z.health, 2);
  });
});
