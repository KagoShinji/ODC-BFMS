import type { Branding } from "./branding";

export interface PrintDocument {
  title: string;
  description?: string;
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
        ? `<dl>${item.fields.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`
        : "";
      const table = item.columns?.length
        ? `<table><thead><tr>${item.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${item.rows?.length ? item.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${item.columns.length}">No records for this document.</td></tr>`}</tbody></table>`
        : "";
      return `<article>
      <header>${logo}<div><p>Republic of the Philippines</p><h1>${escapeHtml(identity.barangay)}</h1><p>Fiscal year ${identity.fiscalYear} · ${identity.demo ? "DEMO — sample records" : "Live records"}</p></div></header>
      <h2>${escapeHtml(item.title)}</h2>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      ${fields}${table}
      ${item.note ? `<p class="note">${escapeHtml(item.note)}</p>` : ""}
      <footer>${escapeHtml(branding.appName)}${branding.organizationName ? ` · ${escapeHtml(branding.organizationName)}` : ""}<br>Generated ${escapeHtml(generated)} (Asia/Manila)</footer>
    </article>`;
    })
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 14mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #172a3b; background: white; font: 11px/1.5 Arial, sans-serif; }
      article + article { break-before: page; }
      header { display: flex; align-items: center; justify-content: center; gap: 18px; text-align: center; border-bottom: 2px solid #172a3b; padding-bottom: 16px; margin-bottom: 20px; break-inside: avoid; }
      header img, .mark { width: 72px; height: 72px; object-fit: contain; flex-shrink: 0; }
      .mark { display: grid; place-items: center; border: 1px solid #526575; border-radius: 50%; font-size: 20px; font-weight: bold; }
      h1 { font-size: 21px; margin: 4px 0; } h2 { font-size: 17px; margin: 0 0 8px; }
      p { margin: 4px 0 12px; } header p { margin: 0; }
      dl { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; border: 1px solid #ccd2d6; padding: 16px; margin: 16px 0; }
      dl div { break-inside: avoid; } dt { font-size: 10px; color: #526575; } dd { margin: 3px 0 0; font-size: 12px; font-weight: bold; white-space: pre-wrap; overflow-wrap: anywhere; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; table-layout: fixed; }
      thead { display: table-header-group; } tr { break-inside: avoid; }
      th, td { padding: 8px; border: 1px solid #ccd2d6; text-align: left; vertical-align: top; overflow-wrap: anywhere; white-space: pre-wrap; }
      th { background: #f1f3f1; font-size: 10px; } .note { margin-top: 16px; padding: 10px; border: 1px solid #ccd2d6; }
      footer { margin-top: 24px; color: #526575; font-size: 9px; border-top: 1px solid #ccd2d6; padding-top: 8px; }
      h2 { break-after: avoid; }
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
