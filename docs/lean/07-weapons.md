# 07: three weapons, picked up from crates

## What the owner wants

Different weapons. The owner approved this set on 28 September 2026, kept to the original's arcade
feel. Every model, effect and sound is our own, made in code.

## The weapons

| Key | Weapon | Fire rate (held button) | Damage | Ammo |
|---|---|---|---|---|
| 1 | **Popper** (today's gun) | 8 shots a second | 1 hit on the first enemy or pumpkin under the crosshair | never runs out |
| 2 | **Scattergun** | 1.5 blasts a second | 6 pellets spread evenly in a 10° cone around the aim; each pellet hits the first enemy or pumpkin on its line for 1 hit | 12 shells, 1 per blast |
| 3 | **Pumpkin launcher** | 1 shot a second | a pumpkin that flies in an arc from the muzzle to the aim point in 0.5 seconds and explodes there: every enemy within 2 units takes 8 hits, bosses included, and every pumpkin in the air within 2 units is shot down | 5 rounds, 1 per shot |

- The Popper is always owned. The others are owned only after their crate is collected, with full
  ammo.
- When the weapon in hand runs out of ammo, it is no longer owned and the Popper is in hand at once.
- Points, falls and bursts follow the existing rules, whatever weapon the hits come from.

## Crates

- In each level, a **Scattergun crate** appears 2 seconds after wave 2 starts, and a **launcher
  crate** 2 seconds after wave 4 starts.
- A crate appears above the field at a random x between -6 and 6, at z = -6. It floats down over
  3 seconds to a height of 1.5 and hovers there, bobbing gently. If it is not collected 10 seconds
  after it appears, it floats up and away over 1 second and is gone.
- The player collects a crate by shooting it: 3 hits from any weapon. Pellets and explosions count as
  hits. Collecting gives the weapon with full ammo; if it is already owned, the ammo refills.
- The crate is a flat-shaded wooden box with a simple emblem of its weapon on each side, made in code.
- A collected crate sounds `pickup` (two bright rising notes) and shows `Scattergun!` or `Pumpkin
  launcher!` at the centre for 1.5 seconds.
- Crates never hurt, block or count as enemies. A wave can be cleared while a crate still floats.

## Switching

- Keys 1, 2 and 3 take the Popper, the Scattergun or the launcher, when owned; a key for a weapon not
  owned does nothing.
- The mouse wheel steps through the owned weapons in that order, and wraps around.
- A switch is instant, and the next shot follows the new weapon's fire rate.
- The title screen's controls line gains `· 1 2 3 or wheel: weapons`, before `· M sound`.

## The HUD

- Bottom left, one line lists all three: `1 Popper ∞ · 2 Scattergun 9 · 3 Launcher —`.
- The weapon in hand is shown bold and bright, owned ones in the normal colour, and weapons not owned
  are dimmed with `—` for their ammo.
- `♪ on` / `♪ off` stays bottom right.

## Look and sound

- **Scattergun:** each blast draws its 6 pellets as short streaks, like the Popper's (#fff3b0), and
  a larger muzzle flash. Cue `scatter`: a boomy blast of about 120 ms.
- **Launcher:** the flying pumpkin is a small glowing orange pumpkin model. Its explosion is an orange
  burst: 16 chunks and a puff of 2 units, over 0.6 seconds. Cues: `launch` (a hollow thunk) and
  `boom` (a deep burst).
- An empty weapon switching back to the Popper sounds `click`: a dry click.
- All new sounds follow mute and pause. Reduced motion turns the explosion into a 0.3-second flash of
  the puff, with no chunks.

## Resets

Each level start, **Try again**, **Play again**, **Next level** and **Back to title** leave only the
Popper, in hand, and clear crates and flying pumpkins. Pause freezes crates, flying pumpkins and
explosions.

## WebMCP

`get_state` gains `weapon` (`popper`, `scattergun` or `launcher`) and `ammo` (a number, or `null` for
the Popper). Nothing else about it changes. The builder may add these two fields where earlier tests
assert `get_state`'s exact answer, and change nothing else in those tests.

## Done when

`node --test` passes, and its tests prove:

1. Each weapon's fire rate, damage and ammo, the scattergun's cone of 6 pellets, and the launcher's
   0.5-second flight and 2-unit blast (8 hits, pumpkins shot down).
2. Crates: when and where they appear, the 3-second fall, the 10-second stay and 1-second leave, the
   3 hits to collect, and full ammo or a refill.
3. Keys 1 to 3 and the wheel, including unowned weapons and wrapping; running empty switches to the
   Popper with its `click` cue.
4. The HUD line and the title's controls line read as above.
5. The resets above, and pause freezing the new objects.
6. `get_state` reports the weapon and its ammo, and every earlier test still passes. The builder may
   change any earlier test whose expectation this spec changes, and nothing else in them.

## Out of scope

More weapons, weapon upgrades, saving weapons between levels, and any change to enemies, bosses or
levels. The builder adds or edits test files as the checks above need.
