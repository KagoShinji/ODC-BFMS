# Barangay Financial Management System by ODC

A Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui application for the process in the supplied barangay finance diagram. The interface uses the ODC reference palette: navy `#172a3b`, orange `#f56618`, light neutrals, and red `#bd3d22`. The dashboard fills the viewport with a modern light-panel layout, rounded cards, search and quick actions.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The app takes you to the login page. `DATA_PROVIDER=demo` is the default; sign in with `demo@odc.local` and `demo1234`. Set `DEMO_LOGIN_EMAIL`, `DEMO_LOGIN_PASSWORD`, and `DEMO_AUTH_SECRET` in `.env.local` for a shared demo. Demo records are synthetic and stored in browser local storage; use **Settings → Restore demo data** to reset them.

```bash
npm run typecheck
npm test
npm run build
```

The dev server writes to `.next-dev` and production builds write to `.next`. This keeps their generated server chunks separate if a build runs while the dev server is open.

## What works in the demo

- Dashboard with budget, cash, bank, collection, payment, and exception summaries.
- Login and sign-out with protected demo workspace routes; Supabase Auth remains the live sign-in path.
- Budget lines with appropriation, committed amount, and available balance.
- Procurement case stages: PR → RFQ → PO → AIR → ready for DV.
- Source cases for payroll, recurring fees, travel, and SK fund transfers.
- Linked disbursement vouchers: draft → submit → approve/reject → record payment.
- Travel cash advances with expense liquidation, refunds, and outstanding balances.
- Collection receipts, voids for unmatched receipts, partial deposit or remittance matching.
- Derived working previews and CSV/print for RAO, SAOB, checks, cashbook, REAI, matching, RCD, RCR, and liquidation; an activity trail.

The demo intentionally allows one browser user to walk through roles. Its approvals and audit trail are illustrative. PBC, RAAF, and transmittal require approved templates and additional source records. The working report previews are not certified government forms.

## Supabase connection

The repository includes browser/server SSR clients, a login page, a connection check, a repository for the first live transaction slice, and [SQL migrations](supabase/migrations/202610280001_initial_finance.sql) with row level security and transactional posting functions.

To connect later, create an isolated Supabase project, set `DATA_PROVIDER=supabase` plus the two public environment values from `.env.example`, apply the reviewed SQL migration, configure the Auth callback URL (`/auth/confirm`), and provision a barangay, budget lines, users, and memberships. Authorized users open the workspace as a read-only sample-data preview. The preview does not load financial records from Supabase or save changes there; live posting stays disabled until database functions, policies, approved forms, and role workflows pass staging acceptance. No secret key is needed in the browser.

The migration covers the initial budget, case, voucher, collection, deposit, and remittance slice. Further migrations are required for production procurement evidence, payroll details, advance/liquidation posting, accountable forms, report snapshots, and finalized transmittals. Do not point this prototype at real financial records.

Global super admin access is defined in [the follow-up migration](supabase/migrations/202610290001_system_admins.sql). It grants read access across barangays but no financial posting or approval authority. Apply it before assigning a user to `system_admins`. Creating an Auth user or assigning this role requires a trusted Supabase admin connection; never put a secret key or password in the repository or `NEXT_PUBLIC_` variables.

## Structure

```text
src/app/                  Routes and layouts
src/components/layout/    Navigation and workspace shell
src/components/ui/        shadcn/ui source components and ODC variants
src/components/financial/ Shared finance UI
src/features/             Module screens and report builders
src/domain/               Types, money and balance rules
src/data/demo/            Seed data and local demo store
src/data/supabase/        First live repository adapter
src/lib/supabase/         Browser/server session clients
supabase/migrations/      Reviewed SQL source for later connection
tests/                    Financial calculation tests
docs/                     Implementation plan and process flows
```

See the [implementation plan](docs/implementation-plan.md) and [process flows](docs/process-flow.md) for the full target scope and interpretation of the supplied image.

The [implementation status](docs/implementation-status.md) distinguishes the working demo from the remaining live finance work.
