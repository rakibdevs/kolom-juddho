// The kolom-juddho Worker: serves the game's static files and the live player count.
//
// - /live upgrades to a WebSocket held by one Durable Object ("lobby"), which tells every open game how many
//   are online and how many are in a match. Nothing is stored and nothing identifies a player: a socket only
//   ever says {"playing": true|false}. It uses the WebSocket Hibernation API, so it sleeps between messages.
// - /room/<CODE>?seat=0|1 upgrades to a WebSocket held by that room's Durable Object ("Room"), which pairs two
//   players for an online match and relays their messages to each other. It has no game logic and stores
//   nothing: each game checks what it receives. Seat 0 opened the room and seat 1 joined it from the link.
// - The page, sw.js, robots.txt and sitemap.xml run through here to fill in __SITE_URL__ (SITE_URL, else this
//   address) and __BUILD_DATE__ (this deploy's date; sw.js gets the deploy's id, so every deploy refreshes the
//   offline cache). wrangler.toml lists those paths in run_worker_first; every other file is served directly.

const MAX_SOCKETS = 5000;
const ROOM = /^\/room\/([A-HJ-NP-Z2-9]{5})$/; // room codes skip I, O, 0 and 1, which are easy to misread
const MAX_MSG = 4096;
const FILL = /^\/(index\.html)?$|^\/(sw\.js|robots\.txt|sitemap\.xml)$/;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/live') return live(req, env);
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

// Only WebSocket upgrades from the game's own pages (ALLOWED_ORIGINS in wrangler.toml, comma separated).
function refuse(req, env) {
  if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket upgrade', { status: 426 });
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(req.headers.get('Origin') || '')) return new Response('Origin not allowed', { status: 403 });
  return null;
}

function live(req, env) {
  return refuse(req, env) || env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(req);
}

function joinRoom(req, env, code, seat) {
  if (seat !== '0' && seat !== '1') return new Response('Bad seat', { status: 400 });
  return refuse(req, env) || env.ROOM.get(env.ROOM.idFromName(code)).fetch(req);
}

export class Lobby {
  constructor(state) {
    this.state = state;
  }

  async fetch() {
    if (this.state.getWebSockets().length >= MAX_SOCKETS) return new Response('Lobby full', { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ playing: false });
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, msg) {
    let playing = false;
    if (typeof msg === 'string' && msg.length < 64) {
      try { playing = JSON.parse(msg).playing === true; } catch (e) { /* ignore anything else */ }
    }
    ws.serializeAttachment({ playing });
    this.broadcast();
  }

  webSocketClose(ws, code) {
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch (e) { /* already closed */ }
    this.broadcast(ws);
  }

  webSocketError(ws) {
    this.broadcast(ws);
  }

  // Sends {online, playing} to every open socket, leaving out one that is closing.
  broadcast(gone) {
    const open = this.state.getWebSockets().filter(w => w !== gone && w.readyState === WebSocket.OPEN);
    const playing = open.filter(w => (w.deserializeAttachment() || {}).playing).length;
    const msg = JSON.stringify({ online: open.length, playing });
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
