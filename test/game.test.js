import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, playing, levelWith, run, kill, clearWave, kinds, level1 } from './helpers.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg ?? ''} ${a} ≈ ${b}`);

describe('1. waves follow the level data', () => {
  test('each wave spawns its counts and kinds', () => {
    const game = playing();
    level1.waves.forEach((wave, i) => {
      assert.equal(game.wave, i + 1);
      run(game, game.queue.length + 0.01);
      assert.deepEqual(kinds(game), wave);
      for (const e of [...game.enemies]) kill(game, e);
      game.update(0.01);
      run(game, level1.timing.gap);
    });
    assert.equal(game.phase, 'announce');
  });

  test('enemies arrive one second apart', () => {
    const game = playing();
    assert.equal(game.enemies.length, 1);
    run(game, 0.99);
    assert.equal(game.enemies.length, 1);
    run(game, 0.01);
    assert.equal(game.enemies.length, 2);
    run(game, 2);
    assert.equal(game.enemies.length, 4);
    run(game, 3);
    assert.equal(game.enemies.length, 4);
  });

  test('"Wave N cleared" shows for 2 seconds, the next wave starts 3 seconds after the clear', () => {
    const game = playing();
    clearWave(game);
    assert.equal(game.banner, 'Wave 1 cleared');
    run(game, 1.98);
    assert.equal(game.banner, 'Wave 1 cleared');
    run(game, 0.02);
    assert.equal(game.banner, null);
    run(game, 0.99);
    assert.equal(game.wave, 1);
    assert.equal(game.enemies.length, 0);
    run(game, 0.01);
    assert.equal(game.wave, 2);
    assert.equal(game.enemies.length, 1);
  });

  test('a new level is new data: the same game plays it', () => {
    const game = playing(levelWith([{ pumpkinMonster: 2, zombie: 1 }]));
    run(game, 2.01);
    assert.deepEqual(kinds(game), { pumpkinMonster: 2, zombie: 1 });
    assert.deepEqual(game.enemies.map((e) => e.kind), ['pumpkinMonster', 'pumpkinMonster', 'zombie']);
  });
});

describe('2. hits, hearts, scores and falling', () => {
  test('a zombie walks to the road at 1.2 units a second', () => {
    const game = playing();
    const z = game.enemies[0];
    assert.equal(z.z, -12);
    run(game, 5);
    near(z.z, -6);
    run(game, 5);
    near(z.z, 0);
  });

  test('a zombie falls after 3 hits for 100 points', () => {
    const game = playing();
    const z = game.enemies[0];
    game.setAim(z.id);
    game.shoot();
    game.shoot();
    assert.ok(game.enemies.includes(z));
    assert.equal(game.score, 0);
    game.shoot();
    assert.ok(!game.enemies.includes(z));
    assert.equal(game.score, 100);
  });

  test('a zombie on the road strikes within 1.5 units: 1 heart every 1.5 seconds', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    run(game, 10);
    assert.equal(game.player.hearts, 5);
    run(game, 1.49);
    assert.equal(game.player.hearts, 5);
    run(game, 0.01);
    assert.equal(game.player.hearts, 4);
    run(game, 1.5);
    assert.equal(game.player.hearts, 3);
  });

  test('a zombie out of reach does not strike', () => {
    const game = playing(levelWith([{ zombie: 1 }]), () => 1); // it appears at x = 8
    game.setMove(-1);
    run(game, 10);
    assert.equal(game.player.x, -8);
    assert.equal(game.player.hearts, 5);
  });

  test('the gun fires 8 shots a second while held and hits what is under the crosshair', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1 }]));
    const m = game.enemies[0];
    game.setAim(m.id);
    game.pointerDown();
    run(game, 0.49); // shots at 0.01, 0.13, 0.25 and 0.38 s
    assert.equal(game.shots, 4);
    assert.equal(m.health, 1);
    game.pointerUp();
    run(game, 1);
    assert.equal(game.shots, 4);
    game.setAim(null);
    game.pointerDown();
    run(game, 0.99);
    assert.equal(game.shots, 12);
    assert.equal(m.health, 1);
  });

  test('a pumpkin monster stays, throws every 2.5 seconds at the player, and a landing costs a heart', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1 }]));
    const m = game.enemies[0];
    run(game, 2.49);
    assert.equal(game.pumpkins.length, 0);
    run(game, 0.01);
    assert.equal(game.pumpkins.length, 1);
    assert.equal(game.pumpkins[0].x, 0);
    run(game, 1.19);
    assert.equal(game.player.hearts, 5);
    run(game, 0.01);
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.player.hearts, 4);
    assert.equal(m.z, -12);
    run(game, 1.3);
    assert.equal(game.pumpkins.length, 1);
  });

  test('a pumpkin misses a player more than 1 unit from where it lands', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1 }]));
    run(game, 2.5);
    game.setMove(1);
    run(game, 0.2); // 1.2 units away
    game.setMove(0);
    run(game, 1);
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.player.hearts, 5);
  });

  test('shooting a pumpkin in the air destroys it for 25 points', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1 }]));
    run(game, 2.5);
    game.setAim(game.pumpkins[0].id);
    game.shoot();
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.score, 25);
    run(game, 1.5);
    assert.equal(game.player.hearts, 5);
  });

  test('a pumpkin monster falls after 5 hits for 250 points, and its pumpkin vanishes with it', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1 }]));
    const m = game.enemies[0];
    run(game, 3);
    assert.equal(game.pumpkins.length, 1);
    game.setAim(m.id);
    for (let i = 0; i < 4; i++) game.shoot();
    assert.ok(game.enemies.includes(m));
    game.shoot();
    assert.ok(!game.enemies.includes(m));
    assert.equal(game.score, 250);
    assert.equal(game.pumpkins.length, 0);
    run(game, 1);
    assert.equal(game.player.hearts, 5);
  });

  test('the player moves at 6 units a second between x = -8 and x = 8', () => {
    const game = playing();
    game.setMove(1);
    run(game, 1);
    near(game.player.x, 6);
    run(game, 1);
    assert.equal(game.player.x, 8);
    game.setMove(-1);
    run(game, 3);
    assert.equal(game.player.x, -8);
  });
});

describe('3. dodge', () => {
  test('no damage from a strike during a dodge, even when the roll is stopped at the edge', () => {
    const game = playing(levelWith([{ zombie: 1 }]), () => 1);
    game.setMove(1);
    run(game, 1.5);
    game.setMove(0);
    assert.equal(game.player.x, 8);
    run(game, 10 - 1.5 + 1.2); // on the road at 10 s, strike due at 11.5 s
    assert.ok(game.dodge());
    run(game, 0.4);
    assert.ok(game.dodging);
    assert.equal(game.player.x, 8);
    assert.equal(game.player.hearts, 5);
  });

  test('no damage from a pumpkin landing during a dodge', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1 }]), () => 1);
    game.setMove(1);
    run(game, 1.5);
    game.setMove(0);
    run(game, 2); // the pumpkin lands at 3.7 s
    assert.ok(game.dodge());
    run(game, 0.3);
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.player.hearts, 5);
  });

  test('a 0.5 second roll along the direction of travel, then a 1 second cooldown', () => {
    const game = playing();
    game.setMove(-1);
    assert.ok(game.dodge());
    run(game, 0.25);
    assert.ok(game.dodging);
    assert.equal(game.dodge(), false);
    run(game, 0.25);
    assert.equal(game.dodging, false);
    near(game.player.x, -4); // no walking during the roll
    game.setMove(0);
    run(game, 0.99);
    assert.equal(game.dodge(), false);
    run(game, 0.01);
    assert.ok(game.dodge());
  });

  test('standing still, it rolls toward the last movement, or right if there was none', () => {
    const game = playing();
    game.dodge();
    run(game, 0.5);
    near(game.player.x, 4);
    run(game, 1);
    game.setMove(-1);
    run(game, 0.1);
    game.setMove(0);
    const x = game.player.x;
    game.dodge();
    run(game, 0.5);
    near(game.player.x, x - 4);
  });
});

function toBoss() {
  const game = playing();
  for (let w = 0; w < 5; w++) {
    clearWave(game);
    run(game, level1.timing.gap);
  }
  return game;
}

describe('4. the Zombie King', () => {
  test('appears after wave 5, announced for 2 seconds', () => {
    const game = toBoss();
    assert.equal(game.banner, 'The Zombie King is here!');
    assert.equal(game.snapshot().boss_health, null);
    run(game, 1.99);
    assert.equal(game.enemies.length, 0);
    run(game, 0.01);
    assert.equal(game.banner, null);
    assert.deepEqual(kinds(game), { boss: 1 });
    assert.equal(game.snapshot().boss_health, 200);
  });

  test('stomps 2 seconds after it appears, still walking, then summons and stomps in turn every 3 seconds', () => {
    const game = toBoss();
    run(game, 2);
    const boss = game.enemies[0];
    run(game, 1.99);
    assert.equal(game.stomps.length, 0);
    run(game, 0.01);
    assert.equal(game.stomps.length, 1);
    assert.ok(boss.z < -3, `still walking at z = ${boss.z}`);
    run(game, 0.99);
    assert.equal(game.player.hearts, 5);
    run(game, 0.01);
    assert.equal(game.player.hearts, 4); // the shockwave arrives 1 second later
    run(game, 1.99);
    assert.deepEqual(kinds(game), { boss: 1 });
    run(game, 0.01);
    assert.deepEqual(kinds(game), { boss: 1, zombie: 2 });
    assert.equal(game.stomps.length, 0);
    run(game, 3);
    assert.equal(game.stomps.length, 1);
    assert.equal(kinds(game).zombie, 2);
    run(game, 3);
    assert.equal(kinds(game).zombie, 4);
    near(boss.z, -3); // meanwhile it walked to 3 units behind the road, as before
  });

  test('a dodge when the shockwave arrives takes no damage', () => {
    const game = toBoss();
    run(game, 2 + 2 + 0.8);
    assert.ok(game.dodge());
    run(game, 0.3);
    assert.equal(game.stomps.length, 0);
    assert.equal(game.player.hearts, 5);
  });

  test('falls after 200 hits for 2000 points', () => {
    const game = toBoss();
    run(game, 2);
    const boss = game.enemies[0];
    const before = game.score;
    game.setAim(boss.id);
    for (let i = 0; i < 199; i++) game.shoot();
    assert.equal(game.snapshot().boss_health, 1);
    assert.equal(game.screen, 'play');
    game.shoot();
    assert.equal(game.score, before + 2000);
    assert.equal(game.snapshot().boss_health, 0);
  });
});

describe('5. victory, defeat and restart', () => {
  test('victory when the boss falls, and the scene freezes', () => {
    const game = toBoss();
    run(game, 2);
    kill(game, game.enemies[0]);
    run(game, 1.5);
    assert.equal(game.screen, 'victory');
    const frozen = JSON.stringify(game.snapshot());
    run(game, 5);
    assert.equal(JSON.stringify(game.snapshot()), frozen);
  });

  test('the shot that fells the boss wins, even with a strike due in the same frame', () => {
    const game = toBoss();
    run(game, 2);
    const boss = game.enemies[0];
    boss.health = 1;
    game.player.hearts = 1;
    const zombie = game.spawn('zombie');
    zombie.z = 0;
    zombie.strike = 0.005;
    game.setAim(boss.id);
    game.pointerDown();
    game.update(0.01);
    run(game, 1.5);
    assert.equal(game.screen, 'victory');
    assert.equal(game.player.hearts, 1);
  });

  test('defeat at zero hearts', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    run(game, 10 + 1.5 * 4 + 0.1);
    assert.equal(game.player.hearts, 1);
    assert.equal(game.screen, 'play');
    run(game, 1.5);
    assert.equal(game.player.hearts, 0);
    assert.equal(game.screen, 'defeat');
    run(game, 5);
    assert.equal(game.player.hearts, 0);
  });

  test('restart resets everything and goes back to the intro card', () => {
    const game = playing();
    game.setMove(-1);
    run(game, 0.5);
    game.setMove(0);
    kill(game, game.enemies[0]);
    run(game, 10 + 1.5 * 5 + 1);
    assert.equal(game.screen, 'defeat');
    game.setMove(-1); // still held, and still aiming, when the button is pressed
    game.setAim(game.enemies[0].id);
    game.restart();
    assert.equal(game.screen, 'intro');
    assert.deepEqual(game.snapshot(), { level: 1, screen: 'intro', wave: 1, score: 0, hearts: 5, enemies: 0, boss_health: null, weapon: 'popper', ammo: null });
    assert.equal(game.player.x, 0);
    assert.equal(game.player.lastDir, 1);
    assert.equal(game.move, 0);
    assert.equal(game.aim, null);
    assert.equal(game.pumpkins.length + game.stomps.length + game.queue.length, 0);
    run(game, 2.99);
    assert.equal(game.player.x, 0); // no movement without new input
    run(game, 0.01);
    assert.equal(game.screen, 'play');
    assert.equal(game.enemies.length, 1);
  });

  test('restart works only from victory or defeat', () => {
    const game = playing();
    game.restart();
    assert.equal(game.screen, 'play');
    assert.equal(game.enemies.length, 1);
  });
});

describe('6. pause', () => {
  test('stops all timers and movement, and resuming carries on where it stopped', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1, zombie: 2 }]));
    run(game, 1.5);
    const before = JSON.stringify([game.enemies, game.pumpkins, game.player, game.queue]);
    game.pressEsc();
    assert.equal(game.screen, 'paused');
    game.setMove(1);
    assert.equal(game.dodge(), false);
    game.pointerDown();
    run(game, 10);
    assert.equal(JSON.stringify([game.enemies, game.pumpkins, game.player, game.queue]), before);
    assert.equal(game.shots, 0);
    game.setMove(0);
    game.pressEsc();
    assert.equal(game.screen, 'play');
    assert.equal(game.firing, false);
    run(game, 0.49);
    assert.equal(game.enemies.length, 2);
    run(game, 0.01);
    assert.equal(game.enemies.length, 3); // the third arrives at 2 s of play
    run(game, 1.69);
    assert.equal(game.player.hearts, 5);
    run(game, 0.01);
    assert.equal(game.player.hearts, 4); // the pumpkin thrown at 2.5 s lands at 3.7 s
  });

  test('Esc during the intro card holds its 3-second timer', () => {
    const game = newGame();
    game.pointerDown();
    run(game, 2);
    game.pressEsc();
    run(game, 10);
    assert.equal(game.screen, 'paused');
    game.pressEsc();
    assert.equal(game.screen, 'intro');
    run(game, 0.99);
    assert.equal(game.screen, 'intro');
    run(game, 0.01);
    assert.equal(game.screen, 'play');
  });
});
