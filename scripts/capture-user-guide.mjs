import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { guideBrowser } from "./guide-browser.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "docs/user-guide");
const origin = process.env.GUIDE_ORIGIN || "http://127.0.0.1:3121";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname)) {
  throw new Error("Capture must use a local demo server.");
}
await fs.mkdir(directory, { recursive: true });
const browser = await guideBrowser();
const { call, evaluate, until, screenshot } = browser;
const pages = [];
const button = (text) =>
  `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})`;
const label = (text) =>
  `[...document.querySelectorAll('label')].find(l => l.textContent.trim().startsWith(${JSON.stringify(text)}))?.control`;
async function click(text) {
  await until(`!!(${button(text)}) && !(${button(text)}).disabled`);
  await evaluate(`${button(text)}.click()`);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await confirmAction();
}
async function confirmAction() {
  const confirmed = await evaluate(`(() => {
    const dialog=document.querySelector('[data-feedback-kind=confirm]');
    const accept=dialog && [...dialog.querySelectorAll('button')].find(b=>!['Cancel','Close'].includes(b.textContent.trim()));
    accept?.click();
    return !!accept;
  })()`);
  if (confirmed) {
    await until(
      "!!document.querySelector('[data-feedback-kind=success], [data-feedback-kind=error]')",
    );
    const error = await evaluate("document.querySelector('[data-feedback-kind=error]')?.innerText");
    if (error) throw new Error(error);
    await evaluate(
      "[...document.querySelectorAll('[data-feedback-kind=success] button')].find(b=>b.textContent.trim()==='Done').click()",
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
}
async function fill(text, value) {
  await evaluate(`(() => {
    const e = ${label(text)};
    if (!e) throw Error('Missing field: ' + ${JSON.stringify(text)});
    Object.getOwnPropertyDescriptor(e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(e, ${JSON.stringify(value)});
    e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true}));
  })()`);
}
async function navigate(route) {
  await call("Page.navigate", { url: origin + route });
  await until(
    `location.pathname === ${JSON.stringify(route.split("?")[0])} && document.readyState === 'complete' && !!document.querySelector('header h1, #login-title')`,
  );
  await until("!document.querySelector('[aria-busy=true]')");
  await evaluate("document.fonts.ready.then(() => true)");
  // Let client providers restore demo records before interacting.
  await evaluate("new Promise(r => setTimeout(r, 250))");
}
async function shot(chapter, id, title, steps, result, focus) {
  await evaluate("document.getElementById('guide-highlight')?.remove()");
  await evaluate("document.querySelector('[aria-label=\"Dismiss notification\"]')?.click()");
  if (focus) {
    await evaluate(`(() => {
      const e = ${focus}; if (!e) throw Error('Missing highlighted control');
      const before=e.getBoundingClientRect();
      if (before.top < 100 || before.bottom > innerHeight - 20) {
        if (!e.closest('[role=dialog]')) {
          e.style.scrollMarginTop='100px'; e.style.scrollMarginBottom='40px';
        }
        e.scrollIntoView({block:'nearest',behavior:'instant'});
      }
      const r=e.getBoundingClientRect(), box=document.createElement('div');
      box.id='guide-highlight';
      box.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;border:3px solid #ee6b26;border-radius:8px;box-shadow:0 0 0 3px white;';
      Object.assign(box.style,{left:(r.left-4)+'px',top:(r.top-4)+'px',width:(r.width+8)+'px',height:(r.height+8)+'px'});
      document.body.append(box);
    })()`);
  }
  await screenshot(path.join(directory, `${id}.png`));
  await evaluate("document.getElementById('guide-highlight')?.remove()");
  pages.push({ chapter, id, title, steps, result });
  console.log(`Captured ${id}`);
}
try {
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 820,
    deviceScaleFactor: 1.5,
    mobile: false,
  });
  await call("Network.clearBrowserCookies");
  await navigate("/login");
  if (!(await evaluate("document.body.innerText.includes('Demo workspace')"))) {
    throw new Error("Refusing to capture or change records outside demo mode.");
  }
  await evaluate("localStorage.clear()");
  await fill("Email address", "demo@odc.local");
  await fill("Password", "demo1234");
  await shot(
    "signin",
    "sign-in",
    "Enter the workspace",
    [
      "Open the sign-in address supplied by your administrator.",
      "Enter your email and password, then choose Sign in. The Sign in as selector appears only in demo mode.",
      "Live accounts receive their access from saved roles; use your own account details.",
    ],
    "A successful sign-in opens your first permitted page.",
    button("Sign in"),
  );
  await click("Sign in");
  await until("location.pathname === '/dashboard' && !!document.querySelector('header h1')");
  await navigate("/dashboard");
  await shot(
    "signin",
    "dashboard",
    "Recognize your workspace",
    [
      "Confirm the barangay and fiscal year shown in the workspace.",
      "Use the left sidebar to open your task. The selected page is highlighted.",
      "Read the summary cards and recent transactions before starting work.",
    ],
    "Your sidebar reflects your saved page access. These screenshots use a Super admin demo account.",
  );
  await navigate("/branding");
  await shot(
    "setup",
    "branding",
    "Review the system branding",
    [
      "As Super admin, open White label in the sidebar.",
      "Edit the system name, organization, logo mark or logo image, and accent color.",
      "Check the preview before saving. This image shows the demo system branding editor.",
    ],
    "Live mode also provides Onboard barangay and a branding scope selector; follow the setup chapter for those live-only controls.",
  );
  await navigate("/staff");
  await shot(
    "staff",
    "staff-directory",
    "Find a person or add an account",
    [
      "Open Staff & access and confirm the barangay.",
      "Search the directory to check whether the person already exists.",
      "Choose Add account (Super admin) or Add staff (Administrator).",
    ],
    "The directory shows each person’s role, status and page access.",
    button("Add account"),
  );
  await click("Add account");
  await fill("Full name", "Training Encoder");
  await fill("Email address", "training.encoder@example.test");
  await shot(
    "staff",
    "staff-form",
    "Set the person’s role and pages",
    [
      "Enter the person’s name and email; select their role.",
      "Review Page access. Check a page to include it or uncheck it to remove it.",
      "Scroll to Add to [barangay], review the confirmation, then save when the details are correct.",
    ],
    "The demo form omits the live initial-password field. Page choices change viewing access; they do not grant financial posting authority.",
    label("Full name"),
  );
  const addAccount =
    "[...document.querySelectorAll('main form button')].find(b=>b.textContent.trim().startsWith('Add to '))";
  await shot(
    "staff",
    "staff-pages",
    "Review the page list and save access",
    [
      "Scroll down within the account form to see all page checkboxes.",
      "Keep the intended pages selected. Use role defaults restores the role’s standard selection.",
      "Choose Add to Barangay San Isidro, review the confirmation and choose Add account.",
    ],
    "The role and page selection will be saved for this person in this barangay.",
    addAccount,
  );
  await evaluate(`${addAccount}.click()`);
  await confirmAction();
  await until("!document.querySelector('main form')");
  await shot(
    "staff",
    "staff-saved",
    "Verify the new staff account",
    [
      "Find Training Encoder in the staff directory.",
      "Check the Encoder role and active status.",
      "Use Customize pages to review or change viewing access, or Deactivate if this access must end.",
    ],
    "Demo accounts are practice entries in this browser. Live mode creates or links a sign-in account.",
    "[...document.querySelectorAll('tr')].find(r=>r.textContent.includes('Training Encoder'))",
  );
  await navigate("/staff");
  await click("Customize pages");
  await shot(
    "staff",
    "page-access",
    "Change an existing person’s pages",
    [
      "In the person’s row, choose Customize pages.",
      "Adjust the checkboxes, or choose Use role defaults to restore their role’s pages.",
      "Choose Save page access to apply the selection. Settings remains available.",
    ],
    "Custom choices replace that account’s role defaults for the selected barangay.",
    button("Save page access"),
  );
  await navigate("/budget");
  await shot(
    "budget",
    "budget-overview",
    "Read the budget before entering an expense",
    [
      "Open Budget and check the fiscal year.",
      "Read Total appropriation, Obligated and Available to commit.",
      "Find the intended budget line, then choose Add budget line if a new line is needed.",
    ],
    "Available to commit is the amount still available after submitted vouchers.",
    button("Add budget line"),
  );
  await click("Add budget line");
  await fill("Code", "MOOE-004");
  await fill("Budget line name", "Community programs");
  await fill("Appropriation", "50000");
  await shot(
    "budget",
    "budget-form",
    "Enter and save a budget line",
    [
      "Enter a unique Code and a clear Budget line name.",
      "Choose the Category and enter the appropriation in pesos. Example: 50000 means ₱50,000.00.",
      "Choose Save budget line and confirm the line appears in Budget lines.",
    ],
    "This example adds MOOE-004 / Community programs with ₱50,000.00.",
    button("Save budget line"),
  );
  await evaluate(`${button("Save budget line")}.click()`);
  await until("document.body.innerText.includes('PLEASE CONFIRM')");
  await shot(
    "budget",
    "confirm-action",
    "Review the confirmation before saving",
    [
      "Read the confirmation message before a record is saved or changed.",
      "Check the code, name and amount. Choose Cancel to go back and correct a mistake.",
      "Choose Add budget line to confirm. Similar confirmations appear for financial actions throughout the system.",
    ],
    "The action is applied only after you confirm the details.",
    `[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='Add budget line')`,
  );
  await confirmAction();
  await until(
    "document.body.innerText.includes('MOOE-004') && !document.querySelector('main form')",
  );
  await shot(
    "budget",
    "budget-saved",
    "Check the saved budget line",
    [
      "Find MOOE-004 in Budget lines.",
      "Verify the name, category and appropriation match your entry.",
      "For a new unused line, its available amount should equal its appropriation.",
    ],
    "The saved line is ready to select when creating an expense case.",
    "[...document.querySelectorAll('tr')].find(r=>r.textContent.includes('MOOE-004'))",
  );
  await navigate("/workflows/procurement");
  await shot(
    "procurement",
    "procurement-overview",
    "Start a purchase request",
    [
      "Open Procurement.",
      "Use the document path to see PR → RFQ → PO → AIR → Ready for DV.",
      "Choose New procurement to enter the purchase request.",
    ],
    "Existing records show their current step and the next available action.",
    button("New procurement"),
  );
  await click("New procurement");
  await fill("Payee / recipient", "Training Supply Co.");
  await fill("Amount", "1500");
  await fill("Purpose", "Training office supplies");
  await fill("Budget line", "b2");
  await shot(
    "procurement",
    "procurement-form",
    "Fill in the purchase request",
    [
      "Enter the supplier or payee, amount and purpose.",
      "Select the correct Budget line and check Available beneath it.",
      "Choose Create case. This example requests ₱1,500.00 for training office supplies.",
    ],
    "The request is saved at PR and appears in the procurement register.",
    button("Create case"),
  );
  await click("Create case");
  await until("!document.querySelector('main form')");
  await shot(
    "procurement",
    "procurement-pr",
    "Complete the PR stage",
    [
      "Find Training office supplies in the register.",
      "Check its payee, amount and PR status.",
      "Choose Complete PR after the corresponding work is complete.",
    ],
    "The next status is RFQ. Demo buttons illustrate the sequence; retain the required evidence in live operations.",
    button("Complete PR"),
  );
  await click("Complete PR");
  // The newly created row is last; the seeded RFQ row is intentionally left alone.
  const trainingButton = (text) =>
    `[...document.querySelectorAll('tr')].find(r=>r.textContent.includes('Training office supplies'))?.querySelector('button:last-child')`;
  await shot(
    "procurement",
    "procurement-rfq",
    "Continue through quotations and purchase order",
    [
      "The request now shows RFQ.",
      "Complete the quotation work, then choose Complete RFQ on the same row.",
      "At PO, complete the purchase order and choose Complete PO.",
    ],
    "Each completed stage advances this same expense case; do not create a duplicate request.",
    trainingButton(),
  );
  await evaluate(`${trainingButton()}.click()`);
  await confirmAction();
  await until(`${trainingButton()}?.textContent.includes('Complete PO')`);
  await evaluate(`${trainingButton()}.click()`);
  await confirmAction();
  await until(`${trainingButton()}?.textContent.includes('Complete AIR')`);
  await shot(
    "procurement",
    "procurement-air",
    "Inspect before preparing the voucher",
    [
      "Confirm the case has reached AIR.",
      "Complete the acceptance and inspection work.",
      "Choose Complete AIR on the same request.",
    ],
    "The case becomes Ready for DV and its action changes to Create DV.",
    trainingButton(),
  );
  await evaluate(`${trainingButton()}.click()`);
  await confirmAction();
  await until(`${trainingButton()}?.textContent.includes('Create DV')`);
  await shot(
    "procurement",
    "procurement-ready",
    "Create the linked disbursement voucher",
    [
      "Confirm the case is Ready for DV.",
      "Choose Create DV once for this case.",
      "Open Disbursements and locate the new draft by payee and purpose.",
    ],
    "The source case and draft voucher remain linked.",
    trainingButton(),
  );
  await evaluate(`${trainingButton()}.click()`);
  await confirmAction();
  await until(
    "!![...document.querySelectorAll('tr')].find(r=>r.textContent.includes('Training office supplies'))?.textContent.includes('View DV')",
  );
  for (const [kind, name, payee, purpose, line] of [
    ["payroll", "payroll", "Barangay personnel", "Training payroll example", "b1"],
    [
      "recurring",
      "recurring-fees",
      "Local Electric Cooperative",
      "Training electricity bill",
      "b3",
    ],
    ["travel", "travel", "Training Accountable Person", "Training seminar travel", "b4"],
    ["transfer", "sk-transfer", "SK Treasurer", "Training SK fund transfer", "b6"],
  ]) {
    await navigate(`/workflows/${kind}`);
    await evaluate(
      "[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('New ')).click()",
    );
    await fill("Payee / recipient", payee);
    await fill("Amount", "1500");
    await fill("Purpose", purpose);
    await fill("Budget line", line);
    await shot(
      "other-expenses",
      name,
      `Enter a ${kind === "recurring" ? "recurring fee" : kind === "transfer" ? "SK transfer" : kind} expense`,
      [
        "Open this expense route from the Spending sidebar and choose New.",
        "Enter the payee, amount and purpose; select the matching budget line.",
        "Choose Create case, then Create DV on the Ready for DV record. Continue in Disbursements.",
      ],
      kind === "travel"
        ? "If the paid travel voucher represents a cash advance, continue to Cash advances after payment."
        : "These routes use the same linked voucher review and payment steps as procurement.",
      button("Create case"),
    );
  }
  await navigate("/disbursements");
  await shot(
    "vouchers",
    "voucher-register",
    "Find the draft voucher",
    [
      "Open Disbursements.",
      "Search by payee, purpose or voucher number, and use the status filter if needed.",
      "Select the Training Supply Co. voucher row to open the linked voucher panel.",
    ],
    "Draft, submitted, approved and paid vouchers appear in the same register.",
  );
  const voucherId = await evaluate(
    "JSON.parse(localStorage.getItem('odc-bfms-demo-v2')).vouchers.find(v=>v.payee==='Training Supply Co.').id",
  );
  await navigate(`/disbursements?selected=${voucherId}`);
  await until("!!document.querySelector('[role=dialog]')");
  await shot(
    "vouchers",
    "voucher-draft",
    "Check the draft and submit it",
    [
      "Review the payee, amount, purpose, source document and budget line in the voucher panel.",
      "Confirm the source case is the intended purchase request.",
      "Choose Submit for review.",
    ],
    "The voucher changes from draft to submitted and commits budget availability.",
    button("Submit for review"),
  );
  await click("Submit for review");
  await until(`!!(${button("Approve")})`);
  await shot(
    "vouchers",
    "voucher-review",
    "Review and approve the submitted voucher",
    [
      "Check the submitted voucher and its supporting records.",
      "Choose Approve when correct, or Reject when a correction is needed.",
      "In live mode, an assigned Approver in this barangay or a Super admin can approve/reject. Ordinary self-approval is blocked.",
    ],
    "Approval records the obligation and makes the voucher ready for payment.",
    button("Approve"),
  );
  await evaluate(`${button("Approve")}.click()`);
  await until("!!document.querySelector('[data-feedback-kind=confirm]')");
  await shot(
    "vouchers",
    "approval-confirmation",
    "Approver: confirm the approval decision",
    [
      "Read the voucher number, payee and amount in the approval confirmation.",
      "Choose Cancel to return to the submitted voucher if anything is wrong.",
      "Choose Approve voucher to save the decision, then check the approved status.",
    ],
    "An assigned Approver can do this in their barangay; ordinary self-approval is blocked. The pictured account is a Super admin demo.",
    "[...document.querySelectorAll('[data-feedback-kind=confirm] button')].find(b=>b.textContent.trim()==='Approve voucher')",
  );
  await confirmAction();
  await until(`!!(${button("Record payment")})`);
  await fill("Check / payment reference", "TRAINING-CHK-0001");
  await shot(
    "vouchers",
    "voucher-payment",
    "Record the payment reference",
    [
      "After payment is issued, enter the actual check or transfer reference.",
      "Check the voucher number and amount again.",
      "As the assigned Treasurer or Super admin, choose Record payment and review its confirmation.",
    ],
    "This training example uses TRAINING-CHK-0001. Use the real payment reference in live work.",
    button("Record payment"),
  );
  await evaluate(`${button("Record payment")}.click()`);
  await until("!!document.querySelector('[data-feedback-kind=confirm]')");
  await shot(
    "vouchers",
    "payment-confirmation",
    "Treasurer: confirm the recorded payment",
    [
      "Read the voucher number, full payment amount and payment reference.",
      "Choose Cancel if the payment or reference needs checking.",
      "Choose Record payment to confirm, then check paid status and the saved reference.",
    ],
    "An assigned Treasurer can record the payment in their barangay. Recording this entry does not initiate a bank transfer or issue a check.",
    "[...document.querySelectorAll('[data-feedback-kind=confirm] button')].find(b=>b.textContent.trim()==='Record payment')",
  );
  await confirmAction();
  await until("document.querySelector('[role=dialog]').innerText.includes('Payment recorded on')");
  await shot(
    "vouchers",
    "voucher-paid",
    "Confirm that the voucher is paid",
    [
      "Check the paid status at the top of the voucher panel.",
      "Verify the payment reference and recorded payment date.",
      "Use Print / Save PDF if you need a system record copy.",
    ],
    "The paid voucher remains linked to its expense case and appears in reporting.",
  );
  // Pay the seeded travel voucher through the same UI to make an eligible advance.
  await navigate("/disbursements?selected=v4");
  await click("Submit for review");
  await click("Approve");
  await fill("Check / payment reference", "TRAINING-TRAVEL-0001");
  await click("Record payment");
  await navigate("/advances");
  await shot(
    "advances",
    "advance-open",
    "Open an advance from a paid travel voucher",
    [
      "Open Cash advances after the travel voucher is paid.",
      "Find the eligible voucher and accountable person.",
      "Choose Open advance only if this payment was cash given to that person.",
    ],
    "Opening tracking does not create a second payment. The example advance is ₱8,900.00.",
    button("Open advance"),
  );
  await click("Open advance");
  await until(`!!(${button("View")})`);
  await click("View");
  await fill("Description / evidence reference", "Training accepted receipts");
  await fill("Amount", "8000");
  await shot(
    "advances",
    "advance-expense",
    "Record an accepted liquidation expense",
    [
      "Choose View on the advance to open Liquidation.",
      "Keep Entry type as Accepted expense; enter the evidence reference and amount.",
      "Choose Record demo entry. This example accepts ₱8,000.00 against ₱8,900.00.",
    ],
    "The remaining outstanding amount will be ₱900.00. Record accepted amounts only.",
    button("Record demo entry"),
  );
  await click("Record demo entry");
  await fill("Entry type", "refund");
  await fill("Description / evidence reference", "Training cash return acknowledgment");
  await fill("Amount", "900");
  await shot(
    "advances",
    "advance-refund",
    "Return the unused balance",
    [
      "Choose Cash refund as Entry type.",
      "Enter the return acknowledgment and the unused amount, here ₱900.00.",
      "Choose Record demo entry and confirm the advance becomes fully settled.",
    ],
    "Accepted expenses plus refunds must equal the advance before its balance reaches zero.",
    button("Record demo entry"),
  );
  await click("Record demo entry");
  await until("document.body.innerText.includes('This advance is fully settled.')");
  await shot(
    "advances",
    "advance-settled",
    "Verify the settled advance",
    [
      "Check the accepted expense and refund entries in Liquidation.",
      "Confirm the fully settled message.",
      "Keep the evidence references with the case; use PDF for a system record copy.",
    ],
    "₱8,000.00 accepted + ₱900.00 refunded = ₱8,900.00 settled.",
  );
  await navigate("/collections");
  await shot(
    "collections",
    "collections-register",
    "Start a collection receipt",
    [
      "Open Collections and review the summary amounts.",
      "Check the receipt register for an existing entry.",
      "Choose Record collection to record a new receipt.",
    ],
    "Awaiting matching is the collection balance still to allocate to a deposit or remittance.",
    button("Record collection"),
  );
  await click("Record collection");
  await fill("Payer", "Training Payer");
  await fill("Amount", "1000");
  await fill("Purpose / particulars", "Training clearance collection");
  await shot(
    "collections",
    "collection-form",
    "Enter and save the receipt",
    [
      "Enter the payer and choose the collection category.",
      "Enter the amount in pesos and describe the particulars.",
      "Choose Issue demo receipt. The example records ₱1,000.00 for Training Payer.",
    ],
    "The application assigns the receipt number; the new receipt starts with an unmatched balance.",
    button("Issue demo receipt"),
  );
  await click("Issue demo receipt");
  await until("!document.querySelector('main form')");
  await shot(
    "collections",
    "collection-saved",
    "Check the new receipt",
    [
      "Find Training Payer in the receipt register.",
      "Verify the receipt number, amount, category and particulars.",
      "Continue to Deposits & remittances when the real treasury movement is ready.",
    ],
    "Saving a receipt does not automatically match it to a bank deposit.",
  );
  await navigate("/deposits");
  await click("New matching batch");
  await fill("Reference / acknowledgement", "TRAINING-DEP-0001");
  await evaluate(
    "[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Training Payer')).querySelector('input').click()",
  );
  await shot(
    "deposits",
    "deposit-form",
    "Allocate receipts to a bank deposit",
    [
      "Choose New matching batch and keep Bank deposit selected.",
      "Enter the bank and the real reference or acknowledgment.",
      "Select the receipt checkbox; adjust the allocation in pesos for a partial match.",
    ],
    "This image allocates the complete ₱1,000.00 training receipt. Batch total equals the selected allocations.",
    button("Confirm demo batch"),
  );
  await click("Confirm demo batch");
  await until("!document.querySelector('main form')");
  await shot(
    "deposits",
    "deposit-saved",
    "Check the confirmed matching batch",
    [
      "Find TRAINING-DEP-0001 in the matching register.",
      "Verify its type, bank, total and allocated receipt.",
      "Check that the receipt’s unmatched balance has decreased by the allocation.",
    ],
    "A confirmed bank deposit moves the selected amount from cash to bank.",
  );
  await click("New matching batch");
  await fill("Transaction type", "remittance");
  await fill("Remittance recipient", "Training Treasury");
  await fill("Reference / acknowledgement", "TRAINING-REM-0001");
  await evaluate("document.querySelector('form input[type=checkbox]').click()");
  await shot(
    "deposits",
    "remittance-form",
    "Record a treasury remittance",
    [
      "Choose Treasury remittance under Transaction type.",
      "Enter the receiving treasury and acknowledgment reference.",
      "Select the receipts and allocations, review Batch total, then confirm when correct.",
    ],
    "A remittance reduces cash and increases remitted collections. Use a bank deposit for movements into the bank.",
    label("Transaction type"),
  );
  await navigate("/reports");
  await shot(
    "reports",
    "reports-center",
    "Choose and check a report",
    [
      "Open Reports and choose a report from Available reports.",
      "Check the fiscal year, displayed columns and totals against the underlying registers.",
      "Choose CSV for data or Print / Save PDF for the selected report. Print / Save all reports combines the available previews.",
    ],
    "The report shown is a working preview drawn from the demo records.",
    button("Print / Save PDF"),
  );
  // Keep the system print document open for capture instead of opening the OS print dialog.
  await call("Page.addScriptToEvaluateOnNewDocument", { source: "window.print = () => {};" });
  await evaluate(
    "window.print = () => {}; const create=document.createElement.bind(document); document.createElement=function(tag,...args){const el=create(tag,...args); if(tag.toLowerCase()==='iframe') el.addEventListener('load',()=>{el.contentWindow.print=()=>{};});return el;};",
  );
  await click("Print / Save PDF");
  await until("!!document.querySelector('iframe')?.contentDocument?.querySelector('article')");
  const printed = await evaluate("document.querySelector('iframe').srcdoc");
  await call("Page.navigate", {
    url: "data:text/html;charset=utf-8," + encodeURIComponent(printed),
  });
  await until("document.readyState === 'complete' && !!document.querySelector('article')");
  await shot(
    "reports",
    "report-copy",
    "Save a report as PDF",
    [
      "The Print / Save PDF action prepares a barangay-branded system record copy like this.",
      "In the browser print dialog, choose Save as PDF as the destination.",
      "Review the pages, then choose Save and select the file location.",
    ],
    "This image shows the printable document; the browser’s print dialog varies by device. System copies do not replace prescribed official forms.",
  );
  await navigate("/audit");
  await shot(
    "reports",
    "audit-trail",
    "Trace the actions in the audit trail",
    [
      "Open Audit trail.",
      "Find the record reference or action you need to review.",
      "Compare its time, actor and details with the expense, receipt or treasury register.",
    ],
    "Use the audit trail with the linked financial records when reconciling or following up a discrepancy.",
  );
  await navigate("/settings");
  await shot(
    "signin",
    "settings",
    "Find account settings and demo reset",
    [
      "Open Settings from the sidebar.",
      "In live mode, use the account section to change your password when needed.",
      "Restore demo data resets this browser’s training records; use it only when you intend to restart practice.",
    ],
    "Settings remains available even when an account has no selected financial pages.",
  );
  await fs.writeFile(path.join(directory, "screens.json"), JSON.stringify(pages, null, 2) + "\n");
  console.log(`Saved ${pages.length} screenshots and captions.`);
} finally {
  browser.close();
}
