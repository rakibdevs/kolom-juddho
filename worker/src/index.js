// The kolom-juddho Worker: serves the game's static files and the live player count.
//
// - /live upgrades to a WebSocket held by one Durable Object ("lobby"), which tells every open game how many
//   are online and how many are in a match. Nothing is stored and nothing identifies a player: a socket only
//   ever says {"playing": true|false}, plus {"start": "cpu"|"2p"|"online"} when it starts a match. The lobby
//   counts those starts per day in its own SQLite storage (an online match is counted once, by the player who
//   opened the room) and sends the totals with every count. GET /stats returns them with the last 30 days.
//   It uses the WebSocket Hibernation API, so it sleeps between messages.
// - /room/<CODE>?seat=0|1 upgrades to a WebSocket held by that room's Durable Object ("Room"), which pairs two
//   players for an online match and relays their messages to each other. It has no game logic and stores
//   nothing: each game checks what it receives. Seat 0 opened the room and seat 1 joined it from the link.
// - POST /feedback takes the অনুভূতি form ({rating, text, name, mode, view, pen}) from the game's own pages and
//   keeps it in the D1 database bound as FEEDBACK (table `feedback`, made on first use). Each address may send
//   a few a minute (FEEDBACK_LIMIT); the address itself is never stored, only the country Cloudflare reports.
// - The page, sw.js, robots.txt and sitemap.xml run through here to fill in __SITE_URL__ (SITE_URL, else this
//   address) and __BUILD_DATE__ (this deploy's date; sw.js gets the deploy's id, so every deploy refreshes the
//   offline cache). wrangler.toml lists those paths in run_worker_first; every other file is served directly.

const MAX_SOCKETS = 5000;
const ROOM = /^\/room\/([A-HJ-NP-Z2-9]{5})$/; // room codes skip I, O, 0 and 1, which are easy to misread
const MAX_MSG = 4096;
const FILL = /^\/(index\.html)?$|^\/(sw\.js|robots\.txt|sitemap\.xml)$/;
const MAX_FEEDBACK = 1000;
const MODES = ['cpu', '2p', 'online'];
const MIN_MATCH_MS = 20000; // a socket's starts closer together than this aren't counted

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/live') return live(req, env);
    if (url.pathname === '/feedback') return feedback(req, env);
    if (url.pathname === '/stats') return stats(req, env);
    const room = url.pathname.match(ROOM);
    if (room) return joinRoom(req, env, room[1], url.searchParams.get('seat'));
    const res = await env.ASSETS.fetch(req);
    if (!FILL.test(url.pathname) || res.status !== 200) return res;
    const site = (env.SITE_URL || url.origin).replace(/\/$/, '');
    const meta = env.CF_VERSION_METADATA || {};
    const date = (meta.timestamp || new Date().toISOString()).slice(0, 10);
    const stamp = url.pathname === '/sw.js' ? (meta.id || date) : date;
    const body = (await res.text()).replaceAll('__SITE_URL__', site).replaceAll('__BUILD_DATE__', stamp);
    const headers = new Headers(res.headers);
    headers.delete('content-length');
    headers.delete('etag');
    if (url.pathname === '/sw.js' || url.pathname === '/' || url.pathname === '/index.html') headers.set('cache-control', 'no-cache');
    return new Response(body, { status: 200, headers });
  },
};

// The game's own pages (ALLOWED_ORIGINS in wrangler.toml, comma separated); empty allows every origin.
function allowedOrigin(req, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return !allowed.length || allowed.includes(req.headers.get('Origin') || '');
}

// Only WebSocket upgrades from the game's own pages.
function refuse(req, env) {
  if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket upgrade', { status: 426 });
  if (!allowedOrigin(req, env)) return new Response('Origin not allowed', { status: 403 });
  return null;
}

// Text from a player: control characters removed (a note keeps its line breaks), trimmed and cut to `max`.
function cleanText(v, max, oneLine) {
  if (typeof v !== 'string') return '';
  const s = v.replace(oneLine ? /[\u0000-\u001F\u007F]/g : /[\u0000-\u0009\u000B-\u001F\u007F]/g, oneLine ? ' ' : '');
  return (oneLine ? s.replace(/\s+/g, ' ') : s).trim().slice(0, max);
}

let feedbackTable = null; // made once per Worker instance
function ensureFeedbackTable(db) {
  feedbackTable = feedbackTable || db.prepare(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, rating INTEGER, text TEXT NOT NULL,
    name TEXT, mode TEXT, view TEXT, pen TEXT, country TEXT)`).run().catch(e => { feedbackTable = null; throw e; });
  return feedbackTable;
}

async function feedback(req, env) {
  if (!allowedOrigin(req, env)) return new Response('Origin not allowed', { status: 403 });
  const cors = { 'Access-Control-Allow-Origin': req.headers.get('Origin') || '*', Vary: 'Origin' };
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
  }
  if (req.method !== 'POST') return reply(405, { ok: false });
  if (!env.FEEDBACK) return reply(503, { ok: false, error: 'off' }); // no D1 database bound yet
  if (env.FEEDBACK_LIMIT) {
    const { success } = await env.FEEDBACK_LIMIT.limit({ key: req.headers.get('CF-Connecting-IP') || 'unknown' });
    if (!success) return reply(429, { ok: false });
  }
  const raw = await req.text();
  if (raw.length > 8192) return reply(413, { ok: false });
  let f;
  try { f = JSON.parse(raw); } catch (e) { return reply(400, { ok: false }); }
  if (!f || typeof f !== 'object') return reply(400, { ok: false });
  if (f.website) return reply(200, { ok: true }); // the hidden field only bots fill in: drop it quietly
  const rating = Number.isInteger(f.rating) && f.rating >= 1 && f.rating <= 5 ? f.rating : null;
  const text = cleanText(f.text, MAX_FEEDBACK, false);
  if (!text && rating === null) return reply(400, { ok: false });
  const pen = typeof f.pen === 'string' && /^[a-z0-9]{1,20}$/.test(f.pen) ? f.pen : null;
  await ensureFeedbackTable(env.FEEDBACK);
  await env.FEEDBACK.prepare('INSERT INTO feedback (at, rating, text, name, mode, view, pen, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(new Date().toISOString(), rating, text, cleanText(f.name, 20, true) || null, MODES.includes(f.mode) ? f.mode : null,
      f.view === '3d' || f.view === '2d' ? f.view : null, pen, (req.cf && req.cf.country) || null).run();
  return reply(200, { ok: true });
}

function live(req, env) {
  return refuse(req, env) || env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(req);
}

// The match counts as JSON, for anyone: {total, online, days: [{day, total, online}, ...]} (newest first).
async function stats(req, env) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const res = await env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch('https://lobby/stats');
  return new Response(res.body, { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=60' } });
}

function joinRoom(req, env, code, seat) {
  if (seat !== '0' && seat !== '1') return new Response('Bad seat', { status: 400 });
  return refuse(req, env) || env.ROOM.get(env.ROOM.idFromName(code)).fetch(req);
}

export class Lobby {
  constructor(state) {
    this.state = state;
    this.sql = state.storage.sql;
    // matches started per UTC day; `online` is the part of `total` played online
    this.sql.exec('CREATE TABLE IF NOT EXISTS plays (day TEXT PRIMARY KEY, total INTEGER NOT NULL, online INTEGER NOT NULL)');
    this.totals = this.sql.exec('SELECT COALESCE(SUM(total), 0) AS total, COALESCE(SUM(online), 0) AS online FROM plays').one();
  }

  async fetch(req) {
    if (new URL(req.url).pathname === '/stats') {
      const days = this.sql.exec('SELECT day, total, online FROM plays ORDER BY day DESC LIMIT 30').toArray();
      return new Response(JSON.stringify({ ...this.totals, days }));
    }
    if (this.state.getWebSockets().length >= MAX_SOCKETS) return new Response('Lobby full', { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ playing: false, last: 0 });
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, msg) {
    let m = {};
    if (typeof msg === 'string' && msg.length < 64) {
      try { m = JSON.parse(msg) || {}; } catch (e) { /* ignore anything else */ }
    }
    const was = ws.deserializeAttachment() || {};
    const playing = m.playing === true;
    let last = was.last || 0;
    // a match starting: counted once per start, and not again from the same socket within MIN_MATCH_MS
    if (playing && !was.playing && MODES.includes(m.start) && Date.now() - last >= MIN_MATCH_MS) {
      last = Date.now();
      this.count(m.start === 'online');
    }
    ws.serializeAttachment({ playing, last });
    this.broadcast();
  }

  count(online) {
    const day = new Date().toISOString().slice(0, 10), n = online ? 1 : 0;
    this.sql.exec('INSERT INTO plays (day, total, online) VALUES (?, 1, ?) ON CONFLICT(day) DO UPDATE SET total = total + 1, online = online + ?', day, n, n);
    this.totals = { total: this.totals.total + 1, online: this.totals.online + n };
  }

  webSocketClose(ws, code) {
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch (e) { /* already closed */ }
    this.broadcast(ws);
  }

  webSocketError(ws) {
    this.broadcast(ws);
  }

  // Sends {online, playing, total, net} to every open socket, leaving out one that is closing. total and net
  // are all the matches ever started and the online ones among them.
  broadcast(gone) {
    const open = this.state.getWebSockets().filter(w => w !== gone && w.readyState === WebSocket.OPEN);
    const playing = open.filter(w => (w.deserializeAttachment() || {}).playing).length;
    const msg = JSON.stringify({ online: open.length, playing, total: this.totals.total, net: this.totals.online });
    for (const w of open) {
      try { w.send(msg); } catch (e) { /* the next close event tidies up */ }
    }
  }
}

// One online match: two seats. Messages from one player go to the other as they are, except that a player may
// not send {sys: ...}, which is how the room itself talks: {sys:'seat',seat}, {sys:'peer',on} and {sys:'full'}.
export class Room {
  constructor(state) {
    this.state = state;
  }

  async fetch(req) {
    const seat = +new URL(req.url).searchParams.get('seat');
    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);
    const others = this.open(server);
    // the seat is taken (a third person with the link, or a second tab): say so and close
    if (others.some(w => this.seatOf(w) === seat)) {
      server.send(JSON.stringify({ sys: 'full' }));
      server.close(4000, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    server.serializeAttachment({ seat });
    server.send(JSON.stringify({ sys: 'seat', seat }));
    if (others.length) {
      server.send(JSON.stringify({ sys: 'peer', on: true }));
      this.tell(others, { sys: 'peer', on: true });
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, msg) {
    if (this.seatOf(ws) == null || typeof msg !== 'string' || msg.length > MAX_MSG) return;
    try { if (JSON.parse(msg).sys !== undefined) return; } catch (e) { return; }
    this.tell(this.open(ws), msg);
  }

  webSocketClose(ws, code) {
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch (e) { /* already closed */ }
    this.gone(ws);
  }

  webSocketError(ws) {
    this.gone(ws);
  }

  gone(ws) {
    if (this.seatOf(ws) != null) this.tell(this.open(ws), { sys: 'peer', on: false });
  }

  seatOf(ws) {
    const a = ws.deserializeAttachment();
    return a ? a.seat : null;
  }

  // The other open, seated sockets.
  open(not) {
    return this.state.getWebSockets().filter(w => w !== not && w.readyState === WebSocket.OPEN && this.seatOf(w) != null);
  }

  tell(list, m) {
    const msg = typeof m === 'string' ? m : JSON.stringify(m);
    for (const w of list) {
      try { w.send(msg); } catch (e) { /* the next close event tidies up */ }
    }
  }
}
