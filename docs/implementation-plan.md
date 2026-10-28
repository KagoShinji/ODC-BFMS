# Barangay Financial Management System by ODC — Implementation Plan

## 1. Outcome and scope

Build a clear, auditable workspace for managing barangay budgets, procurement, payroll, recurring expenses, travel, SK fund transfers, disbursement vouchers, cash advances, collections, deposits/remittances, and the reports shown in the supplied image.

Use **React through Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui**. Prepare Supabase Auth, PostgreSQL, Storage, migrations, and access policies so the application can start in an explicit demo mode and connect to a Supabase project later.

This plan defines the full target scope. The [implementation status](implementation-status.md) records what the current application delivers and what still requires finance approval or live backend work. The companion [process-flow document](process-flow.md) records the image interpretation and detailed Mermaid diagrams.

### Planning assumptions

- Start with one barangay and one deployment; include `barangay_id` in the data model and access checks to support future expansion.
- Use PHP currency, `en-PH` display formatting, and the `Asia/Manila` business timezone. Store event timestamps in UTC and business dates as date values.
- Staff use desktop/tablet screens for encoding and reporting; mobile supports review, approvals, and status checks.
- Record external payment, deposit, and remittance evidence. Live bank transfers and payment gateway integration are outside the initial scope.
- Print-ready documents support existing physical signature procedures. Approval history does not claim to replace legally required signatures.
- Finance personnel provide approved account codes, budget categories, forms, signatories, procurement rules, and opening balances during discovery.
- General fund and SK-related transfers remain separately identifiable. An outgoing SK transfer does not automatically become revenue in another entity's books.

## 2. Modules and screens

| Module                      | Main screens and functions                                                                                                        | Completion condition                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Dashboard / My work         | Role-specific tasks, pending approvals, budget utilization, cash/bank balances, undeposited receipts, overdue advances            | Every amount and alert links to its filtered source records and displays its date/fund scope              |
| Budget                      | Annual/supplemental/continuing budgets, income estimates, budget lines, approval evidence, adjustments and obligation register    | Overspending checks use approved versions and concurrent updates cannot exceed availability               |
| Procurement                 | PR list/form, RFQs, supplier quotations, selection evidence, POs, deliveries, AIRs                                                | Users follow linked documents and accepted quantities control eligible billing                            |
| Payroll                     | Personnel, payroll periods, compensation lines, effective-dated deductions, review and voucher creation                           | Authorized totals reconcile to the resulting vouchers; repeated generation is prevented                   |
| Recurring expenses          | Service accounts, billing periods, due dates, invoice evidence and draft voucher generation                                       | A recurring schedule creates a draft; each bill still requires review and approval                        |
| Travel                      | Travel orders, itinerary, estimated costs, advance/reimbursement request and supporting evidence                                  | Approved travel links to its voucher and any required liquidation                                         |
| SK fund transfers           | Recipient, authority/reference, amount, fund source, payment and acknowledgement                                                  | Transfer is traceable without mixing separate fund balances                                               |
| Disbursements               | DV list, guided form, source links, budget coding, deductions, approval timeline, payment recording and printing                  | Payment requires the configured approvals and posts exactly once                                          |
| Cash advances / Liquidation | Advance register, due dates, expense evidence, refunds, review and remaining balances                                             | Accepted liquidation and refunds reconcile to the advance; excess reimbursement follows separate approval |
| Collections                 | Revenue categories, receipt series, payer, collection entry, receipt printing and void workflow                                   | Receipt numbers remain unique and voided numbers remain traceable                                         |
| Deposits / Remittances      | Undeposited queue, batch entry, evidence, allocations and reconciliation                                                          | Deposited/remitted amounts cannot be allocated twice; unmatched balances remain visible                   |
| Reports / Transmittals      | All reports named in the image, filters, preview, print/PDF, CSV and manifest                                                     | Totals reconcile to posted records and finalized versions can be reproduced                               |
| Administration / Audit      | Barangay profile, fiscal years, funds, accounts, banks, users, permissions, workflow settings, accountable forms and event search | Changes are authorized and auditable; technical administrators do not implicitly gain payment authority   |

Payroll begins with configurable compensation and deductions. Full HR, attendance, biometric integration, and automatic interpretation of tax rules are separate scope. Procurement initially follows the supplied document chain, with methods and requirements configurable after validation.

## 3. Roles and approval model

Implement permissions as capabilities scoped to a barangay and, where needed, fund. The names below describe proposed application responsibilities; confirm actual assignments and signatory authority during discovery.

| Role                                  | Main capabilities                                                              | Boundary                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| System administrator                  | Maintain access, configuration and reference data                              | No financial approval or payment power unless separately assigned          |
| Encoder / requesting staff            | Draft requests and attach evidence; revise returned records                    | Cannot approve own submissions or post payments                            |
| Procurement staff                     | Maintain RFQ, quotation, PO and delivery records                               | Cannot bypass budget/approval gates                                        |
| Budget reviewer                       | Review coding, appropriation, obligations and balances                         | Cannot change approved amounts without a revision                          |
| Accounting reviewer                   | Check supporting documents, classification, deductions and liquidation         | Access scoped to assigned barangay/fund; approval is distinct from payment |
| Punong Barangay / designated approver | Act on assigned approval steps                                                 | Cannot approve a changed version using an old approval                     |
| Treasurer                             | Record authorized payments, manage advances, deposits and treasury reports     | Cannot bypass required certifications or erase posted entries              |
| Collector                             | Issue authorized receipts, prepare collection summaries and remittance batches | Cannot silently void receipts or mark unsupported deposits confirmed       |
| Auditor / read-only reviewer          | Inspect records, evidence, reports and history                                 | No transactional writes                                                    |

Approval steps are versioned and configurable by document type and fund. Snapshot the applicable workflow on submission. Support approve, return with reason, and reject. Permissions, separation of duties, version matching, and state transitions are enforced on the server and database, beyond button visibility. Do not allow a user to approve their own submission by switching roles.

## 4. UI/UX specification

### Application structure

Use a full-viewport workspace with a persistent left sidebar grouped into **Overview, Budget, Spending, Revenue, Reports, and Administration**. The sidebar and main content scroll independently, while the top bar remains available. The top bar shows barangay, fiscal year, active fund filter, global search, notifications, and profile. Keep the active scope visible on lists, forms, and report previews; require explicit selections for financial writes.

Use a modern, restrained civic visual style inspired by the dashboard reference: a light gray workspace, pale navigation, generous rounded white cards, charcoal text, and ODC navy and orange accents. Use readable typography, consistent spacing, restrained borders, and clear status colors. Currency columns are right-aligned with tabular numerals. Dashboard labels distinguish **appropriation available**, **cash on hand**, **cash in bank**, and **unliquidated advances**.

### Priority screen layouts

| Screen           | Proposed layout                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard        | Top row: scoped balance/utilization cards. Main column: My tasks and exceptions. Secondary column: trends, recent activity, upcoming deadlines |
| Transaction list | Page title and one primary action; search/filter row; saved views; sortable paginated table; contextual row actions                            |
| Voucher detail   | Header with number, payee, amount and status; source-document links; tabs for details, budget, attachments and history; approval panel         |
| New voucher      | Stepper: source/payee → budget/items → deductions/evidence → review/submit; persistent total and validation summary                            |
| Budget detail    | Version and approval summary; account-level appropriations, reservations, obligations and available balances; drill-down movements             |
| Deposit matching | Receipt queue alongside deposit details; selected allocation total, unmatched balance, evidence and explicit confirmation                      |
| Report center    | Report selector and scope filters; preview with totals; printable output and export; source-record drill-down                                  |

### Interaction requirements

- Use shadcn/ui primitives for sidebar, buttons, cards, tables, dialogs, sheets, tabs, comboboxes, alerts, forms and skeletons. Use TanStack Table for substantial tabular workflows.
- Search transactions by document/receipt number, payee/payer, purpose, date, fund and status. Persist non-sensitive filters in the URL; use server pagination in live mode.
- Prefill a DV from its approved source; prefill receipt/deposit references from selected records. Avoid entering the same information twice.
- Save drafts explicitly and show “Saving / Saved / Failed” if autosave is added. Display the last successful save time. Prevent accidental navigation away from unsaved changes.
- Show field errors near inputs and a summary linked to errors. Explain failures in plain language, such as “This budget line has ₱8,000 available; the request is ₱10,000.”
- Require review of payee, fund, date, gross amount, deductions and net amount before submission. Approval and posting actions show the exact record/version being acted on.
- Retain data after recoverable failures. Provide loading, empty, error, permission-denied, and no-search-results states for each major screen.
- Use full labels with acronyms in supporting text for known terms. Keep uncertain form labels configurable until confirmed.
- Target WCAG 2.2 AA: keyboard access, visible focus, labelled fields, adequate contrast, non-color status labels and announced validation errors. Verify actual component combinations rather than assuming library accessibility is sufficient.
- Support 360px mobile review and 1280px+ encoding layouts. Use column selection or intentional horizontal scrolling for dense tables. Do not hide transaction identity or totals on mobile.
- Format print views for the approved A4 forms, with repeatable table headers, page numbers, signature blocks and predictable page breaks.
- Demo screens always display “Demo data.” Missing live credentials produce a setup state, never a silent switch to simulated financial success.

## 5. Technical architecture

Use Next.js App Router for routes/layouts and server-rendered initial data. Use React client components for forms, tables, matching and interactive charts. Tailwind provides design tokens and responsive styles; shadcn/ui supplies application-owned components. This fits the [Next.js installation defaults](https://nextjs.org/docs/app/getting-started/installation), [Tailwind Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs), and [shadcn Next.js setup](https://ui.shadcn.com/docs/installation/next).

Use React Hook Form with Zod for form validation, while revalidating inputs on the server. Use Lucide icons and a lightweight chart library only where the chart answers an operational question. Pin compatible stable dependency versions and commit the package lock at implementation time.

```text
React screens / shadcn components
            ↓
Server Actions or Route Handlers
            ↓
Session + permission checks + input validation
            ↓
Domain services and repository contracts
            ↓
Explicit demo adapter OR Supabase adapter
            ↓
PostgreSQL transactions / Auth / private Storage
```

Centralize domain rules in services; keep components independent of fixture data and database query details. Use Server Actions for application mutations and Route Handlers where an HTTP interface is needed, such as exports and upload coordination. Every endpoint authenticates and authorizes independently. Never treat a route redirect as the only permission check; see the [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication).

Proposed structure:

```text
src/
  app/
    (auth)/login/
    (workspace)/
      dashboard/ budget/ procurement/ payroll/ recurring/
      travel/ transfers/ disbursements/ advances/
      collections/ deposits/ reports/ settings/ audit/
    auth/confirm/
    api/exports/
  components/ui/
  components/layout/
  components/financial/
  features/<module>/
    components/ schemas.ts types.ts
  domain/
    services/ permissions/ workflows/ money/
  data/
    contracts/ demo/ supabase/
  lib/
    env.ts
    supabase/client.ts
    supabase/server.ts
    supabase/middleware.ts
  types/database.types.ts
  middleware.ts
supabase/
  config.toml
  migrations/
  seed.sql
  tests/
tests/
  domain/ integration/ e2e/
.env.example
```

The current Next.js 15 implementation uses Middleware for Supabase session refresh. Reassess the filename when upgrading Next.js.

## 6. Supabase-ready implementation contract

### What “ready to connect later” means

The first implementation milestone must include actual Supabase client helpers, repository adapters, versioned SQL migrations, RLS policies, private storage policies, and documented connection steps. Placeholder credentials alone do not satisfy readiness. A later connection still requires migrations, authentication setup, policies, seed/reference data, and verification.

Proposed environment template:

```dotenv
# Explicitly selected development/demo provider.
DATA_PROVIDER=demo

# Required only when DATA_PROVIDER=supabase.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Server-side origin for permitted auth redirects.
APP_ORIGIN=http://localhost:3000
```

Do not invent a real project URL or ship keys in source control. The ordinary application path uses the signed-in user's session and RLS. Introduce a privileged server secret only if a separate administrative task needs it; it must never use a `NEXT_PUBLIC_` name or reach client code.

### Required implementation work

1. Install `@supabase/supabase-js` and `@supabase/ssr`. Create distinct browser and request-scoped server clients, cookie/session refresh support, sign-in/out, invite/reset flows, and an auth confirmation endpoint using the [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).
2. Validate sessions on the server with the documented verified claims/user approach. Do not authorize sensitive operations using unverified session payloads. Keep authenticated financial pages and responses out of shared public caching.
3. Define repository interfaces such as `listVouchers`, `submitVoucher`, `approveVoucher`, `recordPayment`, `issueReceipt`, and `confirmDeposit`. Both adapters use the same typed request/result shapes and business rules. Components never import demo fixtures directly.
4. Demo mode uses synthetic data with deterministic reset and labelled simulated writes. It is restricted to local development or a dedicated demo deployment. Never accept a demo identity as authorization in live mode, and never automatically send demo drafts into the live database.
5. Apply the schema through SQL migrations. Generate TypeScript database types from the migrated schema when a local or hosted Supabase instance is available. Treat any interim types as provisional rather than claiming they are generated.
6. Enable RLS on exposed tables; deny anonymous finance access. Policies check active membership, barangay, capabilities and fund scope. Enforce tenant-consistent relationships in the schema. Test both `USING` and `WITH CHECK` behavior. Follow the [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).
7. Put attachments in private buckets. Link storage objects to authorized records, validate size/type, prevent cross-barangay reads and use short-lived signed URLs after access checks. Keep original evidence and version replacement metadata.
8. Use transactional database functions for posting and other multi-record financial transitions. They must validate the caller, permission, state and version; lock affected balances; apply entries; append audit events; and commit together. Revoke direct table writes that could bypass these operations. Any privileged function needs restricted execution grants and a safe fixed search path.
9. Provide errors for permission denial, invalid transition, stale version, insufficient appropriation and duplicate submission. Use idempotency keys and database uniqueness constraints; a disabled button alone does not prevent duplicate posting.
10. Test migrations, RLS, storage access and transaction behavior against a local Supabase instance or an isolated staging project before claiming the live adapter works. If tooling is unavailable, record that verification as pending.

### Future connection checklist

Create/select the Supabase project → configure allowed auth URLs and invite-based users → set deployment environment values → apply reviewed migrations → configure private storage → load approved reference data/opening balances → generate database types → run access and posting tests → set `DATA_PROVIDER=supabase` in staging → complete finance UAT → configure production backup/restore and deployment settings.

The [Supabase Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) is a connection reference; production readiness includes the additional controls above.

## 7. Proposed database model

| Domain                  | Tables / entities                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Organization and access | `barangays`, `profiles`, `memberships`, `roles`, `permissions`, `role_permissions`, `membership_roles`, `membership_funds`                                                                                                                       |
| Configuration           | `fiscal_years`, `reporting_periods`, `funds`, `accounts`, `bank_accounts`, `revenue_categories`, `signatories`, `workflow_versions`, `workflow_steps`                                                                                            |
| Budget                  | `budgets`, `budget_versions`, `budget_lines`, `income_estimates`, `budget_adjustments`, `reservations`, `obligations`, `obligation_lines`, `obligation_movements`                                                                                |
| Procurement             | `suppliers`, `purchase_requests`, `purchase_request_items`, `rfqs`, `quotations`, `quotation_items`, `award_decisions`, `purchase_orders`, `purchase_order_items`, `deliveries`, `inspection_reports`, `inspection_items`                        |
| Expense sources         | `personnel`, `payroll_runs`, `payroll_items`, `payroll_deductions`, `recurring_expenses`, `bills`, `travel_orders`, `travel_itineraries`, `fund_transfers`                                                                                       |
| Disbursements           | `vouchers`, `voucher_lines`, `voucher_deductions`, typed source-link tables, `payments`, `payment_allocations`, `check_register`                                                                                                                 |
| Cash advances           | `cash_advances`, `liquidations`, `liquidation_lines`, `advance_settlements`, `advance_refunds`                                                                                                                                                   |
| Revenue                 | `collections`, `collection_lines`, `deposits`, `deposit_allocations`, `remittances`, `remittance_allocations`                                                                                                                                    |
| Form accountability     | `accountable_form_series`, `accountable_form_assignments`, `accountable_form_movements`                                                                                                                                                          |
| Controls and reporting  | `approval_instances`, `approval_actions`, `attachments`, typed attachment-link tables, `document_sequences`, `posting_batches`, `ledger_entries`, `audit_events`, `report_snapshots`, `transmittals`, `transmittal_items`, `idempotency_records` |

Use UUID primary keys and explicit foreign keys. Financial records carry barangay, fund, business date, fiscal-year linkage, creator and version. Budget versions may cover multiple funds through scoped lines. Composite relationships prevent linking records belonging to different barangays/funds. Prefer typed source-link tables with real foreign keys over an unchecked polymorphic ID.

Use PostgreSQL `numeric` with defined scales for quantities, prices and money; serialize decimal money as strings and calculate through a decimal library or database arithmetic. Round monetary postings to centavos according to an approved rule. Do not use JavaScript floating-point arithmetic for financial totals. Preserve gross amount, deductions, net payment and recipient liabilities separately.

`posting_batches` and `ledger_entries` form the auditable source for cash movement and reconciliation. Use balanced debit/credit entries with accountant-approved account mappings if the agreed accounting scope requires a general ledger; validate posting templates before release. The system must support the scoped cashbook and registers without claiming that a complete statutory accounting package has been delivered.

Important constraints:

- Unique document sequences within the configured barangay/year/type scope; never allocate numbers using `MAX(number) + 1`.
- Receipt serials are unique within the accountable-form series. Track unused, issued, voided and returned serials without reuse.
- Sum of payment allocations cannot exceed an approved payable; sum of deposit/remittance allocations cannot exceed either the receipt's eligible balance or the batch amount. Enforce concurrent limits inside transactional functions.
- Accepted and billed procurement quantities cannot exceed eligible deliveries or approved order quantities unless an authorized amendment exists.
- A source amount or source item cannot be vouched twice; split/partial billing uses explicit allocations.
- Obligations convert reservations rather than subtracting both for the same amount. Cash availability checks are distinct from appropriation checks.
- Posted data is immutable to normal users. Corrections use linked reversals/adjustments with reasons and approvals. Closed periods reject posting until an authorized reopening.
- Financial audit events are appended by trusted server/database operations. Users cannot rewrite their own history. Platform administrators are outside the application's tamper-resistance boundary.

Index list filters and joins by barangay, fund, business date, status, document number and source IDs. Apply server pagination and avoid exposing payroll details through dashboard aggregates or exports.

## 8. Reporting and reconciliation

Deliver every named output in the image: RAO, SAOB, PBC, Summary of Check Issued, RAAF, Cashbook, Transmittal, REAI, Matching of Collection and Deposit, RCD, RCR, and Liquidation Report. Confirm prescribed titles and templates before finalizing reports; PBC remains explicitly unresolved.

Build report calculations from approved/posted source records using shared database queries or views. Show barangay, fund, period, cutoff, preparer and status. Allow drill-down to source entries. Distinguish working previews from finalized report snapshots. Store finalization time, template version, source cutoff and totals so later adjustments do not silently rewrite a submitted report.

Maintain accountable-form inventory from the first receipt/check issuance, even if the RAAF export is completed later. Include cash on hand, cash in bank, outstanding advances, unmatched deposits and unremitted collections as separate reconciliation views. Reconcile opening balances and imported outstanding items before any live posting.

## 9. Delivery sequence and estimate

Indicative estimate: **12–16 calendar weeks** for one experienced full-time developer with part-time design/QA support and timely finance feedback. This is a planning estimate, not a fixed delivery commitment. Confirm form complexity, legacy-data quality and approval rules after discovery.

| Phase                         | Estimate  | Deliverables and exit criteria                                                                                                                                                                                                                           |
| ----------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Discovery and validation   | 1 week    | Confirm image interpretation, roles, fund structure, opening balances, procurement methods, sample forms and expected report totals; resolve PBC                                                                                                         |
| 1. Foundation and UX          | 2 weeks   | Next.js/React/TypeScript, Tailwind/shadcn design system, responsive shell, core screen prototypes, domain contracts, demo adapter, real Supabase helpers/adapters, initial migrations/RLS/storage setup; verify one vertical slice locally or in staging |
| 2. Budget and approval engine | 1–2 weeks | Budget versions, fund/account setup, reservations/obligations, capability enforcement, versioned approval steps, audit foundation and period controls; verify concurrency controls                                                                       |
| 3. Spending core              | 2 weeks   | Source-linked vouchers, payment recording, advance/liquidation workflow and cashbook postings; prove no duplicate payment or duplicate advance expense                                                                                                   |
| 4. Expense source modules     | 2–3 weeks | Procurement through AIR, basic payroll, recurring bills, travel and SK transfers; verify partial delivery/billing and source-to-voucher reconciliation                                                                                                   |
| 5. Revenue and reconciliation | 1–2 weeks | Receipt issuance/accountable forms, collections, deposits/remittances, allocation matching and corrections; prove depositing money does not duplicate revenue                                                                                            |
| 6. Reports and transmittals   | 2 weeks   | Approved templates, reproducible reports, print/PDF/CSV and transmittals; reconcile all totals to test fixtures and source transactions                                                                                                                  |
| 7. UAT and release readiness  | 1–2 weeks | Finance acceptance, access/security checks, responsive/accessibility review, opening-data import validation, restore rehearsal, operating guide and staff training                                                                                       |

Every finance phase includes the required migrations, posting functions, audit events and tests. Do not defer authorization and accounting integrity to the final phase.

The first reviewable prototype should show dashboard, budget list/detail, PR-to-voucher navigation, voucher review, collection entry and deposit matching with realistic synthetic data. This validates the daily workflow before all report layouts are built.

## 10. Verification and release gates

Use focused domain tests for calculations and transitions, database integration tests for actual enforcement, and Playwright for critical user journeys. Do not rely solely on matching mock behavior.

Required scenarios:

1. An authorized user completes PR → RFQ → PO → partial/full AIR → DV → approval → payment, with traceable documents and correct remaining quantities/balances.
2. Two simultaneous requests cannot overspend the same appropriation; converting a reservation into an obligation does not double count it.
3. Retrying receipt issuance or payment posting creates one result. Concurrent receipt numbering remains unique.
4. An encoder cannot approve their own submission; a user from another barangay or unauthorized fund cannot read/write the record, attachment, RPC or export, including through direct API access.
5. A changed approved amount requires revision/reapproval; a stale approval fails. Unauthorized direct writes cannot mark a voucher paid.
6. An advance supports partial liquidation and refund, accurately reports overdue/outstanding amounts, and closes only when settled. Liquidation creates no duplicate cash outflow.
7. Several receipts match one deposit; a partial deposit leaves a visible balance. Deposits and direct bank receipt matching do not recognize income twice.
8. Receipt voids, payment reversals, rejected deliveries, cancelled checks and period locks preserve evidence and reconcile to reporting totals.
9. Cashbook, budget registers, collection reports, accountable-form inventory and approved report snapshots reconcile to independently calculated fixture totals.
10. Demo mode runs without credentials. Live mode fails clearly when configuration is missing and never accepts a demo session. An isolated Supabase connection passes migration, RLS, storage and posting tests.
11. Critical journeys work by keyboard; validation is understandable; dense tables and forms remain usable at agreed desktop/mobile sizes; approved printed forms paginate correctly.
12. Opening balances and outstanding advances/obligations import with control totals and approval evidence. A staging backup can be restored and reconciled.

Before live use, complete finance acceptance of form mappings, posting templates, signatories and workflow rules. Configure backups according to the selected Supabase plan, restore procedures, retention, monitoring, error reporting with sensitive-data redaction, and an accountable support owner. Review deployment separately after the concrete application and release evidence exist.

## 11. Decisions to validate during discovery

These do not prevent UI planning, but they determine final forms and financial behavior:

- Barangay profile, users, role combinations and required approval/certification sequence.
- Exact meaning of PBC and approved templates for all report acronyms in the image.
- Fiscal year, chart of accounts, revenue categories, funds, bank accounts and authorized opening balances.
- Obligation point, budget adjustments, continuing-balance treatment and liquidation requirements by expense type.
- Applicable procurement methods, partial delivery rules, deductions/withholding configuration and required evidence.
- Receipt/check series, accountable-form custodians, deposit/remittance practices and report submission periods.
- Existing spreadsheet/paper data, migration volume, attachment retention and desired hosting environment.

The recommended starting deliverable is the foundation plus a complete **budget → voucher → approval → payment → cashbook** slice, followed by **receipt → deposit → matching**. Establish these financial rules before expanding all peripheral screens.
