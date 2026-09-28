# 14: a zombie preview image, search details and a better llms.txt

## What the owner wants

On 28 September 2026 the owner asked for three things on https://wonderland.cocode.dk/: a nice
zombie preview image (the picture shown when someone shares the link), good details for search
engines, and a good `llms.txt`. The site stays English only, like the game.

## The preview image

- `og.png` at the repository's root: a PNG of 1200 × 630 pixels, smaller than 600 KB.
- It shows the game's own scene, drawn by the game's own model builders: the ruined road at dusk with
  its backdrop, and the Zombie King with three zombies coming toward the viewer, their red eyes
  glowing. Over it, in large letters, `Zombie Panic in Wonderland`, and below that
  `A low-poly zombie shooter in your browser` and `wonderland.cocode.dk`. The text uses the title
  screen's font and colours, and stays readable when the picture is shown small.
- It is made from `og.html` at the root, a page that renders exactly that picture at 1200 × 630 with
  the game's modules and no HUD. `og.png` is a screenshot of it, taken with headless Chrome through a
  local web server (the game's modules do not load from `file://`); WebGL there needs
  `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader`. `og.html` is not linked from
  the game and is not deployed.

## The favicon

`favicon.svg` at the root: a zombie's head in the game's flat, faceted style, grey-green (#7d9a6a)
with dark eye sockets and dim red (#ff3b30) eyes, on a transparent background, still readable at
16 pixels.

## Search details, in `index.html`'s head

The game itself does not change. The head gains, with every address absolute under
`https://wonderland.cocode.dk/`:

- `<title>Zombie Panic in Wonderland — a low-poly zombie shooter</title>`
- a description: `Play a free low-poly 3D zombie shooter in your browser: hold the ruined road against
  waves of zombies and pumpkin monsters, then face the Zombie King.`
- `robots` `index, follow`, a canonical link to `https://wonderland.cocode.dk/`, `theme-color`
  `#2b1d3f`, and the favicon.
- Open Graph: `og:type` `website`, `og:site_name` and `og:title` `Zombie Panic in Wonderland`,
  `og:description` `Zombies have risen in Wonderland. Grab a scattergun, blow up gas canisters and hold
  the road — free, in your browser.`, `og:url`, `og:image` (`og.png`) with its width, height and
  `og:image:alt` `The Zombie King and three zombies coming down a ruined road at dusk.`, and
  `og:locale` `en_US`.
- Twitter: `summary_large_image`, with the same title, description, image and alt text.
- Structured data, one `application/ld+json` script: a schema.org `VideoGame` with its name, the
  description, the url, the image, `genre` `["Shooter", "Arcade"]`, `gamePlatform` `Web browser`,
  `applicationCategory` `Game`, `operatingSystem` `Any`, `inLanguage` `en`, `isAccessibleForFree`
  `true`, an `Offer` of price `0` in `USD`, `codeRepository`
  `https://github.com/cocodedk/zombie-panic-wonderland`, and `author`: the Person `Babak Bandpey`,
  url `https://cocode.dk`, `sameAs` `https://linkedin.com/in/babakbandpey` and
  `https://github.com/cocodedk`.

## Crawl files

- `robots.txt`: allows everything and names `https://wonderland.cocode.dk/sitemap.xml`.
- `sitemap.xml`: one url, `https://wonderland.cocode.dk/`.
- The Pages workflow copies `og.png`, `favicon.svg`, `robots.txt` and `sitemap.xml` with the files it
  copies today. Nothing else in the workflow changes.

## A better `llms.txt`

It keeps the llms.txt shape (a title, a one-paragraph summary in a quote, then sections) and says, in
plain words, what is true of the game in the code today:

- **Play:** the address, the controls from the title screen, the two levels and their bosses, the
  three weapons with their magazines and reloading, crates, and gas canisters.
- **WebMCP tools:** that the game page registers them, and each tool with its answer, every field of
  `get_state` included, exactly as the code answers.
- **Source:** the repository, `https://github.com/cocodedk/zombie-panic-wonderland`.

## Done when

`node --test` passes, and its tests prove:

1. The head carries every tag above with absolute addresses, and its structured data parses as JSON
   with the fields above.
2. `og.png` is a PNG of 1200 × 630 pixels (read from its header) and smaller than 600 KB; `og.html`
   exists; `favicon.svg` is an SVG.
3. `robots.txt` and `sitemap.xml` read as above.
4. The Pages workflow copies the four new files, and nothing else in it changed.
5. `llms.txt` has the three sections, and lists every field `get_state` returns in the code.
6. Every earlier test still passes. The builder may change any earlier test whose expectation this
   spec changes (the page title, the workflow's file list, `llms.txt`), and nothing else in them. The
   builder adds or edits test files as the checks above need.

## Out of scope

Other languages, other pages, analytics, and any change to the game.
