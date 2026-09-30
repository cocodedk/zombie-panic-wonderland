# Level 3: the Spider Wood (plan, not a spec)

A plan for the owner to react to. Nothing here is built; the specs come after the owner has picked from
the questions at the end.

## What the asset search found (threejsassets.com)

| Wanted | Found | Cost / licence | Verdict |
|---|---|---|---|
| Spider | **Giant Spider 01**: domed carapace, bulbous hairy abdomen with a red hourglass, 8 jointed legs, 8 red eyes, fanged jaws, bristles; 2,602 triangles, 19 KB | Only inside the **Halloween pack, $39**, Pack Commercial License (62 assets). Not sold alone. Not free. | Use as a **design reference**; do not buy yet |
| Bird | **Heron Egret**: 428 triangles, 4 KB, not animated | Free, commercial use | A wading bird, not a menace. The game already has its own crow (`buildCrow`) |
| Wolf | none on the site | | Build one in code |
| Bat | **Bats 01**: 2.0k triangles, 14 KB, not animated | Free, commercial use | **Approved by the owner** as a level 3 flyer, next to the crows |

Other sources named by the search (Sketchfab low-poly spider, 268 triangles, CC BY; Quaternius wolf on
Poly Pizza, CC0) were not opened and have other licences to check.

**The catch:** every model in this game is made in code (`src/view/models/`, one builder per model, no
asset files). Using a `.glb` means adding a loader, the Draco decoder, a licence note and a file the
Pages workflow must copy: a new kind of thing in the repo. Recommendation: **keep building in code**, and
take the spider's shape from the description above (about 2,600 triangles is far more than our zombies
have; ours would be 300 to 500).

## The level

- **Setting:** a webbed twilight wood: dark trees hung with webs, giant mushrooms (level 1's), pale fog.
  A third look after dusk (1) and moonlit corn (2): cold green-violet, and the crescent moon from spec 21.
- **Enemies:** the zombies (ordinary and fast) and crows stay; new **spiders** run in along the ground
  and drop from above; **wolves** as a fast, low, hard-hitting runner (a different threat from the fast
  zombie); **bats** (approved by the owner) as a second flyer beside the crows.
- **Boss:** the **Spider Queen**, the Zombie King's counterpart: a big spider that spits web (slows the
  player's dodge for a moment) and summons spiderlings.
- **Pickups, weapons, score, screens:** as levels 1 and 2.

## Spec breakdown (each small enough for the loop)

1. **28: level 3 shell:** the third level in the game (data, title/next-level flow, a `web` scenery
   model, light, fog, weather and sky), with the zombies and crows; the boss is the Zombie King for now.
2. **29: spiders:** a ground spider enemy and its model in code.
3. **30: dropping spiders:** every third spider comes down on a thread.
4. **31: wolves:** a fast, tough runner that takes 2 hearts a strike, and its model.
5. **32: bats:** a flyer like the crow, quicker, and its model.
6. **33: the Spider Queen:** the boss, web balls that slow the player, and spiders she summons.

Decided defaults: everything built in code (no `.glb`), the wolf a fast runner, bats in, the Spider Queen
as the boss.

## Questions for the owner

1. Build the spider in code (recommended), or buy the Halloween pack ($39) and load `.glb` files?
2. Wolves: a fast runner (proposed) or a slow, tough one?
3. ~~Bats in level 3~~: **yes, decided.**
4. Spider Queen as the boss (proposed), or another?
