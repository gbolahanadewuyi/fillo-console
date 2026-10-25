# Fillo Console — Control Plane

The internal console for Fillo staff: see every company on the platform, investigate what happened, and make a small number of audited changes. It is **not** the customer app (`EOP`, `app.fillo.cloud`), where a company runs its own business.

Its API is the `/v1/control/*` part of `EOP-API` (`functions/src/routes/control-routes.ts`).

## Principles

- **Real data only.** Pages show what the API returns, or an error saying it could not be loaded. There is no mock data and no fallback: staff act on what they see.
- **The API is the authority.** The role comes from `GET /control/me`, which the API resolves from its own staff table or allowlist. It is never guessed from an email address. `src/lib/permissions.ts` mirrors the API's rules so the console doesn't offer what will be refused; it never replaces the server check.
- **Every change says why.** Suspend, reactivate and feature-flag changes go through `ConfirmWithReason` (a reason of at least 5 characters). The API requires it and keeps it in the audit trail.
- **A failure carries a reference.** The API gives every request an id (`X-Request-Id`, also in error bodies and its logs); an error here shows it with a Copy button so support can quote it. Nothing is shown when the request never reached the API.
- **A list's state is in its address.** Page, sort and filters are in the URL, so a link opens the same view and reload keeps it. Forms use react-hook-form with zod, with the message next to the field.
- **No direct data edits.** The console never edits orders, payments, stock or passwords. It can email a person a reset link; they choose their own password.
- **Staff accounts and company owners are out of reach** of the person actions (the API refuses them).

## Pages

| Page | What it does | Roles |
|---|---|---|
| Dashboard | Three sections in the order a person asks: Needs attention, Business (customers only, Lagos days: companies, stations, people, orders and payments today, 14-day payments, recent activity), Platform health (integrations) | all |
| Companies / Company | List, search, status filter. A company is a workspace: Overview, Stations, People (users and invitations), Integrations, Billing (plan, usage against limits, trial, features, provider ids for billing roles), Activity, Cases, Settings (branding); suspend and reactivate | all read; suspend, reactivate, branding: admin, owner |
| Stations, Users | Cross-company lists with search. Users has People and Invitations tabs | all read; resend/revoke invitations: support, admin, owner |
| User | Why one person can or cannot sign in (suspended company, locked subscription, locked login, no station, no login) and the fix: unlock, send reset email, reactivate, resend/revoke invitation, suspend | all read; support, admin, owner act; suspend: admin, owner |
| Orders / Order | Every company's orders (filter by status, payment, number, customer); one order shows money paid, refunded and still owed, items, payments with their POS match, stock moved, the WhatsApp message it came from, and its timeline | all (read-only) |
| Payments | POS transactions the providers reported; opens on the ones not matched to an order. The raw provider payload is never returned | all (read-only) |
| Stock | The stock ledger (every movement, with the order behind it) | all (read-only) |
| Cases / Case | Staff-only notes on a customer's problem: title, links to the company, person, order or transaction, timestamped notes, resolve and reopen. Customers never see them. Open one from a person or an order | all read; support, admin, owner write |
| Integrations | WhatsApp and POS connections per company. WhatsApp health is *unknown* until delivery tracking exists | all |
| Feature Flags | Each feature, where the API checks it, and the companies with their own setting; the owner sets or removes one from the company's Billing tab | owner, admin, support |
| Plans & Billing | The real plans (price, station and people limits, features, how many companies are on each); edit one with a reason | all billing roles read; edit: owner, admin, finance |
| Activity, Audit Logs | The activity ledger with search and an "action starts with" filter | all |
| Search | Companies, people and orders by number | all |
| System Settings | How this console is connected | owner, admin |

Role rules live in `src/lib/permissions.ts` (pages and actions) and are enforced by `RoleGate` (page access) and `can()` (buttons). The API enforces its own copy.

## Stack

Vite 5, React 18, TypeScript, react-router 6, TanStack Query 5, shadcn/ui + Radix, Tailwind 3.

## Running it

```bash
npm install
cp .env.example .env     # set VITE_API_URL and the sign-in settings
npm run dev              # http://localhost:8082
npm run verify           # lint + tests + production build (the pre-push hook runs it)
```

`VITE_*` values are baked in at build time, so each environment is built separately.

| Setting | Meaning |
|---|---|
| `VITE_API_URL` | API base including `/v1`, e.g. `https://api.fillo.cloud/v1` |
| `VITE_AUTH_PROVIDER=local` | Sign in with Fillo accounts (what staging and production use). Unset = Firebase Auth, used with the local emulator |
| `VITE_SHOW_DEMO_ACCOUNTS=true` | Show the demo-account picker on the login page (always shown in `npm run dev`) |

Only `@fillo.cloud`, `@fillo.africa`, `@fillo.io` and `@fillo-demo.local` addresses can start sign-in here, as a convenience filter. Access is decided by the API.

## Structure

```
src/
  contexts/AuthContext.tsx   sign-in; the profile and role come from GET /control/me
  services/api.ts            API client: bearer token, one silent refresh on 401, timeout, ApiError
  hooks/useControlApi.ts     one hook per resource; calls the API and nothing else
  hooks/useTableState.ts     page, sort and filters of a list, kept in the address (so a view can be shared); in memory inside a tab
  lib/permissions.ts         who may open which page and do which action (mirrors the API)
  lib/nav.ts                 the one navigation list (sidebar and mobile menu)
  components/
    ConfirmWithReason.tsx    every sensitive change: describe it, require a reason, close only on success
    QueryError.tsx           what a failed request looks like, with Retry
    DataTable.tsx            the one table: sortable headers, server pagination, loading / error / empty in words; SearchBox
    ActivityLedger.tsx       filterable ledger used by Activity and Audit Logs
    RoleGate.tsx             refuses a page the role does not include
    StatusBadge.tsx / TablePagination.tsx / AppSidebar.tsx / MobileNav.tsx / ui/*
  pages/                     one file per page above
```

## Deployment

Built and deployed on Coolify like the other Fillo apps; see `EOP-API/docs/INFRASTRUCTURE.md` and `docs/RELEASING.md`. `develop` redeploys staging (`console-staging.fillo.cloud`); production deploys are manual from `master`.

## What is not here yet

Recorded in the backlog (GitHub issues in `gbolahanadewuyi/fillo`, console audit): staff management and two-factor sign-in.
