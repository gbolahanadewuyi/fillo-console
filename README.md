# Fillo Console — Control Plane

Internal operator console for the Fillo platform (the “Overwatch” equivalent for EOP). Manages companies, stations, users, billing, integrations, feature flags, and platform health.

**This is not the tenant app.** Tenant operations live in `EOP` (`app.fillo.cloud`). Console is the control plane above tenants:

```
Fillo Platform
  → Company
    → Station
      → Users
        → Operational Data
```

## Stack

- Vite 5 + React 18 + TypeScript
- react-router-dom 6 + TanStack Query 5
- shadcn/ui + Radix + Tailwind CSS 3
- Firebase Auth (same project `energyops-504210` as EOP)

Reuses the Overwatch layout pattern from `kasland-admin-hub` (SidebarProvider, dark sidebar, `apiRequest` with token cache, 15s timeout).

## Getting started

```bash
npm install
cp .env.example .env   # fill VITE_API_URL + VITE_FIREBASE_*
npm run dev            # http://localhost:8082
```

Required env:

- `VITE_API_URL` — backend base (no trailing slash), e.g. `https://us-east1-energyops-504210.cloudfunctions.net/api` or local `http://127.0.0.1:5001/energyops-504210/us-east1/api`
- `VITE_FIREBASE_*` — from Firebase Console > Project Settings (same project as EOP)

Platform auth: only `@fillo.cloud` / `@fillo.africa` / `@fillo-demo.local` emails, plus allowlist `PLATFORM_ADMIN_EMAILS` server-side. In dev, any signed-in user is treated as `platform_admin` (see `src/contexts/AuthContext.tsx`).

## Demo accounts — per platform role (mirrors EOP's tenant demos)

Like the tenant app's `owner@eop-demo.local` etc., the console ships with **one seeded account per platform role** (all password `demo1234`):

| Role | Email | Name | Capabilities |
|------|-------|------|--------------|
| Platform Owner | `owner@fillo.cloud` | Fillo Owner | Full — all companies, billing, flags, destructive ops |
| Platform Admin | `admin@fillo.cloud` | Fillo Admin | Platform management + support |
| Platform Support | `support@fillo.cloud` | Fillo Support | Read-heavy — companies/users/integrations/activity |
| Platform Finance | `finance@fillo.cloud` | Fillo Finance | Plans, subscriptions, billing & financials |

The Login page mirrors `EOP/src/app/login/page.tsx:111-127`: a “Seeded demo accounts” card with one tap to fill `email` + `password` (`MOCK_PLATFORM_PASSWORD` in `src/lib/mock/users.ts:30-50`). Uids are deterministic (`user-platform-owner` etc.) so a Firebase ID token's `uid` matches the Postgres `User.id` seeded in `EOP-API/functions/prisma/seed.ts:160-214` — same coupling `EOP/scripts/seed-emulator-auth.ts:8-14` uses for tenant demos.

**Seeding:**

```bash
# Terminal 1 — start emulators (auth + local API)
cd EOP-API && npm run emulators            # auth:9099, import/export emulator-data
# or: cd fillo-console && npm run emulators # auth:9099 via fillo-console/firebase.json

# Terminal 2 — seed Firebase Auth emulator users (both tenant + platform)
cd EOP-API/functions && npm run seed:auth            # 5 tenant + 4 platform @fillo.cloud
cd fillo-console && npm run seed:emulator            # 4 platform (idempotent, safe to re-run either)

# Seed Postgres (platform company + users, plus Seegas fixtures)
cd EOP-API/functions && npm run seed
```

Toggle between accounts via the Login demo card — header shows `platformRole` badge (Owner/Admin/Support/Finance) and sidebar filters Platform/Plans sections per role (`src/components/AppSidebar.tsx:40-60`).

## Structure

```
src/
  contexts/AuthContext.tsx  platform auth (Firebase + GET /control/me)
  services/api.ts           VITE_API_URL + Bearer token + 15s timeout + ApiError
  hooks/useControlApi.ts    one hook per domain, mock fallback until /control is live
  components/
    AdminLayout.tsx / AppSidebar.tsx / AppHeader.tsx / MobileNav.tsx
    StatusBadge.tsx / TablePagination.tsx / ui/*
  pages/
    Dashboard.tsx           KPIs, 14-day revenue chart, activity, health
    Companies.tsx           cross-tenant list, status filter, search
    CompanyDetail.tsx       tabs: Overview / Stations / Users / Subscription / Branding / Activity
    Stations.tsx / Users.tsx
    Integrations.tsx        WhatsApp / Moniepoint / OPay health (masked secrets)
    FeatureFlags.tsx        platform/company/station matrix
    Plans.tsx               plan catalogue (Starter/Growth/Scale)
    Activity.tsx / AuditLogs.tsx
    Support.tsx             global search (company/user/order/phone)
    Settings.tsx / Notifications.tsx
```

## API — privileged `/v1/control/*`

All routes behind `verifyFirebaseToken` + `requirePlatformRole` (`EOP-API/functions/src/middleware/require-platform.ts`). Cross-tenant queries intentionally omit `where.companyId = viewer.companyId`. Every destructive mutation writes `ActivityLog` + `OutboxEvent`.

Example: `GET /control/companies?page=1&pageSize=20&search=&status=` → `Paginated<ControlCompany>`.

Implemented in `EOP-API`:

- `src/routes/control-routes.ts`
- `src/services/control-service.ts`
- `src/controllers/control-controller.ts`
- `src/middleware/require-platform.ts` (env allowlist: `PLATFORM_ADMIN_EMAILS`, `PLATFORM_OWNER_EMAILS`)
- `src/validators/control-validators.ts`

Feature flags are code-catalogue v1 with `CompanySetting` overrides (`feature.<key>`). Plans are code-catalogue v1.

## Deployment — GCP App Engine

- `app.yaml` → `service: console` (Node 22, `node server.js`)
- `server.js` — SPA static server, immutable cache for `/assets/*`
- Routes: `console.fillo.cloud → console` via `dispatch.yaml` (add to `EOP/dispatch.yaml` or deploy via `fillo-dispatch-rules/dispatch.yaml` with `gcloud app deploy dispatch.yaml`)
- CORS: `ALLOWED_ORIGINS` must include `https://console.fillo.cloud` + `http://localhost:8082`

```bash
npm run build
gcloud app deploy app.yaml --project energyops-504210
# after EOP-API deploy, re-apply Cloud SQL mount:
gcloud run services update api --region us-east1 --add-cloudsql-instances=energyops-504210:us-east1:energyops-504210-instance --project energyops-504210
```

## Security notes

- Secrets (`WhatsappNumber.accessToken`, `PosProviderConnection.webhookSecret`) are masked server-side — console never renders them.
- No impersonation in v1. If added later, require explicit grant + full audit.
- Every platform mutation is audited (`actorId`, `action`, `resourceType/Id/Label`, `companyId`, timestamp).
- Rate limited, confirmation dialogs for suspend/flag changes, no bulk edit.
