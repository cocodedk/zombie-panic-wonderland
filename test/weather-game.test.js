// Spec 16, in the game: the thunder cue and its timing, mute and pause, and the wind mix() gives.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { mix } from '../src/logic/sound.js';
import { level1 } from '../src/levels/level-1.js';
import { short1, seeded, click, tick, storm, untilStrike } from './weather-helpers.js';

const thunders = (game) => game.cues.filter((c) => c.name === 'thunder').length;

describe('4. the thunder cue', () => {
  test('arrives distance / 50 seconds after its strike, once, and never before the flash', () => {
    const game = storm();
    const seen = [];
    let strike = null;
    for (let i = 0; i < 6000; i++) {
      game.update(0.01);
      if (game.weather.strike && game.weather.strike !== strike) {
        strike = game.weather.strike;
        seen.push({ at: strike.at, due: strike.at + strike.distance / 50, heard: [] });
        assert.ok(strike.distance >= 50 && strike.distance <= 90);
      }
      for (const c of game.cues.splice(0)) if (c.name === 'thunder') seen.at(-1).heard.push(game.clock);
    }
    assert.ok(seen.length >= 3);
    for (const s of seen.slice(0, -1)) {
      assert.equal(s.heard.length, 1, 'one per strike');
      assert.ok(s.heard[0] > s.at, 'after the flash');
      assert.ok(s.heard[0] >= s.due - 1e-9 && s.heard[0] < s.due + 0.011, `due ${s.due}, heard ${s.heard[0]}`);
      assert.ok(s.heard[0] - s.at >= 1 && s.heard[0] - s.at < 1.81, '1 to 1.8 seconds');
    }
  });

  test('it waits while paused and goes on after, whether still to come or already on the cues', () => {
    const game = storm();
    const { at, distance } = untilStrike(game);
    game.pressEsc();
    const clock = game.weather.clock;
    tick(game, 10);
    assert.equal(game.weather.clock, clock, 'the weather stands still');
    assert.deepEqual(mix(game).cues, []);
    game.pressEsc();
    while (!thunders(game)) game.update(0.01);
    assert.ok(Math.abs(game.weather.clock - (at + distance / 50)) < 0.011, 'due as if there had been no pause');
    game.pressEsc();
    assert.deepEqual(mix(game).cues, [], 'a cue due is held while paused');
    assert.equal(thunders(game), 1, 'not lost');
    game.pressEsc();
    assert.equal(mix(game).cues.filter((c) => c.name === 'thunder').length, 1);
    assert.equal(thunders(game), 0);
  });

  test('with the sound off it is dropped, as every cue is', () => {
    const game = storm();
    game.toggleSound();
    while (!thunders(game)) game.update(0.01);
    assert.deepEqual(mix(game).cues, []);
    assert.equal(game.cues.length, 0);
    assert.equal(mix(game).wind, null);
  });

  test('a thunder due when the game leaves play is not played, on victory or defeat', () => {
    for (const screen of ['victory', 'defeat']) {
      const game = storm();
      while (!thunders(game)) game.update(0.01);
      game.end(screen);
      const names = mix(game).cues.map((c) => c.name);
      assert.ok(names.includes(screen) && !names.includes('thunder'), names.join());
      tick(game, 5);
      assert.deepEqual(mix(game).cues, [], 'and none after');
    }
  });

  test('mix() gives the wind on the intro card, in play and paused only', () => {
    const game = new Game(short1, { weatherRandom: seeded(1) });
    assert.equal(mix(game).wind, null, 'loading');
    game.loaded();
    assert.equal(mix(game).wind, null, 'title');
    click(game);
    assert.equal(mix(game).wind, level1.weather.rest, 'intro');
    click(game);
    tick(game, 3);
    assert.equal(mix(game).wind, game.weather.wind);
    game.pressEsc();
    assert.equal(mix(game).wind, game.weather.wind, 'paused');
    game.pressEsc();
    game.end('defeat');
    assert.equal(mix(game).wind, null, 'defeat');
    const failed = new Game(short1);
    failed.fail('webgl');
    assert.equal(mix(failed).wind, null, 'error');
  });
});
