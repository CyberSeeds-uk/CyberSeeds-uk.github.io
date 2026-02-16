/* =========================================================
   /snapshot/snapshot-shell.js
   Cyber Seeds — Snapshot Shell (Web Component + Launcher)
   Local-first • Deterministic • Shame-free • Canon
   ========================================================= */

(() => {
  "use strict";

  const IS_SNAPSHOT_PAGE = location.pathname.startsWith("/snapshot");

  // Prevent double-loading
  if (window.__CS_SNAPSHOT_SHELL_LOADED__) return;
  window.__CS_SNAPSHOT_SHELL_LOADED__ = true;

  /* ---------------------------------------------------------
     1) Ensure SeedForge
  --------------------------------------------------------- */

  async function ensureSeedForge(){
    if (window.CSSeedForge?.load) return window.CSSeedForge;

    await import("/engine/seedforge.js");

    if (!window.CSSeedForge?.load){
      throw new Error("SeedForge failed to initialise.");
    }

    return window.CSSeedForge;
  }

  /* ---------------------------------------------------------
     2) Web Component
  --------------------------------------------------------- */

  class CyberSeedsSnapshot extends HTMLElement {

    constructor(){
      super();

      this.attachShadow({ mode: "open" });

      this.api = null;
      this.questions = [];
      this.answers = {};
      this.step = -1;

      this._refs = {};
      this._isOpen = false;
      this._completed = false;

      this._onKeydown = (e) => {
        if (!IS_SNAPSHOT_PAGE && e.key === "Escape" && this._isOpen){
          this.close();
        }
      };
    }

    /* ---------------- Lifecycle ---------------- */

    connectedCallback(){
      this.render();
      this.cacheRefs();
      this.bind();

      this.initialise().catch(err => {
        console.error("[Snapshot] init failed:", err);
        this.showError("The assessment engine didn’t load. Please refresh.");
      });
    }

    disconnectedCallback(){
      window.removeEventListener("keydown", this._onKeydown);
    }

    async initialise(){

      await ensureSeedForge();

      this.api = await window.CSSeedForge.load();

      const qRaw = this.api.questions;

      const list =
        Array.isArray(qRaw?.questions) ? qRaw.questions :
        Array.isArray(qRaw) ? qRaw :
        [];

      this.questions = list
        .slice()
        .sort((a,b) => (a.order ?? 9999) - (b.order ?? 9999));

      this.step = -1;
      this.answers = {};
      this._completed = false;

      this.renderIntro();
      this.setNavState();
    }

    /* ---------------- Render ---------------- */

    render(){

      const css = `
        :host{ display:block; }

        .wrap{ position:relative; }

        .backdrop{
          position:fixed;
          inset:0;
          background:rgba(10,18,17,.75);
          opacity:0;
          pointer-events:none;
          transition:.18s;
          z-index:9998;
        }

        .modal{
          position:fixed;
          left:50%;
          top:50%;
          transform:translate(-50%,-48%) scale(.98);
          width:min(860px, calc(100vw - 28px));
          max-height:82vh;
          background:#fff;
          border-radius:22px;
          box-shadow:0 40px 80px rgba(0,0,0,.25);
          opacity:0;
          pointer-events:none;
          transition:.18s;
          z-index:9999;
          display:flex;
          flex-direction:column;
          overflow:hidden;
          font-family:system-ui,sans-serif;
        }

        .is-open .backdrop{ opacity:1; pointer-events:auto; }

        .is-open .modal{
          opacity:1;
          pointer-events:auto;
          transform:translate(-50%,-50%) scale(1);
        }

        .top{
          padding:18px 20px;
          border-bottom:1px solid #dfecea;
          display:flex;
          justify-content:space-between;
          gap:12px;
        }

        .body{ padding:18px 20px; overflow:auto; }

        .footer{
          padding:14px 20px;
          border-top:1px solid #dfecea;
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:center;
          flex-wrap:wrap;
        }

        .btn{
          border-radius:999px;
          padding:10px 14px;
          border:1px solid #dfecea;
          background:#fff;
          cursor:pointer;
        }

        .btn.primary{
          background:#0f2f2a;
          color:#fff;
        }

        .btn[disabled]{
          opacity:.55;
          cursor:not-allowed;
        }

        .error{
          border:1px solid #c85050;
          background:#fceaea;
          padding:12px;
          border-radius:12px;
        }

        .progress-wrap{
          height:4px;
          background:#eef3f2;
          border-radius:999px;
          overflow:hidden;
          margin-bottom:10px;
        }

        .progress-bar{
          height:100%;
          width:0%;
          background:linear-gradient(90deg,#0f2f2a,#1a6a5d);
        }

        #csKicker{
          margin:0;
          font-size:13px;
          opacity:.85;
        }

        #csTitle{
          margin:4px 0 0;
          font-size:20px;
          line-height:1.2;
        }

        #csHint{
          margin:0 0 12px;
          padding:10px 12px;
          border:1px solid #dfecea;
          border-radius:12px;
          background:#f7fbfa;
        }

        #csPanel label{
          display:block;
          padding:10px 12px;
          border:1px solid #dfecea;
          border-radius:12px;
          margin:10px 0;
          cursor:pointer;
          user-select:none;
        }

        #csPanel input[type="radio"]{
          margin-right:10px;
        }

        .resultRow{ display:flex; gap:8px; flex-wrap:wrap; }
        .chip{
          display:inline-block;
          padding:6px 10px;
          border:1px solid #dfecea;
          border-radius:999px;
          font-size:12px;
          background:#ffffff;
        }

        #csMeta{
          font-size:12px;
          opacity:.8;
        }
      `;

      this.shadowRoot.innerHTML = `
        <style>${css}</style>

        <div class="wrap" aria-hidden="true">

          <div class="backdrop"></div>

          <section class="modal" role="dialog" aria-modal="true" aria-label="Cyber Seeds household snapshot">

            <header class="top">

              <div style="flex:1">

                <div class="progress-wrap">
                  <div class="progress-bar" id="csProgress"></div>
                </div>

                <p id="csKicker">Digital Household Snapshot</p>
                <h2 id="csTitle">See your home as a digital system</h2>

              </div>

              <button id="csClose" class="btn" type="button">Close</button>

            </header>

            <div class="body">

              <div id="csHint">
                This is a calm signal — not a test.
              </div>

              <div id="csPanel"></div>

            </div>

            <footer class="footer">

              <div id="csMeta">Takes about 2 minutes • You can stop anytime</div>

              <div>
                <button id="csBack" class="btn" type="button">Back</button>
                <button id="csNext" class="btn primary" type="button">Begin</button>
              </div>

            </footer>

          </section>

        </div>
      `;
    }

    cacheRefs(){

      const $ = s => this.shadowRoot.querySelector(s);

      this._refs = {
        wrap: $(".wrap"),
        backdrop: $(".backdrop"),
        close: $("#csClose"),
        panel: $("#csPanel"),
        kicker: $("#csKicker"),
        title: $("#csTitle"),
        hint: $("#csHint"),
        meta: $("#csMeta"),
        back: $("#csBack"),
        next: $("#csNext")
      };
    }

    bind(){

      this._refs.close.addEventListener("click", () => this.close());
      this._refs.backdrop.addEventListener("click", () => this.close());

      window.addEventListener("keydown", this._onKeydown);

      this._refs.back.addEventListener("click", () => this.onBack());
      this._refs.next.addEventListener("click", () => this.onNext());
    }

    /* ---------------- Open / Close ---------------- */

    open(){

      if (!this._refs.wrap) return;

      this._isOpen = true;

      this._refs.wrap.classList.add("is-open");
      this._refs.wrap.setAttribute("aria-hidden", "false");

      if (!IS_SNAPSHOT_PAGE){
        document.body.classList.add("modal-open");
      }

      this._refs.close?.focus();
    }

    close(){

      if (IS_SNAPSHOT_PAGE){
        if (this._completed){
          window.location.replace("/resources/");
        }
        return;
      }

      const midRun =
        !this._completed &&
        this.step >= 0 &&
        this.step < this.questions.length;

      if (midRun){
        const ok = confirm("Leave the snapshot? Your answers won’t be saved.");
        if (!ok) return;
      }

      this._isOpen = false;

      this._refs.wrap.classList.remove("is-open");
      this._refs.wrap.setAttribute("aria-hidden", "true");

      document.body.classList.remove("modal-open");
    }

    /* ---------------- UI ---------------- */

    showError(msg){

      this._refs.panel.innerHTML = `
        <div class="error">
          <strong>Unable to continue</strong>
          <p>${msg}</p>
        </div>
      `;

      this._refs.back.disabled = true;
      this._refs.next.disabled = true;
    }

    setNavState(){

      const hasQuestions = this.questions.length > 0;

      this._refs.back.disabled = this.step <= 0;

      if (!hasQuestions){
        this._refs.next.disabled = true;
        return;
      }

      if (this._completed){
        this._refs.next.textContent = "Close";
        this._refs.next.disabled = false;
        return;
      }

      if (this.step < 0){
        this._refs.next.textContent = "Begin";
        this._refs.next.disabled = false;
        this._setProgress(0);
        return;
      }

      const last = this.questions.length - 1;
      const q = this.questions[this.step];

      const answered = Number.isInteger(this.answers[q.id]);

      this._refs.next.textContent =
        this.step >= last ? "Finish" : "Next";

      this._refs.next.disabled = !answered;

      const pct = ((this.step + 1) / this.questions.length) * 100;

      this._setProgress(pct);
    }

    _setProgress(pct){

      const bar = this.shadowRoot.getElementById("csProgress");

      if (bar){
        bar.style.width = `${pct}%`;
      }
    }

    renderIntro(){

      this._refs.kicker.textContent = "Cyber Seeds household snapshot";
      this._refs.title.textContent = "See your home as a digital system";

      this._refs.panel.innerHTML = `
        <p>
          This short check-in looks at how your household’s
          network, devices, accounts, messages, and wellbeing
          quietly interact.
        </p>

        <p>
          It creates a calm, practical signal you can use
          to reduce stress and build digital resilience over time.
        </p>

        <div class="resultRow" style="margin:12px 0;">
          <span class="chip">Five connected systems</span>
          <span class="chip">Local-only results</span>
          <span class="chip">Clear next steps</span>
        </div>

        <p style="margin-top:12px; color:var(--muted);">
          Nothing is uploaded. Everything stays on this device.
        </p>
      `;
    }

    renderQuestion(){

      const q = this.questions[this.step];
      if (!q) return;

      this._refs.kicker.textContent = q.lens ? `Lens: ${q.lens}` : "Question";
      this._refs.title.textContent = q.prompt || "Question";

      const name = `q-${q.id}`;
      const current = this.answers[q.id];

      const options = (q.options || []).map((o,i) => {

        const checked = current === i;

        return `
          <label>
            <input type="radio"
                   name="${name}"
                   value="${i}"
                   ${checked ? "checked" : ""}>
            ${o.label || `Option ${i+1}`}
          </label>
        `;
      }).join("");

      this._refs.panel.innerHTML = options;

      this._refs.panel
        .querySelectorAll(`input[name="${name}"]`)
        .forEach(radio => {

          radio.addEventListener("change", () => {

            this.answers[q.id] = Number(radio.value);

            this.setNavState();
          });
        });
    }

    /* ---------------- Navigation ---------------- */

    onBack(){

      if (this._completed){
        // Once complete, Back is disabled, but guard anyway.
        return;
      }

      if (this.step <= 0){
        this.step = -1;
        this.renderIntro();
        this.setNavState();
        return;
      }

      this.step--;

      this.renderQuestion();
      this.setNavState();
    }

    onNext(){

      if (this._completed){
        if (IS_SNAPSHOT_PAGE){
          window.location.replace("/resources/");
        } else {
          this.close();
        }
        return;
      }

      if (this.step < 0){
        this.step = 0;
        this.renderQuestion();
        this.setNavState();
        return;
      }

      const last = this.questions.length - 1;

      if (this.step >= last){
        this.finish();
        return;
      }

      this.step++;

      this.renderQuestion();
      this.setNavState();
    }

    /* ---------------- Finish ---------------- */

    /* ---------------- Finish ---------------- */

finish(){

  // Guard: prevent double-submit / double-click
  if (this._completed) return;

  try{

    const scored = this.api.scoreAnswers(this.answers);

    const now = Date.now();
    const total = Math.round(scored?.hdss || 0);
    const canonical = {
      schema: "cs.snapshot.v3",
      timestamp: now,
      id: scored?.snapshotId || String(now),
      total,
      ...scored,
      lenses: scored?.lensPercents || {},
      answers: this.answers || {}
    };

    // 1) Save snapshot (local-first)
    localStorage.setItem(
      "cyberseeds_snapshot_latest_v3",
      JSON.stringify(canonical)
    );

    localStorage.setItem(
      "cyberseeds_snapshot_v3",
      JSON.stringify(canonical)
    );

    // Optional but useful: keep a simple history timeline
    // (safe even if you already have a richer history elsewhere)
    try{
      const historyKey = "cyberseeds_snapshot_history_v3";
      const prev = JSON.parse(localStorage.getItem(historyKey) || "[]");
      const next = [canonical, ...prev].slice(0, 24);
      localStorage.setItem(historyKey, JSON.stringify(next));
    }catch{}

    // 2) Notify system (reader/platform/hub can react if still on same page)
    window.dispatchEvent(
      new CustomEvent("cs:snapshot-updated", {
        detail: { snapshot: canonical }
      })
    );

    // 3) Mark complete locally (stops the “leave snapshot?” confirm)
    this._completed = true;

    if (!IS_SNAPSHOT_PAGE){
      document.body.classList.remove("modal-open");
    }

    window.location.replace("/resources/");

  } catch(e){

    console.error("[Snapshot] finish failed:", e);

    this.showError("Could not finalise snapshot. Please refresh and try again.");
  }
}

    renderComplete(snapshot){

      this._completed = true;

      this._refs.kicker.textContent = "Snapshot complete";
      this._refs.title.textContent = "Thank you for checking in";

      this._refs.panel.innerHTML = `
        <p>Your snapshot has been saved locally.</p>
      `;

      this._refs.back.disabled = true;
      this._refs.next.textContent = "Close";
      this._refs.next.disabled = false;

      this.setNavState();
    }
  }

  /* ---------------------------------------------------------
     3) Register
  --------------------------------------------------------- */

  if (!customElements.get("cyber-seeds-snapshot")){
    customElements.define("cyber-seeds-snapshot", CyberSeedsSnapshot);
  }

  /* ---------------------------------------------------------
     4) Ensure Element
  --------------------------------------------------------- */

  function ensureSnapshotElement(){

    let el = document.querySelector("cyber-seeds-snapshot");

    if (el) return el;

    el = document.createElement("cyber-seeds-snapshot");

    document.body.appendChild(el);

    return el;
  }

  /* ---------------------------------------------------------
     5) Bind Launchers
  --------------------------------------------------------- */

  function bindLaunchers(){

    document.addEventListener("click", (e) => {

      const btn = e.target.closest("[data-open-snapshot]");

      if (!btn) return;

      e.preventDefault();

      const snap = ensureSnapshotElement();

      snap.open();
    });
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */

  if (document.readyState === "loading"){

    document.addEventListener("DOMContentLoaded", () => {
      ensureSnapshotElement();
      bindLaunchers();
    });

  } else {

    ensureSnapshotElement();
    bindLaunchers();
  }

})();
