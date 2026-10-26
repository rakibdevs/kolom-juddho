# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Copilot and similar) working on this repository.

## What this is

কলম যুদ্ধ (Pen Fight) is a browser game. Players flick pens on a teacher's table in a 90s Bangladeshi classroom. It is deployed as a static site on GitHub Pages.

## Hard rules

- **No build step.** `index.html` loads `css/style.css` and the plain scripts in `js/` in a fixed order. Do not add a bundler, framework, npm or build step unless the maintainer asks for one. The only exceptions are deploy tooling: `npx wrangler` for the Cloudflare Worker and `node tools/build-site.js` for plain hosts. Neither is needed to develop or play.
- **Classic scripts, not ES modules.** The `js/` files share top-level globals, and the game must still open from `file://`, which modules break. Keep the load order in `index.html` and do not reuse a top-level name in two files.
- **Do not upgrade three.js casually.** The game uses the global-script build of **three.js r128** from cdnjs (`window.THREE`). Newer versions drop that build and change APIs (for example, `CapsuleGeometry` only exists in r142+). Any upgrade must switch to ES modules and be tested in both views.
- **Pin every CDN URL to an exact version.** Never use `@latest` or a version range.
- **No external images or audio.** Textures are drawn on `<canvas>` at runtime and sounds are made with Web Audio. Keep it that way so the page works offline after the first load (`sw.js` caches it). The only image files are in `assets/` (icons and the link preview `og-image.png`). The game never loads them.
- **Keep `__SITE_URL__` placeholders.** The canonical link, Open Graph and Twitter tags, JSON-LD, `robots.txt` and `sitemap.xml` use `__SITE_URL__` (and the sitemap uses `__BUILD_DATE__`). The deploy workflow replaces them with the live address. Never hard-code a domain.
- **No pen logos or trademarked artwork.** Pens are drawn capped, as they lie on a desk, from their parts (barrel, grip, print, end plug, cap, lip ring, clip, trim, and the tip seen through a clear cap) in the real pens' shapes and colours, matched to product photos where we have them. Brand names appear only as plain text labels. Every pen needs a `brand` so the home screen credit note lists it.
- **Two typefaces only.** Noto Sans Bengali (`--font-ui`, `FONT_UI`) for the interface and Noto Serif Bengali (`--font-display`, `FONT_DISPLAY`) for headings, the chalkboard and the 3D blackboard. Use the type scale (`--fs-2xs` … `--fs-2xl`), radii (`--r-sm`, `--r-btn`, `--r-md`, `--r-lg`) and colour tokens (`--gold`, `--paper`, `--chalk-y` …) from `:root` instead of new raw values. Give single-line Bangla text that clips (`overflow:hidden`) a line height of at least 1.45 so vowel signs aren't cut.
- **Bangla first.** The interface text is Bangla. Use the Bengali digits `০১২৩৪৫৬৭৮৯` for numbers shown to players (see the `toBn()` helper). Use typographic punctuation in visible text (’ “ ”).
- **Don't break 2D.** The 2D view is the fallback when WebGL is unavailable. Every gameplay change must work in both views.

## Code map

Scripts load in this order, and each one only uses names from earlier files at load time:

| File | Purpose |
|---|---|
| `css/style.css` | All styles, with light and dark tokens on `:root` |
| `js/config.js` | Table size (`HX`, `HZ`), `TOP` height, physics tuning (`FRIC`, `REST`, `SPIN` and others), `PENS` catalogue, `penDef`, the computer's speech lines `LINES`, the teachers' sayings `TEACHER_QUOTES`, helpers (`$`, `clamp`, `toBn`), game state `G` |
| `js/physics.js` | `newPen`, `closestSeg`, `collide`, `physStep`, `atRest`, `applyShot`. Pure 2D rigid-body physics on the table plane (x, z). |
| `js/cpu.js` | Rashed: `simulate` and `planShot`. They clone the pen state, try candidate shots and score the results. |
| `js/sound.js` | Web Audio made in code: `snap`, `hitSound`, Sir's `footstep`, the hand-bell `bell(long)` and haptics `buzz` |
| `js/art.js` | Canvas textures for both views, including old rough wood (`oldWoodCanvas`: grime, worn patches, knots, scratches, dents, plank joints) for Sir's table, the benches and three carved desk tops (`carve`, `inkBlot`); `drawClassWall` (the home screen's classroom wall: whitewash and green paint, and on wide screens a grilled window, the class routine and a wall clock showing the real time) and `drawTableTop` (Sir's table from above, behind the result page) |
| `js/scene3d.js` | `buildScene` (classroom), `makePenMesh`, `makeRing`, using three.js. `sideWall` builds the walls with real openings for the door and windows, and `buildOutside` adds the sky, field, flag (waved by `waveFlag`), school building, trees and palms (`tree`, `palm`: each merged by `mergeGeos` into two or three meshes with vertex colours, canopy and crown in pivot groups) and drifting leaves seen through them. `buildSir`/`placeSir` draw Sir as a painted cut-out walking along the verandah to the door, with his shadow falling into the room. `waveFlag` billows the flag (two travelling ripples, a fluttering fly end, a droop in light wind). Sir's chair is a turned-leg wooden armchair built from parts in `buildScene`. `swayTrees` rocks the canopies and blows the leaves on a gusting `wind(t)` that the flag shares; leaves never enter the classroom. Camera helpers: `camPos` keeps the orbit camera inside `ROOM`, `fitDist` and `camHome` fit the table to the screen (side view on portrait phones). |
| `js/render2d.js` | `layout2D`, `setWorld`, `screenToWorld`, `drawPen2D`, `draw2D`. Portrait screens rotate the table 90°. |
| `js/flow.js` | Turn and round state machine (`setupMatch`, `newRound`, `startTurn`, `doShot`, `endTurn`, `matchOver`), "স্যার আসছেন!" (`sir`, `sirTick` from the frame loop, `sirArrives`: a tiffin clock of `G.tiffin` minutes (one of `TIFFINS`, 2 by default) counts down in the HUD; during the last `SIR_WARN` seconds footsteps, Sir walking to the door and his shadow (`#sirShadow`) warn; when he arrives play freezes (`G.state='sirend'`) and the match ends on the current score, a draw (`matchOver(-1,true)`) if level; paused on menus, off when `G.sirOn` is false; `later()` holds the pause between rounds in `G.pending` so the home screen can't strand it), HUD, toasts, the result page (`buildResult`: both sides' names, pens and score plus match stats from `G.stats`, names as text only) and the computer's speech bubble (`say(event)`, at most one line per turn, text only) |
| `js/tutorial.js` | `tutor`: on a first visit a ghost hand shows the press-and-pull on the player's pen until their first flick (stored as `kolom-juddho:tutorial`). `tutor.place()` runs each frame and projects the pen to the screen in either view. |
| `js/menu.js` | Home screen as a game title screen: top bar (date, sheet links), chalkboard, and the match card: mode tabs, per side a name field and a ◀ pen ▶ carousel with stats, colour dots and pen dots (`buildSide`); the computer's side shows the rival with his difficulty, and his pen during a match; pickers lock while `G.matchLive`. One sticky ▶ button. Rules, memories and credits sit in a tabbed sheet (`openSheet`/`closeSheet`). `fitHome` makes the home screen fit the window on screens 900px and wider (CSS tightens spacing on short screens, then `zoom` down to 80% at most; phones scroll). The top bar has a GitHub star button beside ⓘ whose count `loadStars` fetches once per session. `sirSays` rotates a teacher's line on the chalkboard every 7 s (tap for the next) and redraws the wall so its clock keeps time. Also remembered setup (`loadSetup`/`saveSetup`), brand credits and the shaded table background |
| `js/share.js` | Result card: `grabView` photographs the table from a fixed camera at 1280 × 720, `drawResultCard` lays out the 1080 × 1350 card, `shareFacebook` posts it (phones: share sheet → Facebook app; desktop: save photo, copy caption, open Facebook, because websites cannot attach photos to Facebook posts), `saveShot` downloads it |
| `js/challenge.js` | Challenge links. `readChallenge` validates the short `?c=pen.colour.level.score.name` code (name as base64url UTF-8; old `?from=&pen=…` links still read) into `G.challenge` and strips the query; while it is set, `rival()` and `level()` return the challenger's name and level and `cpuPen` returns `challengePen()`. `sendChallenge` asks for the player's name if it is missing, then shares or copies a link built on the canonical site address (`siteBase`, so links made on a local copy still point to the live site once deployed). |
| `js/live.js` | `live`: keeps a WebSocket to `LIVE_URL` (empty = off), sends only `{playing}` when a match starts or ends (`live.update()`), shows `#live` on the chalkboard, and reconnects with backoff. |
| `js/input.js` | Pointer events. Pressing on your own pen starts aiming. Dragging elsewhere orbits the camera (3D only). |
| `assets/`, `tools/og-image.html` | Icons and the link preview image. `tools/og-image.html` redraws `og-image.png` with the game's own code; the command is in its header comment. Regenerate it when the pens or title change. |
| `manifest.webmanifest`, `robots.txt`, `sitemap.xml` | Install metadata and crawler files |
| `worker/src/index.js`, `wrangler.toml`, `.assetsignore` | The Cloudflare Worker `kolom-juddho`: serves the site from the repository root (minus `.assetsignore`), fills `__SITE_URL__` (`SITE_URL` var) and `__BUILD_DATE__` (the deploy id for `sw.js`) in the paths listed in `run_worker_first`, and handles `/live`, a WebSocket held by the `Lobby` Durable Object (hibernation API) that broadcasts `{online, playing}` to origins in `ALLOWED_ORIGINS`. Deploy with `npx wrangler deploy` from the root. |
| `tools/build-site.js` | Builds `dist/` for plain web hosts (Apache/LiteSpeed, e.g. kolom.themicly.com): copies the site, fills the placeholders and writes `.htaccess`. Node built-ins only. |
| `sw.js` | Service worker for offline play: precaches `CORE` (the page, styles, every script, three.js), then serves same-origin files, cdnjs and Google Fonts stale-while-revalidate. `VERSION` is `__BUILD_DATE__`, filled in by the deploy workflow. Registered from `main.js` only over https, so local servers always show fresh files. |
| `js/main.js` | Fixed-step physics at 1/480 s, falling animation, render 3D or 2D, then `init` |

### Key invariants

- **One source of truth for game state.** The `pens[]` array holds physics state, and both renderers only read from it. Never put gameplay logic inside a renderer.
- **Pen definitions come from `penDef(id, color)`.** It merges the picked colour into a copy of the `PENS` entry. Renderers read `pens[i].def` and never look up `PENS` directly during a match.
- **The camera never leaves the room.** Always place it through `camPos`; outside the walls the player sees only the back of a wall. Call `resetCam()` instead of setting a fixed view, so phones get a view that fits.
- **Pens per match.** `setupMatch` places the pens once through `placePens` (which frees the old meshes): the chosen pens, or against the computer the player's pen and a random one from `cpuPen`. Pens never change during a match; the home screen disables the pen pickers and mode switch while `G.matchLive`.
- **Names are untrusted text.** Player names, the rival's name and anything from a challenge link are shown only with `textContent`, canvas text or `setAttribute`, never `innerHTML`. Read the computer's name with `rival()` and its level with `level()`, not `G.rival` or `G.diff`.
- **Shared aim state.** `G.aimVis` holds the aim arrow `{cx, cz, ang, power, px?, pz?}` and is drawn by both views.
- **Physics coordinates are world coordinates.** The table is centred at the origin, and its top is at y = `TOP`.
- **A pen is out** when its centre leaves `|x| > HX` or `|z| > HZ`. It then gets a `falling` animation and is removed from physics.
- **`G.state`** is one of `menu`, `aim`, `cpu`, `moving`, `roundover`, `matchover`. Only change it through the flow functions.
- **Round rules.** If the shooter's pen falls, the other player wins the round, even if both pens fell. If only the opponent's pen falls, the shooter wins. If Sir arrives mid-round, nobody scores and the round is played again.

## Common tasks

- **Add a script.** Add its `<script>` tag to `index.html` in load order and its name to `CORE` in `sw.js`, or offline play will miss it.
- **Add a site file that needs `__SITE_URL__`.** Add its path to `FILL` in `worker/src/index.js` and to `run_worker_first` in `wrangler.toml`; `tools/build-site.js` and the Pages workflow fill `.html`, `.xml`, `.txt` and `sw.js` already.
- **Give the computer new lines.** Add to `LINES` in `js/config.js` (keys: `start`, `turn`, `knock`, `oops`, `self`, `lost`, `close`, `saved`, `super`). Keep them short and in the classroom voice; they are shown with `textContent`.

- **Add a pen.** Add an object to `PENS` in `js/config.js` with `id`, `name`, `short` (chip label), `bn`, `brand`, `tag`, its parts (`body`, `cap`, and optional `hex`, `clear` + `ink`, `rubber`, `label` + `labelInk`, `end`, `capLen`, `capMetal`, `capClear`, `capRing`, `clip`, `clipLen`, `trim`, and under a clear cap `nose`, `noseLen`, `noseClear`, `tip`; colours as `#rrggbb`; see the comment above `PENS`), `colors`, `paint`, `m`, `L`, `r`, `speed` and `grip`. Both renderers, the pen cards, the swatches, the credits and the share card pick it up automatically. Keep `speed` at or below about 18, or pens will fly off the table at full power. Size `L` and `r` from the real pen at about 1 unit = 10 cm; 2D drawings widen pens by `PEN_W2D`.
- **Add a colour.** Add `[id, Bangla name, hex]` to the pen's `colors`. `paint` decides which parts take the colour.
- **Tune feel.** Adjust `FRIC`, `LDAMP`, `AFRIC`, `ADAMP`, `REST` and `SPIN`. Play several rounds in both views before committing.
- **Make Rashed stronger or weaker.** Edit the `cfg` table in `planShot`. Raising the sample count `n` costs CPU time; keep "hard" under about 50 ms on a mid-range phone.
- **Tune the special power.** `SUPER` (`speed`, `mass`, and the on-hit `keep` and `grip`) and `SUPER_USES` are in `js/config.js`. The boost lives on `p.boost` from `doShot` until `endTurn` calls `clearBoost`; `brakeOnHit` in `physStep` applies the brake. Uses are earned, not given: `endTurn` grants `SUPER_USES` the first time a human player wins a round in a match (`G.superGot`), and only `doShot` spends them.
- **Rename the CPU.** `CPU` is only the default; players can rename him on the home screen. Always write `rival()` for his name and `poss(name)` for possessives (রাশেদের, মিতুর, প্লেয়ার ১-এর), never `${CPU}ের`.

## Testing checklist

There are no automated tests. Before committing, check the following by hand:

1. Serve the folder (`python3 -m http.server`) and open it on desktop and in a phone-sized viewport, both portrait (about 390 × 780) and landscape (about 780 × 360).
2. Play a full match against Rashed in 3D and another in 2D. Listen for the bell at the start and end; check that 🔇 silences everything.
   To see the first-flick tutorial again, remove `kolom-juddho:tutorial` from local storage.
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
