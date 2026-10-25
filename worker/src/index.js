// The kolom-juddho Worker: serves the game's static files and the live player count.
//
// - /live upgrades to a WebSocket held by one Durable Object ("lobby"), which tells every open game how many
//   are online and how many are in a match. Nothing is stored and nothing identifies a player: a socket only
//   ever says {"playing": true|false}. It uses the WebSocket Hibernation API, so it sleeps between messages.
// - The page, sw.js, robots.txt and sitemap.xml run through here to fill in __SITE_URL__ (SITE_URL, else this
//   address) and __BUILD_DATE__ (this deploy's date; sw.js gets the deploy's id, so every deploy refreshes the
//   offline cache). wrangler.toml lists those paths in run_worker_first; every other file is served directly.

const MAX_SOCKETS = 5000;
const FILL = /^\/(index\.html)?$|^\/(sw\.js|robots\.txt|sitemap\.xml)$/;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/live') return live(req, env);
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

function live(req, env) {
  if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket upgrade', { status: 426 });
  // Only the game's own pages may connect (ALLOWED_ORIGINS in wrangler.toml, comma separated).
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(req.headers.get('Origin') || '')) return new Response('Origin not allowed', { status: 403 });
  return env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(req);
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
