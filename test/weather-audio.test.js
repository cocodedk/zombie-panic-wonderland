// Spec 16, the thunder sound against the stand-in AudioContext (test/weather-audio-helpers.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mix } from '../src/logic/sound.js';
import { Game } from '../src/logic/game.js';
import { level1 } from '../src/levels/level-1.js';
import { setUp, click, frame, peaks, isBed } from './weather-audio-helpers.js';

// A game on level 1's weather, in play, that has a thunder on its cues.
function thundering() {
  const game = new Game({ ...level1, waves: [{ zombie: 1 }] }, { weatherRandom: () => 0.5 });
  game.loaded();
  click(game);
  click(game);
  game.player.hearts = 99;
  while (!game.cues.some((c) => c.name === 'thunder')) game.update(0.01);
  return game;
}

describe('8. the thunder', () => {
  test('one crack of about 80 ms through a highpass at 2 kHz, a rumble of 2.5 seconds through a lowpass sinking from 220 to 40 Hz with two swells, and a sine at 40 Hz', () => {
    const { audio, ctx, effects } = setUp();
    ctx.currentTime = 10;
    audio.play(frame({ cues: [{ name: 'thunder' }] }));
    assert.equal(ctx.sources.length, 2, 'noise: the crack and the rumble');
    assert.equal(ctx.oscillators.length, 1, 'and the sine');
    const [crack, rumble] = ctx.sources;
    assert.equal(crack.to.type, 'highpass');
    assert.deepEqual(crack.to.frequency.calls, [['set', 2000, 10]]);
    assert.ok(Math.abs(crack.stoppedAt - 10 - 0.08) < 0.03, `the crack ends at ${crack.stoppedAt}`);
    assert.equal(rumble.to.type, 'lowpass');
    assert.deepEqual(rumble.to.frequency.calls, [['set', 220, 10], ['ramp', 40, 12.5]]);
    assert.ok(Math.abs(rumble.stoppedAt - 10 - 2.5) < 0.03);
    assert.equal(rumble.loop, true, 'the second-long noise loops, so the rumble lasts its 2.5 seconds');
    assert.equal(peaks(rumble.to.to.gain.calls.map((c) => c[1])).length, 2, 'two slow swells');
    const [sine] = ctx.oscillators;
    assert.deepEqual(sine.frequency.calls, [['set', 40, 10]]);
    const [bus] = new Set([crack.to.to.to, rumble.to.to.to, sine.to.to]);
    assert.equal(new Set([crack.to.to.to, rumble.to.to.to, sine.to.to]).size, 1, 'all through one thunder bus');
    assert.equal(bus.to, effects, 'on the effects bus');
  });

  test('like every cue it follows mute, and while paused it waits and is not lost', () => {
    const game = thundering();
    const { audio, ctx, master } = setUp();
    const heard = () => ctx.sources.filter((s) => !isBed(s)).length; // the crack and the rumble
    game.pressEsc();
    audio.play(mix(game));
    assert.equal(heard(), 0, 'held while paused');
    assert.equal(ctx.state, 'suspended');
    game.pressEsc();
    audio.play(mix(game));
    assert.equal(heard(), 2, 'then it sounds, once');

    const quiet = thundering();
    quiet.toggleSound();
    audio.play(mix(quiet));
    assert.equal(heard(), 2, 'dropped with the sound off');
    assert.equal(master.gain.value, 0, 'and everything sounding is silenced');
  });

  test('thunder still sounding is cut when the game leaves play, as the music is, and not by a pause', () => {
    for (const screen of ['victory', 'defeat']) {
      const game = thundering();
      const { audio, ctx } = setUp();
      audio.play(mix(game));
      const crack = ctx.sources.find((s) => !isBed(s));
      const bus = crack.to.to.to;
      game.pressEsc();
      audio.play(mix(game));
      assert.equal(bus.cut, undefined, 'a pause holds it');
      game.pressEsc();
      audio.play(mix(game));
      assert.equal(bus.cut, undefined, 'it goes on after');
      game.end(screen);
      audio.play(mix(game));
      assert.equal(bus.cut, true, `cut on ${screen}`);
    }
  });
});
