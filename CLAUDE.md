# Zombie panic in Wonderland (low-poly)

A browser game in low-poly 3D with three.js. Mechanics are in
[profile-web-node.md](profile-web-node.md). Specs for graph-loop's lean loop are in `docs/lean/`.

Layout: `src/logic/` holds the rules, screens and WebMCP without three.js (tested by `node --test`);
`src/levels/` holds each level as data; `src/view/` holds the stage, HUD, input and `models/`, one
builder per model. Serve the root with any static server and open `index.html`.

WebMCP: `src/logic/webmcp.js` registers the read-only tools `describe` and `get_state`, listed in
`llms.txt`. Try them in Chrome 150+ with `chrome://flags/#enable-webmcp-testing`. The API is a
draft: re-check https://webmachinelearning.github.io/webmcp/ before changing it.
