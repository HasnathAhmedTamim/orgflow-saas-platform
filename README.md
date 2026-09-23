# OrgFlow

Multi-tenant SaaS subscription platform for the **Octopi Digital Jr. Full-Stack Developer** assessment.

Organizations onboard through **paid Stripe Checkout**. Tenants activate only after a **verified webhook**. Each organization is isolated with its own users, subscription, payments, and transactions.

| Layer | Stack |
|-------|--------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind, TanStack Query |
| Backend | Express, TypeScript, Prisma |
| Database | PostgreSQL |
| Auth | JWT access + refresh in HTTP-only cookies |
| Payments | Stripe Checkout + webhooks |
| Email | Resend (`EmailService` abstraction) |

**Default local ports:** frontend `3000` · API `5000`

### Live demo

| Surface | URL |
|---------|-----|
| App (Vercel) | https://orgflow-saas-platform.vercel.app |
| API (Render) | https://orgflow-saas-platform.onrender.com |
| Health | https://orgflow-saas-platform.onrender.com/api/health |

Seeded logins (same as local): see [Test credentials](#test-credentials).  
**Note:** Render free tier sleeps when idle — the first request after idle can take ~30–60s.

### Walkthrough videos

| Video | Link |
|-------|------|
| 1 — Product walkthrough | https://drive.google.com/file/d/1LFGEUU-wr5GQ_x4jR3OnewIkqCs7Bgv8/view?usp=sharing |
| 2 — Code walkthrough | https://drive.google.com/file/d/1e5-Ox1Rcw-0sjbGpC7PC5Kh6r3Dn26Pt/view?usp=sharing |

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Tech choices](#tech-choices)
4. [Database design](#database-design)
5. [Multi-tenancy](#multi-tenancy)
6. [Authentication](#authentication)
7. [Payment flow](#payment-flow)
8. [Webhook idempotency](#webhook-idempotency)
9. [Transactions & rollback](#transactions--rollback)
10. [Security](#security)
11. [Repository structure](#repository-structure)
12. [Local setup](#local-setup)
13. [Environment variables](#environment-variables)
14. [Testing](#testing)
15. [Test credentials](#test-credentials)
16. [Postman](#postman)
17. [CI/CD & deployment](#cicd--deployment)
18. [Known limitations](#known-limitations)
19. [AI usage](#ai-usage)

---

## Features

### Platform Admin
- Dashboard metrics (organizations, users, subscriptions, revenue, failed payments, recent signups)
- Organization search / status filter, detail view (members, subscription history, payments, transactions)
- Suspend / reactivate organizations
- Plans: create, edit, disable
- Platform-wide transaction history with filters

### Organization Admin
- Organization profile (name, contact, billing email)
- Members: invite, remove, change role
- Subscription: view, upgrade, downgrade, cancel
- Billing: payment history, Stripe Customer Portal, PDF invoice download
- Organization-scoped transactions

### Organization Member
- Own profile and password change
- Read-only organization view (name + plan)
- No access to members, billing, subscription management, or transactions

---

## Architecture

```text
┌─────────────────┐  HTTPS + cookies (same-origin /api)  ┌──────────────────┐
│  Next.js (FE)   │ ──── /api proxy on Vercel ─────────► │  Express API     │
│  Vercel         │                                      │  Render          │
└─────────────────┘                                      └────────┬─────────┘
                                                                  │
                                        ┌─────────────────────────┼─────────────────────┐
                                        ▼                         ▼                     ▼
                                  PostgreSQL                   Stripe                Resend
                                  (Prisma/Neon)             Checkout+WH             Email
```

In production the browser calls **`/api/*` on the Vercel host**. A Next.js route handler proxies to Render so HTTP-only auth cookies are first-party (required for Next middleware session checks). Stripe webhooks still hit Render directly.
| Concern | Approach |
|---------|----------|
| Backend layering | `Route → Middleware → Controller → Service → Prisma` |
| Frontend routing | Role areas: `/platform`, `/organization`, `/member` |
| Server state | TanStack Query |
| UI chrome only | Redux Toolkit (sidebar open/close) |
| Source of truth for activation | Stripe webhook (not the success redirect URL) |

---

## Tech choices

| Area | Choice | Rationale |
|------|--------|-----------|
| Frontend | Next.js App Router + TypeScript + Tailwind | Clear role-based route groups, fast UI iteration |
| Data fetching | TanStack Query | Server state without duplicating it in Redux |
| Backend | Express + TypeScript | Small, interview-explainable REST API |
| ORM / DB | Prisma + PostgreSQL | Typed schema, `$transaction`, FKs, indexes |
| Auth | JWT access + refresh in HTTP-only cookies | Avoid token theft via `localStorage` |
| Payments | Stripe Checkout + webhooks | PCI-friendly; webhook as activation authority |
| Email | Resend behind `EmailService` | Provider-swappable; console fallback without API key |

---

## Database design

**Core models:** `Organization`, `User`, `Plan`, `Subscription`, `Payment`, `Transaction`, `WebhookEvent`, `Invitation`, `PasswordResetToken`, `RefreshToken`, `PendingRegistration`.

**Relationships**
- `Organization` 1→N `User`, `Subscription`, `Payment`, `Transaction`, `Invitation`
- `Subscription` → `Plan`
- `Transaction` → optional `Payment`

**Tenant ownership:** `organizationId` on users (nullable for platform admin) and on all tenant-owned ledger/membership rows.

**Status enums (selected)**
- Organization: `PENDING`, `ACTIVE`, `TRIAL`, `SUSPENDED`, `CANCELLED`
- Subscription: `ACTIVE`, `PENDING`, `FAILED`, `CANCELLED`, `EXPIRED`
- Payment: `PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED`
- Transaction: `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`, `ROLLED_BACK`

**Indexes:** `organizationId`, emails, statuses, `createdAt`, unique `stripeEventId`, unique checkout/payment intent ids where applicable.

Paid signup uses `PendingRegistration` so **no ACTIVE organization** exists before successful payment.

---

## Multi-tenancy

**Model:** shared database, shared schema, row-level isolation via `organizationId`.

**Enforcement**
1. Authenticate from the HTTP-only access JWT cookie
2. Load the user and derive tenant from `user.organizationId` — never trust a client-supplied org id
3. Scope service queries to that id (`assertTenantAccess`)
4. Cross-tenant access → `403 TENANT_ACCESS_DENIED`
5. `PLATFORM_ADMIN` is the intentional platform-wide exception

Frontend route/nav hiding is UX only. **Backend RBAC + tenant checks are the security boundary.**

**Suspension:** when an organization is `SUSPENDED`, its users cannot log in or refresh (`ACCOUNT_SUSPENDED`). Platform admins can still manage the org.

---

## Authentication

| Topic | Implementation |
|-------|----------------|
| Tokens | Access JWT (~15m) + refresh JWT (~7d) |
| Storage | HTTP-only cookies: `orgflow_access`, `orgflow_refresh` |
| Passwords | bcrypt (12 rounds) |
| Refresh store | Hashed server-side; revoked on logout / password change |
| Password reset | Hashed one-time tokens with expiry; responses avoid email enumeration |
| Rate limits | Login, registration, password, and invite endpoints |
| Roles | `PLATFORM_ADMIN`, `ORG_ADMIN`, `MEMBER` (enforced with `requireRoles`) |

---

## Payment flow

```text
Register (org + admin + plan)
  → store PendingRegistration (no ACTIVE org)
  → create Stripe Checkout Session
  → customer pays on Stripe
  → webhook: checkout.session.completed
       1. Verify Stripe signature (raw body)
       2. Prisma $transaction:
            Organization ACTIVE + ORG_ADMIN user
            + Subscription + Payment + Transaction
       3. Delete PendingRegistration
       4. Record WebhookEvent (unique stripeEventId) — only after success
  → send success email
```

**Important:** the Stripe success URL is UX only. **Only the webhook activates the organization.** Abandoned checkouts leave a pending registration that can retry.

### Ongoing lifecycle (webhooks)

| Event | Effect |
|-------|--------|
| `invoice.paid` (`subscription_cycle`) | Renewal payment + transaction; sync period |
| `invoice.payment_failed` | Failed payment/transaction; subscription `FAILED` |
| `customer.subscription.updated` | Status / period / `cancel_at_period_end` sync |
| `customer.subscription.deleted` | Subscription `EXPIRED` |
| `charge.refunded` | Payment + related transactions → `REFUNDED` |
| Checkout expired / failed | Pending plan-change rows → `ROLLED_BACK` / `FAILED` |

Plan changes (upgrade/downgrade) also go through Checkout; pending ledger rows are created up front so abandoned sessions can be rolled back cleanly.

---

## Webhook idempotency

1. If `WebhookEvent.stripeEventId` already exists → treat as duplicate (safe no-op)
2. Run business effects
3. Insert `WebhookEvent` **only after success**

If activation fails, no event row is stored, so Stripe retries can re-apply. Concurrent workers rely on the unique constraint plus business idempotency (consumed pending registration, unique session / payment intent).

---

## Transactions & rollback

Payment activation (org + admin + subscription + payment + transaction) runs inside `prisma.$transaction`.

- Any mid-flow failure rolls the whole unit back — no partial org/user/payment rows
- Covered by automated tests (including unique-email collision rollback)
- Abandoned plan-change checkouts mark pending ledger rows as `ROLLED_BACK`

---

## Security

- bcrypt password hashing
- HTTP-only cookies; `Secure` + appropriate `SameSite` in production
- Zod validation on inputs
- Server-side RBAC (`PLATFORM_ADMIN` / `ORG_ADMIN` / `MEMBER`)
- Tenant isolation at the query layer
- Rate limiting on sensitive routes
- Stripe webhook signature verification (raw body)
- Secrets only in environment variables (never committed)
- Unknown API errors return a generic 500 message (no stack / DB leak to clients)

---

## Email

`EmailService` → `ResendProvider`. Without `RESEND_API_KEY`, messages log to the console.

Covers: member invites, payment success/failure, subscription upgrade/downgrade/cancel, and expiring-soon reminders (daily job).

Optional local redirect: `EMAIL_DEV_OVERRIDE_TO` (Resend-verified inbox).

---

## Repository structure

```text
frontend/              Next.js app
backend/               Express API + Prisma
postman/               API collection (serial use cases)
.github/workflows/     CI
docker-compose.yml     Optional local Postgres
```

---

## Local setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ **or** Docker Compose
- Stripe test keys (for real checkout)
- Optional: Resend API key

### Steps

```bash
# 1) Database
docker compose up -d
# or create local databases: orgflow and orgflow_test

# 2) Backend
cd backend
cp .env.example .env
# set DATABASE_URL, JWT secrets, Stripe keys
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run dev
# → http://localhost:5000

# 3) Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

### Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

Copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`, then restart the API.

---

## Environment variables

See `backend/.env.example` and `frontend/.env.example`.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing |
| `FRONTEND_URL` / `BACKEND_URL` / `PORT` | CORS, links, listen port |
| `COOKIE_SECURE` | `true` in production HTTPS |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Payments + webhook verify |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | Checkout redirects |
| `RESEND_API_KEY` / `EMAIL_FROM` | Outbound email |
| `EMAIL_DEV_OVERRIDE_TO` | Optional email redirect (leave empty in production unless demoing) |
| `NEXT_PUBLIC_API_URL` | Local: `http://localhost:5000/api` · Production (Vercel): **`/api`** |
| `NEXT_PUBLIC_APP_URL` | Frontend origin (local or Vercel URL) |
| `API_PROXY_TARGET` | Optional (Vercel): Render origin for the `/api` proxy (defaults to the deployed API host) |

---

## Testing

### Backend

```bash
cd backend
# Windows PowerShell example:
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orgflow_test?schema=public"
npx prisma migrate deploy
npm test
```

Covered scenarios include:
- Authentication (valid/invalid login, protected routes)
- RBAC (member blocked from billing / members / admin)
- Tenant isolation (org A cannot see org B / platform routes)
- Suspension blocks login
- Webhook activation, duplicate event handling, signed HTTP webhook
- Activation rollback on mid-flow failure
- Renewal / refund status updates (service-level)

### Frontend

```bash
cd frontend
npm test
npm run build
```

### CI

GitHub Actions (`.github/workflows/ci.yml`) runs backend typecheck + tests (Postgres service) and frontend lint / test / build on every push and pull request.

---

## Test credentials

Password for all seeded users: **`Password123!`**

| Role | Name | Email |
|------|------|-------|
| Platform Admin | Hasnath Platform Admin | `admin@orgflow.com` |
| Organization Admin | Sarah Ahmed | `admin@acme.com` |
| Organization Member | James Khan | `member@acme.com` |

Tenant-isolation demo org: **Nordic Soft Ltd** — `admin@nordicsoft.com` (same password).

### Paid registration demo

| Field | Value |
|-------|--------|
| Organization | NovaTech Solutions |
| Admin name | Nadia Rahman |
| Email | `nadia.rahman@novatech.io` |
| Password | `Password123!` |
| Stripe test card | `4242 4242 4242 4242` |

Use a fresh email if that address is already registered from a previous run.

---

## Postman

Import [`postman/OrgFlow.postman_collection.json`](postman/OrgFlow.postman_collection.json).

Run folders **01 → 12** in order:

| # | Folder | Covers |
|---|--------|--------|
| 01 | Health Check | API up |
| 02 | Public Plans | Plans before login |
| 03 | Auth — Platform Admin | Login, me, refresh, invalid login |
| 04 | Platform Admin Panel | Stats, orgs, plans, transactions, suspend/reactivate |
| 05 | Auth — Org Admin | Login as Acme admin |
| 06 | Organization Admin Panel | Profile, members, subscription, billing, invoice, transactions |
| 07 | Accept Invitation | Join with invite token from email/console |
| 08 | Auth — Member | Login as member |
| 09 | Member + Forbidden | Profile OK; billing/members/admin blocked |
| 10 | Paid Registration | Checkout → webhook → new org login |
| 11 | Tenant Isolation | Nordic Soft cannot see Acme / platform data |
| 12 | Password Reset | Forgot + reset |

**Tips**
1. `baseUrl` = `http://localhost:5000/api`
2. Enable cookies in Postman (JWT session)
3. Collection Runner: `01–06`, `08–09`, `11` can run largely automatically
4. Folder `10` needs browser payment + `stripe listen`
5. Folders `07` / `12` need tokens from email or console logs

---

## CI/CD & deployment

| Service | Target | URL |
|---------|--------|-----|
| Frontend | Vercel | https://orgflow-saas-platform.vercel.app |
| Backend | Render (Node, root `backend`) | https://orgflow-saas-platform.onrender.com |
| Database | Neon PostgreSQL | — |
| Payments | Stripe test mode | Webhook → Render |
| Email | Resend | — |
| CI | GitHub Actions | Lint / test / build on push & PR |

`git push` to `master` triggers **auto-deploy** on Vercel and Render (when connected).

### Production env (summary)

**Render (backend)** — set at least:

```text
NODE_ENV=production
COOKIE_SECURE=true
DATABASE_URL=<neon>
FRONTEND_URL=https://orgflow-saas-platform.vercel.app
BACKEND_URL=https://orgflow-saas-platform.onrender.com
JWT_ACCESS_SECRET=<random 32+>
JWT_REFRESH_SECRET=<random 32+>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from Stripe endpoint on Render URL
STRIPE_SUCCESS_URL=https://orgflow-saas-platform.vercel.app/checkout/success
STRIPE_CANCEL_URL=https://orgflow-saas-platform.vercel.app/checkout/cancel
RESEND_API_KEY=re_...
EMAIL_FROM=OrgFlow <onboarding@resend.dev>
```

Build command example:

```text
npm install --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build
```

Start: `npm start`

**Vercel (frontend)** — root directory `frontend`:

```text
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_APP_URL=https://orgflow-saas-platform.vercel.app
```

Optional: `API_PROXY_TARGET=https://orgflow-saas-platform.onrender.com`

### Stripe webhook (production)

Endpoint:

```text
https://orgflow-saas-platform.onrender.com/api/webhooks/stripe
```

Do **not** use the local `stripe listen` signing secret in production.

### Auth cookie note

Because the app and API are on different hosts, the frontend proxies `/api` through Next.js so session cookies are set on the **Vercel** domain. Next.js middleware can then see `orgflow_access` / `orgflow_refresh` and protect `/platform`, `/organization`, and `/member`.

---

## Known limitations

- Stripe Checkout uses inline `price_data` (no pre-created Stripe Price objects required for the demo)
- Invoice PDFs use PDFKit; payment methods are managed via Stripe Customer Portal
- Per-organization custom SMTP is an optional bonus and is **not** implemented
- End-to-end payment/email delivery needs real Stripe / Resend test keys
- Refresh rotation is basic (single stored hash per refresh token)
- Renewal sync depends on Stripe delivering `invoice.paid` / subscription events to the webhook
- Render free instances cold-start after idle; first API call can be slow
- Calling the Render API **directly** from the browser (bypassing the Vercel `/api` proxy) will not set cookies the Next middleware can read

### Bonus status

| Bonus | Status |
|-------|--------|
| CI/CD (GitHub Actions) | Implemented |
| UI polish / design system | Implemented |
| PDF invoices | Implemented |
| Per-org SMTP | Not implemented |

---

## AI usage

Built with Cursor agent assistance for scaffolding, repetitive CRUD, UI pages, and documentation drafts.

Architecture decisions were intentional and are meant to be fully explainable in review:
- tenant isolation via `organizationId`
- webhook as source of truth for activation
- Prisma `$transaction` for paid onboarding
- HTTP-only JWT cookies
- webhook event recorded only after successful business effects

---

## License

Private assessment submission.
