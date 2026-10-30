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
- **White label** (super admins only): system name, organization, logo mark or logo image, and accent color, applied to the workspace, sign-in page, browser title and favicon. In live mode a super admin can also onboard each barangay with its own branding, uploaded logo, and sign-in link (`/b/<slug>`); that barangay's staff see its branding before and after signing in.
- Derived working previews and CSV/print for RAO, SAOB, checks, cashbook, REAI, matching, RCD, RCR, and liquidation; an activity trail.

The demo intentionally allows one browser user to walk through roles. Its approvals and audit trail are illustrative. PBC, RAAF, and transmittal require approved templates and additional source records. The working report previews are not certified government forms.

## Supabase connection

The repository includes browser/server SSR clients, a login page, a connection check, a repository for the first live transaction slice, and [SQL migrations](supabase/migrations/202610280001_initial_finance.sql) with row level security and transactional posting functions.

To connect later, create an isolated Supabase project, set `DATA_PROVIDER=supabase` plus the two public environment values from `.env.example`, apply the reviewed SQL migration, configure the Auth callback URL (`/auth/confirm`), and provision a barangay, budget lines, users, and memberships. Authorized users open the workspace read-only: it shows the selected barangay's records from Supabase under row level security, and recording transactions stays disabled until database functions, policies, approved forms, and role workflows pass staging acceptance. Super admins (and anyone assigned to several barangays) switch barangays from the header; the workspace then shows that barangay's records and branding. Super admins can also record transactions in the barangay they are viewing, for support, testing and fixes, once [the super admin posting migration](supabase/migrations/202611010001_superadmin_posting.sql) is applied. It lets system administrators act with every barangay role and adds functions for budget lines, procurement stages, voucher rejection and receipt voids. With the Super admin workflow migration below, Super admins can approve their own vouchers for support and testing; ordinary approvers still require a different creator. [The cash advances migration](supabase/migrations/202611020001_cash_advances.sql) adds live cash advances (opened from paid travel vouchers) and their liquidation expenses and refunds. No secret key is needed in the browser.

The migration covers the initial budget, case, voucher, collection, deposit, and remittance slice. Further migrations are required for production procurement evidence, payroll details, advance/liquidation posting, accountable forms, report snapshots, and finalized transmittals. Do not point this prototype at real financial records.

Global super admin access is defined in [the follow-up migration](supabase/migrations/202610290001_system_admins.sql). [The staff and branding migration](supabase/migrations/202610300001_staff_and_branding.sql) adds the white-label settings row (readable by everyone, changeable only by system administrators), staff profiles, membership policies that let barangay admins manage non-admin roles in their own barangay, and an audit trigger for access changes. Adding a staff account in live mode creates a Supabase Auth user with a temporary password, so the server needs `SUPABASE_SECRET_KEY` (server-only, never `NEXT_PUBLIC_`). Staff can replace the temporary password under **Settings**. [The barangay branding migration](supabase/migrations/202610310001_barangay_branding.sql) adds barangay sign-in slugs, per-barangay branding, and a public `brand-assets` storage bucket for logos (PNG, JPEG or WebP up to 1 MB; only system administrators can upload).

Apply [the account page access migration](supabase/migrations/202611030001_account_page_access.sql) after the cash-advance migration before using this version in live mode. Staff sessions fail closed if the page-access schema is missing. Under **Staff & access**, choose a role when adding an account, then check or uncheck its pages; existing accounts have a **Customize pages** button. **Use role defaults** restores the union of the person's active roles. Custom choices replace that union and apply only to that person in the selected barangay, across all their roles. Unchecking every page leaves Settings available for password changes. Administrators can customize staff; only super admins can customize administrators. Super admins always retain all pages. These choices control viewing access and its supporting records, not financial posting authority. Dashboard/report previews use accessible financial records; forms and matching pages can read supporting budget, voucher or receipt records without granting the corresponding page URL. An isolated database regression script is available at [supabase/tests/account_page_access.sql](supabase/tests/account_page_access.sql); it rolls back its fixtures.

Apply [the Super admin workflow migration](supabase/migrations/202611040001_superadmin_workflow_access.sql) next to allow a single Super admin to run every supported financial action, including submitting, rejecting, approving their own vouchers, recording payments, and treasury/advance settlement across barangays. The global role works without a barangay membership and ignores custom page restrictions. New Super admin audit events include `actor_access_level: superadmin`; self-approvals additionally record `self_approval`, `superadmin_override`, the creator, and record versions. Ordinary approvers still cannot approve their own vouchers. Transaction state, budget, amount and duplicate-posting checks remain enforced. [The Super admin workflow test](supabase/tests/superadmin_workflow_access.sql) exercises these actions in two fixture barangays, checks cashbook reconciliation and audit history, then rolls back. Run SQL test files only against an isolated test database; both end with an explicit PASS result when all checks succeed.

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

The [implementation status](docs/implementation-status.md) distinguishes the working demo from the remaining live finance work.
