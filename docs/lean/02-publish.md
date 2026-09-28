# 02: publish the game on GitHub Pages

## Goal

The game is playable at https://cocodedk.github.io/zombie-panic-wonderland/, and the repository
explains itself in a short README.

## Behaviour

- `.github/workflows/pages.yml`, named `Deploy Pages`, runs on push to main and on
  workflow_dispatch, with permissions `contents: read`, `pages: write`, `id-token: write`,
  concurrency group `pages` with `cancel-in-progress: false`, and one job `deploy` in the
  `github-pages` environment. Its steps: `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v4`;
  a step copying only `index.html`, `style.css`, `llms.txt` and the `src/` folder into `_site`;
  `actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0`;
  `actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0` with path `_site`;
  `actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1` with id `deployment`.
  Tests, specs and docs are never published.
- `README.md`: a title, one paragraph saying what the game is, the line
  `Play it: https://cocodedk.github.io/zombie-panic-wonderland/`, the controls as the title screen
  shows them, how to run the tests (`node --test`), how to play locally (any static web server in
  the repository folder, for example `python3 -m http.server`), and that it was built by
  graph-loop's lean loop (https://github.com/cocodedk/graph-loop) from the specs in `docs/lean/`.
  The owner turns Pages on; merging to main then publishes the game.
- Nothing about the game changes.

## Done when

`node --test` passes, and its tests prove that pages.yml has the triggers, permissions,
concurrency, pinned actions and copies exactly `index.html`, `style.css`, `llms.txt` and `src/`,
and that README.md has the play link, the local command and the test command.

## Out of scope

Any change to the game, and any other file.
