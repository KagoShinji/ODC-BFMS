import type { ReportId } from "./report-data";

export const reportGroups = [
  "Budget and income",
  "Cash and collections",
  "Accountability",
] as const;

interface ReportHelp {
  group: (typeof reportGroups)[number];
  meaning: string;
  useWhen: string;
  source: string;
  limitation: string;
}

// Keep these descriptions tied to what buildReports actually calculates.
export const reportHelp: Record<ReportId, ReportHelp> = {
  rao: {
    group: "Budget and income",
    meaning:
      "Shows the allocated budget, committed amount and remaining balance for each budget line.",
    useWhen: "Check which budget line still has funds before preparing an expense.",
    source:
      "Budget lines and their submitted, approved or paid vouchers. Draft and rejected vouchers do not count as commitments.",
    limitation:
      "This is a working preview. Confirm the prescribed form and reporting cutoff before official submission.",
  },
  saob: {
    group: "Budget and income",
    meaning:
      "Statement of appropriations, obligations and balances: a summary of budget allocations, commitments and remaining balances by category.",
    useWhen: "Review the overall budget position by category instead of individual budget lines.",
    source:
      "The same budget lines and voucher commitments used by RAO, grouped by budget category.",
    limitation: "Official layout and signatories still need confirmation.",
  },
  pbc: {
    group: "Budget and income",
    meaning:
      "A report named PBC is listed, but its full title and contents have not yet been confirmed.",
    useWhen: "An approved sample is needed before this report can be used.",
    source: "No report data is generated yet.",
    limitation: "Provide the required PBC form and field definitions to enable this report.",
  },
  reai: {
    group: "Budget and income",
    meaning: "Compares estimated income with actual collections by revenue category.",
    useWhen: "Review how much income has been collected for each revenue category.",
    source:
      "Issued collection receipts. Approved income estimates are not yet recorded in this report.",
    limitation:
      "Only actual collections are available. A complete comparison requires approved income estimates.",
  },
  checks: {
    group: "Cash and collections",
    meaning:
      "Lists paid vouchers with their payees, payment references, payment dates and amounts.",
    useWhen: "Review recorded payments and trace a payment back to its voucher.",
    source: "Disbursement vouchers marked as paid.",
    limitation:
      "The current list includes all paid vouchers; it does not verify that each payment was made by check. Confirm payment methods and check numbers before official use.",
  },
  cashbook: {
    group: "Cash and collections",
    meaning: "Shows money coming in and going out, with running cash-on-hand and bank balances.",
    useWhen:
      "Trace how receipts, deposits, remittances, payments and advance refunds affect balances.",
    source:
      "Opening balances, issued receipts, deposit and remittance batches, paid vouchers and cash-advance refunds.",
    limitation:
      "Live opening balances currently start at zero; demo openings are synthetic. Verify openings and record coverage against your actual books and bank records.",
  },
  matching: {
    group: "Cash and collections",
    meaning:
      "Shows how much of each receipt is matched to a deposit or remittance and how much remains unmatched.",
    useWhen: "Find collections that still need to be allocated to a deposit or remittance.",
    source:
      "Issued receipts and the receipt allocations recorded in deposit and remittance batches.",
    limitation:
      "A matched amount means it is allocated in this system; verify the corresponding bank or remittance evidence separately.",
  },
  rcd: {
    group: "Cash and collections",
    meaning:
      "Report of collections and deposits: links collection receipts to their recorded bank deposits.",
    useWhen:
      "Check which receipts make up a bank deposit and the amount allocated from each receipt.",
    source: "Deposit batches and their receipt allocations. Remittance batches are excluded.",
    limitation:
      "Confirm the prescribed format, reporting period and deposit evidence before submission.",
  },
  rcr: {
    group: "Cash and collections",
    meaning:
      "Report of collections and remittances: links collection receipts to amounts remitted to a recipient.",
    useWhen: "Review which collections were remitted, to whom and in what amounts.",
    source: "Remittance batches and their receipt allocations. Bank deposit batches are excluded.",
    limitation:
      "Confirm when this report applies and the approved form and remittance evidence required.",
  },
  raaf: {
    group: "Accountability",
    meaning: "Tracks accountability for receipt and check forms, including their serial ranges.",
    useWhen: "Review forms received, used and remaining once a form inventory is available.",
    source:
      "Accountable-form inventory and opening serial ranges are not yet available to this report.",
    limitation:
      "The form inventory and approved opening serial ranges are needed before balances can be calculated.",
  },
  transmittal: {
    group: "Accountability",
    meaning: "A list of documents being submitted to a recipient, with acknowledgement details.",
    useWhen: "Prepare a record of the documents included in a submission.",
    source:
      "Finalized document selections, recipient and acknowledgement details are not yet captured for this report.",
    limitation:
      "A document-selection and acknowledgement workflow is needed before this report can be generated.",
  },
  liquidation: {
    group: "Accountability",
    meaning:
      "Lists expenses and refunds recorded against cash advances, alongside the accountable person and linked voucher.",
    useWhen: "Review the recorded use of a cash advance and any amount returned.",
    source: "Cash advances and their recorded expense and refund entries.",
    limitation:
      "This lists recorded entries, not proof of approval or complete settlement. Check the remaining advance balance on the Cash advances page and verify supporting evidence.",
  },
};
