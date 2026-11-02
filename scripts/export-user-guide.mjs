import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { guideBrowser } from "./guide-browser.mjs";

const source = new URL("../docs/user-flow-and-role-guide.html", import.meta.url);
const destination = new URL("../docs/user-flow-and-role-guide.pdf", import.meta.url);
const browser = await guideBrowser();
const { call, evaluate, until } = browser;
try {
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1200,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call("Emulation.setEmulatedMedia", { media: "screen" });
  await call("Page.navigate", { url: source.href });
  await until("document.readyState === 'complete' && !!document.querySelector('.visual-sheet')");
  await evaluate("document.fonts.ready.then(() => true)");
  await evaluate("Promise.all([...document.images].map(i=>i.decode())).then(()=>true)");
  const checks = await evaluate(`(() => {
    const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
    return {
      pages: document.querySelectorAll('.sheet').length,
      screens: new Set([...document.querySelectorAll('.system-figure img')].map(img=>img.src)).size,
      roleFlows: [...document.querySelectorAll('.role-playbook')].map(page=>({id:page.id,steps:page.querySelectorAll('.role-actions li').length,handoff:!!page.querySelector('.role-handoff'),access:!!page.querySelector('.role-live')})),
      flowcharts: [...document.querySelectorAll('.flowchart-sheet')].map(page=>({id:page.id,image:!!page.querySelector('.chart-figure img'),notes:page.querySelectorAll('.chart-note').length})),
      missingImages: [...document.images].filter(i=>!i.complete || !i.naturalWidth).length,
      duplicateIds: ids.filter((id,i)=>ids.indexOf(id)!==i),
      brokenLinks: [...document.querySelectorAll('a[href^="#"]')].map(a=>a.hash.slice(1)).filter(id=>!document.getElementById(id)),
      options: document.querySelectorAll('#chapter option').length
    };
  })()`);
  assert.equal(checks.pages, checks.options);
  assert.ok(checks.screens >= 30);
  assert.equal(checks.missingImages, 0);
  assert.deepEqual(checks.duplicateIds, []);
  assert.deepEqual(checks.brokenLinks, []);
  assert.equal(checks.roleFlows.length, 9);
  assert.equal(checks.flowcharts.length, 7);
  assert.ok(
    checks.flowcharts.every((chart) => chart.image && chart.notes === 2),
    "Each flowchart needs its diagram and operational notes",
  );
  assert.ok(
    checks.roleFlows.every((role) => role.steps === 6 && role.handoff && role.access),
    "Each role needs six steps, current access and a handoff",
  );
  for (const media of ["screen", "print"]) {
    await call("Emulation.setEmulatedMedia", { media });
    const overflow = await evaluate(`([...document.querySelectorAll('.sheet')].map(s=>{
      const footer=s.querySelector('footer').getBoundingClientRect();
      const body=s.querySelector('.body');
      const bottom=Math.max(...[...body.children].map(c=>c.getBoundingClientRect().bottom));
      return {id:s.id,overlap:Math.round(bottom-footer.top),overflow:s.scrollHeight-s.clientHeight};
    })).filter(s=>s.overlap>0 || s.overflow>1)`);
    assert.deepEqual(overflow, [], `${media} page overflow: ${JSON.stringify(overflow)}`);
  }
  const pdf = await call("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    generateTaggedPDF: true,
    generateDocumentOutline: true,
  });
  // Chromium emits each landscape sheet as one page. Confirm no accidental extra pages.
  const buffer = Buffer.from(pdf.data, "base64");
  const pageCount = [...buffer.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length;
  assert.equal(pageCount, checks.pages, "Exported PDF page count differs from the handbook");
  await fs.writeFile(destination, buffer);
  await call("Emulation.setEmulatedMedia", { media: "screen" });
  await evaluate(
    "document.getElementById('chapter').value='screen-voucher-payment'; document.getElementById('chapter').dispatchEvent(new Event('change'))",
  );
  assert.equal(await evaluate("location.hash"), "#screen-voucher-payment");
  await call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    true,
    "Mobile page is wider than viewport",
  );
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1200,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call("Page.navigate", {
    url: new URL("../docs/role-flowcharts.html", import.meta.url).href,
  });
  await until(
    "document.readyState==='complete' && document.querySelectorAll('.flowchart-sheet').length===7",
  );
  await evaluate("Promise.all([...document.images].map(i=>i.decode())).then(()=>true)");
  const chartChecks = await evaluate(
    `({pages:document.querySelectorAll('.sheet').length,options:document.querySelectorAll('#chapter option').length,broken:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.hash.slice(1)).filter(id=>!document.getElementById(id))})`,
  );
  assert.equal(chartChecks.pages, 7);
  assert.equal(chartChecks.options, 7);
  assert.deepEqual(chartChecks.broken, []);
  await call("Emulation.setEmulatedMedia", { media: "print" });
  const chartPdf = await call("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    generateTaggedPDF: true,
    generateDocumentOutline: true,
  });
  const chartBuffer = Buffer.from(chartPdf.data, "base64");
  assert.equal([...chartBuffer.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length, 7);
  await fs.writeFile(new URL("../docs/role-flowcharts.pdf", import.meta.url), chartBuffer);
  await call("Emulation.setEmulatedMedia", { media: "screen" });
  await call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(
    await evaluate("document.documentElement.scrollWidth<=innerWidth"),
    true,
    "Flowchart booklet exceeds mobile viewport",
  );
  await evaluate(
    "document.getElementById('chapter').value='flow-collections'; document.getElementById('chapter').dispatchEvent(new Event('change'))",
  );
  assert.equal(await evaluate("location.hash"), "#flow-collections");
  console.log(
    JSON.stringify(
      {
        ...checks,
        pdfPages: pageCount,
        pdfBytes: buffer.length,
        destination: fileURLToPath(destination),
        navigation: "passed",
        mobile: "passed",
        flowchartBooklet: { pages: 7, pdfBytes: chartBuffer.length },
      },
      null,
      2,
    ),
  );
} finally {
  browser.close();
}
