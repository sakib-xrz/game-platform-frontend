# Greedy Mobile Frontend

Production-oriented **mobile-only** Next.js frontend for the supplied multi-game backend. The uploaded backend ZIP is treated as the source of truth; the older handoff PDF is used only for architecture/context where it still matches the code.

## Scope implemented

- Mobile game-selection page (`/`)
- Greedy game page (`/games/greedy`)
- No site header
- No footer / bottom navigation
- Reference-matched 414 × 560 Greedy machine with eight radial options, integrated chip pedestal and red results dashboard
- Betting, drawing/highlight and result-sheet visual states from the supplied screenshots
- Dynamic options, multipliers, chip values and image URLs from the backend config
- Original local 3D food artwork for `HOT_DOG`, `KEBAB`, `HAM`, `STEAK`, `CARROT`, `CORN`, `CABBAGE`, and `TOMATO`; legacy animal-code configs are mapped to the same food wheel for compatibility
- Server-time countdowns (client does not authoritatively advance game state)
- Idempotent REST bet placement with a new `client_request_id` per bet
- Socket.IO realtime round/wallet events
- Snapshot recovery on load, reconnect, visibility resume, network resume and fallback polling
- Durable Socket `event_id` de-duplication
- Wallet balance, current-user round exposure, and immediate multi-item betting
- Public per-option bettor aggregates with compact avatar markers, live coin landings, and a complete bettor sheet
- Recent revealed-result strip
- Result modal using the authoritative backend winner, current-player gross payout, and aggregate Top-3 winners
- iOS/Android safe-area handling and Flutter WebView-friendly viewport behavior
- Loading/error/offline/reconnecting UI
- Production standalone Docker image
- Protected Shadcn UI + Tailwind admin panel at `/admin/login`
- Five-page admin navigation: Dashboard, Manage Greedy, Manage Teen Patti, Manage Lucky 77, and Adjust User Balance
- Complete Greedy and Teen Patti runtime/configuration/approval workflows and searchable audited wallet adjustments

## Admin panel

The admin panel uses the backend's opaque administrator sessions through a trusted Next.js BFF. The session token remains in an HTTP-only cookie; browser mutations additionally require the scoped CSRF cookie and unique idempotency/request identifiers.

Only Manage Greedy, Manage Teen Patti, and Adjust User Balance currently contain active controls. Dashboard is intentionally empty, while Lucky 77 is a reserved placeholder. Publishing a Greedy or Teen Patti configuration automatically updates the authoritative runtime configuration consumed by the player snapshot. High-risk configuration publication and wallet adjustments retain the backend's independent approval workflow.

## Backend contract used

HTTP base: `/api/v1`

- `GET /games/greedy/snapshot`
- `POST /games/greedy/bets`

Socket events used:

- `platform.connected`
- `platform.game.paused`
- `platform.game.resumed`
- `greedy.round.opened`
- `greedy.round.locked`
- `greedy.round.drawing`
- `greedy.round.result`
- `greedy.bet.placed`
- `greedy.round.settled`
- `greedy.round.closed`
- `greedy.round.cancelled`
- `greedy.round.refunded`
- `wallet.balance.updated`

The UI intentionally re-fetches `/games/greedy/snapshot` after important round events because the backend defines PostgreSQL/snapshot state as authoritative.

## Screenshot features intentionally not faked

The screenshots contain values such as **Today's profits**, a global all-time profit ranking, gift state, popularity/Hot state, recommendation packages and a coin-to-diamond exchange rate. The supplied backend does not expose those values, so this frontend does **not** invent them:

- the second wallet pill truthfully shows the current round selection;
- the dashboard ranking-shaped card shows only the latest verified result;
- the result sheet shows the current player result and the authoritative round Top 3, not a fabricated global ranking;
- bettor names and avatars use trusted platform values when supplied, otherwise temporary shortened IDs and generated initials;
- the conversion-shaped plaque describes the backend's one-coin/one-stake semantics.

Those slots can be populated without restructuring the screen when matching backend endpoints/events are added.

## Local setup

Backend first:

```bash
# backend terminal 1
npm run dev

# backend terminal 2
npm run dev:worker
```

Make sure the Greedy database has been seeded and the runtime resumed.

Frontend:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Default development environment:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
NEXT_PUBLIC_DEV_USER_ID=user-001
NEXT_PUBLIC_PAYMENT_LOCK=false
```

Set `NEXT_PUBLIC_PAYMENT_LOCK=true` to show a root-level payment unlock overlay on all game and admin pages.

The backend must have:

```env
ALLOW_DEV_IDENTITY_HEADER=true
CORS_ORIGIN=http://localhost:3000
```

## Multi-player local test

There is no separate multiplayer lobby. The backend already accepts many players in one round; this frontend only needed a way to act as different `user_id`s before the mobile app supplies real identity.

1. Ensure the backend has `ALLOW_DEV_IDENTITY_HEADER=true`.
2. Open Tab A: `http://localhost:3000/games/greedy?user=player-1`
3. Open Tab B: `http://localhost:3000/games/greedy?user=player-2`
4. Or use the **DEV ONLY** player switcher on `/` (presets `user-001`…`user-005` or a custom id). Identity is stored per browser tab in `sessionStorage`.
5. Fund both players via Admin → Finance / wallet adjust (new wallets start at `0`).
6. Place bets in the same live round from both tabs and confirm separate wallets, bets, and payouts.

When the mobile app integrates, it will send the platform user into this game surface; remove the switcher / `NEXT_PUBLIC_DEV_USER_ID` and replace the `X-User-Id` seam with real auth.

## Production authentication

The backend ZIP still uses `X-User-Id` only as a development integration seam. Do **not** expose `NEXT_PUBLIC_DEV_USER_ID` in production.

For production:

1. Integrate real platform authentication in the backend player middleware and Socket handshake.
2. Remove `NEXT_PUBLIC_DEV_USER_ID` and the dev player switcher.
3. Keep `credentials: include` / Socket credentials if your real auth uses secure cookies.
4. Configure the backend CORS origin to the deployed frontend origin.

## Production environment

Example:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
NEXT_PUBLIC_SOCKET_URL=https://api.example.com
NEXT_PUBLIC_PAYMENT_LOCK=false
```

Build:

```bash
npm run typecheck
npm run lint
npm run build
npm run start
```

Docker:

```bash
docker build -t greedy-mobile-frontend \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 \
  --build-arg NEXT_PUBLIC_SOCKET_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_PAYMENT_LOCK=false \
  .

docker run --rm -p 3000:3000 greedy-mobile-frontend
```

> `NEXT_PUBLIC_*` values are compiled into the browser bundle. In normal deployments, provide them during the image build rather than only changing them after the build. If your deployment platform injects build-time environment variables, configure them there.

## Option artwork

The backend supports `image_url` per option and it always takes precedence. If it is null (as in the current technical seed), the frontend uses the original local cartoon PNGs in `public/assets/greedy`, then falls back to emoji only for unknown codes. For final production artwork, publish a new backend config with the final image URLs.

## Mobile-only behavior

The application is designed for phone widths. The Greedy screen caps at the 414px reference canvas; the game-selection screen caps at 480px. On desktop, the mobile canvas is centered and there is intentionally no desktop layout.
