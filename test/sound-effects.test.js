// Spec 04: sound cues, the mix, streaks, bursts and fades, all in the game logic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { Effects, BURSTS, MAX_CHUNKS, MUZZLE, WAIST, muzzleAt } from '../src/logic/effects.js';
import { crowAt } from '../src/logic/game.js';
import { mix, VOLUME } from '../src/logic/sound.js';
import { screenView } from '../src/logic/screens.js';
import { bindMute } from '../src/view/input.js';
import { level2 } from '../src/levels/level-2.js';
import { newGame, playing, levelWith, run, kill, clearWave, click, level1 } from './helpers.js';
import { withWaves, journey, win } from './journey.js';

const names = (game) => game.cues.splice(0).map((c) => c.name);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} is not ${b}`);

// Level 1 with one short wave, then its boss, who has just appeared.
function toBoss(level = level1, waves = [{ zombie: 1 }]) {
  const game = playing(withWaves(level, waves));
  clearWave(game);
  run(game, level.timing.gap + level.timing.bossBanner);
  game.cues.length = 0;
  return game;
}

describe('1. each event emits its cue once, and none before the start click', () => {
  test('nothing on the title, and nothing from the start click itself', () => {
    const game = newGame();
    game.setMove(1);
    game.dodge();
    game.pressEsc();
    run(game, 5);
    assert.deepEqual(game.cues, []);
    game.pointerDown();
    game.pointerUp();
    assert.deepEqual(game.cues, []);
  });

  test('shot, and hit only when it hits', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    game.shoot();
    assert.deepEqual(names(game), ['shot']);
    game.setAim(game.enemies[0].id);
    game.shoot();
    assert.deepEqual(names(game), ['shot', 'hit']);
  });

  test('burst when an enemy falls; hurt when a heart is lost', () => {
    const game = playing(levelWith([{ zombie: 2 }]));
    kill(game, game.enemies[0]);
    assert.deepEqual(names(game).filter((n) => n === 'burst'), ['burst']);
    run(game, 12.6); // the second zombie, a second behind, strikes once
    assert.equal(game.player.hearts, 4);
    assert.deepEqual(names(game), ['groan', 'hurt']); // it groans as it reaches the road
  });

  test('dodge only when it rolls', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    assert.ok(game.dodge());
    assert.equal(game.dodge(), false);
    assert.deepEqual(names(game), ['dodge']);
  });

  test('throw when a pumpkin is thrown, and when a flaming pumpkin is', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1 }]));
    run(game, 2.5);
    assert.deepEqual(names(game), ['throw']);
    const king = toBoss(level2);
    run(king, 2 + 0.05);
    assert.deepEqual(names(king), ['windup', 'throw']);
  });

  test('caw when a crow starts its dive', () => {
    const game = playing(withWaves(level2, [{ crow: 1 }]));
    run(game, 1.99);
    assert.deepEqual(names(game), []);
    run(game, 0.01);
    assert.deepEqual(names(game), ['caw']);
  });

  test('boss when the boss is announced; the boss\'s burst, then victory 1.5 seconds later', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    clearWave(game);
    names(game);
    run(game, 3);
    assert.deepEqual(names(game), ['boss']);
    run(game, 2);
    kill(game, game.enemies[0]);
    assert.deepEqual(game.cues.filter((c) => c.name === 'burst'), [{ name: 'burst', boss: true }]);
    names(game);
    run(game, 1.49);
    assert.deepEqual(names(game), []);
    run(game, 0.01);
    assert.deepEqual(names(game), ['victory']);
    run(game, 5);
    assert.deepEqual(names(game), []);
  });

  test('defeat at zero hearts, after its hurt', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    run(game, 10 + 1.5 * 4 + 0.1);
    names(game);
    run(game, 1.5);
    assert.deepEqual(names(game), ['hurt', 'defeat']);
  });
});

describe('2. mute, pause and each level\'s loop', () => {
  test('the sound starts on; M flips it on every screen, and the title and HUD follow', () => {
    const win = new EventTarget();
    const game = new Game(level1);
    let renders = 0;
    bindMute(win, game, { render: () => { renders += 1; } });
    const m = () => win.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyM' }));
    assert.equal(game.soundOn, true);
    m(); // on the loading screen
    assert.equal(game.soundOn, false);
    assert.equal(renders, 1);
    game.loaded();
    assert.match(screenView(game).band.lines[1], / · Esc pauses · 1 2 3 4 or wheel: weapons · R reloads · M sound: off$/);
    m();
    assert.match(screenView(game).band.lines[1], / · M sound: on$/);
    game.pointerDown();
    assert.equal(screenView(game).hud.sound, '♪ on');
    m();
    assert.equal(screenView(game).hud.sound, '♪ off');
    win.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyM', repeat: true }));
    assert.equal(game.soundOn, false);

    const failed = new Game(level1);
    bindMute(win, failed, { render() {} });
    failed.fail('network');
    m();
    assert.equal(failed.soundOn, false, 'the choice carries from the error screen');
    assert.deepEqual(mix(failed), { cues: [], music: null, wind: null, paused: false, muted: true });
  });

  test('with the sound off no cue sounds and no music plays; on again, they do', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    game.toggleSound();
    game.shoot();
    assert.deepEqual(mix(game), { cues: [], music: null, wind: null, paused: false, muted: true });
    game.toggleSound();
    game.shoot();
    const frame = mix(game);
    assert.deepEqual(frame.cues.map((c) => c.name), ['shot']);
    assert.equal(frame.music, level1.music);
  });

  test('pause holds the cues and the music, and they carry on after', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    game.shoot();
    game.pressEsc();
    assert.deepEqual(mix(game), { cues: [], music: level1.music, wind: 0, paused: true, muted: false });
    assert.equal(game.cues.length, 1, 'held, not dropped');
    game.pressEsc();
    const frame = mix(game);
    assert.equal(frame.paused, false);
    assert.deepEqual(frame.cues.map((c) => c.name), ['shot']);
    assert.deepEqual(mix(game).cues, []);
  });

  test('each level has its own loop, from its intro card until victory or defeat', () => {
    assert.deepEqual([level1.music.name, level1.music.bpm, level1.music.root], ['Dusk run', 140, 57]);
    assert.deepEqual([level2.music.name, level2.music.bpm, level2.music.root], ['Moonlit rows', 136, 50]);
    for (const { music } of [level1, level2]) {
      assert.equal(music.bass.length, 16);
      assert.equal(music.arp.length, 16);
    }
    const game = journey();
    const title = newGame();
    assert.equal(mix(title).music, null, 'silent before the start click');
    title.pointerDown();
    assert.equal(mix(title).music, level1.music, 'from the intro card');
    assert.equal(mix(game).music, level1.music);
    win(game);
    const frame = mix(game);
    assert.equal(frame.music, null);
    assert.ok(frame.cues.some((c) => c.name === 'victory'), 'the jingle replaces it');
    game.nextLevel();
    assert.equal(mix(game).music, level2.music);
    click(game);
    run(game, 30);
    assert.equal(game.screen, 'defeat');
    assert.equal(mix(game).music, null);
  });

  test('one master level of 0.5; music at 0.3 of it, effects at the full level', () => {
    assert.deepEqual(VOLUME, { master: 0.5, music: 0.3, effects: 1 });
  });
});

describe('3. streaks', () => {
  test('each shot draws a streak from the muzzle to where it hits, for 0.06 seconds, with a 0.04-second flash', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    const zombie = game.enemies[0];
    const hitPoint = { x: 0.2, y: 1.1, z: -11.8 };
    game.setAim(zombie.id, hitPoint);
    game.shoot();
    const [streak] = game.effects.streaks;
    assert.deepEqual(streak.to, hitPoint);
    assert.deepEqual(streak.from, muzzleAt(game.player.x, game.level.roadZ, game.pose()), 'the muzzle, turned toward the aim');
    assert.equal(streak.life, 0.06);
    assert.equal(game.effects.flash, 0.04);
    assert.equal(zombie.health, 2, 'the shot still hits at once');
    run(game, 0.03);
    assert.equal(game.effects.flash > 0, true);
    run(game, 0.01);
    assert.ok(game.effects.flash < 1e-9);
    run(game, 0.01);
    assert.equal(game.effects.streaks.length, 1);
    run(game, 0.01);
    assert.equal(game.effects.streaks.length, 0);
  });

  test('a shot at nothing ends at the point under the crosshair', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    const ground = { x: -3, y: 0, z: -5 };
    game.setAim(null, ground);
    game.shoot();
    assert.deepEqual(game.effects.streaks.map((s) => s.to), [ground]);
  });

  test('during a dodge the streak starts at the muzzle as it rolls with the player', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    assert.ok(game.dodge()); // rolls right, a full turn in 0.5 seconds
    run(game, 0.25); // halfway: upside down, and lifted 0.25
    game.shoot();
    const { from } = game.effects.streaks.at(-1);
    near(from.x, game.player.x - MUZZLE.x);
    near(from.y, WAIST + 0.25 - MUZZLE.y);
    near(from.z, game.level.roadZ + MUZZLE.z);
  });

  test('while walking the streak starts at the muzzle as it bobs', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    game.setMove(1);
    run(game, 0.3);
    game.shoot();
    const bob = Math.abs(Math.sin(game.clock * 12)) * 0.05;
    assert.ok(bob > 0.01, `bob ${bob}`);
    near(game.effects.streaks.at(-1).from.y, WAIST + bob + MUZZLE.y);
  });

  test('held fire makes one streak a shot', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    game.setAim(null, { x: 0, y: 0, z: -5 });
    game.pointerDown();
    game.update(0.01);
    assert.equal(game.effects.streaks.length, 1);
    run(game, 1 / 8);
    assert.equal(game.shots, 2);
    assert.equal(game.effects.streaks.length, 1, 'the first one has faded');
  });
});

describe('4. bursts', () => {
  const fell = (waves, level = level1) => {
    const game = playing(withWaves(level, waves));
    run(game, 0.5);
    kill(game, game.enemies[0]);
    return game.effects;
  };

  test('an enemy bursts into 12 chunks in its colours over 1 second, with its puff for 0.3 seconds', () => {
    for (const [waves, kind, puff, level] of [
      [[{ zombie: 1 }], 'zombie', '#9fd18b', level1],
      [[{ pumpkinMonster: 1 }], 'pumpkinMonster', '#e07b24', level1],
      [[{ crow: 1 }], 'crow', '#3a3a3a', level2],
    ]) {
      const fx = fell(waves, level);
      assert.equal(fx.chunks.length, 12, kind);
      for (const c of fx.chunks) {
        assert.ok(BURSTS[kind].colors.includes(c.color), `${kind} ${c.color}`);
        assert.equal(c.life, 1);
      }
      assert.deepEqual(fx.puffs.map((p) => [p.color, p.life, p.size]), [[puff, 0.3, 1]]);
    }
    assert.deepEqual(BURSTS.zombie.colors.slice(0, 3), ['#7d9a6a', '#5b5270', '#3d3a35']);
  });

  test('a crow bursts where it is drawn, circling or diving', () => {
    for (const at of [1, 2.5]) {
      const game = playing(withWaves(level2, [{ crow: 1 }]));
      run(game, at);
      const crow = game.enemies[0];
      const where = crowAt(crow, game.level);
      assert.ok(Math.abs(where.x - crow.x) > 0.1 || Math.abs(where.z - crow.z) > 0.1, 'off its centre of circling');
      kill(game, crow);
      assert.deepEqual(game.effects.puffs[0].pos, where);
      assert.deepEqual(game.effects.chunks[0].pos, where);
    }
  });

  test('chunks fly out and up at 3 to 6 units a second, fall under gravity, spin and shrink to nothing', () => {
    const fx = new Effects();
    fx.burst('zombie', { x: 0, y: 1, z: -5 });
    for (const c of fx.chunks) {
      const speed = Math.hypot(c.vel.x, c.vel.y, c.vel.z);
      assert.ok(speed >= 3 && speed <= 6, `speed ${speed}`);
      assert.ok(c.vel.y > 0, 'up');
    }
    const c = fx.chunks[0];
    const vy = c.vel.y;
    fx.update(0.1);
    near(c.vel.y, vy - 0.98);
    assert.ok(c.rot.x !== 0 || c.rot.y !== 0 || c.rot.z !== 0, 'it spins');
    for (let i = 0; i < 8; i++) fx.update(0.1);
    assert.equal(fx.chunks.length, 12);
    assert.equal(fx.puffs.length, 0, 'the puff is gone after 0.3 seconds');
    fx.update(0.1);
    assert.equal(fx.chunks.length, 0);
  });

  test('a boss bursts into 40 chunks over 1.5 seconds, with a puff three times the size', () => {
    for (const level of [level1, level2]) {
      const game = toBoss(level);
      run(game, 2);
      kill(game, game.enemies[0]);
      const fx = game.effects;
      assert.equal(fx.chunks.length, 40);
      assert.ok(fx.chunks.every((c) => c.life === 1.5));
      assert.deepEqual(fx.puffs.map((p) => p.size), [3]);
    }
  });

  test('a pumpkin shot down bursts into 6 orange chunks over 0.6 seconds, with no puff', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1 }]));
    run(game, 2.6);
    game.setAim(game.pumpkins[0].id);
    game.shoot();
    assert.deepEqual(game.effects.chunks.map((c) => [c.color, c.life]), Array(6).fill(['#e07b24', 0.6]));
    assert.equal(game.effects.puffs.length, 0);
    assert.equal(game.score, 25);
  });

  test('at most 300 chunks; the oldest go first', () => {
    const fx = new Effects();
    for (let i = 0; i < 26; i++) fx.burst('zombie', { x: i, y: 1, z: 0 });
    assert.equal(fx.chunks.length, MAX_CHUNKS);
    assert.ok(fx.chunks.every((c) => c.pos.x >= 1), 'the first burst is gone');
    assert.equal(fx.chunks.filter((c) => c.pos.x === 25).length, 12);
    fx.burst('zombieKing', { x: 99, y: 3, z: 0 });
    assert.equal(fx.chunks.length, MAX_CHUNKS);
    assert.equal(fx.chunks.at(-1).pos.x, 99);
    assert.ok(fx.chunks.every((c) => c.pos.x >= 4));
  });

  test('when the boss falls, everything else bursts with it for no points, no heart is lost, the player moves', () => {
    const game = toBoss(level2);
    run(game, 2);
    const king = game.enemies[0];
    game.spawn('zombie');
    game.spawn('crow');
    game.throwPumpkin(game.spawn('pumpkinMonster'), { hearts: 1, points: 25 });
    const before = game.score;
    game.cues.length = 0;
    kill(game, king);
    assert.deepEqual(game.cues.filter((c) => c.name === 'burst'), [{ name: 'burst', boss: true }, { name: 'burst' }, { name: 'burst' }, { name: 'burst' }], 'one burst each');
    assert.equal(game.score, before + 3000);
    assert.equal(game.enemies.length + game.pumpkins.length, 0);
    assert.equal(game.effects.chunks.length, 40 + 3 * 12 + 6);
    assert.equal(game.effects.puffs.length, 4);
    game.setMove(1);
    run(game, 1);
    assert.ok(game.player.x > 5);
    assert.equal(game.player.hearts, 5);
    assert.equal(game.screen, 'play');
    assert.equal(game.hurt(), false);
    game.setMove(-1);
    run(game, 0.5);
    assert.equal(game.screen, 'victory');
    assert.equal(game.effects.chunks.length, 0, 'the burst has finished');
    const frozen = game.player.x;
    run(game, 1);
    assert.equal(game.player.x, frozen, 'only now the scene freezes');
  });
});

describe('5. reduced motion', () => {
  test('a fallen enemy fades out over 0.3 seconds, and no chunks are made', () => {
    const game = new Game(withWaves(level1, [{ zombie: 1 }, { zombie: 1 }]), { random: () => 0.5, reducedMotion: true });
    game.loaded();
    click(game);
    click(game);
    kill(game, game.enemies[0]);
    const fx = game.effects;
    assert.equal(fx.chunks.length + fx.puffs.length, 0);
    assert.deepEqual(fx.fades.map((f) => [f.kind, f.life]), [['zombie', 0.3]]);
    run(game, 0.29);
    assert.equal(fx.fades.length, 1);
    run(game, 0.01);
    assert.equal(game.effects.fades.length, 0);
    assert.ok(names(game).includes('burst'), 'the burst still sounds');
  });
});

describe('6. pause freezes effects; restart, Next level and Back to title clear them', () => {
  test('pause freezes streaks, chunks and puffs', () => {
    const game = playing(levelWith([{ zombie: 2 }]));
    game.setAim(game.enemies[0].id, { x: 0, y: 1, z: -12 });
    kill(game, game.enemies[0]);
    run(game, 0.02);
    game.pressEsc();
    const frozen = JSON.stringify(game.effects);
    assert.ok(game.effects.streaks.length && game.effects.chunks.length && game.effects.puffs.length);
    run(game, 5);
    assert.equal(JSON.stringify(game.effects), frozen);
    game.pressEsc();
    run(game, 0.01);
    assert.notEqual(JSON.stringify(game.effects), frozen);
  });

  test('restart clears them', () => {
    const game = playing(levelWith([{ zombie: 2 }]));
    run(game, 10.8); // the first zombie is on the road, the second nearly
    kill(game, game.enemies[1]);
    game.player.hearts = 1;
    run(game, 0.8); // the first strikes at 11.5 seconds
    assert.equal(game.screen, 'defeat');
    assert.ok(game.effects.chunks.length > 0, 'frozen on the defeat card');
    game.restart();
    assert.deepEqual([game.effects.streaks, game.effects.chunks, game.effects.puffs, game.effects.fades], [[], [], [], []]);
  });

  test('Next level and Back to title clear them', () => {
    const game = journey();
    win(game);
    game.effects.burst('zombie', { x: 0, y: 1, z: 0 });
    game.nextLevel();
    assert.equal(game.effects.chunks.length, 0);
    click(game);
    win(game);
    game.effects.burst('zombie', { x: 0, y: 1, z: 0 });
    game.toTitle();
    assert.equal(game.effects.chunks.length + game.effects.puffs.length, 0);
  });
});
