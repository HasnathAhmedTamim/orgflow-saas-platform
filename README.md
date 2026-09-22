# OrgFlow — Multi-Tenant SaaS Subscription Platform

OrgFlow is a multi-tenant SaaS subscription platform built for the **Octopi Digital Jr. Full-Stack Developer** technical assessment.

Organizations register through **paid onboarding** (Stripe Checkout). Activation happens only after a verified Stripe webhook. Each organization operates in an isolated tenant space with its own users, subscription, payments, and transactions.

## Features

### Platform Admin
- Dashboard stats (orgs, users, revenue, failed payments, recent signups)
- Organizations list with search/filter, detail pages
- Suspend / reactivate organizations
- Plans management (create / edit / disable)
- Platform-wide transaction history

### Organization Admin
- Org profile (name, contact, billing email)
- Member invite / remove / role change
- Subscription view, upgrade / downgrade / cancel
- Billing & payment history, org transactions

### Organization Member
- Own profile + password change
- Read-only org info (name + plan — no billing)

## Architecture

```text
Next.js (Vercel)  --HTTPS + HTTP-only cookies-->  Express API (Render)
                                                      |
                                         +------------+------------+
                                         |            |            |
                                   Neon Postgres   Stripe      Resend
                                      (Prisma)
```

**Backend layers:** `Route → Middleware → Controller → Service → Prisma`

**Frontend:** App Router role areas (`/platform`, `/organization`, `/member`) + TanStack Query for server state. Redux Toolkit is used only for UI chrome (sidebar).

## Tech Stack

| Area | Choice | Why |
|------|--------|-----|
| Frontend | Next.js App Router + TS + Tailwind | Fast UI, clear route groups per role |
| Data fetching | TanStack Query | Server state without Redux duplication |
| Backend | Express + TypeScript | Simple, interview-explainable REST API |
| ORM / DB | Prisma + PostgreSQL | Typed schema, `$transaction`, indexes, FKs |
| Auth | JWT access + refresh in HTTP-only cookies | Avoid localStorage token theft |
| Payments | Stripe Checkout + webhooks | Webhook is source of truth |
| Email | Resend behind `EmailService` | Swappable provider |

## Database Design

Core models: `Organization`, `User`, `Plan`, `Subscription`, `Payment`, `Transaction`, `WebhookEvent`, `Invitation`, `PasswordResetToken`, `RefreshToken`, `PendingRegistration`.

Key relationships: Organization 1→N Users / Subscriptions / Payments / Transactions / Invitations. Subscription → Plan.

Enums cover org status, subscription status, payment status, and transaction status (`PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`, `ROLLED_BACK`).

Indexes on `organizationId`, emails, statuses, `createdAt`, and unique `stripeEventId`.

## Multi-Tenancy

**Approach:** shared database + shared schema + `organizationId` on tenant data.

**Enforcement:**
1. Authenticate user from HTTP-only access cookie JWT
2. Derive tenant from `user.organizationId` — never trust a client-supplied org id
3. Services scope queries with that id
4. Cross-tenant access → `403 TENANT_ACCESS_DENIED`
5. Platform Admin is the deliberate platform-wide exception

Frontend route hiding is UX only. Backend authorization is the security boundary.

**Suspension:** when an org is `SUSPENDED`, its users cannot log in or refresh (`ACCOUNT_SUSPENDED`). Platform Admin can still manage them.

## Authentication

- Access JWT (~15m) + refresh JWT (~7d) in HTTP-only cookies (`orgflow_access`, `orgflow_refresh`)
- Passwords hashed with bcrypt (12 rounds)
- Refresh tokens stored hashed server-side and revoked on logout / password change
- Forgot / reset password uses hashed one-time tokens with expiry; responses avoid email enumeration
- Rate limiting on login, registration, and password endpoints

## Payment Flow

```text
Register (org + admin + plan)
  → PendingRegistration stored (no ACTIVE org)
  → Stripe Checkout Session
  → User pays on Stripe
  → Webhook checkout.session.completed
       1. Verify Stripe signature (raw body)
       2. Run Prisma $transaction: Organization ACTIVE + ORG_ADMIN + Subscription + Payment + Transaction
       3. Delete PendingRegistration
       4. Record WebhookEvent (unique stripeEventId) — only after success
  → Success email
```

Renewals and lifecycle updates:

```text
invoice.paid (subscription_cycle) → Payment + Transaction (RENEWAL) + period sync
invoice.payment_failed            → Payment/Transaction FAILED + Subscription FAILED
customer.subscription.updated     → status / period / cancel_at_period_end sync
customer.subscription.deleted     → Subscription EXPIRED
charge.refunded                   → Payment + Transaction REFUNDED
checkout expired / failed         → PENDING plan-change rows → ROLLED_BACK / FAILED
```

The Stripe success URL is UX only. **Only the webhook activates the organization.** Abandoned payments leave a pending registration that can retry checkout.

## Webhook Idempotency

`WebhookEvent.stripeEventId` is unique. Business effects run **before** the event row is inserted. If activation fails, no event row is stored, so Stripe retries can re-apply safely. Duplicate deliveries (same event id already recorded) return success without re-applying business effects. Concurrent workers rely on the unique constraint plus business idempotency (consumed `PendingRegistration`, unique checkout session / payment intent).

## Rollback

Payment activation runs inside `prisma.$transaction`. If any step fails (e.g. unique email conflict), the entire unit rolls back — no partial org/user/payment rows. Covered by automated tests. Abandoned plan-change checkouts mark pending ledger rows as `ROLLED_BACK`.

## Security

- Password hashing (bcrypt)
- HTTP-only cookies; Secure + SameSite in production
- Zod validation on inputs
- RBAC middleware (`PLATFORM_ADMIN` / `ORG_ADMIN` / `MEMBER`)
- Tenant isolation at query level
- Rate limiting on sensitive routes
- Stripe webhook signature verification
- Secrets only in environment variables
- API errors never leak stack traces or DB internals (unknown errors always return a generic 500 message)

## Email

`EmailService` → `ResendProvider`. Without `RESEND_API_KEY`, emails log to the console (dev-friendly). Templates cover invites, payment success/failure, subscription changes, and expiring-soon reminders.

## Repository Structure

```text
frontend/     Next.js app
backend/      Express API + Prisma
postman/      API collection
.github/      CI workflow
docker-compose.yml   optional local Postgres
```

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or Docker Compose)
- Stripe test keys (for real checkout)
- Optional: Resend API key

### Steps

```bash
# 1) Database
# Option A: Docker
docker compose up -d

# Option B: local Postgres — create DB `orgflow`

# 2) Backend
cd backend
cp .env.example .env
# edit DATABASE_URL, JWT secrets, Stripe keys
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run dev
# API: http://localhost:5000

# 3) Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
# App: http://localhost:3000
```

### Stripe webhooks locally

```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

Put the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Environment Variables

See `backend/.env.example` and `frontend/.env.example`.

Critical backend vars: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.

## Testing

```bash
cd backend
# ensure orgflow_test database exists and migrated
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orgflow_test?schema=public
npx prisma migrate deploy
npm test
```

Critical coverage:
- Authentication (login, invalid, protected routes)
- RBAC (member blocked from billing/members)
- Tenant isolation (org A cannot see org B / admin routes)
- Suspension blocks login
- Webhook activation + duplicate webhook idempotency
- Transaction rollback on mid-flow failure

```bash
cd frontend
npm test
npm run build
```

## Test Credentials

Password for all seeded users: `Password123!`

| Role | Name | Email |
|------|------|-------|
| Platform Admin | Hasnath Platform Admin | `admin@orgflow.com` |
| Organization Admin | Sarah Ahmed | `admin@acme.com` |
| Organization Member | James Khan | `member@acme.com` |

Tenant-isolation demo org: Nordic Soft Ltd — `admin@nordicsoft.com` (same password).

### Paid registration demo (UI / Postman)

| Field | Value |
|-------|--------|
| Organization | NovaTech Solutions |
| Admin name | Nadia Rahman |
| Email | `nadia.rahman@novatech.io` |
| Password | `Password123!` |
| Stripe test card | `4242 4242 4242 4242` |

## Postman

Import [`postman/OrgFlow.postman_collection.json`](postman/OrgFlow.postman_collection.json).

**Run folders in order (01 → 12):**

| # | Folder | What it covers |
|---|--------|----------------|
| 01 | Health Check | API up |
| 02 | Public Plans | Plans before login |
| 03 | Auth — Platform Admin | Login, me, refresh, invalid login |
| 04 | Platform Admin Panel | Stats, orgs, plans CRUD, transactions, suspend/reactivate |
| 05 | Auth — Org Admin | Login as Acme admin |
| 06 | Organization Admin Panel | Profile, members, invite, subscription, billing, invoice, transactions |
| 07 | Accept Invitation | Join with invite token |
| 08 | Auth — Member | Login as member |
| 09 | Member + Forbidden | Profile OK; billing/members/admin blocked |
| 10 | Paid Registration | Stripe Checkout → webhook → new org login |
| 11 | Tenant Isolation | Nordic Soft cannot see Acme / platform data |
| 12 | Password Reset | Forgot + reset flow |

1. `baseUrl` = `http://localhost:5000/api`
2. Enable **Cookies** in Postman
3. Collection Runner: run `01–06`, `08–09`, `11` automatically
4. Folder `10` needs browser payment + `stripe listen`
5. Folders `07` / `12` need token from email/console


## Deployment

| Service | Target |
|---------|--------|
| Frontend | Vercel |
| Backend | Render |
| Database | Neon PostgreSQL |
| Payments | Stripe (test → live) |
| Email | Resend |

Set production `COOKIE_SECURE=true`, matching `FRONTEND_URL` / CORS origin, and Stripe webhook endpoint to `https://<api>/api/webhooks/stripe`.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs backend typecheck + tests (with Postgres service) and frontend lint/test/build on every push/PR.

## Known Limitations

- Stripe Checkout uses inline `price_data` (no pre-created Stripe Price objects required for demo)
- Invoice PDFs use PDFKit (not Puppeteer); payment methods are managed via Stripe Customer Portal
- Per-organization custom SMTP is a listed bonus and is **not** implemented
- Local Stripe/Resend require real test API keys for end-to-end payment/email delivery
- Refresh cookie rotation is basic (single stored hash per refresh)
- Renewal sync depends on Stripe sending `invoice.paid` / subscription events to the webhook endpoint

## AI Usage

This project was built with Cursor agent assistance for scaffolding, repetitive CRUD, UI pages, and documentation drafting. Architecture decisions (tenant isolation via `organizationId`, webhook-as-source-of-truth, Prisma `$transaction` for activation, HTTP-only JWT cookies) were specified deliberately and are intended to be fully explainable in review.

## License

Private assessment submission.
