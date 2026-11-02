import type { Branding } from "./branding";

export interface PrintDocument {
  title: string;
  description?: string;
  reference?: string;
  signatureLabels?: string[];
  fields?: [string, string][];
  columns?: string[];
  rows?: string[][];
  note?: string;
}

export interface PrintIdentity {
  barangay: string;
  fiscalYear: number;
  branding: Branding;
  demo: boolean;
  generatedAt: Date;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!;
  });
}

/** Give narrative columns room while keeping amounts readable in narrow schedules. */
function columnWeight(label: string) {
  if (/detail|description|particulars|purpose|budget line/i.test(label)) return 2.5;
  if (/account id|email|time/i.test(label)) return 1.8;
  return 1.3;
}

/** A self-contained document: no app navigation, controls, scripts or remote styles. */
export function renderPrintDocument(documents: PrintDocument[], identity: PrintIdentity) {
  if (!documents.length) throw new Error("Choose at least one document to export.");
  const { branding } = identity;
  const logo = /^https:\/\//i.test(branding.logoUrl)
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(identity.barangay)} logo" referrerpolicy="no-referrer">`
    : `<div class="mark">${escapeHtml(branding.markText)}</div>`;
  const generated = identity.generatedAt.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const landscape = documents.some((item) => (item.columns?.length ?? 0) > 5);
  const title = `${identity.barangay} - ${documents.length === 1 ? documents[0].title : "Financial reports"} - FY ${identity.fiscalYear}`;
  const content = documents
    .map((item) => {
      const fields = item.fields?.length
        ? `<section class="particulars"><h3>I. Record particulars</h3><dl>${item.fields.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>`
        : "";
      const columns = item.columns ?? [];
      const rows = item.rows ?? [];
      const totalWeight = columns.reduce((sum, column) => sum + columnWeight(column), 0);
      const numeric = (cell: string) => /^-?₱[\d,]+\.\d{2}$/.test(cell.trim());
      const moneyColumns = columns.map((_, index) => rows.some((row) => numeric(row[index] ?? "")));
      const table = columns.length
        ? `<section class="schedule"><h3>${fields ? "II" : "I"}. Schedule of records</h3><table><caption class="sr-only">${escapeHtml(item.title)}</caption><colgroup>${columns.map((column) => `<col style="width:${((columnWeight(column) / totalWeight) * 100).toFixed(2)}%">`).join("")}</colgroup><thead><tr>${columns.map((column, index) => `<th scope="col"${moneyColumns[index] ? ' class="amount"' : ""}>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((row) => `<tr>${row.map((cell, index) => `<td${moneyColumns[index] ? ' class="amount"' : ""}>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td class="empty" colspan="${columns.length}">No records for this document.</td></tr>`}</tbody></table><p class="record-count">End of schedule · ${rows.length} ${rows.length === 1 ? "entry" : "entries"}</p></section>`
        : "";
      const signatures = (item.signatureLabels ?? ["Prepared by", "Reviewed by"])
        .map(
          (label) =>
            `<div class="signature"><p class="signature-label">${escapeHtml(label)}:</p><div class="signature-space"></div><p class="signature-name">Signature over printed name</p><div class="signature-details"><p class="designation">Position / designation: <span></span></p><p class="designation">Date: <span></span></p></div></div>`,
        )
        .join("");
      return `<article>
      ${identity.demo ? '<div class="demo-banner">DEMO — sample records</div>' : ""}
      <header>${logo}<div class="letterhead"><p>Republic of the Philippines</p><h1>${escapeHtml(identity.barangay)}</h1><p class="office">Barangay Government</p></div><div aria-hidden="true"></div></header>
      <div class="document-heading"><h2>${escapeHtml(item.title)}</h2>${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ""}</div>
      <div class="document-meta"><p>Fiscal year ${identity.fiscalYear} · ${identity.demo ? "DEMO — sample records" : "Live records"}</p><p><strong>Copy:</strong> System record copy</p>${item.reference ? `<p><strong>Reference:</strong> ${escapeHtml(item.reference)}</p>` : ""}<p><strong>Generated:</strong> ${escapeHtml(generated)} (Asia/Manila)</p></div>
      ${fields}${table}
      ${item.note ? `<aside class="note"><strong>Record notes.</strong> ${escapeHtml(item.note)}</aside>` : ""}
      <div class="document-closing">${signatures ? `<section class="signatures" aria-label="Preparation and review signatures">${signatures}</section>` : ""}
      <footer><span>${escapeHtml(branding.appName)}${branding.organizationName ? ` · ${escapeHtml(branding.organizationName)}` : ""}</span><span>Computer-generated record · FY ${identity.fiscalYear}</span></footer></div>
    </article>`;
    })
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page {
        size: A4 ${landscape ? "landscape" : "portrait"}; margin: 15mm 14mm 18mm;
        @bottom-left { content: "System record copy"; font: 8pt Arial, sans-serif; color: #444; }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Arial, sans-serif; color: #444; }
      }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; background: #fff; font: 10pt/1.4 Arial, sans-serif; }
      article + article { break-before: page; }
      header { display: grid; grid-template-columns: 22mm minmax(0, 1fr) 22mm; align-items: center; gap: 5mm; text-align: center; border-bottom: 3px double #111; padding: 0 0 4mm; margin-bottom: 5mm; break-inside: avoid; }
      header img, .mark { width: 21mm; height: 21mm; object-fit: contain; }
      .mark { display: grid; place-items: center; border: 1px solid #777; font: bold 16pt Arial, sans-serif; }
      .letterhead { font-family: "Times New Roman", Times, serif; }
      header p { margin: 0; font-size: 11pt; }
      h1 { font-size: 17pt; line-height: 1.2; margin: 1.5mm 0; text-transform: uppercase; overflow-wrap: anywhere; }
      .office { font-size: 9pt; letter-spacing: 1.5px; text-transform: uppercase; }
      .document-heading { text-align: center; margin: 0 0 5mm; break-inside: avoid; break-after: avoid; }
      h2 { font: bold 14pt/1.3 "Times New Roman", Times, serif; text-transform: uppercase; letter-spacing: .6px; margin: 0; }
      .description { margin: 2mm auto 0; max-width: 85%; font-size: 9pt; }
      .document-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 5mm; border-top: 1px solid #111; border-bottom: 1px solid #111; padding: 2.5mm 0; margin-bottom: 5mm; font-size: 8.5pt; break-inside: avoid; }
      .document-meta p { margin: 0; overflow-wrap: anywhere; }
      h3 { font-size: 9pt; letter-spacing: .5px; text-transform: uppercase; margin: 5mm 0 2mm; break-after: avoid; }
      dl { display: grid; grid-template-columns: 1fr 1fr; margin: 0; border-left: 1px solid #555; border-top: 1px solid #555; }
      dl div { padding: 2.5mm 3mm; border-right: 1px solid #555; border-bottom: 1px solid #555; break-inside: avoid; }
      dl div:last-child:nth-child(odd) { grid-column: 1 / -1; }
      dt { font-size: 8pt; color: #444; } dd { margin: 1mm 0 0; font-size: 10pt; font-weight: bold; white-space: pre-wrap; overflow-wrap: anywhere; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: ${landscape ? "8" : "9"}pt; }
      thead { display: table-header-group; } tr { break-inside: avoid; }
      th, td { padding: 2.2mm 2mm; border: .6pt solid #555; text-align: left; vertical-align: top; overflow-wrap: anywhere; white-space: pre-wrap; }
      th { background: #eee; color: #111; font-size: 8pt; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .amount { text-align: right; font-variant-numeric: tabular-nums; } td.amount { white-space: nowrap; }
      .empty { text-align: center; padding: 6mm; } .record-count { text-align: right; margin: 2mm 0 0; font-size: 8pt; color: #444; }
      .note { margin-top: 5mm; padding: 2.5mm 0; border-top: 1px solid #888; font-size: 8pt; line-height: 1.5; overflow-wrap: anywhere; }
      .document-closing { break-inside: avoid; }
      .signatures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12mm; margin-top: 7mm; break-inside: avoid; }
      .signature { font-size: 9pt; } .signature-label { margin: 0; font-weight: bold; }
      .signature-space { height: 13mm; border-bottom: 1px solid #111; }
      .signature-name { margin: 1mm 0 3mm; text-align: center; font-size: 8pt; }
      .signature-details { display: grid; grid-template-columns: 1.5fr 1fr; gap: 4mm; }
      .designation { display: flex; gap: 2mm; margin: 2mm 0 0; font-size: 8pt; }
      .designation span { flex: 1; border-bottom: 1px solid #888; }
      footer { display: flex; justify-content: space-between; gap: 5mm; margin-top: 7mm; border-top: 1px solid #555; padding-top: 2mm; color: #444; font-size: 7pt; break-inside: avoid; }
      .demo-banner { border: 1.5px solid #111; padding: 1.5mm; margin-bottom: 4mm; text-align: center; font-size: 9pt; font-weight: bold; letter-spacing: 1px; }
      .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); }
      ${
        landscape
          ? `header { grid-template-columns: 18mm minmax(0, 1fr) 18mm; padding-bottom: 3mm; margin-bottom: 2mm; }
      header img, .mark { width: 16mm; height: 16mm; } h1 { font-size: 15pt; } header p { font-size: 10pt; }
      .document-heading { margin-bottom: 3mm; } h2 { font-size: 13pt; }
      .document-meta { gap: 1mm 5mm; padding: 2mm 0; margin-bottom: 3mm; }
      h3 { margin-top: 2mm; } th, td { padding: 1.2mm 2mm; }
      .note { margin-top: 3mm; padding: 1.5mm 0; line-height: 1.4; }
      .signatures { margin-top: 3mm; } .signature-space { height: 8mm; }
      .signature-name { margin-bottom: 1mm; } .designation { margin-top: 1.5mm; }
      footer { margin-top: 3mm; padding-top: 1.5mm; } .demo-banner { padding: 1mm; margin-bottom: 3mm; }`
          : ""
      }
    </style></head><body>${content}</body></html>`;
}

/** Wait for the actual logo before opening the browser's Print / Save as PDF dialog. */
export async function printDocuments(documents: PrintDocument[], identity: PrintIdentity) {
  const html = renderPrintDocument(documents, identity);
  const frame = document.createElement("iframe");
  frame.title = "Printable financial documents";
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "1123px",
    height: "794px",
    border: "0",
  });
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    clearTimeout(cleanupTimer);
    frame.remove();
  };
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("The document took too long to load. Try again.")),
        15000,
      );
      frame.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      frame.srcdoc = html;
      document.body.appendChild(frame);
    });
    const printWindow = frame.contentWindow;
    const printDocument = frame.contentDocument;
    if (!printWindow || !printDocument) throw new Error("Unable to prepare the PDF document.");
    const images = Array.from(printDocument.images);
    if (images.some((item) => !item.complete || item.naturalWidth === 0)) {
      throw new Error(
        "The barangay logo could not be loaded. Check the logo in White label and try again.",
      );
    }
    await Promise.all(images.map((item) => item.decode()));
    printWindow.addEventListener(
      "afterprint",
      () => {
        clearTimeout(cleanupTimer);
        cleanupTimer = setTimeout(cleanup, 1000);
      },
      { once: true },
    );
    // Some browsers omit afterprint on cancellation. Keep the frame long enough for the dialog.
    cleanupTimer = setTimeout(cleanup, 5 * 60 * 1000);
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}
