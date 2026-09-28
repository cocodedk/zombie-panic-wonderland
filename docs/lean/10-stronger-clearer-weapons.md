# 10: weapons that are stronger and clearly different

## What the owner found

The weapons kill more slowly than the Popper, and it is not clear what the Scattergun does.

## Why, from the code

The Popper fires 8 shots a second, 1 hit each: 8 hits a second. The Scattergun fires 1.5 blasts a
second of 6 pellets, but its five outer pellets sit 5° off the aim. At the road, about 9.5 units from
the camera, they pass about 0.8 units to the side of a zombie about 0.8 units wide, so usually only
the centre pellet hits: about 1.5 to 3 hits a second. The launcher gives 8 hits a second on one
target, no more than the Popper, and has only 5 rounds. The Scattergun's thin, short streaks do not
show its spread.

## Behaviour

- **Scattergun:** 8 pellets in a 4° cone (one along the aim, seven evenly around it 2° away),
  2 blasts a second, each pellet worth 2 hits, 16 shells. At the road at least 6 of the 8 pellets pass
  within 0.4 units of the aim point.
- **Pumpkin launcher:** 1.5 shots a second, a flight of 0.35 seconds, a blast of 2.5 units worth
  12 hits to every enemy caught in it, bosses included, 8 rounds. Pumpkins in the air within the
  blast are still shot down.
- **The Popper** does not change.
- **A crosshair for each weapon.** Popper: today's ring. Scattergun: a wider ring with its pellet
  pattern, as below. Launcher: a dashed circle for the blast, with a centre dot.
  All drawn in the crosshair's present colour. The Scattergun's crosshair matches its pellets: a centre
  dot and 7 dots evenly around the ring.
- **Pickup notices say what the weapon does**, for 2.5 seconds: `Scattergun! 8 pellets a blast — best
  up close` and `Pumpkin launcher! Explodes — hits every enemy nearby`.
- **Pellets you can see.** Scattergun streaks are twice as thick as the Popper's and last 0.1 seconds.
  Each pellet that hits something shows a small spark (#fff3b0) where it lands, for 0.15 seconds.
- Everything else stays as it is: crates, switching, the HUD line, sounds, resets and every other
  rule. The only exceptions are the numbers, the crosshairs, the notices and the pellet look above.

## Done when

`node --test` passes, and its tests prove:

1. The new numbers for both weapons, and that the Popper's are unchanged.
2. At 9.5 units, at least 6 of the Scattergun's 8 pellets pass within 0.4 units of the aim point.
3. Against a durable zombie-sized target at the road (a target as wide as a zombie that does not
   fall), the Scattergun deals at least 16 hits a second and the launcher at least 12 hits a shot,
   both more than the Popper's 8 hits a second.
4. The crosshair shape follows the weapon in hand, and the pickup notices read as above for
   2.5 seconds.
5. Pellet streaks' thickness and life, and sparks where pellets hit.
6. Every earlier test still passes. The builder may change any earlier test whose expectation this
   spec changes, and nothing else in them.

## Answers to the grill

- **Crosshair size.** Fixed-size symbols, the same at every distance, larger than the Popper's 32 px
  ring: the Scattergun's ring is 44 px across with its centre dot and 7 dots on the ring; the
  launcher's circle is 52 px across, dashed, with a centre dot.
- **The reference.** Today's crosshair: its colour, stroke width and centre dot stay; only the ring's
  size, the dots and the dashing change. There is no new mock.
- **The launcher's notice** says `hits every enemy nearby`, because the blast never hurts the player.

## Out of scope

New weapons, upgrades and any other change. The builder adds or edits test files as the checks above
need.
