# 34: a music track for each level

## What the owner wants

Electronic music at a high pace, close to techno, faster than the "Pulse" visualizer page the owner named
(https://miaai-lab.github.io/Claude-Opus-5.5-100-HTML-Files/026-pulse-visualizer.html: 110 beats a
minute, A minor, four layers, a kick, noise hats, a bass and an arpeggiated pad, evolving every 8 bars),
one separate track for each level, made by code: no wave, mp3, ogg or any other audio file. The owner asked
on 30 September 2026 and left the details to us; these are the defaults we propose. Our tracks take that
page's idea (layers that join and leave every 8 bars) and push it harder and faster: 136 to 150 beats a
minute, a four-on-the-floor kick, off-beat open hats, rolling hats, an acid-style saw bass and a plucked
arpeggio with an echo. Every track is an original composition; the earlier idea of "Tricky Two" by Röyksopp
stays a matter of feel only, and no melody, chord sequence or rhythm of any existing piece is copied.

## What changes

Today each level has a `music` tune (`{ key, bpm, bars, root, bass, melody }`, spec 04) that `audio.js`
schedules as a bass and a marimba melody. It is replaced by a **track**: a small data description that a
step sequencer plays on a drum kit and three synths, all made from oscillators and noise in Web Audio, as
the game's sounds are. Each of the three levels has its own track (below). The old tune format and its
scheduler are removed.

## The track format

`level.music` is a track, plain data (defined in a new file `src/levels/tracks.js`, which exports `track1`,
`track2` and `track3`; each level file imports its own and sets `music: trackN`):

```
{ name, bpm, swing, root, progression, qualities, kick, snare, hat, hatSoft, openHat, bass, arp,
  pad: { cutoff, level }, arrangement }
```

- **Time:** a bar has 16 steps (sixteenth notes), a step lasts 60 divided by bpm divided by 4 seconds.
  `swing` (0 to 0.2) delays every odd step by that fraction of a step. A **pass** is 8 bars, 128 steps.
- **Harmony:** `root` is the MIDI note of the tonic; `progression` lists the four chords' roots as semitones
  above `root`; each chord lasts 2 bars (32 steps) and the four make one pass. `qualities` gives each
  chord's quality: `'min'` (intervals 0, 3, 7) or `'maj'` (0, 4, 7).
- **Drums**, each a list of steps 0 to 15 within a bar, the same every bar: `kick`, `snare` (a clap), `hat`
  (closed, loud), `hatSoft` (closed, soft), `openHat`.
- **Bass:** 16 entries, a semitone offset above the chord's root or `null` for a rest, played two octaves
  below the `root` register (MIDI `root + chord + offset - 24`).
- **Arp:** 16 entries, each a chord-tone index or `null`: index `i` is the chord's interval `i % 3` plus 12
  times `floor(i / 3)` semitones (so 3 is the root an octave up), played an octave above the `root` (MIDI
  `root + chord + tone + 12`).
- **Pad:** `{ cutoff, level }`: the chord's three tones sustained for its 2 bars.
- **Arrangement:** which layers play in each pass, four passes (32 bars) that then repeat, the same in all
  three tracks: pass 0, the drop: `kick`, `hat`, `hatSoft`, `bass`. Pass 1: those and `snare` and `arp`.
  Pass 2, full: those and `openHat` and `pad`. Pass 3, the breakdown: `arp`, `pad`, `hat`, `hatSoft` and
  `openHat` (no kick, no bass, no snare). A layer not in the pass's list makes no sound in it.

## The three tracks

| | level 1 | level 2 | level 3 |
|---|---|---|---|
| name | `Dusk run` | `Moonlit rows` | `Spider wood` |
| bpm | 140 | 136 | 150 |
| swing | 0 | 0.05 | 0 |
| root | 57 (A) | 50 (D) | 52 (E) |
| progression | 0, 8, 3, 10 | 0, 8, 3, 10 | 0, 8, 10, 7 |
| qualities | min, maj, maj, maj | min, maj, maj, maj | min, maj, maj, min |
| kick | 0, 4, 8, 12 | 0, 4, 8, 12 | 0, 4, 8, 10, 12 |
| snare | 4, 12 | 4, 12 | 4, 12 |
| hat | 0, 2, 4, 6, 8, 10, 12, 14 | 2, 6, 10, 14 | 0, 2, 4, 6, 8, 10, 12, 14 |
| hatSoft | 1, 3, 5, 7, 9, 11, 13, 15 | 1, 3, 5, 7, 9, 11, 13, 15 | 1, 3, 5, 7, 9, 11, 13, 15 |
| openHat | 2, 6, 10, 14 | 14 | 2, 6, 10, 14 |
| pad | cutoff 900, level 0.05 | cutoff 800, level 0.06 | cutoff 700, level 0.05 |

The bass patterns (16 steps each; `.` is a rest):

- Level 1: `0 . . 0 . 0 . . 7 . 0 . 12 . 7 .`
- Level 2: `0 . 7 . 0 . 12 . 0 . 7 . 0 7 12 .`
- Level 3: `0 0 . 0 0 . 0 0 0 0 . 0 7 . 5 .`

The arp patterns:

- Level 1: `0 1 2 3 2 1 2 3 0 1 2 3 2 1 3 2`
- Level 2: `0 2 1 3 0 2 1 3 2 1 3 1 2 1 0 1`
- Level 3: `0 1 2 3 0 1 2 3 0 2 1 3 2 1 0 1`

Level 1 is the brightest, level 2 the most relaxed (a touch of swing, still 136 bpm), level 3 the fastest
(150 bpm) and darkest. All three are faster than the 110 bpm of the page the owner named.

## The sounds

All from oscillators and noise, through the music bus (the game's `VOLUME.music`, today 0.3, unchanged),
each note scheduled on the audio clock:

- **Kick:** a sine gliding from 160 to 48 Hz over 0.11 seconds, peak 0.9, gone in 0.22 seconds, with a click
  of 0.01 seconds of noise through a highpass at 3000 Hz at peak 0.2.
- **Snare:** noise through a bandpass at 1800 Hz (Q 1), 0.12 seconds, peak 0.5, and a second tap 0.015
  seconds later at peak 0.35.
- **Hats:** noise through a highpass at 7500 Hz: closed 0.035 seconds at peak 0.22, soft 0.035 seconds at
  peak 0.1, open 0.22 seconds at peak 0.2.
- **Bass:** an acid-style sawtooth through a lowpass (Q 8) sweeping from 2200 to 300 Hz over 0.12 seconds,
  attack 0.005 seconds, peak 0.55, lasting 0.9 of a step.
- **Arp:** two sawtooths detuned by +6 and -6 cents through a lowpass sweeping from 3000 to 900 Hz over 0.15
  seconds, peak 0.16, lasting 1.5 steps, sent also to an **echo**: a delay of 3 steps with feedback 0.35, the
  loop filtered by a lowpass at 2500 Hz, wet 0.3.
- **Pad:** for each chord, at its first step, two sawtooths detuned by +8 and -8 cents and a triangle for each
  of the chord's three tones an octave above the `root` register (MIDI `root + chord + interval + 12`: for
  level 1's first chord 69, 72 and 76), through a
  lowpass at the track's `pad.cutoff`, attack 0.4 seconds, release 0.4 seconds, each voice at `pad.level`,
  lasting the 2 bars.

## When it plays

As the music does today: from the level's intro card until victory or defeat, through the pause (the
context is suspended and goes on from where it stopped), silent with the sound off, and only after the
first click (browsers allow sound only after one). It starts from step 0 (pass 0) at each level start, Try
again, Play again and Next level; Back to title stops it. A new level's track replaces the old one (`mix()`
still returns the level's `music`, now the track). The sounds (shots, bursts, the cues) are unchanged and
play over it.

## Every screen

- Loading, error and title: silent, as today (there is no title music).
- Intro card, play, the gaps between waves and the boss fight: the level's track, playing.
- Paused: suspended, and it goes on after.
- Victory and defeat: the track stops, as today; the victory and defeat cues play over silence.
- Each level start, Try again, Play again, Next level and Back to title: as above.
- No new text, no HUD change; the `M` key and the sound toggle work as today.

## Nothing else changes

The game's sounds and cues, the volumes (`VOLUME`), levels' data otherwise, the rules, `get_state`,
`llms.txt` (unchanged).

## Files

- `src/levels/tracks.js` (new): the three tracks; each level file sets `music:` to its own and loses its old
  tune (`level-1.js`, `level-2.js`, `level-3.js`).
- `src/logic/music.js` (new): the sequencer as plain data, no Web Audio, so Node can test it: `PASS` (128
  steps), `PASSES` (4), `stepSeconds(track)`, `stepTime(track, step)` (with swing), and
  `eventsAt(track, step)` (`step` counts on without wrapping; the pass is `floor(step / 128) % 4`): the
  list of `{ voice, midi, gain }` due at that step (`kick`, `snare`, `hat`, `hatSoft`, `openHat`, `bass`,
  `arp`, and `pad` with `midis` at each chord's first step).
- `src/view/music.js` (new): plays those events on the audio context: the voices above, the echo, and a
  scheduler the audio module calls each frame (it schedules the steps due in the next 0.2 seconds).
- `src/view/audio.js`: loses its tune scheduler and calls the new one; it must end no longer than it is.
  `src/logic/sound.js`: unchanged unless the track's identity needs it.

Each new file under 200 lines. The Pages workflow copies `src` whole. **No audio file is added** and none
may be fetched or decoded: the code uses no `Audio`, `fetch` or `decodeAudioData` for music.

## The tests

The builder may run the suite and node, but not a web server or a browser: listening to the tracks is the
supervisor's step, made by hand after the pull request opens. The builder may add and edit test files, and
the fake audio context. It may change an earlier test only where that test asserts the old tune format
(`key`, `bars`, `root`, `bass`, `melody` of a level's `music`) or the old scheduler's exact notes (spec 04's
music tests in `test/audio.test.js` and `test/sound-effects.test.js`, and any that read the level data), and
only those.

## Done when

`node --test` passes, and its tests prove:

1. The three tracks have the data in the tables above (bpm, swing, root, progression, qualities, every drum
   list, the bass and arp patterns, the pad, the arrangement), every bpm is above 110, and each level's
   `music` is its own track.
2. `stepSeconds` is 60 divided by bpm divided by 4 (140 bpm is 0.1071 s within 0.0001), `stepTime` delays odd
   steps by `swing` of a step and leaves even ones, and the pass is `floor(step / 128) % 4`, so step 512 is
   pass 0 again.
3. `eventsAt` for level 1: at step 0 (pass 0) a kick, a closed hat and the bass at MIDI 57 + 0 + 0 - 24 = 33,
   and no arp, pad, snare or open hat; at step 32 the chord is F and the bass is 57 + 8 + 0 - 24 = 41; at
   step 128 (pass 1) a kick, a closed hat, the arp at 57 + 0 + 0 + 12 = 69 and no pad; at step 132 also a
   snare and the arp at 57 + 0 + 7 + 12 = 76; at step 258 (pass 2) an open hat, and at step 256 the pad's
   three tones 69, 72 and 76; at step 384 (pass 3, the breakdown) no kick, no bass and no snare, and the
   pad, the arp and the hats present; the bass and arp notes follow the chord's root and quality for every
   step of every track.
4. The same track and step always give the same events (no randomness), a layer outside the pass's list
   gives none, and no event's gain exceeds its peak above (kick 0.9, snare 0.5, hat 0.22, bass 0.55, arp
   0.16, pad 0.06).
5. The music on a stand-in audio context: starting a track schedules nodes (oscillators and noise) only, on
   the audio clock, for the steps in the next 0.2 seconds; a kick is a sine gliding 160 to 48 Hz; the arp
   has two detuned sawtooths and feeds the echo (delay 3 steps, feedback 0.35); the pad starts at each
   chord's first step of a pass that has it; nothing is scheduled twice.
6. The pause suspends and resumes it without skipping or repeating steps; with the sound off nothing
   sounds; it stops on victory and defeat and on the title, and a new start begins at step 0 (pass 0); a
   level's track replaces the previous one.
7. No audio file exists in the repository (none with an audio extension: mp3, wav, ogg, flac, m4a, aac,
   opus, webm), and no source file under `src` uses `new Audio`, `fetch` or `decodeAudioData` for music.
8. The new files are under 200 lines; `audio.js` is no longer than today; every other sound and cue is as
   before.
