# 12: the Scattergun and the launcher reload

## What the owner wants

Reloading for the Scattergun and the pumpkin launcher. The owner asked for it on 28 September 2026
and left the details to us; these are the defaults we proposed.

## Behaviour

- Once collected, the Scattergun and the launcher stay owned until a reset (the resets of spec 07 do
  not change). They never run out, so they are never lost during a level: the switch back to the
  Popper with its `click` cue no longer happens. The `click` sound may be removed.
- Each holds a magazine: the Scattergun 4 shells, the launcher 2 rounds. Each blast or shot uses one.
  Collecting a weapon gives it a full magazine.
- When the magazine in hand is empty, a reload starts by itself. **R** starts one early when the
  weapon in hand is the Scattergun or the launcher, its magazine is not full and it is not already
  reloading; otherwise R does nothing. R works wherever shooting works, and nowhere else. A reload
  takes 1.5 seconds for the Scattergun and 2 seconds for the launcher, and fills the magazine when
  it ends.
- While a weapon reloads it does not fire. With the button held, it fires again as soon as the reload
  ends, then at its own rate.
- Switching away stops a reload, and the magazine keeps what it had. Switching back to a weapon whose
  magazine is empty starts its reload again from the beginning.
- A crate for a weapon already owned fills its magazine at once and ends any reload of it.
- The Popper never reloads. Pause freezes a reload.
- The code already uses `reload` for the time between shots. Name the new magazine reload so the two
  cannot be confused.

## What the player sees and hears

The reference is today's HUD weapon line and crosshair. Only the parts below change.

- **The weapon line**, bottom left, where it shows today: an owned Scattergun or launcher shows its
  magazine as `left/size`, and `reloading` while it reloads. For example
  `1 Popper ∞ · 2 Scattergun 3/4 · 3 Launcher —`, or `1 Popper ∞ · 2 Scattergun reloading · 3 Launcher 2/2`.
  The weapon in hand stays bold and bright; weapons not owned stay dimmed with `—`.
- **The crosshair** is drawn at half opacity while the weapon in hand reloads, and at full opacity
  again when the reload ends.
- **The title's controls line** gains `· R reloads` after `· 1 2 3 or wheel: weapons`, before
  `· M sound`.
- **A new cue, `reload`:** a short metallic rack of about 150 ms, played when a reload ends. It
  follows mute and pause like every cue.

Nothing new shows at the centre of the screen.

## WebMCP

`get_state`'s `ammo` becomes the rounds left in the magazine of the weapon in hand (`null` for the
Popper), and `get_state` gains `reloading`: `true` while the weapon in hand reloads, otherwise
`false`. `llms.txt` describes both. The builder may add `reloading` where earlier tests assert
`get_state`'s exact answer, and change nothing else in those tests.

## Done when

`node --test` passes, and its tests prove:

1. Magazines of 4 and 2, one used per blast or shot; a crate gives a full magazine, and a crate for
   an owned weapon fills it and ends its reload.
2. An empty magazine reloads by itself, in 1.5 seconds for the Scattergun and 2 for the launcher;
   R reloads early only when it should; nothing fires during a reload, and held fire carries on after.
3. The weapons never run out: after 100 blasts the Scattergun is still owned and in hand, and no
   `click` is cued.
4. Switching away stops a reload and keeps the magazine; switching back to an empty weapon starts its
   reload from the beginning; pause freezes a reload.
5. The weapon line, the half-opacity crosshair, the controls line, and the `reload` cue when a reload
   ends.
6. `get_state` reports the magazine and `reloading`, and `llms.txt` says so.
7. Every earlier test still passes. The builder may change any earlier test whose expectation this
   spec changes (running out, the switch back with `click`, crate ammo, the weapon line, the controls
   line, `get_state`'s exact answer), and nothing else in them. The builder adds or edits test files as
   the checks above need.

## Out of scope

Gas canisters (a later spec), new weapons, upgrades, and any change to enemies, bosses or levels.
