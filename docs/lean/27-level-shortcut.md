# 27: a shortcut to any level

Run this after spec 26 is merged.

## What the owner wants

A short cut to examine any level: open the game straight at the level wanted, without playing the ones
before it. The owner asked on 30 September 2026 and left the details to us; these are the defaults we
propose. It is for looking at levels, and it changes nothing about how a level plays.

## The shortcut

Add `?level=N` to the game's address, for example `index.html?level=2` or
`https://wonderland.cocode.dk/?level=2`, and the game opens on that level's title screen; a click
starts **that level** (its intro card, then wave 1) instead of level 1.

- **N** is the level's number, counting from 1, exactly as the levels are listed in `main.js`
  (`levels`): today 1 and 2, and any level added later works without a change. N counts only when it
  is a whole number written in digits, from 1 to the number of levels. Anything else (`0`, `-1`, `2.5`,
  `abc`, an empty value, `99`, or two `level` values) is ignored: the game opens on level 1, as
  today, with no message and no error.
- **The title screen** already draws the scene behind it, and now draws the chosen level's scene
  (sky, ground, scenery), so a level can be looked at without starting it.
- **Behind the click:** the level starts as it does from level 1 today: score 0, three hearts, the
  Popper only, no crates yet, the weather and the sky from the start. Nothing is unlocked and no
  wave is skipped.
- **Afterwards:** the level's own victory goes on to the next level as today (or **Back to title**
  after the last level, as today). **Try again** and **Play again** restart the same level as today.
  **Back to title** returns to the title with the shortcut's level still chosen, so the next click
  starts the same level again. Reloading the page with the address keeps it.
- **The address is read once**, when the page loads; changing it means reloading.

## What the player sees

The reference is today's title screen: its text, its controls line and its click to start stay. Only
one line is added, and only when a level was chosen this way (a valid `N`, even 1): under the title
lines, `Level N · chosen in the address`, in the same style as the other lines. Without the
shortcut the title is exactly as today, and so is everything else.

## Every screen

- Loading and error: as today; no level line.
- Title: the chosen level's scene behind it, and the level line as above.
- Intro card, play, the gaps between waves, the boss fight, paused, victory and defeat: as today, for
  the chosen level.
- No new sound, no HUD change, `get_state` and `llms.txt` unchanged.

## Files

- `src/logic/shortcut.js` (new): `levelFromSearch(search, levelCount)` returns the 0-based index the
  address chooses, or `null` when it chooses none; plain data, no page, so Node can test it.
- `src/main.js`: reads `location.search` and passes the choice; at most 6 lines longer than today.
- `src/logic/game.js`: `Game` takes a `first` option (the index of the level a click starts from,
  default 0), and `start()` begins `this.levels[first]` instead of `this.levels[0]`; at most 6 lines
  longer than today.
- `src/logic/screens.js`: the title's extra line when a level was chosen; at most 5 lines longer.

New files stay under 200 lines; `game.js` is not split. The Pages workflow copies `src` whole, so it
needs no change. The README and `llms.txt` are unchanged.

## The tests

The builder may run the suite and node, but not a web server or a browser: opening the page with the
address is the supervisor's step. The builder may add and edit test files. It changes no earlier
test: with no `first` option every game is as today.

## Done when

`node --test` passes, and its tests prove:

1. `levelFromSearch('?level=2', 2)` is 1, `'?level=1'` is 0, and it is `null` for `''`, `'?level=0'`,
   `'?level=3'` with 2 levels, `'?level=-1'`, `'?level=2.5'`, `'?level=abc'`,
   `'?level='`, `'?level=1&level=2'`, `'?x=1'`, and `'?level=02'`; other parameters beside `level`
   do not matter (`'?a=1&level=2'` is 1).
2. A game made with `first` 1 shows level 2 as `game.level` on the title screen, and its click
   starts level 2 (screen `intro`, level 2's waves and light); with `first` omitted it starts level 1
   as today.
3. A level started this way is a normal start: score 0, three hearts, only the Popper, wave 1 next,
   the same as level 1's start.
4. Victory on level 2 goes on as today (Back to title, there being no next); Try again and Play again
   restart the same level; Back to title returns to the title still on the chosen level, and the next
   click starts it again.
5. The title band has the extra line `Level 2 · chosen in the address` when level 2 was chosen (and
   `Level 1 · chosen in the address` when level 1 was chosen by the address), and exactly today's
   lines when nothing was chosen.
6. `main.js` passes the choice from `location.search` (with the fake page's `location`), and an
   invalid address opens level 1 with no line.
7. `shortcut.js` is under 200 lines, and `main.js`, `game.js` and `screens.js` are within their limits.
