# GrandMark WorkflowOS — Phase 1 Foundation

## Complete operations release

WorkflowOS now includes the full shop navigation and live database-backed workspaces for Orders,
Quotes, Proofs, Production, Installs, Schedule, Permits, Service, Customers, Contacts, Materials,
Vendors, Shipping, Accounting, Email, Files & Logs, AI Tools, and Settings.

Order status changes drive the shop handoff automatically:

- moving an order to **Production** creates its production job;
- moving it to **Install** closes fabrication readiness and creates the install record;
- moving it to **Completed** closes the related production and install work.

The application has a responsive desktop-first shell, collapsible navigation, global module search,
light/dark themes, a live operations dashboard, and shared workflow tables for the restored modules.
The production build currently generates 48 application and API routes.

Real database, real auth, deploy-ready. The prototype's data model, ported to Postgres + Prisma,
with NextAuth role-based sign-in and the design tokens carried over.

## What's in this phase
- **prisma/schema.prisma** — the keystone. Every entity from the prototype as a real table:
  User (5 roles), Client, Contact, Vendor, Material, Order, Proof (versioned, approval-token ready),
  ChatMessage, ProductionJob, Install, ServiceTicket, Estimate, Invoice, Payment, ScheduleEvent,
  EmailRecord, Shipment, OAuthConnection. Soft deletes + timestamps everywhere.
- **Auth** — email/password (bcrypt) via NextAuth JWT sessions; role lives in the session.
  `src/middleware.ts` locks every route except /login and /api/health.
- **Seed** — your owner account, the 16 real vendors, and one Planet Fitness order proving
  every relation (proof v1, chat message, schedule event).
- **Shell UI** — login + a live dashboard reading real counts from Postgres.

## Setup (≈15 minutes)
1. **Database** — create a free project at https://neon.tech. Copy BOTH connection strings.
2. `cp .env.example .env` and fill `DATABASE_URL` (pooled), `DIRECT_URL` (direct), and
   `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
3. `npm install`
4. `npx prisma migrate dev --name init`   ← creates all tables
5. Set `OWNER_PASSWORD` to a strong initial password, then run `npm run seed`
6. `npm run dev` → http://localhost:3000
   Sign in with **scott@grandmarksigns.com** and the password you set.

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. vercel.com → New Project → import the repo. Framework auto-detects Next.js.
3. Add env vars: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, and
   `NEXTAUTH_URL=https://<your-app>.vercel.app`. Set `OWNER_PASSWORD` only
   while creating the initial owner with `npm run seed`.
4. Deploy. Visit `/api/health` — `{ ok: true, db: "up" }` means you're live.

## Phase 2 starts here
Port the prototype pages one at a time (Orders → Clients → Dashboard), each backed by an API
route + Prisma. `src/lib/constants.ts` already holds every dropdown list. Then run the one-time
import of real GrandMark data.

## Notes
- Numbers (ORD-1323 style) are app-generated strings with unique constraints — a small
  `nextNumber()` helper in Phase 2 will sequence them per entity.
- `Estimate.lineItems` is JSON for now; the Phase 4 estimating engine replaces it with real tables.
- `OAuthConnection` stores integration tokens; encrypt-at-rest lands in Phase 5 hardening.


---

# Phase 2 — Core CRUD & the real UI

Now included:
- **Full API layer** — orders (list/search/status filter/pagination, create with auto ORD-numbering,
  update, soft delete), chat, versioned proofs with Draft→Sent→Approved, and a shared CRUD factory
  powering clients / contacts / vendors / materials. All inputs Zod-validated, all routes session-guarded.
- **The app UI** — sidebar shell in the WorkflowOS design system, live Dashboard (pipeline by status),
  Orders list with tabs + search + New Order modal, full Order detail (overview, map-linked address,
  proofs, team chat), and list+create pages for Clients, Contacts, Vendors, Materials. TanStack Query
  keeps everything live after every mutation.
- **Real-data import** — `npm run import -- data/clients.csv data/orders.csv`
  (headers documented in `data/*.sample.csv`; bad rows are skipped and reported, never guessed).

Phase 2 scope notes:
- Proofs accept share links (Dropbox/Drive) now; direct file upload is the Phase 3 storage
  integration (Uploadthing/S3) — the API already stores `fileUrl` either way, so it's a drop-in.
- Edit-in-place, drawers, and the remaining pages (Production, Installs, Schedule, Service,
  Estimates/Invoices) port in the same EntityPage pattern as needed during dogfooding.


---

# Phase 3 — Real integrations

**QuickBooks Online** — OAuth connect from Settings, then one-click sync pulls Customers → Clients
(matched by QBO id) and Invoices → Invoices, read-only so QBO stays the financial source of truth.
Tokens auto-refresh. Setup: developer.intuit.com → create an app → copy keys into .env → add
`{NEXTAUTH_URL}/api/integrations/qbo/callback` as the redirect URI. Start in sandbox; production
needs Intuit's app review (start it early — it takes days, not hours).

**Gmail** — OAuth connect, then Sync pulls recent mail and auto-files each message:
sender's exact address → matching Contact → its Client → the client's most recent open Order.
Filed mail shows on the Inbox page with jump-links to the order. "✉ Send to Customer" on any
Draft proof emails the client a real approval request through your account and marks it Sent
(and files a copy under Sent). Setup: Google Cloud console → OAuth consent screen (Internal if
you're on Workspace — skips verification) → Web credentials with the callback URI from .env.example.

**FedEx** — no user OAuth; client-credentials against your developer project. The Shipping page
quotes real rates per service and creates real 4×6 PDF labels charged to your account number,
each saved to the order's Shipments with its tracking number. Start with FEDEX_ENV=sandbox
(test labels), flip to production after FedEx approves your project.

**Claude AI** — the price check now runs server-side via ANTHROPIC_API_KEY; the key never
reaches the browser. Wired into the New Order form.

Phase 3 honesty notes:
- Integration tokens are stored in Postgres unencrypted for now — encrypt-at-rest is the first
  Phase 5 hardening item. Don't share database access in the meantime.
- Label PDFs are stored as data URLs on the Shipment row (fine at shop volume); they move to
  object storage alongside proof uploads in the storage pass.
- Gmail sync is manual (Sync button) in this phase; a cron/webhook makes it automatic in Phase 5.


---

# Phase 4 — The estimating engine, documents & customer approval

**Estimating engine (the moat).** New Estimates section with a line-item builder. Four line kinds:
- **SIGN** — pick a sign type, enter W×H inches and qty; the engine computes sq ft and prices it
  from your **Price Book** (`sell $/sq ft` with a per-type minimum), tracking blended cost for margin.
- **MATERIAL** — cost/unit × qty, marked up (1.6× default, overridable per line).
- **LABOR** — role × hours at your labor rates (Design/Fabrication/Install, stored in Settings).
- **CUSTOM** — free description + sell price for anything else.

All math runs **server-side** (`src/lib/estimating.ts`) so every device shows identical numbers.
Estimates show blended margin (red under 35%) and flow Draft → Sent → Approved →
**one-click Convert to Order**. The seeded price book is a tuning starting point — adjust it via
`PUT /api/pricebook` or Prisma Studio until it matches how GrandMark actually bids; that tuning
during dogfooding IS the moat.

**Documents.** Print-ready **estimate** (`/api/estimates/{id}/print`, GrandMark letterhead, terms)
and **installer packet** (`/orders/{id}/packet` — job sheet with site info, maps link, approved-proof
check that warns "do not install without an approved proof", sign-off + punch-list boxes).
v1 uses browser print-to-PDF — zero dependencies, works on Vercel; headless PDF generation is a
drop-in later if you need automated attachments.

**Customer proof approval.** "🔗 Approval Link" on any proof mints a tokenized public page
(`/approve/{token}` — no login, the token is the credential). Customers see the artwork, approve
for production or request changes with a note; either way it's recorded on the proof, logged into
the order's chat, and **the PM gets an email** (via the Gmail connection; silently skipped if not
connected — the chat entry is always the record). Proof emails sent through Gmail now include the
one-click approval link automatically.

**Migration required:** `npx prisma migrate dev --name phase4` then `npm run seed`
(adds 14 price book entries + labor rates; existing data untouched — the legacy
`Estimate.lineItems` Json column is retained but no longer used).
