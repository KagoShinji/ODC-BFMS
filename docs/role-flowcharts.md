# BFMS — role-based system flowcharts

These charts describe the checked-out application reviewed on 31 October 2026. Each box identifies the responsible role; its final line identifies who saves or which screen to use. SA means Super admin. Office checks and evidence handoffs use your established process; they are not automatic workflow tasks or additional approval screens.

Open the [illustrated handbook](user-flow-and-role-guide.html#flow-system) or [PDF](user-flow-and-role-guide.pdf) for the fixed-layout, printable charts. The SVG files below stay sharp when enlarged and link to the role playbooks. This source also includes Mermaid diagrams for editing and repository previews.

Live permissions: Super admin creates/submits financial records, posts receipts/matching and settles advances. An assigned Approver can approve/reject submitted DVs; an assigned Treasurer can record payments. Other staff check and coordinate within their permitted pages. Ordinary self-approval is blocked. These charts do not add permissions or certify official procedures.

## The whole system: roles, actions and handoffs.

Start at 1. Complete setup, follow the spending or collection branch, then reconcile the resulting records. Each box names the responsible role and who saves in the current live app.

![The whole system: roles, actions and handoffs.](user-guide/flowcharts/system.svg)

- The named staff role checks and coordinates its work; the save line identifies who can perform the current live action. SA means Super admin.
- Rejected DVs return to the preparer for a corrected new case. Detailed charts below show rejection, budget shortfalls, partial matching and advance balances.

<details>
<summary>Editable Mermaid flowchart</summary>

```mermaid
flowchart LR
  s1["Super admin<br/>1. Onboard barangay<br/>and set branding<br/>Live save: Super admin"]:::live
  s2["Administrator<br/>2. Assign staff roles<br/>and allowed pages<br/>Super admin assigns Admin"]:::live
  s3["All users<br/>3. Sign in; confirm<br/>barangay and year<br/>Use assigned account access"]:::check
  s4{"Decision / check<br/>Expense or<br/>collection?<br/>Choose the record path"}:::decision
  s5["Budget officer<br/>4A. Check budget line<br/>and available balance<br/>Budget entry: Super admin"]:::check
  s6["Encoder / Procurement<br/>5A. Prepare source<br/>case and linked DV<br/>Create / submit: Super admin"]:::check
  s7["Approver<br/>6A. Review submitted<br/>DV; approve / reject<br/>Assigned Approver or SA"]:::live
  s8["Treasurer<br/>7A. Record issued<br/>payment reference<br/>Assigned Treasurer or SA"]:::live
  s9["Treasurer / Super admin<br/>8A. Settle advance<br/>if applicable<br/>Settlement save: Super admin"]:::check
  s10["Collector<br/>4B. Check payer and<br/>receipt details<br/>Issue receipt: Super admin"]:::check
  s11["Treasurer / Collector<br/>5B. Match receipts to<br/>deposit / remittance<br/>Confirm batch: Super admin"]:::check
  s12["Auditor / Administrator<br/>9. Reconcile reports<br/>and follow up findings<br/>Auditor checks; owners fix"]:::check
  s1 --> s2
  s2 --> s3
  s3 --> s4
  s4 -->|"Expense"| s5
  s5 -->|"Prepare"| s6
  s6 -->|"Submitted"| s7
  s7 -->|"Approved"| s8
  s8 -->|"Paid advance"| s9
  s9 -->|"Paid / settled"| s12
  s4 -.->|"Collection"| s10
  s10 -->|"Receipt"| s11
  s11 -->|"Confirmed allocations and report previews"| s12
  classDef live fill:#ecf7f1,stroke:#6ea48c,color:#173147
  classDef check fill:#f0f5fa,stroke:#a7bdcb,color:#173147
  classDef decision fill:#fff5df,stroke:#d5ab4e,color:#173147
```

</details>

## Setup and access: put the right people in the right barangay.

Follow the account setup sequence before any financial work. A barangay sign-in link identifies the workspace; saved membership and page choices determine access.

![Setup and access: put the right people in the right barangay.](user-guide/flowcharts/setup.svg)

- Custom page selections replace the account’s role defaults for the selected barangay. Settings remains available when no financial pages are selected.
- An Administrator can manage staff; only a Super admin manages Administrator roles or White label. A role’s page access does not add financial posting authority.

<details>
<summary>Editable Mermaid flowchart</summary>

```mermaid
flowchart LR
  a1["Super admin<br/>1. Onboard barangay<br/>White label screen<br/>Save name and sign-in slug"]:::live
  a2["Super admin<br/>2. Set logo, name<br/>and accent color<br/>Save barangay branding"]:::live
  a3["Super admin<br/>3. Add barangay<br/>Administrator<br/>Staff & access → Add account"]:::live
  a4["Administrator<br/>4. Add staff; choose<br/>roles and page access<br/>Review → confirm Add account"]:::live
  a5["All users<br/>5. Sign in using<br/>barangay link<br/>Use your email and password"]:::check
  a6{"Decision / check<br/>Access<br/>available?<br/>Account / page check"}:::decision
  a7["All users<br/>6. Change temporary<br/>password in Settings<br/>Live: Account password"]:::live
  a8["All users<br/>7. Confirm barangay<br/>and fiscal year<br/>Open your permitted work area"]:::check
  a9["Assigned staff<br/>8. Follow your<br/>role playbook<br/>Keep the same record reference"]:::check
  a10["Administrator<br/>Check membership<br/>and selected pages<br/>Super admin fixes Admin access"]:::live
  a11["All users<br/>9. Finish work<br/>and sign out<br/>Profile menu → Sign out"]:::check
  a1 --> a2
  a2 --> a3
  a3 --> a4
  a4 --> a5
  a5 --> a6
  a6 -->|"Yes"| a7
  a7 --> a8
  a8 --> a9
  a9 -->|"After work"| a11
  a6 -->|"No"| a10
  a10 -.-> a5
  classDef live fill:#ecf7f1,stroke:#6ea48c,color:#173147
  classDef check fill:#f0f5fa,stroke:#a7bdcb,color:#173147
  classDef decision fill:#fff5df,stroke:#d5ab4e,color:#173147
```

</details>

## Spending: from request to approval and recorded payment.

All five expense sources converge on a linked disbursement voucher (DV). Follow the decision labels before passing the same case and voucher references to the next role.

![Spending: from request to approval and recorded payment.](user-guide/flowcharts/spending.svg)

- Sources: Procurement (PR → RFQ → Purchase Order → AIR), Payroll, Recurring fees, Travel or SK transfer. Non-procurement cases start Ready for DV.
- Assigned Approvers can approve/reject; assigned Treasurers can record payment. Ordinary self-approval is blocked. The app has no Return/edit/resubmit path for a rejected DV; payment records the full amount and does not send money.

<details>
<summary>Editable Mermaid flowchart</summary>

```mermaid
flowchart LR
  v1["Encoder<br/>1. Check request<br/>and existing records<br/>Payee · purpose · amount"]:::check
  v2["Budget officer<br/>2. Check coding<br/>and available budget<br/>Budget screen / source case"]:::check
  v3{"Decision / check<br/>Budget<br/>sufficient?<br/>Check; enforced on submission"}:::decision
  v4["Encoder / Procurement<br/>3. Prepare source<br/>case and evidence<br/>Create case: Super admin"]:::check
  v5["Encoder / Super admin<br/>4. Create linked DV<br/>and Submit for review<br/>Live save: Super admin"]:::live
  v6["Approver<br/>5. Open Submitted DV<br/>and review evidence<br/>Verify amount, source, coding"]:::check
  v7{"Decision / check<br/>Approve<br/>or Reject?<br/>Confirm the chosen action"}:::decision
  v8["Treasurer<br/>6. Verify issued<br/>payment evidence<br/>Approved DV only"]:::check
  v9["Treasurer<br/>7. Enter reference<br/>Record payment<br/>Confirm → check Paid status"]:::live
  v10["Auditor / finance users<br/>8. Reconcile records<br/>and report previews<br/>Travel advance? See next chart"]:::check
  v11["Budget officer / SA<br/>Resolve shortfall<br/>or incorrect coding<br/>Budget changes: Super admin"]:::check
  v12["Encoder / Super admin<br/>Retain rejected DV<br/>Correct via a new case<br/>New case / submission: SA"]:::check
  v1 --> v2
  v2 --> v3
  v3 -->|"Yes"| v4
  v4 --> v5
  v5 -->|"Submitted"| v6
  v6 --> v7
  v7 -->|"Approved"| v8
  v8 --> v9
  v9 -->|"Paid"| v10
  v3 -->|"No"| v11
  v7 -->|"Rejected"| v12
  v12 -.->|"Fresh request / evidence; keep old history"| v1
  v11 -.->|"Recheck budget / coding"| v2
  classDef live fill:#ecf7f1,stroke:#6ea48c,color:#173147
  classDef check fill:#f0f5fa,stroke:#a7bdcb,color:#173147
  classDef decision fill:#fff5df,stroke:#d5ab4e,color:#173147
```

</details>

## Procurement: PR, quotations, Purchase Order and inspection.

Procurement officer (PO) coordinates the document work; Super admin advances the current system stages. A Purchase Order is a document stage, distinct from the PO role abbreviation.

![Procurement: PR, quotations, Purchase Order and inspection.](user-guide/flowcharts/procurement.svg)

- Send the same procurement case reference, supplier details and supporting records to the Encoder / Super admin for DV preparation. Procurement alone does not grant the Disbursements page.
- The document-readiness diamond is an office check, not an implemented certification button. Stage changes track progress; they do not produce official PR, RFQ, PO or AIR documents or validate their evidence.

<details>
<summary>Editable Mermaid flowchart</summary>

```mermaid
flowchart LR
  p1["Encoder / Procurement<br/>1. Identify purchase<br/>and existing PR<br/>Check supplier and purpose"]:::check
  p2["Budget officer<br/>2. Confirm budget<br/>coding and availability<br/>Refer shortfall before proceeding"]:::check
  p3["Super admin<br/>3. New procurement<br/>Create case → PR<br/>Review and confirm creation"]:::live
  p4["Procurement officer<br/>4. Check PR work<br/>and request details<br/>SA clicks Complete PR"]:::check
  p5["Procurement officer<br/>5. Coordinate RFQ<br/>and quotation records<br/>SA clicks Complete RFQ"]:::check
  p6["Procurement officer<br/>6. Check supplier<br/>and Purchase Order<br/>SA clicks Complete PO"]:::check
  p7["Procurement officer<br/>7. Coordinate delivery<br/>and AIR inspection<br/>SA clicks Complete AIR"]:::check
  p8{"Decision / check<br/>Documents<br/>ready?<br/>Office check of evidence"}:::decision
  p9["Encoder / Super admin<br/>8. Ready for DV<br/>Check linked source<br/>SA clicks Create DV once"]:::live
  p10["Super admin / Approver<br/>9. Submit draft DV<br/>then review / decide<br/>Continue in spending chart"]:::check
  p11["Procurement officer<br/>Resolve missing<br/>supporting evidence<br/>Coordinate through office process"]:::check
  p1 --> p2
  p2 --> p3
  p3 --> p4
  p4 --> p5
  p5 --> p6
  p6 --> p7
  p7 --> p8
  p8 -->|"Yes"| p9
  p9 --> p10
  p8 -->|"No"| p11
  p11 -.-> p8
  classDef live fill:#ecf7f1,stroke:#6ea48c,color:#173147
  classDef check fill:#f0f5fa,stroke:#a7bdcb,color:#173147
  classDef decision fill:#fff5df,stroke:#d5ab4e,color:#173147
```

</details>

## Travel advances: settle the amount already paid.

Start only after a travel voucher is paid. Track the accountable person’s use of the advance, accepted expenses and returned cash without recording a second payment.

![Travel advances: settle the amount already paid.](user-guide/flowcharts/advances.svg)

- Current live saves for opening an advance and recording liquidation/refund entries require Super admin access. Treasurer reviews the balance and evidence; the accountable person is an office participant, not an additional app role.
- Example: ₱8,900 advance − ₱8,000 accepted expenses − ₱900 refund = zero. Formal liquidation submission, due-date review and separate approval are not implemented; follow your established review process.

<details>
<summary>Editable Mermaid flowchart</summary>

```mermaid
flowchart LR
  l1["Treasurer<br/>1. Confirm travel DV<br/>is already Paid<br/>Check amount and payee"]:::check
  l2{"Decision / check<br/>Cash advance<br/>to a person?<br/>Office classification check"}:::decision
  l3["Super admin<br/>2. Open advance<br/>from paid travel DV<br/>Cash advances → Open advance"]:::live
  l4["Accountable person<br/>3. Provide receipts<br/>and cash-return proof<br/>Office handoff of evidence"]:::check
  l5["Treasurer / Super admin<br/>4. Check accepted<br/>amounts and evidence<br/>Coordinate the accepted entries"]:::check
  l6["Super admin<br/>5. Record accepted<br/>expense / cash refund<br/>View advance → record entry"]:::live
  l7{"Decision / check<br/>Outstanding<br/>balance zero?<br/>Advance − expenses − refunds"}:::decision
  l8["Treasurer / Auditor<br/>6. Verify settled<br/>advance and reports<br/>Retain DV and evidence refs"]:::check
  l9["Accountable person<br/>Supply remaining<br/>evidence / unused cash<br/>Keep the balance outstanding"]:::check
  l10["Treasurer / Auditor<br/>Standard paid case<br/>No advance to open<br/>Continue normal reconciliation"]:::check
  l1 --> l2
  l2 -->|"Yes"| l3
  l3 --> l4
  l4 --> l5
  l5 --> l6
  l6 --> l7
  l7 -->|"Yes"| l8
  l7 -->|"No"| l9
  l9 -.-> l4
  l2 -->|"No"| l10
  classDef live fill:#ecf7f1,stroke:#6ea48c,color:#173147
  classDef check fill:#f0f5fa,stroke:#a7bdcb,color:#173147
  classDef decision fill:#fff5df,stroke:#d5ab4e,color:#173147
```

</details>

## Collections: from payer details to confirmed treasury matching.

Follow each receipt into its bank deposit or treasury remittance. Collector prepares and checks; Treasurer checks treasury evidence; Super admin records receipts and matching batches in the current live app.

![Collections: from payer details to confirmed treasury matching.](user-guide/flowcharts/collections.svg)

- A bank deposit moves previously collected cash into the bank; it is not additional revenue. A treasury remittance reduces cash and increases remitted collections. Allocations may be partial and cannot exceed unmatched amounts.
- To correct an issued receipt, coordinate with Super admin: an unallocated issued receipt can be voided and stays in history. A receipt already allocated to a batch cannot be voided through that action.

<details>
<summary>Editable Mermaid flowchart</summary>

```mermaid
flowchart LR
  c1["Collector<br/>1. Check payer<br/>category and amount<br/>Search for an existing receipt"]:::check
  c2["Super admin<br/>2. Record collection<br/>and issue receipt<br/>Confirm details → save receipt"]:::live
  c3["Collector<br/>3. Verify receipt<br/>and unmatched amount<br/>Keep generated receipt number"]:::check
  c4["Treasurer / Collector<br/>4. Check real deposit<br/>or remittance evidence<br/>Bank / recipient and reference"]:::check
  c5["Super admin<br/>5. New matching batch<br/>Select receipt amounts<br/>Choose deposit or remittance"]:::live
  c6{"Decision / check<br/>Evidence and<br/>allocations agree?<br/>Office check + amount validation"}:::decision
  c7["Super admin<br/>6. Confirm matching<br/>batch and reference<br/>Check saved batch / allocations"]:::live
  c8{"Decision / check<br/>Receipt fully<br/>matched?<br/>Check remaining unmatched"}:::decision
  c9["Collector / Auditor<br/>7. Reconcile matching<br/>RCD / RCR and cashbook<br/>Match receipt + batch references"]:::check
  c10["Collector / Treasurer<br/>Carry unmatched<br/>balance to later batch<br/>Partial allocation stays visible"]:::check
  c11["Treasurer / Super admin<br/>Correct allocation<br/>or investigate evidence<br/>Keep batch unconfirmed"]:::check
  c1 --> c2
  c2 --> c3
  c3 --> c4
  c4 --> c5
  c5 --> c6
  c6 -->|"Yes"| c7
  c7 --> c8
  c8 -->|"Yes"| c9
  c8 -->|"No"| c10
  c6 -->|"No"| c11
  c11 -.-> c5
  c10 -.->|"Next actual treasury movement"| c4
  classDef live fill:#ecf7f1,stroke:#6ea48c,color:#173147
  classDef check fill:#f0f5fa,stroke:#a7bdcb,color:#173147
  classDef decision fill:#fff5df,stroke:#d5ab4e,color:#173147
```

</details>

## Reports and oversight: trace records, investigate and follow up.

Review the spending and revenue branches together. Findings return to the responsible owner; staff access issues return to the Administrator or Super admin.

![Reports and oversight: trace records, investigate and follow up.](user-guide/flowcharts/oversight.svg)

- Auditor reviews and reports findings; it does not edit records. The current audit page shows the latest loaded events. Reports depend on the account’s visible records; check scope before comparing totals.
- These are working report previews and system copies. Formal period lock/reopening, archived snapshots and several prescribed report templates remain pending. A review here does not complete an official period close.

<details>
<summary>Editable Mermaid flowchart</summary>

```mermaid
flowchart LR
  o1["Finance users<br/>1. Confirm barangay<br/>year and visible data<br/>Resolve load errors before review"]:::check
  o2["Budget officer / Auditor<br/>2. Trace source case<br/>DV and budget use<br/>Compare amount, payee, coding"]:::check
  o3["Treasurer / Auditor<br/>3. Trace paid DV<br/>and advance balance<br/>Check payment and settlement"]:::check
  o4["Collector / Auditor<br/>4. Trace receipt<br/>and batch allocations<br/>Matched + unmatched = receipt"]:::check
  o5["Auditor<br/>5. Inspect audit<br/>actor, time and action<br/>Check linked record references"]:::check
  o6{"Decision / check<br/>Figures and<br/>history agree?<br/>Review against source evidence"}:::decision
  o7["Permitted finance users<br/>6. Export working<br/>report previews<br/>CSV / Print / Save PDF"]:::check
  o8["Administrator<br/>7. Review outstanding<br/>work and staff access<br/>Correct staff roles / pages"]:::check
  o9["All users<br/>8. Retain references<br/>and sign out<br/>Follow office retention process"]:::check
  o10["Auditor / record owner<br/>Document findings<br/>and request correction<br/>Authorized role / SA investigates"]:::check
  o11["Super admin<br/>Resolve Admin access<br/>or supported corrections<br/>Retain audit history"]:::live
  o1 --> o2
  o2 --> o3
  o3 --> o4
  o4 --> o5
  o5 --> o6
  o6 -->|"Yes"| o7
  o7 --> o8
  o8 --> o9
  o6 -->|"No"| o10
  o10 -.-> o5
  o8 -.->|"Escalate if needed"| o11
  classDef live fill:#ecf7f1,stroke:#6ea48c,color:#173147
  classDef check fill:#f0f5fa,stroke:#a7bdcb,color:#173147
  classDef decision fill:#fff5df,stroke:#d5ab4e,color:#173147
```

</details>
