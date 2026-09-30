// Spec 34: the three tracks as data and the step sequencer that reads them (no Web Audio).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { track1, track2, track3 } from '../src/levels/tracks.js';
import { PASS, PASSES, stepSeconds, stepTime, eventsAt } from '../src/logic/music.js';
import { level1 } from '../src/levels/level-1.js';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';

const _ = null;
const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];
const ODDS = [1, 3, 5, 7, 9, 11, 13, 15];
const ARRANGEMENT = [
  ['kick', 'hat', 'hatSoft', 'bass'],
  ['kick', 'hat', 'hatSoft', 'bass', 'snare', 'arp'],
  ['kick', 'hat', 'hatSoft', 'bass', 'snare', 'arp', 'openHat', 'pad'],
  ['arp', 'pad', 'hat', 'hatSoft', 'openHat'],
];
const PEAK = { kick: 0.9, snare: 0.5, hat: 0.22, hatSoft: 0.1, openHat: 0.2, bass: 0.55, arp: 0.16, pad: 0.06 };
const TRACKS = [track1, track2, track3];

const voices = (track, step) => eventsAt(track, step).map((e) => e.voice);
const find = (track, step, voice) => eventsAt(track, step).find((e) => e.voice === voice);

describe('1. the three tracks', () => {
  test('each has the data of the spec', () => {
    const want = [
      { name: 'Dusk run', bpm: 140, swing: 0, root: 57, progression: [0, 8, 3, 10], qualities: ['min', 'maj', 'maj', 'maj'],
        kick: [0, 4, 8, 12], snare: [4, 12], hat: EIGHTHS, hatSoft: ODDS, openHat: [2, 6, 10, 14],
        bass: [0, _, _, 0, _, 0, _, _, 7, _, 0, _, 12, _, 7, _], arp: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 3, 2],
        pad: { cutoff: 900, level: 0.05 } },
      { name: 'Moonlit rows', bpm: 136, swing: 0.05, root: 50, progression: [0, 8, 3, 10], qualities: ['min', 'maj', 'maj', 'maj'],
        kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], hatSoft: ODDS, openHat: [14],
        bass: [0, _, 7, _, 0, _, 12, _, 0, _, 7, _, 0, 7, 12, _], arp: [0, 2, 1, 3, 0, 2, 1, 3, 2, 1, 3, 1, 2, 1, 0, 1],
        pad: { cutoff: 800, level: 0.06 } },
      { name: 'Spider wood', bpm: 150, swing: 0, root: 52, progression: [0, 8, 10, 7], qualities: ['min', 'maj', 'maj', 'min'],
        kick: [0, 4, 8, 10, 12], snare: [4, 12], hat: EIGHTHS, hatSoft: ODDS, openHat: [2, 6, 10, 14],
        bass: [0, 0, _, 0, 0, _, 0, 0, 0, 0, _, 0, 7, _, 5, _], arp: [0, 1, 2, 3, 0, 1, 2, 3, 0, 2, 1, 3, 2, 1, 0, 1],
        pad: { cutoff: 700, level: 0.05 } },
    ];
    TRACKS.forEach((track, i) => {
      assert.deepEqual({ ...track, arrangement: undefined }, { ...want[i], arrangement: undefined }, want[i].name);
      assert.deepEqual(track.arrangement, ARRANGEMENT, `${want[i].name}'s arrangement`);
    });
  });

  test('every bpm is above 110, and each level\'s music is its own track', () => {
    for (const t of TRACKS) assert.ok(t.bpm > 110, t.name);
    assert.equal(level1.music, track1);
    assert.equal(level2.music, track2);
    assert.equal(level3.music, track3);
  });
});

describe('2. time', () => {
  test('a step lasts 60 / bpm / 4 seconds', () => {
    assert.ok(Math.abs(stepSeconds(track1) - 0.1071) < 0.0001);
    assert.equal(stepSeconds(track3), 60 / 150 / 4);
  });

  test('swing delays odd steps by that fraction of a step and leaves even ones', () => {
    const s = stepSeconds(track2);
    assert.ok(Math.abs(stepTime(track2, 4) - 4 * s) < 1e-9);
    assert.ok(Math.abs(stepTime(track2, 5) - 5.05 * s) < 1e-9);
    assert.ok(Math.abs(stepTime(track1, 5) - 5 * stepSeconds(track1)) < 1e-9, 'no swing on level 1');
  });

  test('a pass is 128 steps and four make the cycle: step 512 is pass 0 again', () => {
    assert.deepEqual([PASS, PASSES], [128, 4]);
    assert.deepEqual(voices(track1, 0), voices(track1, 512));
    assert.deepEqual(voices(track1, 130), voices(track1, 130 + 512));
    assert.ok(!voices(track1, 512 + 4).includes('arp'), 'pass 0 has no arp');
  });
});

describe('3. eventsAt on level 1', () => {
  test('step 0, pass 0: a kick, a closed hat and the bass at 33; nothing else', () => {
    assert.deepEqual(voices(track1, 0).sort(), ['bass', 'hat', 'kick']);
    assert.equal(find(track1, 0, 'bass').midi, 57 + 0 + 0 - 24);
    assert.equal(find(track1, 0, 'bass').midi, 33);
  });

  test('step 32: the chord is F and the bass follows it', () => {
    assert.equal(find(track1, 32, 'bass').midi, 57 + 8 + 0 - 24);
    assert.equal(find(track1, 32, 'bass').midi, 41);
  });

  test('pass 1: the arp and the snare join, without a pad', () => {
    assert.deepEqual(voices(track1, 128).sort(), ['arp', 'bass', 'hat', 'kick']);
    assert.equal(find(track1, 128, 'arp').midi, 57 + 0 + 0 + 12);
    assert.deepEqual(voices(track1, 132).sort(), ['arp', 'hat', 'kick', 'snare']);
    assert.equal(find(track1, 132, 'arp').midi, 57 + 0 + 7 + 12);
  });

  test('pass 2: the open hat and the pad, whose three tones are 69, 72 and 76', () => {
    assert.ok(voices(track1, 258).includes('openHat'));
    assert.deepEqual(find(track1, 256, 'pad').midis, [69, 72, 76]);
    assert.ok(!voices(track1, 257).includes('pad'), 'only at the chord\'s first step');
    assert.deepEqual(find(track1, 256 + 32, 'pad').midis, [57 + 8 + 12, 57 + 8 + 4 + 12, 57 + 8 + 7 + 12]);
  });

  test('pass 3, the breakdown: no kick, bass or snare; the pad, the arp and the hats', () => {
    const v = voices(track1, 384);
    assert.deepEqual(v.sort(), ['arp', 'hat', 'pad']);
    assert.ok(voices(track1, 385).includes('hatSoft'));
    assert.ok(voices(track1, 386).includes('openHat'));
    for (let s = 384; s < 512; s++) {
      for (const voice of ['kick', 'bass', 'snare']) assert.ok(!voices(track1, s).includes(voice), `${voice} at ${s}`);
    }
  });

  test('every bass and arp note follows its chord\'s root and quality, in every track', () => {
    const TONES = { min: [0, 3, 7], maj: [0, 4, 7] };
    for (const t of TRACKS) {
      for (let step = 0; step < PASS * PASSES; step++) {
        const i = Math.floor((step % PASS) / 32);
        const chord = t.root + t.progression[i];
        const at = step % 16;
        const layers = t.arrangement[Math.floor(step / PASS)];
        const bass = find(t, step, 'bass');
        const arp = find(t, step, 'arp');
        if (layers.includes('bass') && t.bass[at] != null) assert.equal(bass.midi, chord + t.bass[at] - 24, `${t.name} bass ${step}`);
        else assert.equal(bass, undefined, `${t.name} no bass ${step}`);
        if (layers.includes('arp') && t.arp[at] != null) {
          const k = t.arp[at];
          assert.equal(arp.midi, chord + TONES[t.qualities[i]][k % 3] + 12 * Math.floor(k / 3) + 12, `${t.name} arp ${step}`);
        } else assert.equal(arp, undefined, `${t.name} no arp ${step}`);
      }
    }
  });
});

describe('4. determinism, layers and peaks', () => {
  test('the same track and step always give the same events; a layer outside the pass gives none', () => {
    for (const t of TRACKS) {
      for (let step = 0; step < PASS * PASSES * 2; step++) {
        const events = eventsAt(t, step);
        assert.deepEqual(eventsAt(t, step), events);
        const layers = t.arrangement[Math.floor(step / PASS) % PASSES];
        for (const e of events) assert.ok(layers.includes(e.voice), `${t.name} ${e.voice} at ${step}`);
      }
    }
  });

  test('no gain exceeds its peak', () => {
    for (const t of TRACKS) {
      for (let step = 0; step < PASS * PASSES; step++) {
        for (const e of eventsAt(t, step)) assert.ok(e.gain > 0 && e.gain <= PEAK[e.voice], `${t.name} ${e.voice}`);
      }
    }
  });
});

describe('7. no audio files', () => {
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    if (['.git', 'node_modules', '.zvec-grep', 'memory'].includes(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

  test('the repository holds no audio file, and src fetches and decodes none', () => {
    const files = walk('.');
    assert.deepEqual(files.filter((f) => /\.(mp3|wav|ogg|flac|m4a|aac|opus|webm)$/i.test(f)), []);
    for (const f of files.filter((f) => f.startsWith('src') && f.endsWith('.js'))) {
      assert.doesNotMatch(readFileSync(f, 'utf8'), /new Audio|fetch\(|decodeAudioData/, f);
    }
  });
});

describe('8. sizes', () => {
  test('the new files are under 200 lines and audio.js is no longer than it was (177)', () => {
    const lines = (f) => readFileSync(f, 'utf8').split('\n').length;
    for (const f of ['src/levels/tracks.js', 'src/logic/music.js', 'src/view/music.js']) assert.ok(lines(f) < 200, f);
    assert.ok(lines('src/view/audio.js') <= 178, 'audio.js');
  });
});
