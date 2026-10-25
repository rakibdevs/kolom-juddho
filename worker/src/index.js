// Live player count for কলম যুদ্ধ. Every open game connects a WebSocket to /live; one Durable Object
// ("lobby") holds all the sockets and tells everyone how many are online and how many are in a match.
// Nothing is stored and nothing identifies a player: a socket only ever says {"playing": true|false}.
// Uses the WebSocket Hibernation API, so the object sleeps between messages and costs almost nothing.

const MAX_SOCKETS = 5000;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== '/live') return new Response('কলম যুদ্ধ live counter. Connect a WebSocket to /live.', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket upgrade', { status: 426 });
    // Only the game's own pages may connect (ALLOWED_ORIGINS in wrangler.toml, comma separated).
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length && !allowed.includes(req.headers.get('Origin') || '')) return new Response('Origin not allowed', { status: 403 });
    return env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(req);
  },
};

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
