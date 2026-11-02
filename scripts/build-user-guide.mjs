import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderRoleGuides } from "./user-guide-roles.mjs";
import { renderFlowcharts } from "./user-guide-flowcharts.mjs";

const source = fileURLToPath(new URL("../docs/user-flow-and-role-guide.html", import.meta.url));
const screens = JSON.parse(
  await fs.readFile(new URL("../docs/user-guide/screens.json", import.meta.url), "utf8"),
);
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
let html = await fs.readFile(source, "utf8");
// Replace generated content in place, preserving the authored workflow and role chapters.
html = html.replace(/\s*<!-- visual-page:start -->[\s\S]*?<!-- visual-page:end -->/g, "");
html = html.replace(/\s*<!-- visual-links:start -->[\s\S]*?<!-- visual-links:end -->/g, "");
html = html.replace(/\s*<!-- visual-styles:start -->[\s\S]*?<!-- visual-styles:end -->/g, "");
html = html.replace(/<option data-visual[^>]*>[\s\S]*?<\/option>/g, "");
const styles = `
<!-- visual-styles:start -->
<style>
  .visual-layout { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 1fr); gap: 22px; align-items: start; }
  .system-figure { margin: 0; min-width: 0; }
  .system-figure a { display: block; }
  .system-figure img { display: block; width: 100%; height: auto; border: 1px solid #d9e3e8; border-radius: 10px; }
  .system-figure figcaption { color: #526778; font-size: 10px; line-height: 1.5; padding-top: 10px; }
  .visual-instructions ol { padding: 0; margin: 0; list-style: none; counter-reset: visual-step; }
  .visual-instructions li { counter-increment: visual-step; position: relative; padding: 0 0 18px 31px; font-size: 13px; line-height: 1.55; }
  .visual-instructions li::before { content: counter(visual-step); position: absolute; left: 0; top: 0; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: #ee6b26; color: white; font-size: 11px; font-weight: 800; }
  .visual-result { border-top: 2px solid #d9e3e8; padding-top: 13px; margin-top: 5px; }
  .visual-result strong { color: #146d56; font-size: 12px; }
  .visual-result p { margin-top: 7px; font-size: 12px; color: #526778; line-height: 1.55; }
  .visual-pager { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; font-weight: 700; margin-top: 15px; }
  .visual-links { font-size: 11px; padding-top: 9px; color: #9d4316; font-weight: 700; }
  .visual-sheet header { margin-bottom: 18px; }
  .visual-sheet header h1 { font-size: 27px; }
  .visual-sheet .body { gap: 12px; }
  @media screen and (max-width: 1159px) { .visual-layout { grid-template-columns: minmax(0, 3fr) minmax(0, 1fr); } }
  @media screen and (max-width: 700px) { .visual-layout { grid-template-columns: 1fr; } .visual-instructions { padding-top: 8px; } }
</style>
<!-- visual-styles:end -->`;
html = html.replace("</head>", styles + "\n</head>");
for (const chapter of [...new Set(screens.map((screen) => screen.chapter))]) {
  const group = screens.filter((screen) => screen.chapter === chapter);
  const chapterPattern = new RegExp(`(<section class="sheet" id="${chapter}"[\\s\\S]*?</section>)`);
  const original = html.match(chapterPattern);
  if (!original) throw new Error(`Missing chapter ${chapter}`);
  const link = `<!-- visual-links:start --><p class="visual-links"><a href="#screen-${group[0].id}">See the actual screens → ${group.length} illustrated steps</a></p><!-- visual-links:end -->`;
  const withLink = original[1].replace(/(<header>[\s\S]*?)(<\/header>)/, `$1${link}$2`);
  const illustrated = group
    .map((screen, index) => {
      const previous = group[index - 1];
      const next = group[index + 1];
      return `<!-- visual-page:start -->
<section class="sheet visual-sheet" id="screen-${escape(screen.id)}" aria-labelledby="title-screen-${escape(screen.id)}">
  <header>
    <div class="eyebrow"><span>ODC / SEE IT IN THE SYSTEM</span><span>SCREEN ${index + 1} OF ${group.length} · DEMO</span></div>
    <h1 id="title-screen-${escape(screen.id)}">${escape(screen.title)}</h1>
    <p>Follow these steps in your workspace. Where shown, an orange outline marks the control to use.</p>
  </header>
  <div class="body">
    <div class="visual-layout">
      <figure class="system-figure">
        <a href="user-guide/${escape(screen.id)}.png" target="_blank" rel="noopener" aria-label="Open full-size screenshot: ${escape(screen.title)}"><img src="user-guide/${escape(screen.id)}.png" width="1920" height="1230" alt="${escape(screen.title)} — actual BFMS screen with synthetic training records" /></a>
        <figcaption>Actual application capture · Super admin demo · ${escape(screen.capturedOn || "31 October 2026")}. Names, references and amounts are training examples. <span class="screen-tip-inline">Open the image to zoom.</span></figcaption>
      </figure>
      <aside class="visual-instructions" aria-label="Steps and expected result">
        <ol>${screen.steps.map((step) => `<li>${escape(step)}</li>`).join("")}</ol>
        <div class="visual-result"><strong>What you should see</strong><p>${escape(screen.result)}</p></div>
        <nav class="visual-pager" aria-label="Walkthrough navigation">
          ${previous ? `<a href="#screen-${escape(previous.id)}">← Previous screen</a>` : ""}
          ${next ? `<a href="#screen-${escape(next.id)}">Next screen →</a>` : ""}
          <a href="#${chapter}">Workflow notes ↗</a>
        </nav>
      </aside>
    </div>
  </div>
  <footer><span>Demo capture · Live buttons and available pages depend on your account access</span><span class="page-no"></span></footer>
</section>
<!-- visual-page:end -->`;
    })
    .join("\n");
  html = html.replace(chapterPattern, withLink + "\n" + illustrated);
}
const roles = JSON.parse(
  await fs.readFile(new URL("../docs/user-guide/roles.json", import.meta.url), "utf8"),
);
html = renderRoleGuides(html, roles, screens);
html = await renderFlowcharts(html);
// Rebuild the page dropdown from the final page order, including each screenshot page.
const sections = [
  ...html.matchAll(
    /<section class="sheet(?: [^"]+)?" id="([^"]+)"[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/g,
  ),
];
const total = sections.length;
const options = sections
  .map((match, index) => {
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    return `<option value="${match[1]}"${match[1].startsWith("screen-") ? ' data-visual="true"' : ""}>${String(index + 1).padStart(2, "0")} · ${title}</option>`;
  })
  .join("\n");
html = html.replace(/(<select id="chapter">)[\s\S]*?(<\/select\s*>)/, `$1\n${options}\n$2`);
let number = 0;
html = html.replace(
  /<span class="page-no">[\s\S]*?<\/span>/g,
  () => `<span class="page-no">${String(++number).padStart(2, "0")} / ${total}</span>`,
);
if (number !== total) throw new Error("Page count and footer count disagree.");
html = html.replace(
  /(<span class="count" id="position">)[^<]*(<\/span\s*>)/,
  (_, start, end) => `${start}1 / ${total}${end}`,
);
await fs.writeFile(source, html);
// Provide a short, standalone chart booklet alongside the complete handbook.
const chartPages = [
  ...html.matchAll(/<section\s+class="sheet flowchart-sheet"[\s\S]*?<\/section>/g),
].map((match) => match[0]);
if (chartPages.length !== 7) throw new Error("The flowchart booklet needs all seven charts.");
let chartNumber = 0;
const chartContent = chartPages
  .join("\n")
  .replace(
    /<span class="page-no">[\s\S]*?<\/span>/g,
    () => `<span class="page-no">${++chartNumber} / ${chartPages.length}</span>`,
  );
let chartBook = html.replace(/<main>[\s\S]*?<\/main>/, `<main>${chartContent}</main>`);
const chartSections = sections.filter((match) => match[1].startsWith("flow-"));
const chartOptions = chartSections
  .map(
    (match, index) =>
      `<option value="${match[1]}">${index + 1} · ${match[2].replace(/<[^>]+>/g, "").trim()}</option>`,
  )
  .join("\n");
chartBook = chartBook.replace(
  /(<select id="chapter">)[\s\S]*?(<\/select\s*>)/,
  `$1\n${chartOptions}\n$2`,
);
chartBook = chartBook.replace(
  /(<span class="count" id="position">)[^<]*(<\/span\s*>)/,
  (_, start, end) => `${start}1 / ${chartPages.length}${end}`,
);
chartBook = chartBook.replace(
  /href="#(?!flow-)([^"]+)"/g,
  'href="user-flow-and-role-guide.html#$1"',
);
chartBook = chartBook.replaceAll(
  'href="user-flow-and-role-guide.pdf"',
  'href="role-flowcharts.pdf"',
);
chartBook = chartBook.replace(
  /<title>[\s\S]*?<\/title>/,
  "<title>ODC BFMS — Role-based system flowcharts</title>",
);
chartBook = chartBook.replace(
  /(<meta\s+name="description"\s+content=")[^"]*("\s*\/>)/,
  "$1Role-based system flowcharts showing BFMS setup, spending, procurement, advances, collections, reporting and handoffs.$2",
);
chartBook = chartBook.replace("ODC / USER HANDBOOK", "ODC / ROLE FLOWCHARTS");
chartBook = chartBook.replace(
  /<div class="screen-tip">[\s\S]*?<\/div>/,
  '<div class="screen-tip">Follow the role labels, numbered steps and decision arrows. Open a diagram to zoom. <a href="user-flow-and-role-guide.html">Full illustrated handbook →</a></div>',
);
await fs.writeFile(new URL("../docs/role-flowcharts.html", import.meta.url), chartBook);
console.log(
  `Updated handbook: ${total} pages, including ${screens.length} actual screen captures.`,
);
