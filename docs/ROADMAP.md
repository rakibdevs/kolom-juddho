# Roadmap: কলম যুদ্ধ as a childhood-memory game

This file lists only work that is still to do. Finished work lives in the code, the README and the git history.

## Goal

The game should feel like two minutes of tiffin period in a 90s Bangladeshi classroom: the bell, friends crowding round Sir's table, the pen you were proud of, the slingshot flick, and the panic when Sir's footsteps come down the verandah.

It must stay one-thumb playable on a cheap phone, Bangla first, offline after the first load, and free of a build step.

## Open gaps

| # | Area | Gap | Why it matters |
|---|---|---|---|
| 1 | Time and tension | The game promises “স্যার আসার আগেই” but has no clock and no Sir. | The core memory, playing under the threat of the teacher, is missing. |
| 2 | People | The classroom is empty. তুহিন and মিতু are on the board but you can't play them. | Pen fights were social: friends watched, cheered and argued. |
| 3 | Progress | No wins, streaks or trophies are kept. | Without something to come back for, one match is the whole game. |
| 4 | Pens | Linc and Cello are drawn from catalogue descriptions, not photos. No customising. | Kids bragged about pens: the new Matador, the chewed cap, the sticker. The pen has to look right. |
| 5 | Rules | Only "knock it off". | Real classrooms had local rules, such as landing on top of the other pen. |
| 6 | Tech | No automated checks in CI. `assets/game-snapshot.png` (3.8 MB) is deployed but unused. `assets/og-image` still uses the old fonts and English tagline. | Reliability, page weight and a consistent link preview. |

## Design principles

1. **One tap to play.** Settings never block the first match.
2. **Every feature triggers a specific memory.** If it doesn't remind someone of school, it waits.
3. **Short sessions.** A match should take three minutes or less, the length of a tiffin break.
4. **Bangla first.** Bengali digits, typographic punctuation, and the 90s Dhaka-classroom voice.
5. **Draw everything in code.** No logos, no image or audio files, and the game keeps working offline.
6. **Respect players.** No ads, no tracking, no dark patterns. Progress lives on the device. The live count is anonymous and stores nothing.
7. **Pens are free.** Any pen in any colour, with no unlocks or use limits. The computer's pen is random, and pens can't change during a match.
8. **Everyone can be renamed.** Every character a player meets, including future rivals, takes a custom name; use `rival()` and `poss()`.

Effort sizes: **S** is a day or less, **M** is two to four days, **L** is a week or more.

## Phase 2: tension and people (about two weeks)

| # | Feature | Design | Implementation | Effort |
|---|---|---|---|---|
| 2.1 | “স্যার আসছেন!” | A wall clock in the HUD counts down a three-minute tiffin. Late in the match: footsteps get louder, a shadow appears at the door, and a whisper toast says "স্যার আসছে!". Players get about five seconds. If Sir arrives mid-round, **both players lose the round** ("দুজনেরই কলম বাজেয়াপ্ত!"). It's a toggle (on by default) so pure play stays possible. | Timer state in `G` and `js/flow.js`. Footsteps made in `js/sound.js`. In 3D, a simple teacher silhouette in the doorway (`buildOutside` already frames the door). In 2D, a banner. | M |
| 2.2 | Classmate ladder | Play through the names on the board: রাশেদ, তুহিন, মিতু, then the class captain. Each has a style (power hitter, spinner, careful) and their own lines, and every one can be renamed. Their pens stay random. Beating one opens the next. | A `RIVALS` table in `js/config.js` with `cfg {n, noise, pn}`, preferences and `lines`. `planShot` reads the rival's config. A ladder card on the home screen. | M |
| 2.3 | Crowd round the table | Low-poly classmates in white shirts and navy uniforms stand round the dais and bob and cheer on hits. In 2D: heads at the table edge. | `THREE.InstancedMesh` for bodies and heads so draw calls stay flat (about 217 today). Animation in `sync3D`. | L |
| 2.4 | আমার খাতা (my notebook) | An exercise-book page, opened from the home screen's top bar, with wins, best streak and trophies: 3–0 clean sweep, one-flick knock-off, ⚡ winner, beat ওস্তাদ. | A small `js/store.js` (namespaced, versioned keys, try/catch), also used by setup and names. Trophy checks in `endTurn` and `matchOver`. A new tab in the home screen's sheet. | M |

## Phase 3: pens and rules (about two to three weeks)

| # | Feature | Design | Implementation | Effort |
|---|---|---|---|---|
| 3.1 | Pens from photos | Check Linc Pentonic and Cello Gripper against real photos, as Econo DX, Pin-Point, Hi-School and RFL Good Luck were. Add pens with no brand: a 4-colour click pen, a gel pen, a cheap "চায়না কলম". | Edit or add `PENS` entries; new pens are drawn from existing parts (`click`, `clear`, `rubber`, `capMetal`). Needs a photo of each pen. | S each |
| 3.2 | Customising | A chewed cap, a sticker on the barrel (cricket ball, flag, cartoon star), a name scratched in, a rubber-band grip (+grip, −speed). Mostly cosmetic, with small trade-offs. | New optional parts in `drawPen2D` and `makePenMesh`. Stored per pen. | M |
| 3.3 | Rule variants | **ওপরে চড়া**: landing on top of the other pen wins. **এক টোকা**: one flick each, and whoever stays nearest the centre wins. **রুলার সীমানা**: a ruler line halves the table. | Overlap detection at rest and a short "climb" animation for ওপরে চড়া. A rule enum in `G` read by `endTurn`. | L |

## Phase 4: seasons and extras (backlog)

- **Seasons:** rain on the windows during বর্ষা, পহেলা বৈশাখ decorations, and exam-season chalk on the board. Anything for 21 February must be handled with care and respect.
- **English toggle** for the diaspora; the strings move into a small table.
- **Accessibility:** a high-contrast theme, a left-handed HUD, and a reduced-motion version of the camera.

## Housekeeping

- **Checks.** Commit the physics Monte Carlo (used to balance ⚡) as `tools/sim.js`, run with plain `node`. Add `node --check` for every script to the Pages workflow. Keep to Node built-ins, with no npm, per `AGENTS.md`.
- **Actions runtime.** The Pages workflow warns that Node 20 actions are deprecated; bump the action versions.
- **Page weight.** Exclude `assets/game-snapshot.png` (3.8 MB) from the deployed site, or convert it to a small JPEG for the README.
- **Link preview.** Regenerate `assets/og-image` with `tools/og-image.html` so it uses the Noto Bengali fonts and the Bangla tagline.
- **Home screen fit.** In two-player mode on a desktop the match card is a little taller than the screen, so the sticky ▶ button covers the view toggle until you scroll.

## Cross-cutting implementation notes

- **Data first.** `PENS`, `RIVALS`, `LINES` and `TROPHIES` live in `js/config.js`, so content contributions don't touch logic.
- **Storage.** One `js/store.js` with namespaced keys (`kolom-juddho:*`), a schema version, and try/catch around every read and write. Migrate `setup` and `names` into it.
- **Performance budget.** Stay at 60 fps on a mid-range phone. Watch `renderer.info.render.calls` and the scene's mesh count (483 now; the trees are already merged). Use instancing for the crowd and trees.
- **Privacy.** Progress, names and setup stay on the device. No analytics without a clear opt-in.

## Suggested order

1. Phase 2: 2.1 Sir arrives → 2.4 my notebook → 2.2 classmate ladder → 2.3 crowd.
2. Phase 3: 3.1 pens from photos → 3.2 customising → 3.3 rule variants.
