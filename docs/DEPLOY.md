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

Not yet deployed. Before pointing this at Vercel for real, two things
from `docs/TRUST.md` §7 and this milestone's work need to be resolved
first, not discovered after shipping:

1. **Flow persistence.** Vercel serverless functions are not a single
   long-lived process — the `globalThis` in-memory store this milestone
   ships works for local dev but will not reliably survive across
   separate serverless invocations or multiple concurrent instances in
   production. A real datastore (even something simple — Vercel KV,
   Postgres, etc.) is required before this is production-safe on
   Vercel, not just "probably fine."
2. **RPC access.** Set `CELO_RPC_URL` as a Vercel environment variable
   if not using the default `https://forno.celo.org` (e.g. a
   rate-limit-safe provider for real traffic).

Until persistence is addressed, treat any Vercel deployment as a demo
environment, not a production one — the same honesty standard applied
throughout `THREAT_MODEL.md`.