# কলম যুদ্ধ — Pen Fight

A browser pen fight game set on the teacher's table in a 90s Bangladeshi classroom. It's tiffin period, Sir is in the teachers' room, and you have one job: flick your pen and knock your friend's pen off the table.

Play in a full **3D classroom** modelled on a traditional Bangladeshi government school (blackboard, rows of wooden desks and benches, a village mural, tall grilled windows with wall charts, ceiling fans, the cane on Sir's chair, and an open door onto the school field with the national flag in front of the next building) or a clean **2D top-down table** that runs on older phones too.

If you enjoy the game, please give the repository a star: **[github.com/rakibdevs/kolom-juddho](https://github.com/rakibdevs/kolom-juddho)** ⭐

## Features

- **Play against Rashed (রাশেদ)**, a CPU opponent who simulates possible shots before choosing one. Three levels: নতুন, মোটামুটি, ওস্তাদ.
- **Two-player pass-and-play** on one phone or computer, with your own names (remembered on that device).
- **⚡ সুপার টোকা**: win a round to earn one super flick for that match, then arm it on any turn. Your pen goes a little faster and hits as if much heavier, then brakes on impact, so it knocks the other pen away while staying on the table. Only human players get it.
- **Eight school pens**, drawn in the shapes, colours and proportions of the real pens, each in four colours, with its own speed, weight and grip:
  - Econo DX: light and quick
  - Matador Pin-Point: bright barrel, clear cap and needle tip, balanced
  - Matador Hi-School: see-through coloured barrel and chrome tip, steady
  - Linc Pentonic: slim black barrel, light
  - Cello Gripper: clear barrel and rubber grip
  - RFL Good Luck: the local fine ball, frosted barrel, quick
  - Hero Fountain Pen: heavy metal tank
  - Hero 616: steel cap, steady
- **Pick your pen**: any pen in any colour, as often as you like. Against the computer, Rashed gets a random pen. Pens are fixed once a match starts.
- **Rename anyone**: your name, Rashed's, or both players' in two-player mode.
- **Live player count**: how many people are online and in a match right now, from an optional Cloudflare Worker that stores nothing.
- **Challenge links**: after a match, send a friend a link. They play the computer playing as you, with your pen at your level, and can send a challenge back. Nothing goes to a server; it's all in the link.
- **3D and 2D views** that share the same physics. You can switch between them mid-match.
- Real 2D rigid-body physics: off-centre hits make the pen spin, and heavier pens hit harder.
- **Post your result to Facebook** as a photo: a result card with the score, both pens and a photo of the final table. On phones the share sheet opens the Facebook app with the photo in a new post; on desktop the photo is saved, a caption is copied and Facebook opens so you can attach it. You can also just save the image.
- **The tiffin bell**: a brass hand-bell rings at the start and end of a match, made in code. Phones also buzz on flicks, hits and falls.
- **Rashed talks back** in a speech bubble: he taunts, grumbles at your ⚡ and gloats when he knocks you off.
- **A ghost hand** shows the press-and-pull on your first visit.
- **Works offline** once you've played: install it to your home screen like an app.
- Bangla interface, works with touch and mouse, light and dark mode.
- Plain HTML, CSS and JS files with no build step.

## How to play

1. Press on your own pen where you want to hit it.
2. Pull back the opposite way, like a slingshot. The further you pull, the harder the flick.
3. Let go.

Hitting the middle sends the pen straight, and hitting near an end makes it spin. Knock the other pen off the table to win the round. If your own pen falls, you lose the round. The first player to win 3 rounds wins the match.

In 3D, drag an empty area to look around and scroll or pinch to zoom.

## Run locally

No install is needed. Either open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

**Option A: GitHub Actions (included)**

1. Create a new repository on GitHub, for example `kolom-juddho`.
2. Push these files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Pen fight game"
   git branch -M main
   git remote add origin https://github.com/<your-username>/kolom-juddho.git
   git push -u origin main
   ```
3. In the repository, go to **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. The workflow in `.github/workflows/pages.yml` runs on every push to `main`. When it finishes, the game is live at `https://<your-username>.github.io/kolom-juddho/`.

**Option B: deploy from a branch**

Go to **Settings → Pages**, choose **Deploy from a branch**, then pick `main` and `/ (root)`. You can delete the `.github` folder if you use this option. With this option, nothing fills in the site address, so replace every `__SITE_URL__` in `index.html`, `robots.txt` and `sitemap.xml` with your live address (no trailing slash), and `__BUILD_DATE__` in `sitemap.xml` with today's date.

## Live player count (optional, Cloudflare)

The chalkboard can show **🟢 এখন অনলাইন ১২ জন · খেলছে ৫ জন**. The count comes from a tiny Cloudflare Worker in `worker/`: one Durable Object holds a WebSocket per open game and tells everyone the totals. It stores nothing and receives only whether a tab is in a match. It runs on the Workers free plan.

1. Log in once: `cd worker && npx wrangler login`.
2. In `worker/wrangler.toml`, list the pages allowed to connect in `ALLOWED_ORIGINS` (your Pages or custom domain).
3. Deploy: `npx wrangler deploy`. It prints an address like `https://kolom-juddho-live.<you>.workers.dev`.
4. Put that address, as `wss://kolom-juddho-live.<you>.workers.dev/live`, into `LIVE_URL` in `js/config.js` and deploy the site.

With `LIVE_URL` empty the game never connects, and the count hides itself whenever the Worker can't be reached.

To try it locally, run `npx wrangler dev --port 8787` in `worker/` and set `LIVE_URL` to `ws://127.0.0.1:8787/live`.

**After the first deploy**, add the site to [Google Search Console](https://search.google.com/search-console) and submit `sitemap.xml`. You can check the link preview with the [Facebook sharing debugger](https://developers.facebook.com/tools/debug/).

## Project structure

```
.
├── index.html                 # Markup; loads the stylesheet and scripts in order
├── css/style.css              # All styles, light and dark themes
├── js/
│   ├── config.js              # Constants, pen catalogue (PENS), game state
│   ├── physics.js             # 2D rigid-body physics
│   ├── cpu.js                 # Rashed, the CPU player
│   ├── sound.js               # Web Audio sounds, bell, haptics
│   ├── art.js                 # Canvas textures and Sir's table
│   ├── scene3d.js             # three.js classroom and pen meshes
│   ├── render2d.js            # Top-down 2D view
│   ├── flow.js                # Turns, rounds, HUD, Rashed's speech bubble
│   ├── tutorial.js            # First-flick ghost hand
│   ├── menu.js                # Home screen
│   ├── share.js               # Result image
│   ├── challenge.js           # Challenge links
│   ├── live.js                # Live player count (connects to worker/)
│   ├── input.js               # Pointer input
│   └── main.js                # Game loop and boot
├── assets/                    # Icons and og-image.png (link preview)
├── tools/og-image.html        # Redraws og-image.png with the game's code
├── manifest.webmanifest       # Install name, colours and icons
├── sw.js                      # Service worker for offline play
├── worker/                    # Cloudflare Worker + Durable Object for the live count
├── robots.txt, sitemap.xml    # For search engines
├── .nojekyll                  # Tells Pages to serve files as-is
├── .github/workflows/pages.yml
├── LICENSE                    # MIT
├── CONTRIBUTING.md            # How to add a pen, test and send a change
├── docs/ROADMAP.md            # Gaps and the plan for what to build next
├── AGENTS.md                  # Instructions for AI coding agents
├── CLAUDE.md                  # Points Claude Code to AGENTS.md
└── README.md
```

The scripts are classic `<script>` files that share globals, so the game still runs when you open `index.html` straight from disk.

## Tech

- [three.js r128](https://threejs.org/), loaded from cdnjs, for the 3D view
- Canvas 2D for the top-down view
- Web Audio for every sound (flicks, hits, falls and the bell), generated in code with no audio files
- A service worker for offline play
- Google Fonts: Baloo Da 2 (interface), Atma (chalk and handwriting) and Kalam (English handwriting)

All textures (the blackboard, wood, cement floor, village mural, wall charts and notice board) are drawn in code at runtime. The only image files are the icons and the link preview in `assets/`, which the game itself never loads.

## Credits and note

This is a fan-made nostalgia project. The pens are drawn from product photos and memory in the shapes and colours of pens many of us carried in school. The names and designs belong to their makers: Econo (Econo DX), Matador (Matador Pin-Point and Hi-School), Linc (Linc Pentonic), Cello (Cello Gripper), RFL (RFL Good Luck) and Hero (Hero Fountain Pen and Hero 616). No logos are used, and this project is not affiliated with or endorsed by any pen manufacturer. The same note is shown on the home screen.

## License

Released under the [MIT License](./LICENSE). Copyright (c) 2026 Md. Rakibul Islam.

You are free to use, copy, modify and share the code. The license covers this project's code and artwork only; pen brand names remain the trademarks of their owners.
