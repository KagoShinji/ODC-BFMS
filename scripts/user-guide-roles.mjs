const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

export function renderRoleGuides(html, roles, screens) {
  html = html.replace(/\s*<!-- role-pages:start -->[\s\S]*?<!-- role-pages:end -->/g, "");
  html = html.replace(/\s*<!-- role-styles:start -->[\s\S]*?<!-- role-styles:end -->/g, "");
  const titles = {
    "roles-request": "Encoder and Procurement officer: prepare the handoff.",
    "roles-review": "Budget officer and Approver: check and decide.",
    "roles-treasury": "Treasurer and Collector: payment and matching.",
    "roles-audit": "Auditor, Administrator and Super admin: oversight and access.",
  };
  const shortcuts = roles
    .map((role) => `<a href="#role-${role.id}">${escape(role.name)}</a>`)
    .join("");
  html = html.replace(
    "</head>",
    `<!-- role-styles:start -->
<style>
  #action-access table td, #action-access table th { padding:5px 11px; }
  .role-shortcuts { display:flex;flex-wrap:wrap;gap:7px 14px;font-size:11px;font-weight:700; }
  .role-shortcuts a { color:#9d4316; }
  .role-summary { padding:16px; }
  .role-summary h3 { font-size:17px; }
  .role-summary ol { margin:12px 0;padding-left:19px;font-size:12px;line-height:1.5; }
  .role-summary li { margin-bottom:8px; }
  .role-summary .role-note { font-size:11px;line-height:1.5; }
  .role-flow { background:#eaf3fa;border-left:4px solid #47829f;padding:11px 14px;font-size:12px;font-weight:700;line-height:1.5; }
  .role-layout { display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px;align-items:start; }
  .role-layout .system-figure figcaption { font-size:10px; }
  .role-live { margin-top:13px;border:1px solid #d9e3e8;border-radius:10px;padding:12px 14px;background:#f1f5f7;font-size:11px;line-height:1.5; }
  .role-live strong { display:block;font-size:12px;margin-bottom:5px; }
  .role-live p { font-size:11px; }
  .role-actions { margin:0;padding:0;list-style:none;counter-reset:role-step; }
  .role-actions li { counter-increment:role-step;position:relative;padding-left:29px;margin-bottom:10px;font-size:11.5px;line-height:1.45; }
  .role-actions li::before { content:counter(role-step);position:absolute;left:0;top:0;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#ee6b26;color:white;font-size:10px;font-weight:800; }
  .role-actions strong { display:block;font-size:12px;margin-bottom:3px; }
  .role-actions a { color:#9d4316;font-size:10px;font-weight:700; }
  .role-handoff { border-top:2px solid #d9e3e8;padding-top:10px;font-size:11px;line-height:1.5; }
  .role-handoff strong { color:#146d56;display:block;margin-bottom:4px;font-size:12px; }
  .role-playbook header h1 { font-size:28px; }
  .role-playbook header { margin-bottom:16px; }
  .role-playbook .body { gap:12px; }
  @media screen and (max-width:700px) { .role-layout { grid-template-columns:1fr; } }
</style><!-- role-styles:end -->\n</head>`,
  );
  for (const [group, title] of Object.entries(titles)) {
    const members = roles.filter((role) => role.group === group);
    const overview = `<section class="sheet" id="${group}" aria-labelledby="title-${group}">
      <header><div class="eyebrow"><span>ODC / ROLE PLAYBOOKS</span><span>CHOOSE YOUR RESPONSIBILITY</span></div><h1 id="title-${group}">${escape(title)}</h1><p>Start with your role below. Each dedicated page gives six numbered steps, an actual screen, live permissions and the next owner.</p></header>
      <div class="body">
        <nav class="role-shortcuts" aria-label="Choose your role">${shortcuts}</nav>
        <div class="grid ${members.length === 3 ? "three" : "two"}">${members.map((role) => `<article class="card role-summary"><a class="jump" href="#role-${role.id}">Open ${escape(role.name)} walkthrough →</a><h3>${escape(role.name)}</h3><ol>${role.steps.map((step) => `<li>${escape(step.title)}</li>`).join("")}</ol><p class="role-note">${escape(role.access)}</p></article>`).join("")}</div>
        <aside class="callout"><strong>The handoff needs a reference and an owner</strong><p>Use the same source-case, DV or receipt reference across checks. Give the next person the reference, evidence and result through your established process; the app does not send a workflow task automatically. Page checkboxes control viewing, while assigned roles control the supported financial actions.</p></aside>
      </div><footer><span>Based on current roles, page defaults, finance API and financial screens · Demo pictures illustrate shared screens</span><span class="page-no"></span></footer>
    </section>`;
    const pages = members
      .map((role) => {
        const image = screens.find((screen) => screen.id === role.image);
        if (!image) throw Error(`Missing role image ${role.image}`);
        for (const step of role.steps)
          if (!screens.some((screen) => screen.id === step.screen))
            throw Error(`Missing linked screen ${step.screen}`);
        return `<section class="sheet role-playbook" id="role-${role.id}" aria-labelledby="title-role-${role.id}">
        <header><div class="eyebrow"><span>ODC / YOUR ROLE, STEP BY STEP</span><span>${escape(role.name.toUpperCase())}</span></div><h1 id="title-role-${role.id}">${escape(role.name)} — your six-step flow.</h1><p>Follow the sequence, confirm your allowed actions, then pass the record to the next owner.</p></header>
        <div class="body">
          <div class="role-flow">${escape(role.flow)}</div>
          <div class="role-layout">
            <div><figure class="system-figure"><a href="user-guide/${role.image}.png" target="_blank" rel="noopener"><img src="user-guide/${role.image}.png" width="1920" height="1230" alt="${escape(role.name)} workflow illustration: ${escape(image.title)}; captured with a Super admin demo account" /></a><figcaption>Actual shared application screen · Super admin demo capture. This is not a ${escape(role.name)} login capture; menus and buttons may differ with your account. Open the numbered step’s screen link for a larger illustration.</figcaption></figure><aside class="role-live"><strong>What this role can do in the current live app</strong><p>${escape(role.access)}</p></aside></div>
            <div><ol class="role-actions">${role.steps.map((step) => `<li><strong>${escape(step.title)} <a href="#screen-${step.screen}">Screen →</a></strong><p>${escape(step.text)}</p></li>`).join("")}</ol><aside class="role-handoff"><strong>What to pass on, and to whom</strong><p>${escape(role.handoff)}</p></aside></div>
          </div>
        </div><footer><a href="#${group}">← Back to role choices</a><span>Live access depends on active role + selected barangay + allowed pages</span><span class="page-no"></span></footer>
      </section>`;
      })
      .join("\n");
    const pattern = new RegExp(`<section class="sheet" id="${group}"[\\s\\S]*?</section>`);
    if (!pattern.test(html)) throw Error(`Missing role group ${group}`);
    html = html.replace(
      pattern,
      overview + `\n<!-- role-pages:start -->\n${pages}\n<!-- role-pages:end -->`,
    );
  }
  return html;
}
