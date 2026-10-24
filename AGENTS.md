# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Copilot and similar) working on this repository.

## What this is

কলম যুদ্ধ (Pen Fight) is a browser game. Players flick pens on a teacher's table in a 90s Bangladeshi classroom. It is deployed as a static site on GitHub Pages.

## Hard rules

- **No build step.** `index.html` loads `css/style.css` and the plain scripts in `js/` in a fixed order. Do not add a bundler, framework, npm or build step unless the maintainer asks for one.
- **Classic scripts, not ES modules.** The `js/` files share top-level globals, and the game must still open from `file://`, which modules break. Keep the load order in `index.html` and do not reuse a top-level name in two files.
- **Do not upgrade three.js casually.** The game uses the global-script build of **three.js r128** from cdnjs (`window.THREE`). Newer versions drop that build and change APIs (for example, `CapsuleGeometry` only exists in r142+). Any upgrade must switch to ES modules and be tested in both views.
- **Pin every CDN URL to an exact version.** Never use `@latest` or a version range.
- **No external images or audio.** Textures are drawn on `<canvas>` at runtime and sounds are made with Web Audio. Keep it that way so the page works offline after the first load. The only image files are in `assets/` (icons and the link preview `og-image.png`). The game never loads them.
- **Keep `__SITE_URL__` placeholders.** The canonical link, Open Graph and Twitter tags, JSON-LD, `robots.txt` and `sitemap.xml` use `__SITE_URL__` (and the sitemap uses `__BUILD_DATE__`). The deploy workflow replaces them with the live address. Never hard-code a domain.
- **No pen logos or trademarked artwork.** Pens are drawn from their parts (tip or nib, barrel, nose ring, grip, cap, clip, trim) in the real pens' shapes and colours. Brand names appear only as plain text labels. Every pen needs a `brand` so the home screen credit note lists it.
- **Bangla first.** The interface text is Bangla. Use the Bengali digits `০১২৩৪৫৬৭৮৯` for numbers shown to players (see the `toBn()` helper). Use typographic punctuation in visible text (’ “ ”).
- **Don't break 2D.** The 2D view is the fallback when WebGL is unavailable. Every gameplay change must work in both views.

## Code map

Scripts load in this order, and each one only uses names from earlier files at load time:

| File | Purpose |
|---|---|
| `css/style.css` | All styles, with light and dark tokens on `:root` |
| `js/config.js` | Table size (`HX`, `HZ`), `TOP` height, physics tuning (`FRIC`, `REST`, `SPIN` and others), `PENS` catalogue, `penDef`, helpers (`$`, `clamp`, `toBn`), game state `G` |
| `js/physics.js` | `newPen`, `closestSeg`, `collide`, `physStep`, `atRest`, `applyShot`. Pure 2D rigid-body physics on the table plane (x, z). |
| `js/cpu.js` | Rashed: `simulate` and `planShot`. They clone the pen state, try candidate shots and score the results. |
| `js/sound.js` | Web Audio noise bursts (`snap`, `hitSound`) |
| `js/art.js` | Canvas textures for both views, and `drawTableTop` (Sir's table seen from above, used by the home screen and the share card) |
| `js/scene3d.js` | `buildScene` (classroom), `makePenMesh`, `makeRing`, using three.js. `sideWall` builds the walls with real openings for the door and windows, and `buildOutside` adds the sky, field, flag (waved by `waveFlag`), school building and trees seen through them. Camera helpers: `camPos` keeps the orbit camera inside `ROOM`, `fitDist` and `camHome` fit the table to the screen (side view on portrait phones). |
| `js/render2d.js` | `layout2D`, `setWorld`, `screenToWorld`, `drawPen2D`, `draw2D`. Portrait screens rotate the table 90°. |
| `js/flow.js` | Turn and round state machine (`setupMatch`, `newRound`, `startTurn`, `doShot`, `endTurn`, `matchOver`), HUD and toasts |
| `js/menu.js` | Home screen: mode and view tiles, pen cards, colour swatches, brand credits, shaded table background |
| `js/share.js` | Result card: `grabView` photographs the table from a fixed camera at 1280 × 720, `drawResultCard` lays out the 1080 × 1350 card, `shareResult` shares the JPEG (image only) or downloads it |
| `js/input.js` | Pointer events. Pressing on your own pen starts aiming. Dragging elsewhere orbits the camera (3D only). |
| `assets/`, `tools/og-image.html` | Icons and the link preview image. `tools/og-image.html` redraws `og-image.png` with the game's own code; the command is in its header comment. Regenerate it when the pens or title change. |
| `manifest.webmanifest`, `robots.txt`, `sitemap.xml` | Install metadata and crawler files |
| `js/main.js` | Fixed-step physics at 1/480 s, falling animation, render 3D or 2D, then `init` |

### Key invariants

- **One source of truth for game state.** The `pens[]` array holds physics state, and both renderers only read from it. Never put gameplay logic inside a renderer.
- **Pen definitions come from `penDef(id, color)`.** It merges the picked colour into a copy of the `PENS` entry. Renderers read `pens[i].def` and never look up `PENS` directly during a match.
- **The camera never leaves the room.** Always place it through `camPos`; outside the walls the player sees only the back of a wall. Call `resetCam()` instead of setting a fixed view, so phones get a view that fits.
- **Shared aim state.** `G.aimVis` holds the aim arrow `{cx, cz, ang, power, px?, pz?}` and is drawn by both views.
- **Physics coordinates are world coordinates.** The table is centred at the origin, and its top is at y = `TOP`.
- **A pen is out** when its centre leaves `|x| > HX` or `|z| > HZ`. It then gets a `falling` animation and is removed from physics.
- **`G.state`** is one of `menu`, `aim`, `cpu`, `moving`, `roundover`, `matchover`. Only change it through the flow functions.
- **Round rules.** If the shooter's pen falls, the other player wins the round, even if both pens fell. If only the opponent's pen falls, the shooter wins.

## Common tasks

- **Add a pen.** Add an object to `PENS` in `js/config.js` with `id`, `name`, `bn`, `brand`, `tag`, its parts (`body`, `tip`, and optional `clear`, `hex`, `nib`, `rubber`, `trim`, `label`, `labelInk`), `colors`, `paint`, `m`, `L`, `r`, `speed` and `grip`. Both renderers, the pen cards, the swatches, the credits and the share card pick it up automatically. Keep `speed` at or below about 18, or pens will fly off the table at full power.
- **Add a colour.** Add `[id, Bangla name, hex]` to the pen's `colors`. `paint` decides which parts take the colour.
- **Tune feel.** Adjust `FRIC`, `LDAMP`, `AFRIC`, `ADAMP`, `REST` and `SPIN`. Play several rounds in both views before committing.
- **Make Rashed stronger or weaker.** Edit the `cfg` table in `planShot`. Raising the sample count `n` costs CPU time; keep "hard" under about 50 ms on a mid-range phone.
- **Tune the special power.** `SUPER` (`speed`, `mass`, and the on-hit `keep` and `grip`) and `SUPER_USES` are in `js/config.js`. The boost lives on `p.boost` from `doShot` until `endTurn` calls `clearBoost`; `brakeOnHit` in `physStep` applies the brake. Only human players get uses, and only `doShot` spends them.
- **Rename the CPU.** Change `CPU`. Possessive forms use `${CPU}ের`, so check that the grammar still works with the new name.

## Testing checklist

There are no automated tests. Before committing, check the following by hand:

1. Serve the folder (`python3 -m http.server`) and open it on desktop and in a phone-sized viewport, both portrait (about 390 × 780) and landscape (about 780 × 360).
2. Play a full match against Rashed in 3D and another in 2D.
3. Switch views in the middle of a turn using the 2D/3D button.
4. Play a two-player match.
5. Check the home screen in both light and dark mode, and pick a few pens and colours for both players.
6. Finish a match in each view and check the share preview, then press 📸 (share sheet on phones, PNG download on desktop).
7. Make sure the browser console shows no errors.
8. Run a syntax check. The second command also catches a top-level name declared in two files:
   ```bash
   for f in js/*.js; do node --check "$f"; done
   cat js/*.js > /tmp/all.js && node --check /tmp/all.js
   ```

## Deploy

Pushing to `main` deploys through `.github/workflows/pages.yml`, which copies `index.html`, `css/` and `js/`. If you add a new top-level file or folder, add it to that copy step. Nothing needs to be built.
