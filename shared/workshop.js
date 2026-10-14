/* Shared engine for every training page.
   A training page defines window.TRAINING (see understanding-ai/index.html)
   and loads this file; everything else is drawn from that. */
(function () {
  const SITE = window.SITE_CONFIG || {};
  const T = window.TRAINING;
  const SECTIONS = T.sections;
  const SHEET_URL = T.sheetUrl || SITE.sheetUrl || "";
  const STORE_KEY = "nsciTrainings." + T.id;

  /* ---------- page skeleton ---------- */
  document.body.classList.add("training");
  document.title = T.title;
  const depts = (SITE.departments || []).map(d => `<option>${d}</option>`).join("");
  document.body.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <a class="home" href="../">← All trainings</a>
        <div class="bar"></div>
        <h1>${T.title}</h1>
        <p>${T.subtitle || ""}${SITE.presenter ? ` · ${SITE.presenter}` : ""}</p>
      </div>
      <div class="profile">
        <label for="name">Your name</label>
        <input id="name" placeholder="First and last name" autocomplete="name">
        <label for="dept">Department</label>
        <select id="dept"><option value="">Choose…</option>${depts}</select>
      </div>
      <nav id="nav"></nav>
    </aside>
    <main id="main"></main>`;

  /* ---------- saved state (per training, per browser) ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
  const state = load();
  state.answers = state.answers || {};
  state.done = state.done || [];
  state.sessionId = state.sessionId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  // name and department are shared across trainings
  try {
    const who = JSON.parse(localStorage.getItem("nsciTrainings.profile")) || {};
    state.name = state.name || who.name || "";
    state.dept = state.dept || who.dept || "";
  } catch (e) { /* storage unavailable */ }
  let current = Math.min(state.current || 0, SECTIONS.length - 1);

  function save() {
    state.current = current;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      localStorage.setItem("nsciTrainings.profile", JSON.stringify({ name: state.name, dept: state.dept }));
    } catch (e) { /* storage unavailable: fine */ }
  }

  const nameEl = document.getElementById("name");
  const deptEl = document.getElementById("dept");
  nameEl.value = state.name;
  deptEl.value = state.dept;
  nameEl.addEventListener("input", () => { state.name = nameEl.value; nameEl.classList.remove("missing"); save(); });
  deptEl.addEventListener("change", () => { state.dept = deptEl.value; deptEl.classList.remove("missing"); save(); });

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function secId(i) { return SECTIONS[i].id || "s" + (i + 1); }

  function questionList(i) {
    const s = SECTIONS[i], a = s.activity, list = [], id = secId(i);
    if (a.parts) a.parts.forEach((p, pi) => p.questions.forEach((q, qi) => list.push({ key: `${id}-p${pi}q${qi}`, text: q, part: p.label })));
    else a.questions.forEach((q, qi) => list.push({ key: `${id}-q${qi}`, text: q }));
    return list;
  }

  /* ---------- drawing ---------- */
  function renderNav() {
    document.getElementById("nav").innerHTML = SECTIONS.map((s, i) => {
      const done = state.done.includes(secId(i));
      return `
      <button class="sec-btn ${i === current ? "active" : ""} ${done ? "done" : ""}" data-go="${i}">
        <span class="num">${done ? "✓" : i + 1}</span>
        <span>${s.title}<span class="meta">${s.mins || ""}${s.slides ? ` · slides ${s.slides}` : ""}</span></span>
      </button>
      <div class="sub ${i === current ? "open" : ""}">
        <a href="#video" data-go="${i}" data-anchor="video">▶ Video</a>
        <a href="#slides" data-go="${i}" data-anchor="slides">▤ Slides</a>
        <a href="#activity" data-go="${i}" data-anchor="activity">✎ Activity</a>
      </div>`;
    }).join("");
  }

  function renderMain() {
    const s = SECTIONS[current], a = s.activity;
    let lastPart = null, qs = "";
    questionList(current).forEach(q => {
      if (q.part && q.part !== lastPart) { qs += `<p class="part">${q.part}</p>`; lastPart = q.part; }
      qs += `<div class="q"><label for="${q.key}">${q.text}</label>
        <textarea id="${q.key}" data-key="${q.key}">${esc(state.answers[q.key] || "")}</textarea></div>`;
    });

    const video = s.youtubeId
      ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(s.youtubeId)}?rel=0" title="${esc(s.title)} video" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`
      : `<div class="video"><span>Video coming soon</span></div>`;

    const slides = s.slidesPdf
      ? `<iframe class="slides-frame" src="${encodeURI(s.slidesPdf)}" title="${esc(s.title)} slides"></iframe>
         <a class="btn-link" href="${encodeURI(s.slidesPdf)}" target="_blank" rel="noopener">Open these slides in a new tab →</a>`
      : `<div class="placeholder">Slides${s.slides ? " " + s.slides : ""} coming soon</div>`;

    const isDone = state.done.includes(secId(current));
    document.getElementById("main").innerHTML = `
      ${SHEET_URL ? "" : `<div class="banner">Saving isn't connected yet: answers are kept in this browser only.</div>`}
      <div class="eyebrow">Section ${current + 1} of ${SECTIONS.length}</div>
      <h2 class="title">${s.title}</h2>
      ${s.lede ? `<p class="lede">${s.lede}</p>` : ""}

      <h3 class="block" id="video">Video <small>${s.mins || ""}</small></h3>
      ${video}

      <h3 class="block" id="slides">Slides <small>${s.slides ? "slides " + s.slides : ""}</small></h3>
      ${slides}

      <h3 class="block" id="activity">Activity <small>${a.time || "about 5–8 min"}</small></h3>
      <div class="activity">
        <h4>${a.name}</h4>
        ${a.instr ? `<p class="instr">${a.instr}</p>` : ""}
        ${a.prompts ? a.prompts.map(p => `<span class="prompt">${esc(p)}</span>`).join("") : ""}
        ${a.seeds ? `<div class="seeds">Stuck? Ideas: ${a.seeds}</div>` : ""}
        ${qs}
        <div class="submit-row">
          <button class="submit" id="submitBtn">${isDone ? "Update answers" : "Submit answers"}</button>
          <span class="status" id="status"></span>
        </div>
      </div>

      <div class="nextbar">
        <button ${current === 0 ? "disabled" : ""} data-go="${current - 1}">← Previous section</button>
        <button ${current === SECTIONS.length - 1 ? "disabled" : ""} data-go="${current + 1}">Next section →</button>
      </div>`;

    document.querySelectorAll("textarea[data-key]").forEach(t =>
      t.addEventListener("input", () => { state.answers[t.dataset.key] = t.value; save(); }));
    document.getElementById("submitBtn").addEventListener("click", submitSection);
  }

  function go(i, anchor) {
    if (i !== current) { current = i; save(); renderNav(); renderMain(); }
    if (anchor) document.getElementById(anchor).scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", e => {
    const el = e.target.closest("[data-go]");
    if (!el || el.disabled) return;
    e.preventDefault();
    go(Number(el.dataset.go), el.dataset.anchor);
  });

  /* ---------- submitting ---------- */
  async function submitSection() {
    const s = SECTIONS[current];
    const status = document.getElementById("status");
    const btn = document.getElementById("submitBtn");
    status.className = "status";

    if (!state.name || !state.name.trim() || !state.dept) {
      if (!state.name || !state.name.trim()) nameEl.classList.add("missing");
      if (!state.dept) deptEl.classList.add("missing");
      status.className = "status err";
      status.textContent = "Please add your name and department in the sidebar first.";
      (state.name ? deptEl : nameEl).focus();
      return;
    }

    const rows = questionList(current).map(q => ({
      section: `${current + 1}. ${s.title}`,
      activity: s.activity.name,
      part: q.part || "",
      question: q.text,
      answer: state.answers[q.key] || ""
    }));
    if (!rows.some(r => r.answer.trim())) {
      status.className = "status err";
      status.textContent = "Please answer at least one question before submitting.";
      return;
    }

    if (SHEET_URL) {
      btn.disabled = true;
      status.textContent = "Saving…";
      try {
        // text/plain avoids a CORS preflight; Apps Script reads the body as JSON.
        await fetch(SHEET_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            training: T.title, name: state.name.trim(), department: state.dept,
            sessionId: state.sessionId, rows
          })
        });
      } catch (e) {
        btn.disabled = false;
        status.className = "status err";
        status.textContent = "Couldn't save. Check your connection and try again; your answers are still here.";
        return;
      }
      btn.disabled = false;
    }

    if (!state.done.includes(secId(current))) state.done.push(secId(current));
    save();
    renderNav();
    btn.textContent = "Update answers";
    status.className = "status ok";
    status.textContent = SHEET_URL ? "✓ Saved. Thank you!" : "✓ Saved in this browser (sheet not connected).";
  }

  renderNav();
  renderMain();
})();
