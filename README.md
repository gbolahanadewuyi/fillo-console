# Fillo Console — Control Plane

The internal console for Fillo staff: see every company on the platform, investigate what happened, and make a small number of audited changes. It is **not** the customer app (`EOP`, `app.fillo.cloud`), where a company runs its own business.

Its API is the `/v1/control/*` part of `EOP-API` (`functions/src/routes/control-routes.ts`).

## Principles

- **Real data only.** Pages show what the API returns, or an error saying it could not be loaded. There is no mock data and no fallback: staff act on what they see.
- **The API is the authority.** The role comes from `GET /control/me`, which the API resolves from its own staff table or allowlist. It is never guessed from an email address. `src/lib/permissions.ts` mirrors the API's rules so the console doesn't offer what will be refused; it never replaces the server check.
- **Every change says why.** Suspend, reactivate and feature-flag changes go through `ConfirmWithReason` (a reason of at least 5 characters). The API requires it and keeps it in the audit trail.
- **No direct data edits.** The console never edits orders, payments, stock or passwords.

## Pages

| Page | What it does | Roles |
|---|---|---|
| Dashboard | Platform counts, payments recorded (14 days), recent activity, integration health | all |
| Companies / Company | List, search, status filter; one company's stations, users, activity, branding; suspend and reactivate | all read; suspend, reactivate, branding: admin, owner |
| Stations, Users | Cross-company lists with search | all |
| Integrations | WhatsApp and POS connections per company. WhatsApp health is *unknown* until delivery tracking exists | all |
| Feature Flags | Catalogue and per-company overrides (read-only here; no part of the apps reads them yet) | owner, admin, support |
| Plans & Billing | Reference list of plans (not linked to companies yet) | owner, admin, finance |
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
  lib/permissions.ts         who may open which page and do which action (mirrors the API)
  lib/nav.ts                 the one navigation list (sidebar and mobile menu)
  components/
    ConfirmWithReason.tsx    every sensitive change: describe it, require a reason, close only on success
    QueryError.tsx           what a failed request looks like, with Retry
    ActivityLedger.tsx       filterable ledger used by Activity and Audit Logs
    RoleGate.tsx             refuses a page the role does not include
    StatusBadge.tsx / TablePagination.tsx / AppSidebar.tsx / MobileNav.tsx / ui/*
  pages/                     one file per page above
```

## Deployment

Built and deployed on Coolify like the other Fillo apps; see `EOP-API/docs/INFRASTRUCTURE.md` and `docs/RELEASING.md`. `develop` redeploys staging (`console-staging.fillo.cloud`); production deploys are manual from `master`.

## What is not here yet

Recorded in the backlog (GitHub issues in `gbolahanadewuyi/fillo`, console audit): investigation pages for orders, payments and stock; recording of webhook and job failures so integration health can be real; access diagnosis and safe user actions (unlock, send reset email, resend invite); support case notes; staff management and two-factor sign-in.
