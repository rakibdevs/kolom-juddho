// Builds a ready-to-upload copy of the site in dist/ for plain web hosts, such as the LiteSpeed host behind
// kolom.themicly.com: copies the site's files and fills in __SITE_URL__ and __BUILD_DATE__ the way the Pages
// workflow and the Cloudflare Worker do, then adds an .htaccess so the page and the service worker are never
// served stale. Node built-ins only; there is still no build step for development.
//
//   node tools/build-site.js https://kolom.themicly.com
//
// Then upload everything inside dist/ (including the hidden .htaccess) to the site's document root.
'use strict';
const fs = require('fs'), path = require('path');

const site = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https?:\/\/[^/]+/.test(site)) { console.error('Usage: node tools/build-site.js https://your.domain'); process.exit(1); }

const root = path.join(__dirname, '..'), out = path.join(root, 'dist');
const FILES = ['index.html', 'sw.js', 'css', 'js', 'assets', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml'];
const SKIP = new Set(['assets/game-snapshot.png']); // a large README screenshot the game never loads
const now = new Date(), date = now.toISOString().slice(0, 10), stamp = now.toISOString().replace(/[:.]/g, '-');

fs.rmSync(out, { recursive: true, force: true });
function copy(rel) {
  const from = path.join(root, rel), to = path.join(out, rel);
  if (SKIP.has(rel)) return;
  if (fs.statSync(from).isDirectory()) { fs.mkdirSync(to, { recursive: true }); fs.readdirSync(from).forEach(f => copy(path.join(rel, f))); return; }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (/\.(html|xml|txt)$|^sw\.js$/.test(rel)) {
    const text = fs.readFileSync(from, 'utf8').replaceAll('__SITE_URL__', site).replaceAll('__BUILD_DATE__', rel === 'sw.js' ? stamp : date);
    fs.writeFileSync(to, text);
  } else fs.copyFileSync(from, to);
}
FILES.forEach(copy);

fs.writeFileSync(path.join(out, '.htaccess'), `# কলম যুদ্ধ on Apache or LiteSpeed
DirectoryIndex index.html
AddType application/manifest+json .webmanifest
AddType text/javascript .js
<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|sw\\.js)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>
`);

const left = [];
(function scan(dir) { fs.readdirSync(dir).forEach(f => { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) scan(p); else if (/\.(html|xml|txt|js)$/.test(f) && fs.readFileSync(p, 'utf8').includes('__SITE_URL__')) left.push(path.relative(out, p)); }); })(out);
if (left.length) { console.error('A __SITE_URL__ placeholder was not filled in:', left.join(', ')); process.exit(1); }
console.log(`Built dist/ for ${site} (${date}). Upload everything inside dist/, including .htaccess.`);
