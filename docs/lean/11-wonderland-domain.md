# 11: the game's own address, wonderland.cocode.dk

## What the owner wants

The game lives at https://wonderland.cocode.dk/. The owner created the DNS record (a CNAME from
wonderland.cocode.dk to cocodedk.github.io) on 28 September 2026, and the repository's Pages setting
names the domain.

## Behaviour

- A file `CNAME` at the repository root holds exactly one line: `wonderland.cocode.dk`.
- `.github/workflows/pages.yml` copies `CNAME` into `_site` along with `index.html`, `style.css`,
  `llms.txt` and `src/`; nothing else about the workflow changes.
- `README.md`'s play link becomes `Play it: https://wonderland.cocode.dk/`, and no file in the
  repository names the old project Pages address (the `zombie-panic-wonderland` path under
  cocodedk's github.io host) any more. `llms.txt` names
  https://wonderland.cocode.dk/ as the page's address.
- The game itself does not change: it already uses relative paths, so it works at the domain's root.

## Done when

`node --test` passes, and its tests prove the `CNAME` file's single line, that pages.yml copies it
with the other four, the README's play link, `llms.txt`'s address, and that no tracked file names
that old address. Every earlier test still passes; the builder may change
any earlier test whose expectation this spec changes (the old play link and the old copy list), and
nothing else in them.

## Out of scope

Any change to the game. The builder adds or edits test files as the checks above need.
