import fs from "node:fs/promises";

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const nodeWidth = 180;
const nodeHeight = 92;
const validRoles = new Set([
  "superadmin",
  "administrator",
  "encoder",
  "procurement",
  "budget",
  "approver",
  "treasurer",
  "collector",
  "auditor",
  "all-users",
  "accountable-person",
]);

function port(node, side) {
  return {
    left: [node.x, node.y + nodeHeight / 2],
    right: [node.x + nodeWidth, node.y + nodeHeight / 2],
    top: [node.x + nodeWidth / 2, node.y],
    bottom: [node.x + nodeWidth / 2, node.y + nodeHeight],
  }[side];
}

function svgDiagram(chart) {
  const nodes = new Map(chart.nodes.map((node) => [node.id, node]));
  const connections = chart.edges
    .map((edge) => {
      const start = port(nodes.get(edge.from), edge.fromPort || "right");
      const end = port(nodes.get(edge.to), edge.toPort || "left");
      const points = [start, ...(edge.via || []), end];
      const stroke = edge.failure ? "#a63b2c" : edge.dashed ? "#788d9a" : "#486a7d";
      const path = `<polyline points="${points.map((point) => point.join(",")).join(" ")}" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round" ${edge.dashed ? 'stroke-dasharray="5 4"' : ""} marker-end="url(#arrow-${edge.failure ? "failure" : edge.dashed ? "handoff" : "normal"})"/>`;
      return path;
    })
    .join("");
  const labels = chart.edges
    .filter((edge) => edge.label)
    .map((edge) => {
      const [x, y] = edge.labelAt;
      const width = edge.label.length * 5.6 + 14;
      return `<g aria-label="${escape(edge.label)}"><rect x="${x - width / 2}" y="${y - 9}" width="${width}" height="18" rx="4" fill="white"/><text x="${x}" y="${y + 3.4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${edge.failure ? "#a63b2c" : "#355569"}">${escape(edge.label)}</text></g>`;
    })
    .join("");
  const boxes = chart.nodes
    .map((node) => {
      const decision = node.kind === "decision";
      const fill = decision ? "#fff5df" : node.tone === "live" ? "#ecf7f1" : "#f0f5fa";
      const border = decision ? "#d5ab4e" : node.tone === "live" ? "#6ea48c" : "#a7bdcb";
      const shape = decision
        ? `<polygon points="${node.x + 90},${node.y} ${node.x + 180},${node.y + 46} ${node.x + 90},${node.y + 92} ${node.x},${node.y + 46}" fill="${fill}" stroke="${border}" stroke-width="1.4"/>`
        : `<rect x="${node.x}" y="${node.y}" width="180" height="92" rx="9" fill="${fill}" stroke="${border}" stroke-width="1.3"/>`;
      const textX = node.x + (decision ? 90 : 12);
      const anchor = decision ? "middle" : "start";
      const firstY = node.y + (decision ? 39 : 42);
      const role = decision ? "DECISION / CHECK" : node.role;
      const roleY = node.y + (decision ? 24 : 19);
      const roleSize = decision ? 8.3 : 10.4;
      const body = `${shape}<text x="${textX}" y="${roleY}" text-anchor="${anchor}" font-size="${roleSize}" font-weight="800" fill="${decision ? "#85631e" : node.tone === "live" ? "#22644b" : "#355569"}">${escape(role)}</text>${node.lines.map((line, index) => `<text x="${textX}" y="${firstY + index * 16}" text-anchor="${anchor}" font-size="${decision ? 12.2 : 12.4}" font-weight="700" fill="#173147">${escape(line)}</text>`).join("")}${decision ? "" : `<text x="${node.x + 12}" y="${node.y + 78}" font-size="9.7" fill="#526778">${escape(node.save)}</text>`}`;
      const detail = [node.role || "Decision", ...node.lines, node.save].join(" — ");
      const link = ["all-users", "accountable-person"].includes(node.roleId)
        ? "signin"
        : `role-${node.roleId}`;
      return `<a href="../../user-flow-and-role-guide.html#${link}"><g class="flow-node" data-node-id="${node.id}" data-role="${node.roleId}"><title>${escape(detail)}</title>${body}</g></a>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1040 ${chart.height}" width="1040" height="${chart.height}" role="img" aria-labelledby="chart-title chart-description">
<title id="chart-title">${escape(chart.title)}</title><desc id="chart-description">${escape(chart.description)} ${escape(chart.nodes.map((node) => [node.role || "Decision", ...node.lines, node.save].join(": ")).join(". "))}</desc>
<defs>${[
    ["normal", "#486a7d"],
    ["failure", "#a63b2c"],
    ["handoff", "#788d9a"],
  ]
    .map(
      ([name, color]) =>
        `<marker id="arrow-${name}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker>`,
    )
    .join("")}</defs>
<style>text{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}a{text-decoration:none}.flow-node:hover{filter:drop-shadow(0 2px 3px #17314733)}</style>
<rect width="1040" height="${chart.height}" fill="white"/>${connections}${boxes}${labels}
</svg>\n`;
}

function mermaidDiagram(chart) {
  const safe = (value) => String(value).replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  const rows = chart.nodes.map((node) => {
    const label = [node.role || "Decision / check", ...node.lines, node.save]
      .map(safe)
      .join("<br/>");
    return `  ${node.id}${node.kind === "decision" ? `{"${label}"}` : `["${label}"]`}:::${node.kind === "decision" ? "decision" : node.tone || "check"}`;
  });
  const edges = chart.edges.map(
    (edge) =>
      `  ${edge.from} ${edge.dashed ? "-.->" : "-->"}${edge.label ? `|"${safe(edge.label)}"|` : ""} ${edge.to}`,
  );
  return [
    "flowchart LR",
    ...rows,
    ...edges,
    "  classDef live fill:#ecf7f1,stroke:#6ea48c,color:#173147",
    "  classDef check fill:#f0f5fa,stroke:#a7bdcb,color:#173147",
    "  classDef decision fill:#fff5df,stroke:#d5ab4e,color:#173147",
  ].join("\n");
}

export async function renderFlowcharts(html) {
  const charts = JSON.parse(
    await fs.readFile(new URL("../docs/user-guide/flowcharts.json", import.meta.url), "utf8"),
  );
  const chartIds = new Set(charts.map((chart) => chart.id));
  if (chartIds.size !== charts.length) throw Error("Duplicate flowchart ID");
  const coveredRoles = new Set(charts.flatMap((chart) => chart.nodes.map((node) => node.roleId)));
  for (const role of validRoles) {
    if (!["all-users", "accountable-person"].includes(role) && !coveredRoles.has(role))
      throw Error(`Role missing from flowcharts: ${role}`);
  }
  const directory = new URL("../docs/user-guide/flowcharts/", import.meta.url);
  await fs.mkdir(directory, { recursive: true });
  for (const chart of charts) {
    const nodes = new Set(chart.nodes.map((node) => node.id));
    if (nodes.size !== chart.nodes.length) throw Error(`Duplicate nodes in ${chart.id}`);
    for (const node of chart.nodes) {
      if (!validRoles.has(node.roleId)) throw Error(`Unknown role ${node.roleId}`);
      if (
        node.x < 0 ||
        node.y < 0 ||
        node.x + nodeWidth > 1040 ||
        node.y + nodeHeight > chart.height
      )
        throw Error(`Node ${node.id} exceeds chart bounds`);
      if (
        node.kind === "decision" &&
        chart.edges.filter((edge) => edge.from === node.id).length < 2
      )
        throw Error(`Decision ${node.id} needs both outcomes`);
    }
    for (const edge of chart.edges) {
      if (!nodes.has(edge.from) || !nodes.has(edge.to))
        throw Error(`Broken connection in ${chart.id}`);
      if (edge.label && !edge.labelAt) throw Error(`Unpositioned label in ${chart.id}`);
    }
    const reached = new Set([chart.nodes[0].id]);
    const pending = [chart.nodes[0].id];
    while (pending.length) {
      const current = pending.shift();
      for (const edge of chart.edges.filter((item) => item.from === current)) {
        if (!reached.has(edge.to)) {
          reached.add(edge.to);
          pending.push(edge.to);
        }
      }
    }
    if (reached.size !== nodes.size) throw Error(`Disconnected steps in ${chart.id}`);
    for (const link of chart.links)
      if (!chartIds.has(link)) throw Error(`Broken chart link ${link}`);
    await fs.writeFile(new URL(`${chart.id}.svg`, directory), svgDiagram(chart));
  }
  const mermaid = `# BFMS — role-based system flowcharts

These charts describe the checked-out application reviewed on 31 October 2026. Each box identifies the responsible role; its final line identifies who saves or which screen to use. SA means Super admin. Office checks and evidence handoffs use your established process; they are not automatic workflow tasks or additional approval screens.

Open the [illustrated handbook](user-flow-and-role-guide.html#flow-system) or [PDF](user-flow-and-role-guide.pdf) for the fixed-layout, printable charts. The SVG files below stay sharp when enlarged and link to the role playbooks. This source also includes Mermaid diagrams for editing and repository previews.

Live permissions: Super admin creates/submits financial records, posts receipts/matching and settles advances. An assigned Approver can approve/reject submitted DVs; an assigned Treasurer can record payments. Other staff check and coordinate within their permitted pages. Ordinary self-approval is blocked. These charts do not add permissions or certify official procedures.

${charts
  .map(
    (chart) => `## ${chart.title}

${chart.description}

![${chart.title}](user-guide/flowcharts/${chart.id}.svg)

${chart.notes.map((note) => `- ${note}`).join("\n")}

<details>
<summary>Editable Mermaid flowchart</summary>

\`\`\`mermaid
${mermaidDiagram(chart)}
\`\`\`

</details>`,
  )
  .join("\n\n")}
`;
  await fs.writeFile(new URL("../docs/role-flowcharts.md", import.meta.url), mermaid);
  html = html.replace(/\s*<!-- flowchart-pages:start -->[\s\S]*?<!-- flowchart-pages:end -->/g, "");
  html = html.replace(
    /\s*<!-- flowchart-styles:start -->[\s\S]*?<!-- flowchart-styles:end -->/g,
    "",
  );
  const styles = `<!-- flowchart-styles:start --><style>
  .flowchart-sheet header { margin-bottom:12px; }
  .flowchart-sheet h1 { font-size:28px; }
  .flowchart-sheet .body { gap:8px; }
  .chart-shortcuts { display:flex;flex-wrap:wrap;gap:7px 15px;font-size:10.5px;font-weight:700; }
  .chart-shortcuts a { color:#9d4316; }
  .chart-figure { margin:0;min-width:0; }
  .chart-figure img { display:block;width:100%;height:auto;max-height:440px;object-fit:contain; }
  .chart-legend { display:flex;flex-wrap:wrap;gap:14px;font-size:10px;color:#526778; }
  .chart-legend span { display:flex;align-items:center;gap:5px; }
  .chart-swatch { display:inline-block;width:12px;height:12px;border:1px solid #a7bdcb;border-radius:3px;background:#f0f5fa; }
  .chart-swatch.live { border-color:#6ea48c;background:#ecf7f1; }
  .chart-swatch.decision { border-color:#d5ab4e;background:#fff5df;transform:rotate(45deg);border-radius:0; }
  .chart-notes { display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:10.5px;line-height:1.5; }
  .chart-note { border-top:2px solid #d9e3e8;padding-top:8px; }
  .chart-figure figcaption { font-size:10px;line-height:1.4;color:#526778;margin-top:4px; }
  @media screen and (max-width:700px) { .chart-notes { grid-template-columns:1fr; } .chart-figure { overflow-x:auto; } .chart-figure img { min-width:900px; } }
  </style><!-- flowchart-styles:end -->`;
  html = html.replace("</head>", styles + "\n</head>");
  const pages = charts
    .map(
      (
        chart,
      ) => `<section class="sheet flowchart-sheet" id="flow-${chart.id}" aria-labelledby="title-flow-${chart.id}">
    <header><div class="eyebrow"><span>ODC / FOLLOW THE ROLE AND THE ARROW</span><span>CURRENT SYSTEM FLOW</span></div><h1 id="title-flow-${chart.id}">${escape(chart.title)}</h1><p>${escape(chart.description)}</p></header>
    <div class="body">
      <nav class="chart-shortcuts" aria-label="Flowchart and role links">${chart.links.map((id) => `<a href="#flow-${id}">${escape(charts.find((item) => item.id === id).title.split(":")[0])} →</a>`).join("")}${(
        chart.roles || []
      )
        .map(
          (id) =>
            `<a href="#role-${id}">${escape(
              id === "procurement"
                ? "Procurement officer"
                : id
                    .replace("superadmin", "Super admin")
                    .replace("administrator", "Administrator")
                    .replace(/^./, (c) => c.toUpperCase()),
            )} steps ↗</a>`,
        )
        .join("")}</nav>
      <figure class="chart-figure"><a href="user-guide/flowcharts/${chart.id}.svg" target="_blank" rel="noopener" aria-label="Open full-size flowchart: ${escape(chart.title)}"><img src="user-guide/flowcharts/${chart.id}.svg" width="1040" height="${chart.height}" alt="${escape(chart.title)} Each box identifies the responsible role, numbered action and current live saver. Follow labeled branches and arrows." /></a><figcaption>Follow numbered boxes and arrowheads. Solid arrow = next step; dashed arrow = handoff or retry; red branch = resolve before continuing. Open the diagram to zoom or use its role links.</figcaption></figure>
      <div class="chart-legend"><span><i class="chart-swatch live"></i>Live action by the named authorized role</span><span><i class="chart-swatch"></i>Review / coordinate; read the save line</span><span><i class="chart-swatch decision"></i>Decision or check, as described in the notes</span></div>
      <div class="chart-notes">${chart.notes.map((note) => `<p class="chart-note">${escape(note)}</p>`).join("")}</div>
    </div><footer><a href="role-flowcharts.md">Editable chart source</a><span>Current access: roles.ts · finance API · page access · financial screens</span><span class="page-no"></span></footer>
  </section>`,
    )
    .join("\n");
  const cover = /(<section class="sheet" id="start"[\s\S]*?<\/section>)/;
  if (!cover.test(html)) throw Error("Missing handbook cover");
  return html.replace(
    cover,
    `$1\n<!-- flowchart-pages:start -->\n${pages}\n<!-- flowchart-pages:end -->`,
  );
}
