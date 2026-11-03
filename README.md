# Barangay Financial Management System by ODC

A Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui application for the process in the supplied barangay finance diagram. The interface uses the ODC reference palette: navy `#172a3b`, orange `#f56618`, light neutrals, and red `#bd3d22`. The dashboard fills the viewport with a modern light-panel layout, rounded cards, search and quick actions.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The app takes you to the login page. `DATA_PROVIDER=demo` is the default; sign in with `demo@odc.local` and `demo1234` and choose **Super admin**, **Administrator**, or **Staff** to walk through each access level. Set `DEMO_LOGIN_EMAIL`, `DEMO_LOGIN_PASSWORD`, and `DEMO_AUTH_SECRET` in `.env.local` for a shared demo. Demo records are synthetic and stored in browser local storage; use **Settings → Restore demo data** to reset them.

```bash
npm run typecheck
npm test
npm run build
```

The dev server writes to `.next-dev` and production builds write to `.next`. This keeps their generated server chunks separate if a build runs while the dev server is open.

## What works in the demo

- Dashboard with budget, cash, bank, collection, payment, and exception summaries.
- Login and sign-out with protected demo workspace routes; Supabase Auth remains the live sign-in path.
- Theme-aware page skeletons and navigation spinners, plus submit and record-action progress indicators with duplicate-click protection. Loading states follow real pending work without adding artificial delays.
- Budget lines with appropriation, committed amount, and available balance.
- Procurement case stages: PR → RFQ → PO → AIR → ready for DV.
- Source cases for payroll, recurring fees, travel, and SK fund transfers.
- Linked disbursement vouchers: draft → submit → approve/reject → record payment.
- Travel cash advances with expense liquidation, refunds, and outstanding balances.
- Collection receipts, voids for unmatched receipts, partial deposit or remittance matching.
- Three access levels: super admins, barangay administrators, and staff, each with its own navigation.
- **Appearance** in the desktop and mobile sidebar switches all workspace pages, charts, menus, and dialogs between light and dark mode. The preference is remembered in this browser; sign-in stays light.
- **Notifications**: the bell shows pending vouchers, unmatched receipts, unsettled cash advances, and recent activity, with links to the relevant records, unread counts, and mark-all-read. Read status is saved separately for each account and barangay in this browser. New items display an in-app alert; live workspaces check for updates every minute while visible and when returning to the tab.
- **Staff & access** (administrators and super admins): add staff accounts, assign roles, deactivate or restore access, and customize each person's pages with checkboxes. Role defaults filter the sidebar and protect direct page URLs; only super admins add or change administrators.
- **Action dialogs**: confirmation, success and error modals share the system's branding and light/dark theme. Staff/access changes, financial saves and workflow transitions, branding, and password changes request confirmation. Results appear after the action completes; cancellation keeps records unchanged and errors retain form input. Dialogs support keyboard focus, Escape/cancel, and mobile screens.
- **White label** (super admins only): system name, organization, logo mark or logo image, and accent color, applied to the workspace, sign-in page, browser title and favicon. In live mode a super admin can also onboard each barangay with its own branding, uploaded logo, and sign-in link (`/b/<slug>`); that barangay's staff see its branding before and after signing in.
- Derived working previews and CSV/Print / Save PDF for RAO, SAOB, checks, cashbook, REAI, matching, RCD, RCR, and liquidation; an activity trail.
- Barangay-branded PDF copies of budget, expense, voucher, collection, deposit/remittance, cash advance and audit registers, plus individual expense cases, vouchers, collection records, deposit/remittance allocations and advance/liquidation details. Exports use the selected barangay's name and saved branding, including its logo (or the configured text mark when no logo is set), fiscal year, demo/live label and Manila generation time. Choose **Save as PDF** in the browser print dialog; **Print / Save all reports** combines the nine available reports into one document, with each report starting on a new page. Register exports follow the current search/status filters. A failed logo load or incomplete live-data load blocks export. PBC, RAAF and transmittal remain pending until their required data and approved templates are available. These record copies do not replace prescribed official forms.

The demo intentionally allows one browser user to walk through roles. Its approvals and audit trail are illustrative. PBC, RAAF, and transmittal require approved templates and additional source records. The working report previews are not certified government forms.

All register tables, report tables, Staff & access, and the Audit trail have pagination with 10, 25, 50 or 100 rows per page. Search, status, report and barangay changes reset the page; a shorter result set clamps to a valid page. Summary cards and CSV/PDF exports use the complete filtered set of loaded records, rather than only the visible page. The live audit feed remains limited to the latest 200 events.

Audit entries are grouped by Manila date, with performer names and emails visible and full account IDs, event IDs and recorded details under expandable Event details. Search, account/action selectors, inclusive date filters, newest/oldest sorting and one-click filter reset help narrow the loaded log. Export filtered log includes the same identity and all matching loaded events across pages. The audit notice is serialized by the server and timestamp labels are built from explicit Manila date parts for consistent hydration. Demo actions use the signed-in demo account, not the person whose access is being changed. Older demo events without account information remain unidentified rather than being assigned to the current user.

Receipt matching now has a separate **Receipt matching progress** register with collected, matched-to-date and remaining amounts, matching statuses, search/filter controls and pagination. **Match remaining** opens the batch form with the receipt balance prefilled and previews the amount left after a partial allocation. Batch status stays **Confirmed** independently of receipt progress. **View details** shows every allocation in a batch with current receipt balances; PDF exports retain the complete batch. After saving, the page shows the recorded amount and actual updated receipt balances once the batch is loaded. Read-only accounts can inspect matching without entering an unavailable posting flow. These interface changes require no additional SQL migration.

## Financial integrity fixes

Dashboard budget commitments and RAO now use the same current-year budget-line scope. Older transactions stay available for cash history, payments, outstanding receipts and advance settlements. Transaction reports explicitly include all loaded dates; fiscal-year closing and continuing-budget policies remain pending office verification.

The live cashbook reads posted `cashbook_entries`, including original receipts and their dated void movements. Financial queries load every page in stable order instead of stopping at Supabase's row limit. A failed financial/advance/liquidation/ledger load blocks balances, exports and new postings until records are reloaded. Setup and account-management pages remain accessible.

Live app submissions use account/barangay-scoped request IDs. Unconfirmed submissions retain their ID in this tab's session storage and reuse it on retry; with browser storage disabled the same-page memory guard still applies. A confirmed success releases the ID so a deliberate new submission can proceed. The database stores the posting and replay response in one transaction, rechecks current permissions, and rejects reuse with different arguments or another barangay.

**Deployment:** apply [202611060001_finance_request_idempotency.sql](supabase/migrations/202611060001_finance_request_idempotency.sql) after the preceding migrations before deploying this application's live posting changes. The API fails closed if the replay function is missing. Existing direct SQL/RPC callers keep their previous behavior; the protected boundary is the app's finance API. No remote migration is applied automatically.

Run [finance_request_idempotency.sql](supabase/tests/finance_request_idempotency.sql) in an isolated database after all migrations; its fixtures and postings roll back. It checks all supported action replays, actor/barangay isolation, unchanged role restrictions, permission revocation, and single audit/ledger posting.

## Supabase connection

The repository includes browser/server SSR clients, a login page, a connection check, a repository for the first live transaction slice, and [SQL migrations](supabase/migrations/202610280001_initial_finance.sql) with row level security and transactional posting functions.

To connect later, create an isolated Supabase project, set `DATA_PROVIDER=supabase` plus the two public environment values from `.env.example`, apply the reviewed SQL migration, configure the Auth callback URL (`/auth/confirm`), and provision a barangay, budget lines, users, and memberships. Authorized users open the workspace read-only: it shows the selected barangay's records from Supabase under row level security, and recording transactions stays disabled until database functions, policies, approved forms, and role workflows pass staging acceptance. Super admins (and anyone assigned to several barangays) switch barangays from the header; the workspace then shows that barangay's records and branding. Super admins can also record transactions in the barangay they are viewing, for support, testing and fixes, once [the super admin posting migration](supabase/migrations/202611010001_superadmin_posting.sql) is applied. It lets system administrators act with every barangay role and adds functions for budget lines, procurement stages, voucher rejection and receipt voids. With the Super admin workflow migration below, Super admins can approve their own vouchers for support and testing; ordinary approvers still require a different creator. [The cash advances migration](supabase/migrations/202611020001_cash_advances.sql) adds live cash advances (opened from paid travel vouchers) and their liquidation expenses and refunds. No secret key is needed in the browser.

The migration covers the initial budget, case, voucher, collection, deposit, and remittance slice. Further migrations are required for production procurement evidence, payroll details, advance/liquidation posting, accountable forms, report snapshots, and finalized transmittals. Do not point this prototype at real financial records.

Global super admin access is defined in [the follow-up migration](supabase/migrations/202610290001_system_admins.sql). [The staff and branding migration](supabase/migrations/202610300001_staff_and_branding.sql) adds the white-label settings row (readable by everyone, changeable only by system administrators), staff profiles, membership policies that let barangay admins manage non-admin roles in their own barangay, and an audit trigger for access changes. Adding a staff account in live mode creates a Supabase Auth user with a temporary password, so the server needs `SUPABASE_SECRET_KEY` (server-only, never `NEXT_PUBLIC_`). Staff can replace the temporary password under **Settings**. [The barangay branding migration](supabase/migrations/202610310001_barangay_branding.sql) adds barangay sign-in slugs, per-barangay branding, and a public `brand-assets` storage bucket for logos (PNG, JPEG or WebP up to 1 MB; only system administrators can upload).

Apply [the account page access migration](supabase/migrations/202611030001_account_page_access.sql) after the cash-advance migration before using this version in live mode. Staff sessions fail closed if the page-access schema is missing. Under **Staff & access**, choose a role when adding an account, then check or uncheck its pages; existing accounts have a **Customize pages** button. **Use role defaults** restores the union of the person's active roles. Custom choices replace that union and apply only to that person in the selected barangay, across all their roles. Unchecking every page leaves Settings available for password changes. Administrators can customize staff; only super admins can customize administrators. Super admins always retain all pages. These choices control viewing access and its supporting records, not financial posting authority. Dashboard/report previews use accessible financial records; forms and matching pages can read supporting budget, voucher or receipt records without granting the corresponding page URL. An isolated database regression script is available at [supabase/tests/account_page_access.sql](supabase/tests/account_page_access.sql); it rolls back its fixtures.

Apply [the Super admin workflow migration](supabase/migrations/202611040001_superadmin_workflow_access.sql) next to allow a single Super admin to run every supported financial action, including submitting, rejecting, approving their own vouchers, recording payments, and treasury/advance settlement across barangays. The global role works without a barangay membership and ignores custom page restrictions. New Super admin audit events include `actor_access_level: superadmin`; self-approvals additionally record `self_approval`, `superadmin_override`, the creator, and record versions. Ordinary approvers still cannot approve their own vouchers. Transaction state, budget, amount and duplicate-posting checks remain enforced. [The Super admin workflow test](supabase/tests/superadmin_workflow_access.sql) exercises these actions in two fixture barangays, checks cashbook reconciliation and audit history, then rolls back. Run SQL test files only against an isolated test database; both end with an explicit PASS result when all checks succeed.

Apply [the audit actor identity migration](supabase/migrations/202611050001_audit_actor_identity.sql) after the Super admin workflow migration to enable account identity for all authorized audit viewers. New events capture the actor’s name and email in the database; events recorded before the migration resolve current profile/account details when available. The scoped read function allows only events in a barangay where the caller has Audit trail access, without opening the staff directory or Auth user table. Before migration, the app uses the existing RLS audit read and resolves only profiles already visible to that viewer, with the account ID retained when a profile cannot be read. The isolated [audit identity regression](supabase/tests/audit_actor_identity.sql) checks snapshots, legacy lookup, spoof prevention, missing profiles and role/barangay boundaries; it rolls back its fixtures. This migration is included in the repository and must be installed in the connected database separately.

### Barangay subdomains

Set `NEXT_PUBLIC_ROOT_DOMAIN` (for example `bfms.example.ph`) before building to give each barangay its own address, such as `san-isidro.bfms.example.ph`. The subdomain picks the barangay's branding on the sign-in page and fixes the barangay shown after sign-in; `/b/<slug>` links then redirect to it. Production needs a wildcard DNS record (`*.bfms.example.ph`) pointed at the host, a wildcard domain configured on the hosting platform, and `https://*.bfms.example.ph/**` in Supabase Auth's redirect URLs. Sign-in sessions are per subdomain. Locally, set it to `localhost:3000` and open `http://<slug>.localhost:3000`. Leave it blank to use `/b/<slug>` links only. It grants read access across barangays but no financial posting or approval authority. Apply it before assigning a user to `system_admins`. Creating an Auth user or assigning this role requires a trusted Supabase admin connection; never put a secret key or password in the repository or `NEXT_PUBLIC_` variables.

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

The step-by-step user handbook includes actual application screenshots, highlighted controls, expected results and six-step playbooks for all nine roles: [open the HTML guide](docs/user-flow-and-role-guide.html) or [read the PDF](docs/user-flow-and-role-guide.pdf). Screens use synthetic demo records. See [screenshot maintenance](docs/user-guide/README.md) to refresh the images and regenerate the PDF.

The [role-based system flowcharts](docs/role-flowcharts.html) show the whole process, the role responsible for each action, live save authority, decision branches and handoffs. Use the [seven-page flowchart PDF](docs/role-flowcharts.pdf) for a short printout or the [editable SVG/Mermaid reference](docs/role-flowcharts.md) to review the diagram source.

The [implementation status](docs/implementation-status.md) distinguishes the working demo from the remaining live finance work.
