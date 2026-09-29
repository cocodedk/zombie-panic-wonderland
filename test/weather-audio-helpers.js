// A stand-in AudioContext that keeps what was made, how it was connected and set, and what was
// started and stopped; and what the weather's audio tests share.

import { createAudio } from '../src/view/audio.js';

const param = () => ({
  value: 0,
  calls: [],
  setValueAtTime(v, t) { this.calls.push(['set', v, t]); },
  exponentialRampToValueAtTime(v, t) { this.calls.push(['ramp', v, t]); },
});

export class FakeContext {
  static made = [];
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 100;
    this.state = 'running';
    this.destination = { name: 'destination' };
    this.sources = []; // noise, as started
    this.oscillators = [];
    this.gains = [];
    FakeContext.made.push(this);
  }
  node(extra) {
    const node = { connect(to) { node.to = to; return to; }, disconnect() { node.cut = true; }, ...extra };
    return node;
  }
  createGain() {
    const g = this.node({ gain: param() });
    this.gains.push(g);
    return g;
  }
  createOscillator() {
    const o = this.node({ frequency: param(), start: (at) => { o.startedAt = at; this.oscillators.push(o); }, stop(at) { o.stoppedAt = at; } });
    return o;
  }
  createBufferSource() {
    const s = this.node({ loop: false, start: (at) => { s.startedAt = at; this.sources.push(s); }, stop(at) { s.stoppedAt = at; } });
    return s;
  }
  createBiquadFilter() {
    return this.node({ frequency: param(), Q: param() });
  }
  createBuffer(channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  suspend() { this.state = 'suspended'; }
  resume() { this.state = 'running'; }
}

export function setUp() {
  const audio = createAudio({ AudioContext: FakeContext });
  audio.unlock();
  const ctx = FakeContext.made.at(-1);
  return { audio, ctx, master: ctx.gains[0], music: ctx.gains[1], effects: ctx.gains[2] };
}

export const click = (game) => { game.pointerDown(); game.pointerUp(); };
export const frame = (over = {}) => ({ cues: [], music: null, paused: false, muted: false, ...over });
export const isBed = (s) => s.to?.type === 'bandpass'; // the wind bed's noise
export const bedOf = (ctx) => ctx.sources.find(isBed);
export const peaks = (values) => values.filter((v, i) => i > 0 && i < values.length - 1 && v > values[i - 1] && v > values[i + 1]);
