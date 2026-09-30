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
    this.musicSources = []; // the same, for the music
    this.oscillators = [];
    this.gains = [];
    this.delays = [];
    FakeContext.made.push(this);
  }
  node(extra) {
    const node = { outs: [], connect(to) { node.to = to; node.outs.push(to); return to; }, disconnect() { node.cut = true; }, ...extra };
    return node;
  }
  createGain() {
    const g = this.node({ gain: param() });
    this.gains.push(g);
    return g;
  }
  createOscillator() {
    const o = this.node({ frequency: param(), detune: param(), start: (at) => { o.startedAt = at; this.oscillators.push(o); }, stop(at) { o.stoppedAt = at; } });
    return o;
  }
  createBufferSource() {
    // The music's noise (its drums) is kept apart, so `sources` holds the game's own sounds.
    const s = this.node({ loop: false, start: (at) => { s.startedAt = at; (this.onMusicBus(s) ? this.musicSources : this.sources).push(s); }, stop(at) { s.stoppedAt = at; } });
    return s;
  }
  onMusicBus(node) { // does what `node` feeds end in the music bus (the second gain made)?
    for (let n = node, hops = 0; n && hops < 20; n = n.to, hops++) if (n === this.gains[1]) return true;
    return false;
  }
  createBiquadFilter() {
    return this.node({ frequency: param(), Q: param() });
  }
  createDelay() {
    const d = this.node({ delayTime: param() });
    this.delays.push(d);
    return d;
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
