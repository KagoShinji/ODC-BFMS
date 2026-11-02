# Handbook screenshots

The handbook contains actual application screenshots captured on 31 October 2026 with synthetic records in a dedicated local **Super admin demo** session. Orange outlines identify the relevant control or record. Each image has numbered instructions and an expected result in the handbook. Open an image in the HTML edition to view it at full size.

The demo omits live-only barangay onboarding, branding scope selection, initial staff passwords and password changes. The handbook identifies these differences instead of presenting a demo screen as a live screen. No live financial records or environment secrets are captured.

`roles.json` defines the nine role playbooks: Encoder, Procurement officer, Budget officer, Approver, Treasurer, Collector, Auditor, Administrator and Super admin. Each has six steps, links to full screen walkthroughs, current live permissions and a next-owner handoff. Role illustrations reuse the shared demo screens and are explicitly labeled as Super admin demo captures; they do not impersonate separate role sessions. Update permissions against `roles.ts`, page access, the finance API and database functions when the app changes.

`flowcharts.json` defines seven role-labeled diagrams: whole-system overview, setup/access, spending/approval/payment, procurement, advances, collections/matching, and reporting/oversight. Edit this file to change nodes, role labels, live savers, branch decisions or connections. `build-user-guide.mjs` generates the SVG files in `flowcharts/`, the editable Mermaid reference in `../role-flowcharts.md`, the chart-only HTML booklet, and the flowchart pages near the beginning of the full handbook. SVG charts stay sharp at any zoom and work offline. The PDF export also writes `../role-flowcharts.pdf` with only the seven charts.

## Refresh the screenshots

The capture tools require Node.js 22 or newer and a Chromium browser. Run all commands from the repository root. Use a disposable browser profile; the script resets cookies and local storage in that browser and creates training records. It refuses non-local origins and checks that the sign-in page is in demo mode before entering any records.

1. Build the current app with `npm run build`, then start a local demo server in a separate terminal:

   ```sh
   DATA_PROVIDER=demo DEMO_LOGIN_EMAIL=demo@odc.local DEMO_LOGIN_PASSWORD=demo1234 DEMO_AUTH_SECRET=guide-local-capture-only npm run start -- --hostname 127.0.0.1 --port 3121
   ```

2. Start a dedicated browser. On macOS with Brave:

   ```sh
   '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' --headless --disable-gpu --no-first-run --no-default-browser-check --remote-debugging-port=9341 --user-data-dir=/private/tmp/bfms-visual-guide-browser about:blank
   ```

3. Run `npm run guide:capture`. This walks through the real forms and confirmations, writes PNGs and `screens.json`, then inserts the screenshot pages beside their workflow chapters and rebuilds the role playbooks from `roles.json`. The authored workflow chapters are preserved. Review the images and captions after changes to the app.
4. Run `npm run guide:pdf`. This checks image loading, internal links, page numbering, desktop/print overflow, mobile width and chapter navigation before exporting the PDF. It requires only the isolated browser; the app server is not needed for this step.
5. Stop the demo server and close the dedicated browser when finished.

`GUIDE_ORIGIN` and `GUIDE_BROWSER_PORT` override the local server address and browser debugging port. Run `node scripts/build-user-guide.mjs` to rebuild the HTML from existing captures and captions without recapturing the app. Keep the PNGs beside the HTML for offline use; the PDF embeds its images.
