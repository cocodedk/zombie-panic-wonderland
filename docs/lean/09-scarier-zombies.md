# 09: a little scarier zombies

## What the owner wants

The zombies a little more scary, with small changes only.

## Behaviour

- **Eyes:** every zombie's eyes, the Zombie King's included, glow a dim red (#ff3b30) instead of
  their present colour.
- **Face:** each zombie's jaw hangs torn open, a little lower than the rest of the face, with 3 to 5
  small crooked off-white teeth (#e8e0c8), all made in code from flat-shaded primitives. The Zombie
  King has the same, scaled with it.
- **Twitch:** while a zombie walks or stands, its head jerks now and then: every 2 to 4 seconds, at
  random, it snaps up to 20° to one side and back within 0.15 seconds.
- **Groan:** a new cue, `groan`, a low short moan made with the Web Audio API. It sounds when a
  zombie reaches the road, and at most once every 1.5 seconds across all zombies. It follows mute and
  pause like every other sound.
- Nothing else changes: apart from the eyes, the jaw and the teeth above, which are the only
  exceptions, the zombies' shape, colours, size, speed, hits, points and every rule of play stay as
  they are. Reduced motion turns the twitch off.

## Answers to the grill

- **The reference.** The existing zombie and Zombie King models in `src/view/models`, changed only
  as above; there is no new mock.
- **What each screen shows and sounds like.** The changes live on the zombies, so they show and sound
  only where zombies exist.
  - Loading, error, title and intro look and sound exactly as today, because no zombie is there.
  - Moments with no zombie on the field, such as between waves, have no twitches and no groans.
  - In play, zombies show the new eyes, jaw and teeth and twitch as above, and groans sound as above.
  - Pause freezes the twitch where it is and sounds nothing. Victory and defeat freeze the scene,
    twitches included, as today.
  - A restart, **Next level**, **Play again** or **Back to title** resets the groan's 1.5-second
    limit.

## Done when

`node --test` passes, and its tests prove the eye colour, the jaw and 3 to 5 teeth in the zombie and
Zombie King models, the twitch's timing and angle limits (off under reduced motion), and the `groan`
cue on reaching the road, no more than once every 1.5 seconds. Every earlier test still passes; the
builder may change any earlier test whose expectation this spec changes, and nothing else in them.

## Out of scope

Any other change. The builder adds or edits test files as the checks above need.
