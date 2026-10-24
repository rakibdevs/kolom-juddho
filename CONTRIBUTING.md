# Contributing

Thanks for helping. The game is plain HTML, CSS and JS with no build step, so you only need a browser and a text editor.

## Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works.

## Where things live

Each file in `js/` covers one part of the game. The table in [AGENTS.md](./AGENTS.md#code-map) lists what each one does. The scripts load in the order listed in `index.html` and share top-level names, so:

- don't declare the same top-level name in two files, and
- at load time, only use names from files that load earlier (inside functions anything goes).

## Add a pen or a colour

Everything about a pen is one entry in `PENS` in `js/config.js`: its names, brand, parts, colours and physics stats. The 3D view, the 2D view, the home screen, the credits and the share card all read from it. Draw pens from their shapes and colours only, with no logos, and put the brand name in `brand` and, if you like, `label`.

## Before you send a change

Go through the testing checklist in [AGENTS.md](./AGENTS.md#testing-checklist). In short: play a match in 3D and in 2D, check light and dark mode on desktop and in a phone-sized window, check the share image, keep the console free of errors, and run:

```bash
for f in js/*.js; do node --check "$f"; done
cat js/*.js > /tmp/all.js && node --check /tmp/all.js
```

Interface text is Bangla first, and numbers shown to players use Bengali digits (`toBn()`).
