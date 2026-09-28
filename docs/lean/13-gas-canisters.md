# 13: gas canisters that blow up

## What the owner wants

Gas canisters on the field that the player shoots to blow up. The owner asked for them on
28 September 2026 and left the details to us; these are the defaults we proposed.

## Behaviour

- In both levels, when waves 2, 3, 4 and 5 start, 2 gas canisters appear standing on the ground of
  the field, at a random x between -6 and 6 and a random z between -8 and -4, at least 4 units apart.
  Zombies walk from z = -12 to the road at z = 0, so they pass the canisters. Wave 1 and the boss
  fight have none.
- When their wave is cleared, canisters still standing disappear at once, with no effect.
- Shots treat a canister like a crate: a Popper shot or a pellet hits only the first thing on its
  line, a canister included, so a canister shields what is behind it. Each hit flashes it white for
  0.08 seconds with the `hit` cue. The second hit blows it up. A launcher blast that reaches it blows
  it up at once.
- **The blast**, measured from the canister's centre the way the launcher's blast is measured: every
  enemy within 3 units takes 12 hits, every pumpkin in the air within 3 units is shot down, and a crate
  within 3 units takes one hit, as from a launcher blast. It never hurts the player. Points follow the
  existing rules, as for a launcher blast; the canister itself gives none.
- Canisters never count as enemies, never move and never block the player. A wave is cleared while
  canisters stand, and `get_state` does not change.
- Pause freezes a canister's flash and its explosion.

## What the player sees and hears

The references are today's crate (for being hit) and the launcher's explosion (for the blast). Only
the parts below are new.

- **The canister**, made in code and flat-shaded like every model: an upright red (#c0392b) cylinder
  about 0.5 units across and 1 unit tall, with a yellow (#f1c40f) band around its middle and a dark
  grey (#444444) valve on top. Its builder takes its colours and sizes as parameters, like every model.
- **The explosion:** a fireball of 20 chunks in orange (#ff8c1a) and gas green (#9acd32) and a puff of
  3 units, over 0.7 seconds. With reduced motion it is a 0.3-second flash of the puff, with no chunks,
  as the launcher's is.
- **A new cue, `gas`:** a short hiss and then a deep boom, about 400 ms. It follows mute and pause like
  every cue.
- **Where canisters show:** in the scene during waves 2 to 5, playing or paused. When the game is lost
  during a wave, the scene freezes with them in it. The title, the intro card, the gaps between waves,
  the boss fight and victory have none.
- Nothing new shows in the HUD or at the centre of the screen.

## Resets

Each level start, **Try again**, **Play again**, **Next level** and **Back to title** clear canisters
and their explosions.

## Done when

`node --test` passes, and its tests prove:

1. 2 canisters appear when each of waves 2 to 5 starts, in both levels, inside the area above and at
   least 4 units apart; none in wave 1 or the boss fight; the standing ones disappear when their wave
   is cleared, and every reset clears them.
2. The second hit blows a canister up; a canister shields what is behind it; a launcher blast that
   reaches it blows it up at once.
3. The blast: 12 hits to every enemy within 3 units, pumpkins shot down, one hit to a crate, the
   player never hurt, points as for a launcher blast, and none for the canister.
4. Canisters never count as enemies: a wave is cleared while they stand, and `get_state` is unchanged.
5. The model builder with its colours and sizes as parameters, the explosion's chunks, puff and time,
   the reduced-motion flash, the `gas` cue, and pause freezing the flash and the explosion.
6. Every earlier test still passes. The builder may change any earlier test whose expectation this
   spec changes, and nothing else in them. The builder adds or edits test files as the checks above
   need.

## Out of scope

New weapons, other props, and any change to enemies, bosses, weapons or levels beyond the canisters.
