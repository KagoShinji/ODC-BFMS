# Workflow gap review

Reviewed: November 3, 2026 (Asia/Manila).

This review compares the supplied barangay financial-management process image with the current local UI, API, calculations and SQL migrations. It describes the implementation in this repository; the deployed Supabase database and its migration state were not inspected. The original review below records the pre-fix behavior. The implementation update records the subsequent technical fixes; office-dependent workflows remain pending.

## Technical implementation update

The subsequent technical-fix change corrects the dashboard/RAO budget-scope mismatch, loads posted cashbook history with dated voids, reports incomplete financial loads, and adds transactional request replay protection to live app submissions. Source-table reads now fetch all pages. Existing role restrictions and office-dependent flows remain unchanged.

Validation of the fixes: 74 automated tests, a production build, all ten migrations and four rollback SQL suites in an isolated PostgreSQL engine, and browser checks for mixed-year budget totals, cashbook/PDF history, a real demo receipt void, safe retries after reload, and mobile layout passed.

Apply [202611060001_finance_request_idempotency.sql](../supabase/migrations/202611060001_finance_request_idempotency.sql) after the preceding migrations before using the updated live posting API. The migration has been tested locally; it has not been applied to the remote project. Opening balances, bank reconciliation, reporting cutoffs/year-end policy and the missing office forms are still pending.

## Findings that affect totals or completing work

### 1. Reporting periods are inconsistent — high priority

**Status:** dashboard/RAO mismatch fixed by using the same budget-line scope. Broader period and year-end workflows remain pending.

The live loader selects budget lines for the current fiscal year, but loads expense cases, vouchers, receipts, deposits and advances across all dates. The dashboard subtracts every loaded committed voucher from the current-year appropriation. RAO instead matches vouchers to each loaded budget-line ID. These views can disagree when older records exist.

A local synthetic example with a current-year appropriation of ₱10,000 and a prior-year paid voucher of ₱1,000 against a different budget line produced:

- Dashboard available budget: **₱9,000**.
- RAO available budget: **₱10,000**.

A reporting-period model needs to define transaction dates, budget authorization years, opening balances and cross-year settlements together. Filtering every record by date alone would lose legitimate opening obligations and unmatched receipts. There is also no year-end close, reopen or continuing-balance workflow.

Evidence: [live loader](../src/data/supabase/workspace-data.ts), [dashboard calculations](../src/domain/finance.ts), [report calculations](../src/features/reports/report-data.ts).

### 2. Cash and bank setup and reconciliation are missing — high priority

Live cash and bank openings are set to zero. There is no opening-balance setup page, bank-account master, statement reconciliation or bank-funding workflow independent of receipt allocations. Recording a payment debits the bank for the full voucher amount without checking available bank funds. Budget appropriation does not create bank money.

This explains how the app can show a negative bank balance even when a real account has an opening balance that has not been recorded. It does not establish the actual balance at the bank.

Evidence: [live openings](../src/data/supabase/workspace-data.ts), [payment posting](../supabase/migrations/202610280001_initial_finance.sql), [balance calculations](../src/domain/finance.ts).

### 3. Failed advance/liquidation loads can look empty — high priority

**Status:** fixed. Advance, liquidation and ledger failures now mark the load incomplete and block financial views/exports/postings.

The live loader checks errors for its main financial queries but omits the cash-advance and liquidation query results from its combined failure check. A failed query can therefore become an empty array without the incomplete-data warning used to block exports.

A mocked missing-table response for `cash_advances` returned `cashAdvances: []` and no load error. Missing data should produce an unavailable state rather than a zero outstanding balance.

Evidence: [live loader and failure check](../src/data/supabase/workspace-data.ts).

### 4. Staff cannot complete their assigned live workflows through the app — high priority

The full supported live posting flow is enabled for Super admin. The app additionally permits assigned Approvers to approve/reject, and assigned Treasurers to record voucher payments. Other live actions are blocked by the provider/API for ordinary accounts, including Encoder preparation, Procurement stage updates, Budget entry, Collector receipt issue, and Treasurer deposit/remittance and liquidation entry.

Page access and SQL role checks exist, but do not by themselves enable these actions in the UI/API. A Super admin walkthrough therefore does not prove that separate staff accounts can complete the same chain. Some database RPCs permit role-based writes more broadly than the app currently exposes; permissions need a consistent policy across both layers.

Evidence: [live action gate](../src/app/api/finance/route.ts), [client posting gate](../src/data/demo/finance-provider.tsx), [access helpers](../src/lib/auth/roles.ts).

### 5. Rejected and incorrect records have no complete correction path — high priority

A rejected voucher remains linked to its source case. Voucher creation permits only one voucher per source. The UI tells the user to create another expense case; there is no return-with-reason, draft editing, revision or resubmission workflow, and rejection has no reason field.

Paid vouchers and confirmed deposits/remittances have no cancellation, linked reversal or replacement workflow. An unmatched receipt can be voided, but a receipt with deposit allocations cannot be voided, and there is no deposit-reversal path to resolve that situation. Transaction mistakes can require creating duplicate source work or intervention outside the supported application flow.

Evidence: [voucher states and unique source constraint](../supabase/migrations/202610280001_initial_finance.sql), [rejection and receipt void functions](../supabase/migrations/202611010001_superadmin_posting.sql), [rejected-voucher UI](../src/features/disbursements/disbursements-view.tsx).

### 6. Cashbook history is reconstructed from current status — high priority

**Status:** fixed for live posted history. Browser demo voids also retain the original receipt and reversal; an unknown legacy void date is labeled unavailable.

The database records an issued collection and its later void as separate cashbook entries. The report builder instead uses only currently issued receipts and does not load the posted `cashbook_entries` ledger. Once a receipt is voided, its original collection disappears from the displayed cashbook, without a dated void/reversal row.

A synthetic receipt generated two cashbook rows while issued (opening plus receipt), and only the opening row after voiding. The net current balance may still be correct; the movement history and historical reporting cutoff are incomplete. The cashbook should use the posted ledger with its original and corrective entries.

Evidence: [report event builder](../src/features/reports/report-data.ts), [void posting](../supabase/migrations/202611010001_superadmin_posting.sql), [loaded data sources](../src/data/supabase/workspace-data.ts).

### 7. Advance refunds cannot be deposited through the matching flow — high priority

Recording an advance refund increases cash and reduces the advance balance without creating income, which preserves the distinction between a refund and revenue. However, deposit confirmation requires allocations to issued collection receipts. A refund entry cannot be selected as a deposit source. Its cash-to-bank movement has no complete application path.

The missing flow is **advance refund → refund acknowledgement → deposit allocation → bank movement**, preserving its original non-revenue classification. A refund should not be entered as new income simply to make it selectable.

Evidence: [refund posting](../supabase/migrations/202611020001_cash_advances.sql), [receipt-only deposit allocations](../supabase/migrations/202610280001_initial_finance.sql), [deposit selection UI](../src/features/deposits/deposits-view.tsx).

## Coverage against the supplied image

“Partial” means a page or basic action exists but does not implement the full supporting document workflow.

| Area in the image                        | Current coverage                   | Missing work                                                                                                                                                                                |
| ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Budget: annual, supplemental, continuing | Partial                            | Budget versions/types, review and approval, income estimates, authorized adjustments and continuing balances. Currently adds current-year budget lines.                                     |
| PR → RFQ → PO → AIR → Procurement        | Partial                            | Itemized requests, supplier quotation records/comparison, purchase-order details, delivery/inspection records and partial acceptance. Buttons currently advance one status string.          |
| Procurement evidence                     | Storage foundation only            | A private evidence bucket and policies exist, but no financial document upload, attachment listing or linkage workflow is implemented in the app. Logo upload is a separate feature.        |
| Payroll → DV                             | Generic expense case               | Employee/payroll-period details, earnings/deductions, payee breakdown and payroll preparation/review.                                                                                       |
| Recurring fees → DV                      | Generic expense case               | Provider/account details, billing periods, due dates, bill attachments and duplicate-bill checks. No recurrence scheduler.                                                                  |
| Travel Order → Travel/Itinerary → DV     | Generic travel case                | Separate travel order, destination/dates, itinerary, travel cost details and approval evidence. The `TO` reference alone does not implement a travel-order document.                        |
| SK fund transfer → DV                    | Generic transfer case              | Receiving-fund/recipient details, transfer authority, purpose restrictions and receipt/acknowledgement linkage.                                                                             |
| DV → approval → payment                  | Basic path implemented             | Correction/revision flow, reasoned rejection, payment-method/account selection, check lifecycle, partial payments and reversals. Existing version/state checks protect several transitions. |
| DV → liquidation report                  | Partial; paid travel vouchers only | Other eligible advance types if required, liquidation draft/submission/review/return/approval, due dates and evidence uploads. Expenses/refunds currently reduce the balance immediately.   |
| Collection → deposit/remittance          | Basic path implemented             | Source evidence, non-revenue refund deposits, correction/reversal, account selection and statement reconciliation. Partial receipt allocations and over-allocation checks already exist.    |
| RAO / SAOB                               | Working previews                   | Complete budget lifecycle, formal obligation/adjustment records and consistent reporting periods. Current commitments are derived from submitted, approved and paid vouchers.               |
| PBC                                      | Missing                            | Full title, required source data, fields, calculations, form and signatories remain undefined. No setup screen.                                                                             |
| Summary of checks issued                 | Partial                            | Actual payment-method/check records, check series, cancellations/replacements and reconciliation. Currently lists every paid voucher.                                                       |
| RAAF                                     | Missing                            | Accountable-form stock and serial-range movements: received, assigned, issued, voided, returned and remaining. No setup screen.                                                             |
| Cashbook                                 | Partial                            | Opening balances, account detail and reporting-period controls; see findings above.                                                                                                         |
| Transmittal                              | Missing                            | Document selection, finalized submission manifest, recipient and acknowledgement tracking. No setup screen.                                                                                 |
| REAI                                     | Partial                            | Actual issued collections are calculated; approved income estimates and variance comparison are missing.                                                                                    |
| Matching of collection and deposit       | Basic path implemented             | Receipt allocations and unmatched balances exist; bank evidence, reconciliation and variance resolution are incomplete.                                                                     |
| RCD / RCR                                | Working previews                   | Approved output definitions, reporting coverage and complete source/correction history.                                                                                                     |

The Reports page currently contains **9 previews and 3 pending report types**. The formal PDF styling added to the system improves presentation; it does not add the missing source workflows or form definitions.

## Other completion gaps

- **Report access can produce partial-looking totals.** Having the Reports or Dashboard page alone does not authorize all underlying source-table reads. RLS can return empty subsets without an error, while the report renderer still calculates from those subsets. An explicit report data scope or authorized reporting endpoint is needed so hidden data is not presented as a complete zero.
- **Cash advances are opened manually from paid travel vouchers.** Payment is not automatically classified as an advance. This is intentional in the current UI, but the workflow needs an explicit advance decision and follow-up so an eligible paid voucher is not overlooked.
- **Audit history is capped at 200 loaded events.** Pagination and PDF export operate on that loaded subset. Full-history filtering/export needs database pagination or a dedicated archive query.
- **Business dates and periods are fixed in posting functions.** Most financial writes use today's Manila date. There is no controlled historical-entry/period-selection workflow.
- **Retry behavior was incomplete and is now protected through the app finance API.** Several voucher transitions have row locks and version checks, and receipt allocations have over-allocation checks. The new request replay migration and client now protect creation and transition actions after uncertain responses. See the deployment note above.

## Suggested implementation order

1. Correct period scope and incomplete-load handling; establish audited cash/bank openings and account records, and use posted cashbook history.
2. Enable the intended staff actions consistently in the UI, API and SQL, with a separate-account walkthrough for each role.
3. Add reasoned returns/rejections, editable drafts/revisions, and authorized reversals/replacements.
4. Add procurement and other source-document details with evidence attachment/linking, then gate stage completion on the agreed requirements.
5. Add liquidation review/approval, advance classification and the refund-to-deposit path.
6. Complete income estimates, accountable-form inventory and transmittal sources; implement PBC once its actual definition/sample is supplied.
7. Finalize report periods, forms, signatories, reconciliation and full audit retrieval.

The image does not define the full contents of payroll, travel, transfer or the unexplained report acronyms. Their detailed fields and approvals need confirmation from actual office forms; the missing detail should not be filled with invented requirements.

## Checks performed

- Reviewed the current application pages, live posting API/provider, financial calculations and all finance-related migrations, including the later role/access overrides.
- Ran the existing automated suite: **56 tests passed**. These cover implemented behavior and do not demonstrate completeness of missing workflows.
- Ran local synthetic probes for mixed-year totals and voided-receipt cashbook history, and a mocked failed-advance-load probe. Results are recorded above.
- No remote database reads/writes, financial postings or application changes were made during this review.
