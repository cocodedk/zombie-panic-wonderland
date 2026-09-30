# 27: level buttons on the title page

Run this after spec 26 is merged.

## What the owner wants

Buttons on the title page that let the owner play from a certain level: one button per level. The owner
asked on 30 September 2026 (in place of an earlier idea of a shortcut in the address) and left the
details to us; these are the defaults we propose. It is for examining and playing any level, and it
changes nothing about how a level plays.

## The buttons

- On the **title** screen, under today's two lines (`Click to start` and the controls line), a row of
  buttons, one for each level in the game (today 2; a level added later gets its button with no other
  change). Each is labelled `Level N`, N being the level's `number`.
- **Clicking a level's button** starts that level, the way a click on the title starts level 1 today:
  its intro card, then wave 1, with score 0, three hearts, the Popper only, no crates yet, the weather
  and sky from the start. Nothing is unlocked and no wave is skipped.
- **A click anywhere else** on the title still starts level 1, as today; `Click to start` stays.
- The buttons show **only on the title**. On every other screen they are hidden.
- **Afterwards** the level goes on as today: victory goes to the next level (or **Back to title**
  after the last one), Try again and Play again restart the same level. **Back to title** shows the
  title with the buttons again.
- The buttons can be pressed with the keyboard too: Tab to one and Enter starts that level (Space is
  the dodge key and does not press it).

## What the player sees

The reference is today's title screen and today's buttons (Play again, Next level, Back to title): the
same look (`#band button` in `style.css`: gold `#f0b25a` on dark, rounded, `1.2rem` type), the same
size and spacing. The new buttons sit in a row under the text lines, `1rem` apart, wrapping onto a
second row when the window is too narrow for them. Nothing else on the title changes: its text, its
controls line, the scene behind it (level 1's).

## Every screen

- Loading and error: as today; no buttons.
- Title: the buttons as above.
- Intro card, play, the gaps between waves, the boss fight, paused, victory and defeat: as today; no
  level buttons (victory and defeat keep their own buttons).
- No new sound, no HUD change, `get_state` and `llms.txt` unchanged.

## How it is made

- `src/logic/screens.js`: on the title, the band data also carries `levels`, a list of
  `{ text: 'Level N', index }` (index into `game.levels`); every other screen's band has none. Plain
  data, so Node can test it.
- `src/logic/game.js`: `startAt(index)`: on the title screen only, with an integer index inside
  `levels`, begins `levels[index]` with score 0 (as the title click does with `levels[0]`); anywhere
  else, or with any other index, it does nothing. At most 8 lines longer than today.
- `src/view/hud.js`: makes one button for each entry of `levels` in a new container, shows the
  container only when the band carries `levels`, and calls `game.startAt(index)` on a click; it makes
  the buttons again only when the list changes. At most 16 lines longer than today.
- `index.html`: one new empty container, `<div class="levels" hidden></div>`, inside `#band`, after
  `.lines` and before `.buttons`; `style.css`: the row's layout (flex, gap, wrap, centred), at most 8
  lines. The buttons take today's `#band button` style, and the `pointer-events: auto` it sets.
- The page already ignores a press on a button for the click-to-start (`input.js` skips `BUTTON`
  targets), so a level button starts only its own level.

New files: none. `game.js` is not split. The Pages workflow copies `index.html`, `style.css` and `src`
already, so it needs no change.

## The tests

The builder may run the suite and node, but not a web server or a browser: a picture of the title with
its buttons is the supervisor's step. The builder may add and edit test files, and the fake page the
HUD tests use, as far as the new container needs it. It may change an earlier test only where the title
band's exact data is asserted (which now also carries `levels`), and only that assertion.

## Done when

`node --test` passes, and its tests prove:

1. On the title, `screenView(game).band.levels` is `[{ text: 'Level 1', index: 0 }, { text: 'Level 2',
   index: 1 }]` for the two levels, and no other screen's band has `levels`; the band's title and lines
   are today's.
2. `game.startAt(1)` on the title begins level 2: screen `intro`, `game.level` level 2, score 0, three
   hearts, only the Popper owned, wave 1 next; `startAt(0)` begins level 1 as the title click does.
3. `startAt` does nothing off the title (intro, play, paused, victory, defeat, loading, error) and for
   `-1`, `2`, `1.5`, `'1'`, `null` and `undefined` on the title.
4. The title click (`pointerDown`) still starts level 1; and after `Back to title` the title's
   `levels` are back.
5. The HUD (with the fake page) makes two buttons labelled `Level 1` and `Level 2` in the container on
   the title, hides the container on every other screen, calls `startAt(index)` when one is clicked,
   and does not make them again while the list is unchanged.
6. A press on a level button does not also start level 1 (with the fake page, `input.js`'s button
   check).
7. `game.js`, `hud.js` and `style.css` are within the limits above, and `index.html` has exactly one
   new container.
