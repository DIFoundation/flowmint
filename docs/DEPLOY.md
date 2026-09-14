# Deploying `apps/web` (M5)

## Local + ngrok (current phase)

MiniPay only opens sites served over HTTPS, so testing on an actual
phone requires tunneling the local dev server rather than hitting
`localhost` directly.

1. `pnpm --filter web dev` — starts the Next.js dev server (default port 3000).
2. In a second terminal: `ngrok http 3000`.
3. Open the `https://*.ngrok-free.app` URL ngrok prints, on a phone with
   MiniPay installed. `wallet-provider.tsx` auto-detects
   `window.ethereum?.isMiniPay` and auto-connects — no manual "connect"
   step needed inside MiniPay itself.
4. To test as a plain mobile browser (no MiniPay), open the same ngrok
   URL in Chrome/Safari on a phone and use the "Connect Wallet" button
   instead (any injected-wallet-compatible mobile browser wallet works).

**Known limitation while testing this way**: `apps/web/src/lib/agent-server.ts`
holds Flow state in an in-memory `Map` anchored to `globalThis`. This
survives Next.js's dev-mode module reloading fine (confirmed by testing
— see `DECISIONS.md` 026) and works correctly for a single long-lived
local process. It is not a database — restarting the dev server clears
all in-flight flows.

## Vercel (target production host)

Not yet deployed. Before pointing this at Vercel for real, this needs to
be resolved first, not discovered after shipping — and it's no longer
just a theoretical concern, it's the specific thing blocking M6's exit
criterion in production:

1. **Flow + metrics persistence.** Vercel serverless functions are not a
   single long-lived process — the `globalThis` in-memory stores this
   and the M5 milestone ship (`agent-server.ts`, `metrics-store.ts`) work
   for local dev but will not reliably survive across separate
   serverless invocations or multiple concurrent instances in
   production. Concretely: M6's "measure returning users" is impossible
   to trust on Vercel until this is real. A real datastore (even
   something simple — Vercel KV, Postgres, etc.) is required before
   real user data means anything past a single deploy.
2. **RPC access.** Set `CELO_RPC_URL` as a Vercel environment variable
   if not using the default `https://forno.celo.org` (e.g. a
   rate-limit-safe provider for real traffic).
3. **`METRICS_ACCESS_KEY`.** Set this in production — without it,
   `/api/metrics` is wide open and leaks every wallet address that's
   used the app.

Until persistence is addressed, treat any Vercel deployment as a demo
environment, not a production one — the same honesty standard applied
throughout `THREAT_MODEL.md`.