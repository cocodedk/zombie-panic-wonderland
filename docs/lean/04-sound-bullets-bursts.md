# 04: sound, visible bullets and bursting enemies

## What the owner wants

Game sound, visible bullets and exploding zombies. The owner delegated the details to the
original's feel, kept simple, on 28 September 2026; these decisions follow that. Every sound and
every effect is our own, made in code: no audio or image files.

## Sound, synthesized with the Web Audio API

- **When it starts:** with the click on `Click to start`; browsers allow sound only after a click.
  Before that click the page is silent.
- **Mute:** the M key turns all sound off and on at any time; sound starts on. The HUD shows `♪ on`
  or `♪ off` small at the bottom right, and the title's controls line ends with `· M sound`. The
  choice lasts until the page is closed and is not saved.
- **Volume:** one master level, 0.5; music plays at 0.3 of it, effects at the full master level.
- **Effects:**
  - shot: a short click and thump, about 60 ms, quiet enough for 8 a second;
  - hit: a short high tick when a shot hits;
  - burst: a crunchy noise burst of about 300 ms when an enemy falls, 600 ms and deeper for a boss;
  - hurt: a low falling tone when a heart is lost;
  - dodge: a quick rising whoosh;
  - throw: a soft thump when a pumpkin or flaming pumpkin is thrown;
  - caw: a short squawk when a crow starts its dive;
  - the boss's announcement: a low swelling drone;
  - victory: three rising notes; defeat: three falling notes.
- **Music:** one short loop per level, in the original's mood (ominous but light), from a bass line
  and a soft marimba-like melody.
  - Level 1: minor key, 120 beats a minute, 8 bars.
  - Level 2: another minor key, 100 beats a minute, 8 bars.
  - It plays from the intro card until victory or defeat, where the jingle replaces it. It starts
    again with the next intro card.
- **Pause:** all sound pauses with the game and resumes with it.

## Visible bullets

- Each shot draws a bright streak (#fff3b0) from the gun's muzzle to where it lands: the point it
  hits on an enemy or a pumpkin, or else the point under the crosshair on the ground or backdrop.
  The streak shows for 0.06 seconds, with a small muzzle flash of 0.04 seconds.
- Shooting rules do not change: a shot still hits at once, as in levels 1 and 2. The streak only
  shows it.

## Bursting enemies

- When an enemy falls, it bursts into 12 small flat-shaded chunks in its own colours. They fly out
  and up in random directions at 3 to 6 units a second, fall under gravity (9.8), spin, and shrink
  to nothing in 1 second.
- A puff comes with the chunks: a flat-shaded ball that grows and fades in 0.3 seconds, green
  (#9fd18b) for a zombie, orange (#e07b24) for a pumpkin monster and dark grey (#3a3a3a) for a crow.
- A boss bursts into 40 chunks over 1.5 seconds, with a puff three times the size.
- A pumpkin shot down in the air bursts into 6 orange chunks over 0.6 seconds, with no puff.
- Chunks and puffs only show; they never hit anything. At most 300 chunks exist at once, and the
  oldest go first.
- Pause freezes streaks, chunks and puffs; a restart, **Next level** or **Back to title** clears them.
- **Reduced motion:** when the browser asks for reduced motion (`prefers-reduced-motion`), a fallen
  enemy fades out over 0.3 seconds instead of bursting, and no chunks are made.

## Components, for reuse

The game logic records what happened as cues (shot, hit, burst, hurt, dodge, throw, caw, boss,
victory, defeat) and as effects (streaks, bursts), in modules that do not use the browser, so Node
can test them. The view turns effects into three.js objects, and a separate audio module turns cues
into Web Audio sounds. Other levels and enemies reuse all three. `get_state` does not change.

## Done when

`node --test` passes, and its tests prove:

1. Each event in the list above emits its cue exactly once, and no cue comes before the start click.
2. Mute stops every cue from sounding and M flips it; pause holds cues and music; each level gets
   its own loop.
3. Each shot makes a streak ending at the hit point or the crosshair point, lasting 0.06 seconds.
4. Each fall makes a burst with the counts, durations and colours above, bosses and shot pumpkins
   included, and the 300-chunk cap drops the oldest first.
5. Reduced motion replaces bursts with a 0.3-second fade.
6. Pause freezes effects; restart, **Next level** and **Back to title** clear them.
7. Every earlier test still passes.

## Answers to the grill

- **M on every screen.** M works on every screen, loading and error included. Wherever the HUD
  shows, its `♪ on` or `♪ off` shows the state. On the title screen, the controls line ends with
  `· M sound: on` or `· M sound: off` and follows each press. On the loading and error screens
  nothing plays and nothing shows, but the choice carries into the game.
- **The boss's fall.** When a boss falls, every other enemy on the field bursts with it (no points
  for them), nothing can cost a heart, and the player can still move. The victory card appears
  1.5 seconds later, when the boss's burst has finished, and only then does the scene freeze. The
  builder may change earlier tests that expect the victory screen at the moment the boss falls, so
  that they expect it 1.5 seconds later; nothing else in those tests changes.

## Out of scope

A volume slider, saving the mute choice, audio or image files of any kind, and any change to the
rules of play. The builder adds or edits test files as the checks above need.
