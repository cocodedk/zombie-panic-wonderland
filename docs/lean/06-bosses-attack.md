# 06: the bosses attack

## What the owner wants

The bosses do not attack at all. They must.

## Why they do not, today

A boss walks from the backdrop (z = -12) to 3 units behind the road (z = -3) at 1.2 units a second,
7.5 seconds, and its action timer starts only when it arrives, so its first attack comes 11.5 seconds
after it appears. At 8 shots a second, the player fells the Zombie King (60 hits) in 7.5 seconds and
the Scarecrow King (80 hits) in 10, so a player who keeps firing never sees an attack. The stomp also
makes no sound, so even when one lands it is easy to miss.

## Behaviour

- **Attacks start early.** A boss's first action comes 2 seconds after it appears, whether it is
  still walking or already standing, and then one every 3 seconds, in turn as before: the Zombie
  King stomps, then summons; the Scarecrow King throws a flaming pumpkin, then summons crows.
- **A warning before each action.** For the 0.6 seconds before each action, the boss winds up: it
  raises its arms, and its crown (the Zombie King) or its hat (the Scarecrow King) glows. A new cue,
  `windup`, sounds as it begins: a low rising growl.
- **The stomp is felt.** A new cue, `stomp`, plays a heavy thud when the boss stomps. The camera
  shakes for 0.25 seconds, by at most 0.15 units, when the shockwave reaches the road, whether or not
  it costs a heart. The shockwave's own rules do not change: it reaches the road 1 second after the
  stomp and costs 1 heart unless the player is dodging.
- **Summons come from the boss.** Summoned enemies appear beside the boss, within 2 units of its x at
  its z, not in the backdrop.
- **Longer fights.** The Zombie King falls after 200 hits and the Scarecrow King after 240, about
  25 and 30 seconds of steady fire. Their points do not change.
- The boss bar, the announcement, the burst on falling and the victory card's 1.5-second wait do not
  change. Mute, pause and reduced motion apply to the new sound and the shake as to everything else:
  reduced motion turns the shake off.

## Done when

`node --test` passes, and its tests prove:

1. A boss's first action comes 2 seconds after it appears while it is still walking, then every
   3 seconds, alternating as above, for both bosses.
2. The wind-up starts 0.6 seconds before each action, with its `windup` cue.
3. A stomp emits `stomp`, and the shake starts when the shockwave reaches the road; reduced motion
   gives no shake.
4. Summoned enemies appear within 2 units of the boss's x, at its z.
5. The Zombie King falls after 200 hits and the Scarecrow King after 240.
6. Every earlier test still passes. The builder may change the tests that pin the old hit counts,
   the old first-action time or the old summon position, and nothing else in them.

## Out of scope

New attacks, new enemies, weapons (the next spec), and any other change. The builder adds or edits
test files as the checks above need.
