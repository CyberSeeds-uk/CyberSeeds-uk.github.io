/* =========================================================
   /snapshot/snapshot-shell.js
   Cyber Seeds — Snapshot Shell (Web Component + Launcher)
   Local-first • Deterministic • Shame-free • Canon
   ========================================================= */

(() => {
  "use strict";

  // Prevent double-loading if this file is included twice
  if (window.__CS_SNAPSHOT_SHELL_LOADED__) return;
  window.__CS_SNAPSHOT_SHELL_LOADED__ = true;

  // ---------------------------------------------------------
  // 1) Ensure the engine exists (SeedForge)
  // ---------------------------------------------------------
  async function ensureSeedForge(){
    if (window.CSSeedForge?.load) return window.CSSeedForge;
    // ✅ correct path: engine lives in /engine/
    await import("/engine/seedforge.js");
    if (!window.CSSeedForge?.load){
      throw new Error("SeedForge engine did not initialise.");
    }
    return window.CSSeedForge;
  }

  // ---------------------------------------------------------
  // 2) Web Component
  // ---------------------------------------------------------
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
        if (e.key === "Escape" && this._isOpen) this.close();
      };
    }

    /* ---------------- Lifecycle ---------------- */

    connectedCallback(){
      this.render();
      this.cacheRefs();
      this.bind();

      this.initialise().catch((err) => {
        console.error("[CyberSeedsSnapshot] initialise failed:", err);
        this.showError("The assessment engine didn’t load. Please refresh and try again.");
      });
    }

    disconnectedCallback(){
      window.removeEventListener("keydown", this._onKeydown);
    }

    async initialise(){
      await ensureSeedForge();
      this.api = await window.CSSeedForge.load();

      // Normalise question structure
      const qRaw = this.api.questions;
      const list =
        Array.isArray(qRaw?.questions) ? qRaw.questions :
        Array.isArray(qRaw) ? qRaw :
        [];

      this.questions = list
        .slice()
        .sort((a,b) => (a.order ?? 9999) - (b.order ?? 9999));

      // Reset state
      this.step = -1;
      this.answers = {};

      this.renderIntro();
      this.setNavState();
    }

    /* ---------------- Render ---------------- */

    render(){
      const css = `
        :host{
          --ink:#14201e;
          --muted:#51615f;
          --brand:#0f2f2a;
          --brand2:#1a6a5d;
          --mint:#e8f6f5;
          --mint2:#eef7f6;
          --line:#dfecea;
          --radius:16px;
          --radius2:22px;
          display:block;
        }

        .wrap{ position:relative; }

        .backdrop{
          position:fixed;
          inset:0;
          background:rgba(10,18,17,.75);
          backdrop-filter:blur(4px);
          opacity:0;
          pointer-events:none;
          transition:opacity .18s ease;
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
          border:1px solid rgba(0,0,0,.06);
          border-radius:var(--radius2);
          box-shadow:0 40px 80px rgba(0,0,0,.25);
          opacity:0;
          pointer-events:none;
          transition:opacity .18s ease, transform .18s ease;
          z-index:9999;
          display:flex;
          flex-direction:column;
          overflow:hidden;
          font-family:system-ui,-apple-system,Segoe UI,sans-serif;
        }

        .is-open .backdrop{ opacity:1; pointer-events:auto; }
        .is-open .modal{
          opacity:1; pointer-events:auto;
          transform:translate(-50%,-50%) scale(1);
        }

        .top{
          padding:18px 20px;
          background:linear-gradient(180deg,var(--mint2),#fff);
          border-bottom:1px solid var(--line);
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:flex-start;
        }

        .kicker{ color:var(--muted); font-size:.92rem; margin:0; }
        .title{ color:var(--ink); font-size:1.18rem; margin:6px 0 0; line-height:1.25; }

        .close{
          border:1px solid var(--line);
          background:#fff;
          border-radius:12px;
          padding:8px 12px;
          cursor:pointer;
          color:var(--ink);
        }
        .close:focus{ outline:3px solid rgba(26,106,93,.25); outline-offset:2px; }

        .body{ padding:18px 20px; overflow:auto; line-height:1.6; }

        .hint{
          background:linear-gradient(180deg,#f2faf9,#fff);
          border:1px solid var(--line);
          border-radius:var(--radius);
          padding:12px;
          margin-bottom:14px;
          color:var(--muted);
          font-size:.96rem;
        }

        .choices{ display:grid; gap:10px; }
        .choice{
          border:1px solid var(--line);
          border-radius:16px;
          padding:14px;
          background:#fff;
          display:flex;
          gap:12px;
          cursor:pointer;
          transition:.18s ease;
        }
        .choice:hover{ border-color:rgba(26,106,93,.45); background:var(--mint2); }
        .choice input{ margin-top:3px; accent-color:var(--brand2); }
        .choice:has(input:checked){
          border-color:var(--brand);
          background:#eef7f6;
        }

        .reassure{
          color:var(--muted);
          font-size:.92rem;
          margin:12px 0 0 0;
          border-left:3px solid var(--mint);
          padding-left:10px;
        }

        .footer{
          padding:14px 20px;
          border-top:1px solid var(--line);
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:center;
          background:#fff;
        }

        .btn{
          border-radius:999px;
          padding:10px 14px;
          border:1px solid var(--line);
          background:#fff;
          cursor:pointer;
          font-weight:600;
          color:var(--ink);
        }
        .btn.primary{
          background:var(--brand);
          border-color:var(--brand);
          color:#fff;
        }
        .btn:disabled{ opacity:.55; cursor:not-allowed; }

        .meta{ color:var(--muted); font-size:.92rem; }

        .resultCard{
          border:1px solid var(--line);
          border-radius:var(--radius);
          background:#f6fbfa;
          padding:14px;
        }
        .resultRow{ display:flex; gap:12px; flex-wrap:wrap; margin-top:10px; }
        .chip{
          border:1px solid var(--line);
          border-radius:999px;
          padding:8px 10px;
          background:#fff;
          font-size:.92rem;
          color:var(--ink);
        }

        .error{
          border:1px solid rgba(200,80,80,.35);
          background:rgba(200,80,80,.08);
          padding:12px;
          border-radius:var(--radius);
          color:var(--ink);
        }

        .progress-wrap{
          width:100%;
          height:4px;
          background:#eef3f2;
          border-radius:999px;
          overflow:hidden;
          margin-bottom:8px;
        }
        .progress-bar{
          height:100%;
          width:0%;
          background:linear-gradient(90deg,var(--brand),var(--brand2));
          transition:.4s;
        }
      `;

      this.shadowRoot.innerHTML = `
        <style>${css}</style>

        <div class="wrap" aria-hidden="true">
          <div class="backdrop"></div>

          <section class="modal" role="dialog" aria-modal="true" aria-label="Cyber Seeds snapshot">
            <header class="top">
              <div style="flex:1">
                <div class="progress-wrap">
                  <div class="progress-bar" id="csProgress"></div>
                </div>
                <p class="kicker" id="csKicker">Household snapshot</p>
                <h2 class="title" id="csTitle">A calm check-in</h2>
              </div>
              <button class="close" id="csClose" type="button" aria-label="Close">Close</button>
            </header>

            <div class="body">
              <div class="hint" id="csHint">This is a calm check-in — not a test.</div>
              <div id="csPanel"></div>
            </div>

            <footer class="footer">
              <div class="meta" id="csMeta">Ready when you are.</div>
              <div style="display:flex; gap:10px;">
                <button class="btn" id="csBack" type="button">Back</button>
                <button class="btn primary" id="csNext" type="button">Begin</button>
              </div>
            </footer>
          </section>
        </div>
      `;
    }

    cacheRefs(){
      const $ = s => this.shadowRoot.querySelector(s);

      this._refs.wrap     = $(".wrap");
      this._refs.backdrop = $(".backdrop");
      this._refs.modal    = $(".modal");
      this._refs.close    = $("#csClose");
      this._refs.panel    = $("#csPanel");
      this._refs.kicker   = $("#csKicker");
      this._refs.title    = $("#csTitle");
      this._refs.hint     = $("#csHint");
      this._refs.meta     = $("#csMeta");
      this._refs.back     = $("#csBack");
      this._refs.next     = $("#csNext");
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
      this._completed = false; 
      this._refs.wrap.classList.add("is-open");
      this._refs.wrap.setAttribute("aria-hidden","false");
      document.body.classList.add("modal-open");

      // helpful: focus close for keyboard users
      try { this._refs.close?.focus?.(); } catch {}
    }

    close(){

     // Only warn if unfinished
      const midRun =
        !this._completed &&
        this.step >= 0 &&
        this.step < (this.questions.length || 0);
   
      if (midRun){
        const ok = confirm("Leave the snapshot? Your answers won’t be saved.");
        if (!ok) return;
      }
   
      if (!this._refs.wrap) return;
   
      this._isOpen = false;
   
      this._refs.wrap.classList.remove("is-open");
      this._refs.wrap.setAttribute("aria-hidden","true");
   
      document.body.classList.remove("modal-open");
    }
    /* ---------------- UI ---------------- */

    showError(msg){
      this._refs.panel.innerHTML = `
        <div class="error">
          <strong>Unable to continue.</strong>
          <div style="margin-top:6px">${msg}</div>
        </div>
      `;
      this._refs.back.disabled = true;
      this._refs.next.disabled = true;
      this._refs.meta.textContent = "Please refresh and try again.";
    }

    setNavState(){
      const hasQuestions = this.questions.length > 0;

      this._refs.back.disabled = (this.step <= 0);
      this._refs.next.disabled = false;

      if (!hasQuestions){
        this._refs.next.disabled = true;
        this._refs.next.textContent = "Unavailable";
        return;
      }

      if (this.step < 0){
        this._refs.next.textContent = "Begin";
        this._refs.meta.textContent = "Ready when you are.";
        this._setProgress(0);
        return;
      }

      const last = this.questions.length - 1;
      const q = this.questions[this.step];
      const answered = q && Number.isInteger(this.answers[q.id]);

      this._refs.next.textContent = (this.step >= last) ? "Finish" : "Next";
      this._refs.next.disabled = !answered;

      this._refs.meta.textContent =
        `Step ${this.step + 1} of ${this.questions.length} — you’re doing well`;

      const pct = ((this.step + 1) / this.questions.length) * 100;
      this._setProgress(pct);
    }

    _setProgress(pct){
      const bar = this.shadowRoot.getElementById("csProgress");
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }

    renderIntro(){
      this._refs.kicker.textContent = "Household snapshot";
      this._refs.title.textContent  = "A calm check-in";

      this._refs.panel.innerHTML = `
        <p>You’ll answer a few short questions.</p>

        <div class="resultRow">
          <span class="chip">Overall signal</span>
          <span class="chip">Trajectory</span>
          <span class="chip">Risk pressure</span>
          <span class="chip">One focus lens</span>
        </div>

        <p style="margin-top:12px">
          Nothing is uploaded. Results stay on this device.
        </p>
      `;
    }

    renderQuestion(){
      const q = this.questions[this.step];
      if (!q) return;

      this._refs.kicker.textContent = "Snapshot question";
      this._refs.title.textContent  = q.prompt || "Question";

      const name = `q-${q.id}`;
      const current = this.answers[q.id];

      const options = (q.options || []).map((o,i) => {
        const checked = Number.isInteger(current) && current === i;
        const label = o.label || `Option ${i + 1}`;

        return `
          <label class="choice">
            <input type="radio" name="${name}" value="${i}" ${checked ? "checked" : ""} />
            <div>${label}</div>
          </label>
        `;
      }).join("");

      this._refs.panel.innerHTML = `
        <div class="choices" role="radiogroup" aria-label="${q.prompt || "Question"}">
          ${options}
        </div>
        <p class="reassure">
          ${q.reassurance || "There are no right or wrong answers here."}
        </p>
      `;

      this._refs.panel
        .querySelectorAll(`input[name="${name}"]`)
        .forEach(radio => {
          radio.addEventListener("change", () => {
            this.answers[q.id] = Number(radio.value);
            this.setNavState();
          });
        });
    }

       function renderDonut(lenses, signal, focusLens){

        if (!lenses || !signal) return;
      
        setDonutText(signal);
        setDonutSegments(lenses, focusLens);
      
        // Legend numbers
        const mapId = {
          network: "donutValNetwork",
          devices: "donutValDevices",
          privacy: "donutValPrivacy",
          scams: "donutValScams",
          wellbeing: "donutValWellbeing"
        };
      
        LENS_ORDER.forEach(lens => {
          const el = document.getElementById(mapId[lens]);
          if (el) el.textContent = `${Math.round(lenses[lens] ?? 0)}%`;
        });
      
        updateLensInsight(focusLens, lenses);
        bindDonutInteractivity(lenses);
      }
    /* ---------------- Navigation ---------------- */

    onBack(){
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

    /* ---------------- Canon signal model ---------------- */

    lensLabels(){
      return {
        network:"Network",
        devices:"Devices",
        privacy:"Accounts & Privacy",
        scams:"Scams & Messages",
        wellbeing:"Children & Wellbeing"
      };
    }

    buildTrajectory(currentScore, previousScore){
      if (previousScore == null){
        return { label: "Stable", diff: 0, change: "No earlier snapshot yet." };
      }
      const diff = Math.round(currentScore - previousScore);
      if (diff >= 4) return { label: "Improving", diff, change: `Up ${diff} points since the last snapshot.` };
      if (diff <= -4) return { label: "Declining", diff, change: `Down ${Math.abs(diff)} points since the last snapshot.` };
      return { label: "Stable", diff, change: "Holding steady since the last snapshot." };
    }

    buildSignal(totalScore, trajectoryLabel, lensPercents){
      const total = Math.round(totalScore ?? 0);

      let overall = "STABLE";
      if (total >= 80) overall = "STRONG";
      else if (total >= 60) overall = "STABLE";
      else if (total >= 40) overall = "FRAGILE";
      else overall = "STRAINED";

      const order = ["network","devices","privacy","scams","wellbeing"];
      const lowest = Math.min(...order.map(l => lensPercents?.[l] ?? 0));

      const riskPressure =
        (lowest < 45 || total < 45) ? "High" :
        (lowest < 65 || total < 60) ? "Medium" :
        "Low";

      const resilienceIndex =
        total >= 75 ? "Growing" :
        total >= 55 ? "Flat" :
        "Weak";

      const summary = {
        STRONG: "Strong foundations are visible. Keep routines steady and build gently.",
        STABLE: "A steady base with clear opportunities to strengthen.",
        FRAGILE: "Some protections are in place, but a few gaps may feel heavy.",
        STRAINED: "The household is carrying a lot right now. Small, calm steps will help."
      }[overall];

      return { overall, score: total, trajectory: trajectoryLabel, riskPressure, resilienceIndex, summary };
    }

    /* ---------------- Storage ---------------- */

    safeParse(v, f=null){
      try{ return JSON.parse(v); } catch { return f; }
    }

    loadHistory(){
      const key = "cyberseeds_snapshots_v1";
      try{
        const raw = localStorage.getItem(key);
        const parsed = this.safeParse(raw, []);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    saveHistory(h){
      const key = "cyberseeds_snapshots_v1";
      try{ localStorage.setItem(key, JSON.stringify(h)); } catch {}
    }

    saveSnapshotCanonical(s){
      try{ localStorage.setItem("cyberseeds_snapshot_v3", JSON.stringify(s)); } catch {}
      try{ localStorage.setItem("cyberseeds_snapshot_last", String(s.id)); } catch {}
    }

    buildPassport(h){
      return {
        schema:"cs.passport.v1",
        createdAt:new Date().toISOString(),
        snapshots:h.map(s => ({
          id:s.id,
          timestamp:s.timestamp,
          total:s.total,
          lenses:s.lenses,
          focus:s.focus,
          strongest:s.strongest,
          weakest:s.weakest
        }))
      };
    }

    persistPassport(h){
      try{
        localStorage.setItem("cyberseeds_passport_v1", JSON.stringify(this.buildPassport(h)));
      } catch {}
    }

    /* ---------------- Seed selection ---------------- */

    _stableHash(input){
      const str = typeof input === "string" ? input : JSON.stringify(input);
      let hash = 0;
      for (let i = 0; i < str.length; i++){
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }

    pickSeedPackForLens(lens, snapshotId){
      const pool = this.api?.seedsForLens?.(lens) || [];
      if (!Array.isArray(pool) || pool.length === 0){
        return {
          title: `Next steps for ${this.lensLabels()[lens] || lens}`,
          today: "Choose one small calm improvement in your focus lens.",
          this_week: "Build one routine you can repeat without pressure.",
          this_month: "Make it stick with one simple household agreement."
        };
      }

      const h = this._stableHash(`${lens}:${snapshotId}`);
      const pick = (offset) => pool[(h + offset) % pool.length];

      const a = pick(0);
      const b = pick(1);
      const c = pick(2);

      const norm = (s, fallback) => {
        if (!s || typeof s !== "object") return fallback;
        return (s.text || s.body || s.step || s.title || fallback);
      };

      return {
        title: a?.title || `Your next Digital Seed (${this.lensLabels()[lens] || lens})`,
        today: norm(a?.today ?? a?.step_today ?? a?.step, "Choose one small calm step today."),
        this_week: norm(b?.this_week ?? b?.week ?? b?.step_week, "Build one routine this week."),
        this_month: norm(c?.this_month ?? c?.month ?? c?.step_month, "Make it stick this month.")
      };
    }

    canonicalize(scored){
      const now = Date.now();
      const history = this.loadHistory();
      const previous = history[0];

      const lenses = Object.fromEntries(
        Object.entries(scored.lensPercents || {}).map(([k,v]) => [k, Math.round(v)])
      );

      const prevTotal =
        previous?.total ??
        previous?.hdss ??
        previous?.totalScore ??
        null;

      const trajectory = this.buildTrajectory(scored.hdss, prevTotal);
      const signal = this.buildSignal(scored.hdss, trajectory.label, lenses);

      const focus = scored.focus || scored.weakest || "privacy";

      let rationale = "";
      try{
        if (this.api?.buildRationale){
          rationale = this.api.buildRationale(focus, this.answers) || "";
        }
      } catch {}

      const seed = this.pickSeedPackForLens(focus, scored.snapshotId);

      const canonical = {
        schema: "cs.snapshot.v3",
        id: `${scored.snapshotId}-${now}`,
        timestamp: now,

        total: Math.round(scored.hdss),
        lenses,
        lensPercents: lenses,

        lensScores: scored.lensScores || {},
        lensMax: scored.lensMax || {},

        answers: { ...this.answers },

        focus,
        strongest: scored.strongest,
        weakest: scored.weakest,
        stage: scored.stage || null,

        seed,
        rationale,

        signal,
        trajectory
      };

      this.saveSnapshotCanonical(canonical);

      const nextHistory = [canonical, ...history].slice(0, 24);
      this.saveHistory(nextHistory);
      this.persistPassport(nextHistory);

      return { canonical, history: nextHistory };
    }

    finish(){
      try{
        const scored = this.api.scoreAnswers(this.answers);
        const { canonical } = this.canonicalize(scored);

        // 🔒 Event contract: homepage/resources expect detail.snapshot
        window.dispatchEvent(new CustomEvent("cs:snapshot-updated", {
          detail: { snapshot: canonical }
        }));

        this.renderComplete(canonical);
      }
      catch (e){
        console.error("[CyberSeedsSnapshot] finish failed:", e);
        this.showError("We couldn’t finalise the snapshot. Please refresh and try again.");
      }
    }

    renderComplete(snapshot){
       
      this._completed = true;
     
      this._refs.kicker.textContent = "Snapshot complete";
      this._refs.title.textContent  = "Thank you for checking in";

      const overall = snapshot?.signal?.overall || "STABLE";
      const summary = snapshot?.signal?.summary || "Your snapshot has been saved locally.";
      const traj = snapshot?.trajectory?.label || "Stable";
      const risk = snapshot?.signal?.riskPressure || "—";
      const resi = snapshot?.signal?.resilienceIndex || "—";
      const focusLabel = this.lensLabels()[snapshot.focus] || snapshot.focus;

      this._refs.panel.innerHTML = `
        <div class="resultCard">
          <h3 style="margin:0;">Your household signal</h3>
          <p style="margin:8px 0 0; color:var(--muted);">${summary}</p>

          <div class="resultRow" style="margin-top:12px;">
            <span class="chip">${overall} • ${snapshot.total}/100</span>
            <span class="chip">Trajectory: ${traj}</span>
            <span class="chip">Risk pressure: ${risk}</span>
            <span class="chip">Resilience: ${resi}</span>
            <span class="chip">Focus: ${focusLabel}</span>
          </div>

          <p style="margin-top:12px; color:var(--muted);">
            Saved locally on this device. Nothing is uploaded.
          </p>
        </div>
      `;

      this._refs.back.disabled = true;
      this._refs.next.textContent = "Close";
      this._refs.next.disabled = false;

      // ensure Next becomes Close (no stale handler)
      this._refs.next.onclick = () => this.close();

      try{ localStorage.removeItem("cs_snapshot_draft"); } catch {}
    }
  }

  // Define once
  if (!customElements.get("cyber-seeds-snapshot")){
    customElements.define("cyber-seeds-snapshot", CyberSeedsSnapshot);
  }

  // ---------------------------------------------------------
  // 3) Ensure the element exists in the DOM
  // ---------------------------------------------------------
   ensureSnapshotElement(){
    let el = document.querySelector("cyber-seeds-snapshot");
    if (el) return el;

    el = document.createElement("cyber-seeds-snapshot");
    document.body.appendChild(el);
    return el;
  }

  // ---------------------------------------------------------
  // 4) Bind click triggers (no per-page drop-in)
  // ---------------------------------------------------------
  function bindLaunchers(){
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-open-snapshot]");
      if (!btn) return;

      e.preventDefault();

      const snap = ensureSnapshotElement();
      // open immediately; component will finish initialise asynchronously
      snap.open();
    });
  }

  // Boot
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
