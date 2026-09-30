// One electronic track for each level, as data: a step sequencer (src/logic/music.js) plays it on a
// drum kit and three synths (src/view/music.js). Every track is an original composition.
//
// A bar has 16 steps; `swing` delays every odd step by that fraction of a step. Each chord lasts 2 bars
// and the four make a pass of 8 bars. `progression` lists the chords' roots in semitones above `root`
// (a MIDI note), `qualities` their kind. Drums list the steps of a bar they sound on. `bass` gives a
// semitone offset above the chord's root per step, `arp` a chord-tone index per step (null rests).
// `arrangement` says which layers play in each of four passes, which then repeat.

const _ = null;

const ARRANGEMENT = [
  ['kick', 'hat', 'hatSoft', 'bass'], // the drop
  ['kick', 'hat', 'hatSoft', 'bass', 'snare', 'arp'],
  ['kick', 'hat', 'hatSoft', 'bass', 'snare', 'arp', 'openHat', 'pad'], // full
  ['arp', 'pad', 'hat', 'hatSoft', 'openHat'], // the breakdown
];

const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];
const OFFBEATS = [1, 3, 5, 7, 9, 11, 13, 15];

export const track1 = {
  name: 'Dusk run',
  bpm: 140,
  swing: 0,
  root: 57,
  progression: [0, 8, 3, 10],
  qualities: ['min', 'maj', 'maj', 'maj'],
  kick: [0, 4, 8, 12],
  snare: [4, 12],
  hat: EIGHTHS,
  hatSoft: OFFBEATS,
  openHat: [2, 6, 10, 14],
  bass: [0, _, _, 0, _, 0, _, _, 7, _, 0, _, 12, _, 7, _],
  arp: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 3, 2],
  pad: { cutoff: 900, level: 0.05 },
  arrangement: ARRANGEMENT,
};

export const track2 = {
  name: 'Moonlit rows',
  bpm: 136,
  swing: 0.05,
  root: 50,
  progression: [0, 8, 3, 10],
  qualities: ['min', 'maj', 'maj', 'maj'],
  kick: [0, 4, 8, 12],
  snare: [4, 12],
  hat: [2, 6, 10, 14],
  hatSoft: OFFBEATS,
  openHat: [14],
  bass: [0, _, 7, _, 0, _, 12, _, 0, _, 7, _, 0, 7, 12, _],
  arp: [0, 2, 1, 3, 0, 2, 1, 3, 2, 1, 3, 1, 2, 1, 0, 1],
  pad: { cutoff: 800, level: 0.06 },
  arrangement: ARRANGEMENT,
};

export const track3 = {
  name: 'Spider wood',
  bpm: 150,
  swing: 0,
  root: 52,
  progression: [0, 8, 10, 7],
  qualities: ['min', 'maj', 'maj', 'min'],
  kick: [0, 4, 8, 10, 12],
  snare: [4, 12],
  hat: EIGHTHS,
  hatSoft: OFFBEATS,
  openHat: [2, 6, 10, 14],
  bass: [0, 0, _, 0, 0, _, 0, 0, 0, 0, _, 0, 7, _, 5, _],
  arp: [0, 1, 2, 3, 0, 1, 2, 3, 0, 2, 1, 3, 2, 1, 0, 1],
  pad: { cutoff: 700, level: 0.05 },
  arrangement: ARRANGEMENT,
};
