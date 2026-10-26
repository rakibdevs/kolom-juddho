# Online play: plan and approach

How two friends on different devices play one match of কলম যুদ্ধ, why it is built this way, and what is left.

**Status:** room-code play with a friend is built and tested locally on the `online-play` branch, against `npx wrangler dev`. It is not deployed yet.

## What players see

1. On the home screen, the player picks **🌐 অনলাইনে**, their pen and name, and can type the friend's name in the friend's card. Then they press **▶ রুম খুলে বন্ধুকে ডাকো**.
2. The friend's card shows a link such as `https://kolom.themicly.com/?room=3E29K.<your name>.<friend's name>` (names base64url, both optional) and a **📤 পাঠাও** button: the share sheet on phones, copy on desktops.
3. The friend opens the link and sees “🎯 রাকিব ডেকেছে!”. Their name field is filled with the name from the link, unless their device already has a name of its own. They pick a pen and press **▶ যোগ দাও**.
4. If the room already has two players, or can't be reached, a popup explains it and offers **▶ নতুন রুম খোলো** (or **↻ আবার চেষ্টা করো**).
5. The match starts on both screens. Each player flicks on their own turn and watches the friend's aim arrow and flick on the other.
6. At the end, **আবার খেলো** starts a rematch once both have pressed it. **হোমে ফিরে যাও** leaves the room.

The player who opened the room decides the Sir and tiffin settings. On a portrait phone, each player sees the table from their own end.

## Why a Cloudflare Durable Object

The game is turn-based, so a turn is one small message, not a stream of positions. Any relay that keeps two WebSockets open is enough.

| Option | Verdict | Why |
|---|---|---|
| **Durable Object on the existing Worker** | **Chosen** | Real-time, on the free Workers plan, and in the same deploy as the live count (`Lobby`). The game itself can stay on any host, because rooms are reached at the Worker's address from any origin in `ALLOWED_ORIGINS`. |
| WebSockets on the shared (LiteSpeed) host | No | Shared PHP hosting doesn't keep long-running socket processes. A Node process would need a VPS or a plan that allows one. |
| PHP long-polling with MySQL or files | Possible, not chosen | Works for turn-based play, but adds a 1–2 s lag per turn and many PHP requests the host may throttle, and stale rooms would need their own clean-up. |
| WebRTC peer-to-peer | No | Still needs a signalling server, and some mobile networks need a paid TURN relay. |

## Architecture

```
 Phone A (seat 0)                   Cloudflare Worker kolom-juddho                 Phone B (seat 1)
 kolom.themicly.com   ──wss──►  /room/3E29K?seat=0 ─┐                ┌─ /room/3E29K?seat=1  ◄──wss──  link ?room=3E29K.name
                                                     └─► Room "3E29K" ◄┘
                                                         (Durable Object: seats two, relays, stores nothing)
```

- **Server (`worker/src/index.js`, class `Room`).** There is one Durable Object per room code, created by `idFromName(code)`. It accepts two sockets, one per seat, using the WebSocket Hibernation API. It passes each message to the other seat as it is. It has no game logic and stores nothing; when both players leave, the room simply goes idle.
  - **Messages the room sends itself:** `{sys:'seat'}`, `{sys:'peer', on}` when the friend arrives or leaves, and `{sys:'full'}` when the seat is taken.
  - **Limits:** players may not send `{sys}` messages, messages over 4 KB are dropped, and only origins in `ALLOWED_ORIGINS` may connect.
- **Room codes** are 5 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, which skips I, O, 0 and 1 because they are easy to misread. That gives about 33 million codes, made with `crypto.getRandomValues`.
- **Seats** are the match's player numbers. Seat 0 opened the room and plays player 1, on the blue side. Seat 1 joined from the link. A reconnecting player asks for the same seat again, so a third person with the link gets “room full”.
- **Client (`js/online.js`)** owns the connection, the room screens and the messages. The game code calls a few small hooks: `online.shot`, `online.aim`, `online.canEnd`, `online.turnStarted`, `online.ownsClock`, `online.sirCame` and `online.over`. Player `i` is at this screen when `mine(i)`.

## Keeping both screens the same

Both games run the full match, physics included. These rules keep them identical:

| Concern | Rule |
|---|---|
| **Who starts** | Seat 0 sends `{t:'start'}` with a random 32-bit seed, the Sir and tiffin settings, both pens and both names. If both picked the same pen in the same colour, seat 1 gets the next colour. Both games then call `setupMatch()`. |
| **Round layout** | `newRound()` draws positions from `netRand()` (mulberry32 on `G.rngState`, seeded by `start`). It uses integer maths only, so every browser gives the same numbers. |
| **A flick** | The player whose turn it is sends `{t:'shot', s, dx, dz, power, sup}`, and both screens call `doShot` with it. While aiming, `{t:'aim'}` sends the arrow about 12 times a second so the friend can watch. Aim messages are not resent. |
| **Where the pens stop** | Physics is plain JavaScript at a fixed 1/480 s step, but `Math.sin`, `Math.cos` and `Math.hypot` can differ in the last bit between browsers. So the shooter's screen is the authority: when its pens settle, it sends `{t:'rest', poses}` with each pen's x, z, angle and whether it fell. The other screen snaps to that and only then ends the turn (`online.canEnd()` holds `endTurn`). Scores therefore always agree; in tests, positions agreed to 1/10 000 of a unit before the snap. |
| **Sir** | Seat 0 owns the tiffin clock. Seat 1's clock runs too, for display, but stops at 0 until `{t:'sir', score}` arrives. Sir then ends the match on that score on both screens. |
| **Menus** | Online, the match doesn't pause on the home screen: the clock runs and the friend's turns are played. |

## Connection drops

- **Nothing is lost.** Every game message carries a number (`n`) and stays in a 64-message outbox. Each side ignores numbers it has already seen.
  - On (re)connecting, each side's hello (`{t:'hi', id, got}`) says the last number it received.
  - The other side then resends everything after that number.
  - This was tested by restarting the Worker mid-turn, which dropped both sockets. Both sides reconnected, caught up and finished the match in step.
- **Retries.** A dropped socket retries with backoff (0.7 s doubling to 8 s), and a notice says “🔌 সংযোগ খুঁজছি…”.
- **Friend away.** If the friend is gone, the player who stayed sees “🔌 মিতুর সংযোগ নেই, অপেক্ষা করছি…”. After `GONE_WAIT` (30 s) the match goes to the player who stayed (`matchOver(w,'left')`).
- **Leaving.** Leaving on purpose (the home button, ✕, or closing the tab through `pagehide`) sends `{t:'bye'}`, so the friend wins at once.
- **Reloading.** A reloaded page has a new `id` in its hello. The other side treats that as the old friend having left.

## Trust and safety

- **Names.** The friend's own name (sent in their hello) wins. If they didn't give one, the name the room's opener typed is used, then “বন্ধু”. A link opened on the inviter's own device doesn't reuse the inviter's name for the friend. If both players have the same name, each screen calls its own player “তুমি”.
- **Checked input.** Everything received is validated before use: numbers are finite and in range, pen ids exist, poses and scores have the right shape, and names go through `cleanName` and are shown only as text.
- **Cheating.** A modified client could still lie about where the pens stopped. That is acceptable for a game between friends. Making the server authoritative would mean running `physStep` in the Durable Object, which is possible because the physics is plain JavaScript; it is not planned yet.
- **Privacy.** Nothing is stored or logged. A room only knows two sockets and their seat numbers.

## Cost

Rooms use SQLite-backed Durable Objects, which are on the Workers free plan like `Lobby`. A match is roughly 50–150 small messages, and with hibernation, idle rooms cost nothing.

## Files

| File | What changed |
|---|---|
| `worker/src/index.js` | `Room` class, the `/room/CODE?seat=0\|1` route, and a shared origin check `refuse()` |
| `wrangler.toml` | `ROOM` binding, migration `v2`, and `/room/*` in `run_worker_first` |
| `js/online.js` (new) | Connection, room screens, messages, resend, and the `mine()` and `netRand()` helpers |
| `js/config.js` | `WORKER_URL`, which is the local Worker under `wrangler dev` on port 8787; `G.seat`, `G.peer`, `G.net`, `G.rngState` |
| `js/flow.js` | `who()` and HUD labels online, the `remote` state (the friend's turn), seeded `newRound`, Sir's clock owner, and online results including a friend leaving |
| `js/menu.js`, `index.html`, `css/style.css` | The 🌐 অনলাইনে tab, the room box (`#netBox`), the friend's side of the match card, online rematch, and the connection notice (`#netHud`) |
| `js/input.js`, `js/main.js` | Only the player at this screen can aim; the frame loop waits for `canEnd()`; the clock runs during menus |
| `js/render2d.js`, `js/tutorial.js`, `js/scene3d.js` | Seat 1 sees portrait views from their own end (2D `T2.f`, 3D `camHome` yaw) |
| `sw.js` | `online.js` added to the offline cache |

## Testing locally

```bash
npx wrangler dev --port 8787     # serves the game and the rooms; WORKER_URL switches to ws://localhost:8787
```

Open `http://localhost:8787` in two windows, or two devices on the same network. Choose 🌐 অনলাইনে in one, then open its link in the other.

Check the following:

- **A full match:** both screens show the same score after every turn.
- **A rematch:** both players press আবার খেলো.
- **Leaving:** leave from the home screen mid-match, and also close the tab.
- **Reconnecting:** restart `wrangler dev` (or `touch worker/src/index.js`) mid-turn. Both should reconnect and carry on.
- **A third visitor:** opening the link a third time shows “room full”.
- **Sir:** let Sir arrive and check both screens end on the same result.
- **Other modes:** CPU and two-player still work.

## Deploying

1. Merge the `online-play` branch, then run `npx wrangler deploy` from the root. This creates the `Room` class through migration `v2`; the existing `Lobby` and the live count are unaffected.
2. Rebuild the plain-host copy (`node tools/build-site.js https://kolom.themicly.com`) and upload `dist/`, because the game files changed.
3. GitHub Pages deploys on push, as before.

## What's next

| # | Item | Notes | Effort |
|---|---|---|---|
| O1 | Turn timer | A friend who stops playing currently holds the match until Sir arrives. Add about 30 s per turn, with a countdown ring, then the turn passes or a gentle auto-flick plays. | S |
| O2 | Resume after a reload | Keep `code`, `seat` and the outbox in `sessionStorage`, and have seat 0 send the whole match on request (`{t:'state'}`) so a reloaded page rejoins mid-match. | M |
| O3 | Play anyone online | A “কারো সাথে খেলো” button: `Lobby` already sees every open game, so it can pair two waiting players and hand them a room code. Needs a short wait screen and a cancel button. | M |
| O4 | Quick reactions | A few classroom reactions (😂 “হা হা”, 😮 “বাপরে!”, 😤 “আবার!”) as one-tap chips; fixed phrases, so no chat moderation is needed. | S |
| O5 | Server-checked results | Run `physStep` in the `Room` and accept only rests that match, if cheating ever becomes a problem. | M |
| O6 | Room expiry and rate limits | Close a room after about 30 minutes without messages, and cap messages per second per socket. | S |
