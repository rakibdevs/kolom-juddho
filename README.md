# কলম যুদ্ধ — Pen Fight

A browser pen fight game set on the teacher's table in a 90s Bangladeshi classroom. It's tiffin period, Sir is in the teachers' room, and you have one job: flick your pen and knock your friend's pen off the table.

Play in a full **3D classroom** (blackboard, benches, ceiling fans, the cane on Sir's chair) or a clean **2D top-down table** that runs on older phones too.

## Features

- **Play against Rashed (রাশেদ)**, a CPU opponent who simulates possible shots before choosing one. Three levels: নতুন, মোটামুটি, ওস্তাদ.
- **Two-player pass-and-play** on one phone or computer.
- **Four 90s pens**, drawn in the shapes and colours of the real pens, each in four colours to pick from, with its own speed, weight and grip:
  - Econo DX: light and quick
  - Matador Pinpoint: balanced
  - Matador Hi-School: rubber grip, hard to push
  - Hero Fountain Pen: heavy metal tank
- **3D and 2D views** that share the same physics. You can switch between them mid-match.
- Real 2D rigid-body physics: off-centre hits make the pen spin, and heavier pens hit harder.
- **Share your result** as an image: the last frame of the match on a chalkboard card, through your phone's share sheet or as a PNG download.
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
│   ├── sound.js               # Web Audio sounds
│   ├── art.js                 # Canvas textures and Sir's table
│   ├── scene3d.js             # three.js classroom and pen meshes
│   ├── render2d.js            # Top-down 2D view
│   ├── flow.js                # Turns, rounds, HUD
│   ├── menu.js                # Home screen
│   ├── share.js               # Result image
│   ├── input.js               # Pointer input
│   └── main.js                # Game loop and boot
├── assets/                    # Icons and og-image.png (link preview)
├── tools/og-image.html        # Redraws og-image.png with the game's code
├── manifest.webmanifest       # Install name, colours and icons
├── robots.txt, sitemap.xml    # For search engines
├── .nojekyll                  # Tells Pages to serve files as-is
├── .github/workflows/pages.yml
├── CONTRIBUTING.md            # How to add a pen, test and send a change
├── AGENTS.md                  # Instructions for AI coding agents
├── CLAUDE.md                  # Points Claude Code to AGENTS.md
└── README.md
```

The scripts are classic `<script>` files that share globals, so the game still runs when you open `index.html` straight from disk.

## Tech

- [three.js r128](https://threejs.org/), loaded from cdnjs, for the 3D view
- Canvas 2D for the top-down view
- Web Audio for the flick, hit and fall sounds, generated in code with no audio files
- Google Fonts: Anek Bangla (interface), Atma (chalk and handwriting) and Kalam (English handwriting)

All textures (the blackboard, wood, red-oxide floor and notice board) are drawn in code at runtime. The only image files are the icons and the link preview in `assets/`, which the game itself never loads.

## Credits and note

This is a fan-made nostalgia project. The pens are drawn from memory in the shapes and colours of pens many of us carried in school. The names and designs belong to their makers: Econo (Econo DX), Matador (Matador Pinpoint and Hi-School) and Hero (Hero Fountain Pen). No logos are used, and this project is not affiliated with or endorsed by any pen manufacturer. The same note is shown on the home screen.

Add a license of your choice (for example MIT) before sharing the code publicly.
