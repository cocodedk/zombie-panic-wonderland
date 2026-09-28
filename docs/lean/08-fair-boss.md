# 08: a boss fight a person can win

## What the owner found

The Zombie King could not be beaten. Its summoned zombies arrive right at the road's edge, and the
owner did not know how to avoid the shockwaves.

## What a play-test measured

A bot played the Zombie King fight 20 times each way under the game's own rules. A bot that dodged
every shockwave on time won 20 of 20 in about 29 seconds, and so did one with human reaction times.
A bot that never dodged lost all 20, dead at 27 seconds with the King 7 hits from falling. Winning
depends entirely on timing a Space roll against every shockwave, which nothing teaches. The
original let a player simply stay out of the way.

## Behaviour

- **Step aside.** A shockwave hits only the part of the road within 3 units of the boss's x when it
  stomps. A player farther away than that is not hurt. A player within 3 units is hurt unless
  dodging, as today. The shockwave's look shows this: it spreads along the road only as far as it
  reaches.
- **A hint, once per boss fight.** When a boss first winds up in a fight, a line of its own at the
  centre, just below the pickup notice's line, reads `Space: dodge — or step aside!` for 2 seconds.
  A pickup notice and the hint can show at the same time.
- **Summons with room to answer.** Summoned enemies appear 2 units further back than today: within
  2 units of the boss's x, at the boss's z minus 2, wherever the boss is at that moment. From a boss
  standing at z = -3, zombies then need about 4 seconds to reach the road, not 2.5; summons made while
  the boss is still walking in simply take longer. There is no special case.
- The Scarecrow King's actions (flaming pumpkins and crows) do not change, except that its summoned
  crows follow the new summon position.
- Nothing else changes: hit counts, timings, damage, points, the wind-up, the shake and the cues.

## Done when

`node --test` passes, and its tests prove:

1. A stomp costs no heart when the player is more than 3 units from the boss's x, and 1 heart
   within 3 units unless dodging.
2. The hint shows once per boss fight, at the first wind-up, for 2 seconds, on its own line.
3. Summoned enemies appear within 2 units of the boss's x at its z minus 2.
4. A bot that never dodges but steps aside from each stomp can beat the Zombie King. The test plays
   the fight with the game's own logic, aiming at summoned zombies first and then the King.
5. Every earlier test still passes. The builder may change any earlier test whose expectation this
   spec changes, and nothing else in them.

## Out of scope

Any other change. The builder adds or edits test files as the checks above need.
