// Spec 16, the screens: where the weather runs, the fresh weather of every level start, and a game
// that plays out as if there were none.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { level1 } from '../src/levels/level-1.js';
import { LIGHTNING } from '../src/logic/weather.js';
import { short1, short2, seeded, click, tick, storm, untilStrike } from './weather-helpers.js';

const thunders = (game) => game.cues.filter((c) => c.name === 'thunder').length;

describe('5. the screens', () => {
  const clockAfter = (game) => { const before = game.weather.clock; tick(game, 1); return game.weather.clock - before; };

  test('it stands still on loading, error, title, paused, victory and defeat, and runs on the intro card and in play', () => {
    const loading = new Game(short1, { weatherRandom: seeded(1) });
    assert.equal(clockAfter(loading), 0, 'loading');
    const error = new Game(short1);
    error.fail('network');
    assert.equal(clockAfter(error), 0, 'error');
    loading.loaded();
    assert.equal(clockAfter(loading), 0, 'title');
    click(loading);
    assert.ok(Math.abs(clockAfter(loading) - 1) < 1e-9, 'the intro card');
    click(loading);
    assert.ok(Math.abs(clockAfter(loading) - 1) < 1e-9, 'play');
    loading.pressEsc();
    assert.equal(clockAfter(loading), 0, 'paused');
    for (const screen of ['victory', 'defeat']) {
      const game = storm();
      untilStrike(game);
      game.end(screen);
      const { age } = game.weather;
      assert.equal(clockAfter(game), 0, screen);
      assert.equal(game.weather.age, age, 'a strike in progress stays as it is');
    }
  });

  test('a level start, Try again, Play again, Next level and Back to title each make a fresh weather', () => {
    const fresh = (game, level) => {
      const w = game.weather;
      assert.equal(w.clock, 0);
      assert.equal(w.strike, null);
      assert.deepEqual([w.light, w.shift, w.bolt, w.waiting], [0, 0, null, []]);
      assert.equal(w.wind, level.weather.rest);
      assert.ok(w.next >= 4 && w.next <= 8, `the first strike is due at ${w.next}`);
    };
    const struck = (game) => { untilStrike(game); tick(game, 0.1); assert.ok(game.weather.strike); return game.weather; };

    const game = new Game(short1, { levels: [short1, short2], weatherRandom: seeded(2) });
    game.loaded();
    const first = game.weather;
    game.pointerDown(); // the level starts
    assert.notEqual(game.weather, first);
    fresh(game, short1);
    game.pointerUp();
    const played = struck(game);
    game.end('defeat');
    game.restart(); // Try again
    assert.notEqual(game.weather, played);
    fresh(game, short1);
    click(game);
    struck(game);
    game.end('victory');
    game.restart(); // Play again
    fresh(game, short1);
    click(game);
    struck(game);
    game.end('victory');
    game.nextLevel();
    fresh(game, short2);
    assert.equal(game.level, short2);
    click(game);
    struck(game);
    game.end('victory');
    game.toTitle();
    fresh(game, short1);
    assert.equal(game.screen, 'title');
  });
});

describe('6. the weather never reads the game\'s random', () => {
  // The same inputs into a game with the level's weather and one without.
  function play(level, weather, { weatherSeed = 3, seconds = 90 } = {}) {
    let draws = 0;
    const rand = seeded(42);
    const game = new Game({ ...level, weather }, { random: () => { draws += 1; return rand(); }, weatherRandom: seeded(weatherSeed) });
    game.loaded();
    click(game);
    click(game);
    game.player.hearts = 99;
    game.pointerDown();
    const log = [];
    let claps = 0;
    for (let i = 0; i < seconds * 100; i++) {
      game.setAim(game.enemies[0]?.id ?? null);
      game.setMove(Math.sin(i / 200) > 0 ? 1 : -1);
      game.update(0.01);
      claps += thunders(game);
      log.push(JSON.stringify([game.snapshot(), game.score, game.enemies.map((e) => [e.id, e.x, e.z, e.health]), game.cues.filter((c) => c.name !== 'thunder').length]));
      game.cues.length = 0;
    }
    return { log, draws, claps, game };
  }

  test('after the same inputs get_state, scores, enemies and draws of random match', () => {
    const level = { ...level1, waves: [{ zombie: 6, pumpkinMonster: 2 }, { zombie: 6 }] };
    const stormy = play(level, level1.weather);
    const calm = play(level, null);
    assert.ok(stormy.claps >= 3, `${stormy.claps} thunders in the stormy game`);
    assert.equal(calm.claps, 0);
    assert.ok(stormy.game.score > 0);
    assert.deepEqual(stormy.log, calm.log);
    assert.equal(stormy.draws, calm.draws);
    const other = play(level, level1.weather, { weatherSeed: 99 });
    assert.equal(other.draws, stormy.draws, 'nor does the weather\'s seed matter');
    assert.deepEqual(other.log, calm.log);
  });

  // A bot that holds the trigger, shoots what it meets, steps aside from stomps and never dodges.
  function bot(weather) {
    const game = new Game({ ...level1, weather }, { random: seeded(11), weatherRandom: seeded(8) });
    game.loaded();
    click(game);
    click(game);
    game.pointerDown();
    let claps = 0;
    let t = 0;
    while (game.screen === 'play' && t < 900) {
      const target = game.enemies.find((e) => e.kind === 'zombie') ?? game.enemies.find((e) => e.kind !== 'boss') ?? game.enemies[0];
      game.setAim(target?.id ?? null);
      const s = game.stomps[0];
      game.setMove(s && Math.abs(game.player.x - s.x) <= level1.boss.stompReach + 0.5 ? Math.sign(game.player.x - s.x) || 1 : 0);
      game.update(0.01);
      claps += thunders(game);
      game.cues.length = 0;
      t += 0.01;
    }
    return { screen: game.screen, score: game.score, hearts: game.player.hearts, t: Math.round(t * 100), shots: game.shots, claps };
  }

  test('a bot play-through of level 1 gives the same result with the weather as without', () => {
    const stormy = bot(level1.weather);
    const calm = bot(null);
    assert.ok(stormy.claps > 0, 'it thundered');
    assert.ok(['victory', 'defeat'].includes(stormy.screen), stormy.screen);
    assert.deepEqual({ ...stormy, claps: 0 }, { ...calm, claps: 0 });
  });

  test('a strike\'s bolt and thunder come from the weather\'s stream alone', () => {
    const a = storm({ weatherSeed: 6, random: seeded(1) });
    const b = storm({ weatherSeed: 6, random: seeded(2) });
    assert.deepEqual([untilStrike(a).distance, a.weather.strike.at], [untilStrike(b).distance, b.weather.strike.at]);
    assert.ok(a.weather.strike.distance >= -LIGHTNING.bolt.z[1]);
  });

  test('with no random given at all, a game seeded through Math.random plays on as if there were no weather', () => {
    const real = Math.random;
    const play = (weather) => {
      const rand = seeded(42);
      let draws = 0;
      Math.random = () => { draws += 1; return rand(); };
      const game = new Game({ ...level1, weather, waves: [{ zombie: 8 }] });
      game.loaded();
      click(game);
      click(game);
      game.player.hearts = 99;
      game.pointerDown();
      const log = [];
      for (let i = 0; i < 4000; i++) {
        if (i === 2000) { game.end('defeat'); game.restart(); click(game); game.pointerDown(); } // a reset in the middle
        game.setAim(game.enemies[0]?.id ?? null);
        game.update(0.01);
        log.push(JSON.stringify([game.snapshot(), game.enemies.map((e) => [e.x, e.z])]));
        game.cues.length = 0;
      }
      return { draws, log };
    };
    try {
      const stormy = play(level1.weather);
      const calm = play(null);
      assert.ok(calm.draws > 0, 'the game draws from Math.random');
      assert.equal(stormy.draws, calm.draws, 'the weather draws none');
      assert.deepEqual(stormy.log, calm.log);
    } finally {
      Math.random = real;
    }
  });
});
