// The audio module against a stand-in AudioContext: silent until the click, every cue has a
// sound, the volumes, the pause and each level's loop.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/view/audio.js';
import { mix } from '../src/logic/sound.js';
import { level2 } from '../src/levels/level-2.js';
import { playing, levelWith, level1 } from './helpers.js';

const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });

class FakeContext {
  static made = [];
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 100;
    this.state = 'running';
    this.destination = { name: 'destination' };
    this.started = []; // oscillators and noise, as they start
    this.gains = [];
    FakeContext.made.push(this);
  }
  node(extra) {
    return { connect: (to) => { this.last = to; return to; }, disconnect() { this.cut = true; }, ...extra };
  }
  createGain() {
    const g = this.node({ gain: param() });
    const connect = g.connect;
    g.connect = (to) => { g.to = to; return connect(to); };
    this.gains.push(g);
    return g;
  }
  createOscillator() {
    return this.node({ frequency: param(), start: () => this.started.push('tone'), stop() {} });
  }
  createBufferSource() {
    return this.node({ start: () => this.started.push('noise'), stop() {} });
  }
  createBiquadFilter() {
    return this.node({ frequency: param(), Q: param() });
  }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  suspend() { this.state = 'suspended'; }
  resume() { this.state = 'running'; }
}

const CUES = ['shot', 'hit', 'burst', 'hurt', 'dodge', 'throw', 'caw', 'boss', 'windup', 'stomp', 'victory', 'defeat', 'scatter', 'launch', 'boom', 'pickup', 'click'];

function setUp() {
  const audio = createAudio({ AudioContext: FakeContext });
  return audio;
}

test('silent until the click; then a master level of 0.5, music at 0.3 of it, effects at 1', () => {
  const audio = setUp();
  const before = FakeContext.made.length;
  audio.play({ cues: [{ name: 'shot' }], music: level1.music, paused: false });
  assert.equal(FakeContext.made.length, before, 'no context before the click');
  audio.unlock();
  const ctx = FakeContext.made.at(-1);
  const [master, music, effects] = ctx.gains;
  assert.equal(master.to, ctx.destination);
  assert.deepEqual([master.gain.value, music.gain.value, effects.gain.value], [0.5, 0.3, 1]);
  assert.equal(music.to, master);
  assert.equal(effects.to, master);
});

test('M silences what is already sounding, the boss\'s drone included, and brings it back', () => {
  const game = playing(levelWith([{ zombie: 1 }]));
  const audio = setUp();
  audio.unlock();
  const master = FakeContext.made.at(-1).gains[0];
  audio.play({ cues: [{ name: 'boss' }], music: null, paused: false, muted: false });
  assert.equal(master.gain.value, 0.5);
  game.toggleSound();
  audio.play(mix(game));
  assert.equal(master.gain.value, 0);
  game.toggleSound();
  audio.play(mix(game));
  assert.equal(master.gain.value, 0.5);
});

test('every cue makes a sound', () => {
  const audio = setUp();
  audio.unlock();
  const ctx = FakeContext.made.at(-1);
  for (const name of CUES) {
    const count = ctx.started.length;
    audio.play({ cues: [{ name }], music: null, paused: false });
    assert.ok(ctx.started.length > count, name);
  }
  const count = ctx.started.length;
  audio.play({ cues: [{ name: 'burst', boss: true }], music: null, paused: false });
  assert.ok(ctx.started.length > count, 'the boss\'s burst');
});

test('the pause suspends all sound and the resume wakes it; the loop changes with the level', () => {
  const game = playing(levelWith([{ zombie: 1 }]));
  const audio = setUp();
  audio.unlock();
  const ctx = FakeContext.made.at(-1);
  audio.play(mix(game));
  const notes = ctx.started.length;
  assert.ok(notes > 0, 'the loop plays');
  game.pressEsc();
  audio.play(mix(game));
  assert.equal(ctx.state, 'suspended');
  audio.unlock(); // a click while paused does not wake it
  assert.equal(ctx.state, 'suspended');
  game.pressEsc();
  audio.play(mix(game));
  assert.equal(ctx.state, 'running');

  const loop1 = ctx.gains.filter((g) => g.to === ctx.gains[1]).at(-1); // the loop's own output
  audio.play({ cues: [], music: level2.music, paused: false });
  assert.equal(loop1.cut, true, 'level 1\'s loop stops');
  game.toggleSound();
  const count = ctx.started.length;
  ctx.currentTime = 10;
  audio.play(mix(game));
  assert.equal(ctx.started.length, count, 'with the sound off nothing plays');
});
