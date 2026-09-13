# ☕ Smol Café  Full System Architecture & Operations Manual

Welcome to the **smol café** monorepo! This repository contains the complete, production-ready mobile-first Web POS, Customer Ordering, Kitchen Display System (KDS), Inventory & Procurement Engine, Community Subsystems, and Admin Analytics platform for **smol café** in Rishikesh.

---

## 📋 Table of Contents

- [1. Executive Summary & Brand Identity](#1-executive-summary--brand-identity)
- [2. System Architecture & Tech Stack](#2-system-architecture--tech-stack)
- [3. Multi-Role Capability Matrix (6 Roles)](#3-multi-role-capability-matrix-6-roles)
- [4. Complete Subsystem & Feature Directory](#4-complete-subsystem--feature-directory)
  - [4.1 Landing Page & QR Table Session Entry](#41-landing-page--qr-table-session-entry)
  - [4.2 Digital Menu & Customer Ordering](#42-digital-menu--customer-ordering)
  - [4.3 Real-Time Order Tracking & Engagement](#43-real-time-order-tracking--engagement)
  - [4.4 Billing, Online Payments & Cash Settlement](#44-billing-online-payments--cash-settlement)
  - [4.5 Kitchen Display System (KDS) & ETA Engine](#45-kitchen-display-system-kds--eta-engine)
  - [4.6 Chef Inventory, Recipes & 86 Engine](#46-chef-inventory-recipes--86-engine)
  - [4.7 Smol Café Jukebox Subsystem](#47-smol-café-jukebox-subsystem)
  - [4.8 Blackboard Daily Specials Subsystem](#48-blackboard-daily-specials-subsystem)
  - [4.9 Community Events ("What's On")](#49-community-events-whats-on)
  - [4.10 Procurement & Goods Receipt Engine](#410-procurement--goods-receipt-engine)
  - [4.11 Budget vs. Actual Spend Analytics](#411-budget-vs-actual-spend-analytics)
  - [4.12 Loyalty Rewards & Order Claiming Engine](#412-loyalty-rewards--order-claiming-engine)
  - [4.13 Super Admin Analytics & User Management](#413-super-admin-analytics--user-management)
  - [4.14 System Observability & Health Monitoring](#414-system-observability--health-monitoring)
  - [4.15 Developer Quick Role Switcher ("Smol Backdoor")](#415-developer-quick-role-switcher-smol-backdoor)
- [5. Database Schema & Financial Integrity Engine](#5-database-schema--financial-integrity-engine)
- [6. Security Model, RBAC & MFA](#6-security-model-rbac--mfa)
- [7. Dual Database Engine (Supabase & Mock Parity)](#7-dual-database-engine-supabase--mock-parity)
- [8. Repository Structure](#8-repository-structure)
- [9. Getting Started & Operations Guide](#9-getting-started--operations-guide)
- [10. Automated Test & Invariant Suite](#10-automated-test--invariant-suite)

---

## 1. Executive Summary & Brand Identity

**smol café** is designed as a warm, low-pressure, mobile-first operations engine powering a physical café experience. Rather than a generic e-commerce ordering system, it bridges customer delight at the table with counter billing, kitchen prep workflow, inventory depletion, vendor procurement, and owner financial oversight.

### 🎨 Brand Aesthetic & Design System
- **Core Color Palette:** Warm Café Crème (`#F3E7D3`), Smol Cherry Red (`#B72E35`), Terracotta (`#9E5330`), Espresso Ink (`#241F1C`), Warm Sourdough (`#FAF4EB`).
- **Typography:** EB Garamond (classic serif headings), Inter (clean body text), Noto Sans Mono (receipts & numerical counters).
- **Design Features:** 4-Arch Bento Grid navigation, chalk-aesthetic blackboard widgets, smooth micro-animations, custom vector illustrations for coffee, sourdough sandwiches, kulhad chai, and bowls.

---

## 2. System Architecture & Tech Stack

The project is structured as a modern TypeScript monorepo managed via **npm workspaces**:

```
smol-cafe/
├── apps/
│   └── web/                 # Next.js 15 (App Router) + React 19 + Tailwind CSS + TypeScript
└── packages/
    ├── db/                  # Typed PostgreSQL schema, migrations, RPCs, query adapter & seeders
    └── ui/                  # Shared accessible UI primitives (Buttons, Modals, Badges)
```

### 🛠️ Core Technologies
- **Frontend Framework:** Next.js 15 App Router, React 19, Tailwind CSS.
- **Iconography & UI:** Lucide React icons, Framer-motion inspired CSS transitions.
- **Backend & Database:** Supabase PostgreSQL (ap-south-1 Mumbai) + Next.js Server Actions / API Routes. Zero external Express server required.
- **Development Database:** Custom In-Memory Mock DB Engine replicating all 22 PostgreSQL tables, fluent PostgREST query builders, and 5 stored procedure RPCs for zero-setup local dev.
- **Online Payments:** Razorpay Checkout API & Webhooks with HMAC-SHA256 signature verification and 4-stage idempotency.
- **Observability:** Sentry integration + Redacted Structured JSON Logger.

---

## 3. Multi-Role Capability Matrix (6 Roles)

The application enforces role-based access control across **6 distinct user roles**:

| Role | Access Scope | Core Responsibilities & Capabilities |
| :--- | :--- | :--- |
| **Customer** | Public / Session Scoped | Scan table QR, view live 59-item menu, customize items, submit cart orders, track prep ETA, play conversation prompt deck, call staff, pay online/cash, request jukebox songs, RSVP to events, manage loyalty pass. |
| **Cashier / Counter** | `/cashier` | Live table monitor, manual walk-in order taking, cash settlement with change calculator, receipt printing, issuing partial/full refunds with Razorpay API reversal and loyalty adjustments. |
| **Kitchen** | `/kitchen` | 4-column live KDS (Received → Started → Preparing → Ready), 44px+ touch targets, urgency timer alerts (<5m, 5-10m, >10m), dish recipe lookup, station bottleneck ETA feedback, manual 86 toggle engine. |
| **Chef** | `/admin/procurement`, `/kitchen` | Raw ingredient inventory tracking, recipe mapping, receiving purchase orders (GRNs), auto-stock depletion & reservation, shelf-life monitoring. |
| **Admin** | `/admin/*` | Live menu CRUD, category management, blackboard daily specials scheduler, community events manager, staff DJ jukebox controller, vendor PO/GRN approval, budget allocation, loyalty rewards manager. |
| **Super Admin** | `/admin` | Owner financial dashboard, daily/weekly revenue trends, top items, cash vs. card payment split analytics, staff account CRUD & role assignment, owner MFA (AAL2) security verification. |

---

## 4. Complete Subsystem & Feature Directory

### 4.1 Landing Page & QR Table Session Entry
- **Table QR Entry Point (`/t/[tableToken]`):** Resolves scanned table QR tokens (e.g. `table-04`), issues a cryptographically signed table session cookie (`tsession_<tableId>`), creates or connects to an active `table_session`, and redirects the guest to the menu.
- **Home Landing Screen (`/`):** Displays table greeting, 4-Arch Bento Grid quick-nav (Slow Mornings, Real Food, Chai & Chaas, Munchies), live chalk blackboard card, and quick cards for Jukebox, Live Sessions, Smol Rewards, and Admin Tower.

### 4.2 Digital Menu & Customer Ordering
- **Live 59-Item Catalogue (`/menu`, `/smol-menu`):** Pre-seeded from `menu-seed-master.csv` across 13 categories (Coffee, Specialty Brews, Teas, Kulhad Chai, Sourdough Sandwiches, Bowls, Breakfast, Sweets, Cold Beverages, etc.).
- **Sticky Category Navigation:** Smooth scrolling category bar with quick filter pills.
- **Live Search & Dietary Filter Badges:** Real-time search by item name or ingredient; badges for `Vegetarian`, `Vegan`, `Gluten-Free`, `Chef Special`, `Spicy`, `Jain`.
- **Item Detail Modal:** High-resolution product showcase, rich description, milk/sugar customization selectors, and dynamic pairing suggestions.
- **Cart Drawer & Subtotal Engine:** Real-time subtotal calculation in integer paise, item notes/instructions, stock availability check, and loyalty points redemption at checkout.
- **Atomic Order Submission:** Invokes the `submit_order` PL/pgSQL transaction with anti-double-tap idempotency key verification, server-side price validation, session binding, and immediate stock reservation.

### 4.3 Real-Time Order Tracking & Engagement
- **Order Progress Timeline (`/orders`):** 5-stage status progress bar (`Submitted` → `Accepted` → `Preparing` → `Ready` → `Served`) powered by 4-second polling.
- **Explainable ETA Engine:** Calculates remaining preparation time using station bottleneck formulas, active ticket counts, and a 120-second expo buffer.
- **Conversation Prompt Deck Modal:** 15 interactive prompt cards for table games and deep conversation starters while waiting for food.
- **"Another Round" Upsell Suggestions:** Smart upsell card suggesting drinks or desserts, automatically suppressed if kitchen active tickets exceed 5.
- **Table Call / Staff Assistance:** 1-tap request button ("Call Waiter", "Request Water", "Clean Table").

### 4.4 Billing, Online Payments & Cash Settlement
- **Running Bill & Digital Receipt (`/bill`):** Live table bill showing itemized order breakdown, subtotal, tax, discounts, and immutable price snapshots.
- **Razorpay Online Payments:** Integrated checkout supporting UPI, Credit/Debit Cards, and Netbanking with client key isolation, 4-stage idempotency attempt tracking, and HMAC-SHA256 signature verification.
- **Cashier POS & Counter Settlement (`/cashier`):** Visual table grid showing active sessions and running balances. Cash settlement modal features an automatic tender & change calculator, invoking `record_cash_payment` to close table sessions.
- **Refund Lifecycle Management:** Cashiers can issue full or partial refunds directly from the dashboard, triggering automated Razorpay refund API requests and proportional loyalty point reversals.

### 4.5 Kitchen Display System (KDS) & ETA Engine
- **Ticket Board (`/kitchen`):** 4-column ticket board (`Received`, `Started`, `Preparing`, `Ready`) built with 44px+ tap targets for busy kitchen staff.
- **Urgency Timers:** Dynamic color-coded ticket timers (<5 min green, 5-10 min amber, >10 min red warning).
- **Quantity Aggregator:** Real-time aggregate count of ordered items across all active kitchen tickets (e.g. "Total 6 Chai, 3 Sandwiches").
- **Dish Recipe & Prep Instructions:** Instant popup modal displaying ingredient lists and step-by-step preparation guidelines.
- **ETA Prediction Error Auditing:** Logs kitchen completion times against predicted ETAs to refine bottleneck coefficients.

### 4.6 Chef Inventory, Recipes & 86 Engine
- **Inventory Ledger (`inventory_movements`):** Append-only movement log tracking stock additions, recipe consumption, damage/wastage, and GRN receipts.
- **Recipe & Servable Qty Engine (`servable_qty()`):** Computes maximum cookable portions for every menu item based on raw ingredient stock.
- **Precedence-Aware 86 Engine:** Menu item availability follows strict precedence:
  1. Manual Admin/Kitchen 86 toggle (Immediate override)
  2. Active customer order stock reservation
  3. Recipe raw ingredient stock levels

### 4.7 Smol Café Jukebox Subsystem
- **Public Jukebox Queue (`/music`):** Public vinyl/music playlist queue where guests search the catalogue and submit song requests.
- **Table Voting & Deduplication:** Guests vote for queued songs (1 vote per table per track, enforced via session cookies).
- **Rate Limiting:** Prevents spam by limiting tables to 1 request every 15 minutes.
- **Staff DJ Controller (`/admin/music`):** Staff can play next track, mark played, delete requests, clear queue, or lock request submissions.

### 4.8 Blackboard Daily Specials Subsystem
- **Chalk-Aesthetic Homepage Card:** Displays daily specials, chef notes, or announcement quotes.
- **Time-Scheduled Specials (`/admin/blackboard`):** Admin creator sets `starts_at` and `ends_at` timestamps for automated post publishing and archiving.

### 4.9 Community Events ("What's On")
- **Events Calendar (`/events`):** Showcases live acoustic sessions, book readings, poetry nights, and workshops.
- **1-Tap RSVP Registration:** Guest interest registration with capacity limits and calendar download.
- **Admin Events Manager (`/admin/events`):** Full CRUD interface for creating events, managing attendee lists, and exporting RSVPs.

### 4.10 Procurement & Goods Receipt Engine
- **Vendor Master Directory (`/admin/procurement`):** Manage suppliers, lead times, contact details, and payment terms.
- **Purchase Orders (POs):** Draft and issue POs for ingredients and stock without affecting live inventory balance.
- **Goods Receipt Notes (GRNs):** Upon delivery, staff approve GRNs to execute an atomic `RECEIVE` movement, updating inventory stock balances and purchase costs.

### 4.11 Budget vs. Actual Spend Analytics
- **Budget Allocations (`/admin/budgets`):** Define monthly spending limits per category (Dairy, Produce, Coffee Beans, Packaging).
- **Live Actual Spend Tracking:** Aggregates approved GRN costs in real time against budgets with variance indicators and supplier price trend charts.

### 4.12 Loyalty Rewards & Order Claiming Engine
- **Supabase OTP Auth (`/profile`, `/account`):** Passwordless mobile OTP / email authentication for customer accounts.
- **24h Order Claiming Engine (`claim_session_orders`):** Allows guest diners to claim anonymous table session orders into their registered account within 24 hours.
- **Append-Only Loyalty Ledger (`loyalty_ledger`):** Calculates current points balance from immutable earn/spend ledger entries.
- **Rewards Manager (`/admin/rewards`):** Admin CRUD for setting point costs and discount values for redeemable cafe perks.

### 4.13 Super Admin Analytics & User Management
- **Analytics Dashboard (`/admin`):** Revenue trends, daily/weekly sales volume, top-performing menu items, and payment split (Cash vs. UPI/Card).
- **User Role Management:** Add staff accounts, assign roles (`admin`, `cashier`, `kitchen`, `chef`), and revoke access instantly.

### 4.14 System Observability & Health Monitoring
- **Observability Suite (`/admin/observability`):** Sentry error tracking, database connection stats, and active alert rules.
- **Structured Redacted Logger:** JSON logger with `requestId` tracing and automatic redaction of sensitive credentials, keys, and OTPs.
- **Health Check Endpoint (`/api/health`):** JSON status endpoint returning uptime, database query latency, and system health checks.

### 4.15 Developer Quick Role Switcher ("Smol Backdoor")
- **Role Backdoor (`/smol-backdoor`):** Slide-out developer drawer accessible in development environments to switch between Customer, Cashier, Kitchen, Chef, Admin, and Super Admin views instantly.

---

## 5. Database Schema & Financial Integrity Engine

The application database comprises **22 PostgreSQL tables** built with strict relational constraints:

```
Core Schema:
├── table_sessions (Active table visits, tokens, session state)
├── categories (13 menu categories)
├── menu_items (59 items, status, integer prices in paise, metadata)
├── orders (Session orders, order numbers, order status, total paise)
├── order_items (Line items, immutable price snapshots, item status, notes)
├── payments (Cash/Razorpay transactions, tender, change, net paid)
├── webhook_events (Razorpay event deduplication via provider_event_id UNIQUE)
├── inventory_items (Raw stock items, reorder thresholds, shelf life)
├── inventory_movements (Append-only stock ledger: RECEIVE, CONSUME, WASTE)
├── recipes (Ingredient mappings & quantity per menu item)
├── profiles (Customer accounts, phone, email)
├── loyalty_ledger (Append-only points ledger: EARN, REDEEM, REVERSAL)
├── rewards & reward_redemptions (Rewards catalog & customer redemptions)
├── blackboard_posts (Daily specials with starts_at / ends_at)
├── cafe_events & event_rsvps (Community events & guest RSVPs)
├── music_sessions, song_requests, song_votes (Jukebox subsystem)
├── vendors, purchase_orders, goods_receipts (Procurement engine)
└── budgets (Monthly spending allocations & spend targets)
```

### 🔒 Financial & Data Integrity Principles
1. **Integer Paise Pricing:** All monetary amounts are calculated and stored in integer paise (e.g. ₹150.00 = `15000`), eliminating floating-point rounding errors.
2. **Server-Side Price Validation:** Cart totals submitted from the UI are recalculated server-side from active database menu prices during `submit_order`.
3. **Anti-Double-Tap Idempotency Keys:** Order submissions require a client-generated UUID idempotency key to prevent duplicate billing from network retries.
4. **Immutable Price Snapshots:** Once an order is created, `order_items` stores an immutable snapshot of the price at checkout. Subsequent menu price updates will never alter historical receipts.
5. **Webhook Deduplication:** The `webhook_events` table enforces a `UNIQUE(provider_event_id)` index to ensure out-of-order or duplicate payment webhooks are safely ignored.

---

## 6. Security Model, RBAC & MFA

- **Row-Level Security (RLS):** Applied across all 22 database tables with deny-by-default policies. Customer access is strictly restricted to their active `table_session_id`.
- **Server Action Authorization (`requireStaffAuth`):** All staff server actions perform server-side role validation before execution.
- **Super Admin MFA Verification (`is_admin_mfa_verified`):** Sensitive operations (user deletion, role changes, financial overrides) require Supabase AAL2 MFA verification.

---

## 7. Dual Database Engine (Supabase & Mock Parity)

The application features a **dual-adapter architecture**:
1. **Production Engine:** Connects seamlessly to Supabase PostgreSQL using SSR and browser clients when `.env.local` credentials are configured.
2. **Zero-Setup In-Memory Mock Adapter:** When running locally without Supabase credentials, the app automatically initializes an in-memory mock database pre-seeded with all 59 menu items, 13 categories, 12 dining tables, sample events, and jukebox queues. It fully emulates PostgREST fluent queries and all 5 PostgreSQL RPC functions (`submit_order`, `record_cash_payment`, `claim_session_orders`, `record_loyalty_movement`, `handle_order_inventory_transition`).

---

## 8. Repository Structure

```
smol-cafe/
├── apps/
│   └── web/
│       ├── app/                     # Next.js 15 App Router pages & API routes
│       │   ├── (customer routes)    # /, /menu, /orders, /bill, /music, /events, /profile
│       │   ├── (staff routes)       # /cashier, /kitchen, /admin/*
│       │   ├── smol-backdoor/       # Dev quick role switcher
│       │   └── api/                 # /api/health, /api/webhooks/razorpay
│       ├── components/              # Feature component directories
│       └── lib/                     # Client utilities, RPC helpers & session handlers
├── packages/
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema/              # Typed database definitions
│   │   │   ├── queries/             # Data access functions & fluent mock adapter
│   │   │   └── types.ts             # Invariant & domain TypeScript interfaces
│   │   ├── supabase/migrations/     # 17 SQL migrations & RLS policy definitions
│   │   └── scripts/                 # CSV menu seeder and dry-run scripts
│   └── ui/                          # Shared UI component primitives
├── menu-seed-master.csv             # Real 59-item catalogue seed source
├── prd.md                           # Product Requirements Document
├── rules.md                         # Architecture & security rules
├── design.md                        # Brand kit & visual guidelines
└── package.json                     # Root monorepo workspace configuration
```

---

## 9. Getting Started & Operations Guide

### ⚡ Prerequisites
- Node.js v18+ or v20+
- npm v9+

### 1. Installation
Clone the repository and install workspace dependencies:
```bash
npm install
```

### 2. Run Development Server
Launch the Next.js web application (runs on `http://localhost:3000` with the pre-seeded In-Memory Mock DB by default):
```bash
npm run dev
```

### 3. Environment Setup (Optional for Supabase)
To connect to a live Supabase project, create `apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

### 4. Database Commands
```bash
# Generate database types
npm run db:types

# Preview menu seed import (dry run)
npm run db:seed:dry

# Apply menu seed to live Supabase DB
npm run db:seed:apply
```

### 5. Build & Typecheck
```bash
# Typecheck all monorepo packages
npm run typecheck

# Lint all packages
npm run lint

# Build production bundle
npm run build
```

---

## 10. Automated Test & Invariant Suite

The repository includes release-blocking test suites to verify financial accuracy, idempotency, and security constraints:

```bash
# Run basic database unit tests
npm run test

# Run Release-Blocking Financial & System Invariant Tests
npm run test:invariants

# Run Refund Lifecycle & Loyalty Reversal Tests
npm run test:refunds

# Run 8-Scenario Role-Based Access Control (RBAC) Negative Authorization Matrix
npm run test:rbac
```

### Verified System Invariants:
- ✅ Anti-double-tap order submission idempotency.
- ✅ Server-side price recalculation & 409 conflict diffing.
- ✅ Race condition protection during concurrent stock reservation.
- ✅ Monotonic status state transitions (`Submitted` → `Accepted` → `Preparing` → `Ready` → `Served`).
- ✅ Webhook deduplication via unique event tracking.
- ✅ Strict RBAC negative authorization across 8 security boundaries.
- ✅ Proportional loyalty point reversal on partial and full refunds.

---

*smol café POS — Built with care for small places with long stays.*
