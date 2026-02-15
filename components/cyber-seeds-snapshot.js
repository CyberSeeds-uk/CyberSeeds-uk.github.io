/* =========================================================
   <cyber-seeds-snapshot>
   Canon Web Component Modal
   Local-first • Deterministic • Shame-free
   ========================================================= */

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
    this._isComplete = false;
    this._boundKeydown = e => {
      if (!this._isOpen) return;
      if (e.key === "Escape"){
        this.close();
        return;
      }
      if (e.key === "Tab"){
        this.trapFocus(e);
      }
    };
  }


  /* ---------------- Lifecycle ---------------- */

  connectedCallback(){
    this.render();
    this.cacheRefs();
    this.bind();

    this.initialise().catch(() => {
      this.showError("The assessment engine didn’t load. Please refresh and try again.");
    });
  }


  async initialise(){

    if (!window.CSSeedForge){
      await import("/engine/seedforge.js");
    }

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

    this.migrateLegacySnapshots();

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

      .wrap{
        position:fixed;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        padding-top:calc(16px + env(safe-area-inset-top));
        padding-bottom:calc(16px + env(safe-area-inset-bottom));
        padding-left:14px;
        padding-right:14px;
        opacity:0;
        pointer-events:none;
        transition:.18s;
        z-index:9998;
      }

      .backdrop{
        position:absolute;
        inset:0;
        background:rgba(10,18,17,.75);
        backdrop-filter:blur(4px);
      }

      .modal{
        position:relative;
        width:min(860px, calc(100vw - 28px));
        max-height:calc(100dvh - (32px + env(safe-area-inset-top) + env(safe-area-inset-bottom)));
        background:#fff;
        border:1px solid rgba(0,0,0,.06);
        border-radius:var(--radius2);
        box-shadow:0 40px 80px rgba(0,0,0,.25);
        display:flex;
        flex-direction:column;
        overflow:hidden;
        font-family:system-ui,-apple-system,Segoe UI,sans-serif;
        transform:scale(.98);
        transition:.18s;
        opacity:0;
      }

      .is-open{opacity:1;pointer-events:auto;}
      .is-open .modal{opacity:1;transform:scale(1);}

      .top{
        padding:18px 20px;
        background:linear-gradient(180deg,var(--mint2),#fff);
        border-bottom:1px solid var(--line);
        display:flex;
        justify-content:space-between;
        gap:12px;
      }

      .kicker{color:var(--muted);font-size:.92rem;margin:0;}
      .title{color:var(--ink);font-size:1.18rem;margin:6px 0 0;}

      .close{
        border:1px solid var(--line);
        background:#fff;
        border-radius:12px;
        padding:8px 12px;
        cursor:pointer;
      }

      .body{padding:18px 20px;overflow:auto;line-height:1.6;}

      .hint{
        background:linear-gradient(180deg,#f2faf9,#fff);
        border:1px solid var(--line);
        border-radius:var(--radius);
        padding:12px;
        margin-bottom:14px;
        color:var(--muted);
      }

      .choices{display:grid;gap:10px;}

      .choice{
        border:1px solid var(--line);
        border-radius:16px;
        padding:14px;
        background:#fff;
        display:flex;
        gap:12px;
        cursor:pointer;
      }

      .choice.is-selected{
        border-color:var(--brand);
        background:#eef7f6;
      }

      .choice input{margin-top:2px;}

      .footer{
        padding:14px 20px;
        border-top:1px solid var(--line);
        display:flex;
        justify-content:space-between;
      }

      .btn{
        border-radius:999px;
        padding:10px 14px;
        border:1px solid var(--line);
        background:#fff;
        cursor:pointer;
        font-weight:600;
      }

      .btn.primary{
        background:var(--brand);
        border-color:var(--brand);
        color:#fff;
      }

      .meta{color:var(--muted);font-size:.92rem;}

      .resultCard{
        border:1px solid var(--line);
        border-radius:var(--radius);
        background:#f6fbfa;
        padding:14px;
      }

      .resultRow{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;}

      .chip{
        border:1px solid var(--line);
        border-radius:999px;
        padding:8px 10px;
        background:#fff;
        font-size:.92rem;
      }

      .error{
        border:1px solid rgba(200,80,80,.35);
        background:rgba(200,80,80,.08);
        padding:12px;
        border-radius:var(--radius);
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

      :where(button,input,[tabindex]):focus-visible{
        outline:2px solid var(--brand2);
        outline-offset:2px;
      }

      .sr-only{
        position:absolute;
        width:1px;
        height:1px;
        padding:0;
        margin:-1px;
        overflow:hidden;
        clip:rect(0,0,0,0);
        white-space:nowrap;
        border:0;
      }

      @media (max-width:600px){
        .wrap{
          padding-left:4px;
          padding-right:4px;
        }

        .modal{
          width:calc(100vw - 8px);
          max-height:calc(100dvh - (16px + env(safe-area-inset-top) + env(safe-area-inset-bottom)));
          border-radius:16px;
        }

        .top,.body,.footer{padding-left:16px;padding-right:16px;}
        .choice{padding:14px;min-height:44px;}
      }
    `;


    this.shadowRoot.innerHTML = `
      <style>${css}</style>

      <div class="wrap" aria-hidden="true">

        <div class="backdrop"></div>

        <section class="modal" role="dialog" aria-modal="true">

          <header class="top">

            <div style="flex:1">

              <div class="progress-wrap">
                <div class="progress-bar" id="csProgress"></div>
              </div>

              <p class="kicker" id="csKicker">Household snapshot</p>
              <h2 class="title" id="csTitle">A calm check-in</h2>

            </div>

            <button class="close" id="csClose">Close</button>

          </header>


          <div class="body">

            <div class="hint" id="csHint">
              This is a supportive household check-in — not a test or inspection.
            </div>

            <div id="csPanel"></div>

          </div>


          <footer class="footer">

            <div class="meta" id="csMeta">Ready when you are.</div>

            <div>
              <button class="btn" id="csBack">Back</button>
              <button class="btn primary" id="csNext">Begin</button>
            </div>

          </footer>

        </section>

        <div class="sr-only" id="csLive" aria-live="polite"></div>

      </div>
    `;
  }



  /* ---------------- Cache ---------------- */

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
    this._refs.live     = $("#csLive");
  }



  /* ---------------- Events ---------------- */

  bind(){

    this._refs.close.addEventListener("click", () => this.close());
    this._refs.backdrop.addEventListener("click", () => this.close());

    window.addEventListener("keydown", this._boundKeydown);

    this._refs.back.addEventListener("click", () => this.onBack());
    this._refs.next.addEventListener("click", () => this.onNext());
  }



  /* ---------------- Open / Close ---------------- */

  open(){

    if (!this._refs.wrap) return;

    this._isOpen = true;

    this.restoreDraft();

    if (this.step >= 0){
      this.renderQuestion();
    } else {
      this.renderIntro();
    }
    this.setNavState();

    this._refs.wrap.classList.add("is-open");
    this._refs.wrap.setAttribute("aria-hidden","false");

    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => this.focusFirstElement());
  }


  close(){

    if (!this._isComplete && this.step >= 0 && this.hasDraft()){
      const ok = confirm("Leave the snapshot? Your unfinished answers on this device will be discarded.");
      if(!ok) return;
      this.clearDraft();
    }

    if (!this._refs.wrap) return;

    this._isOpen = false;

    this._refs.wrap.classList.remove("is-open");
    this._refs.wrap.setAttribute("aria-hidden","true");

    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
  }

  focusables(){
    return Array.from(this.shadowRoot.querySelectorAll(
      ".modal button, .modal [href], .modal input, .modal select, .modal textarea, .modal [tabindex]:not([tabindex='-1'])"
    )).filter(el => !el.disabled && el.offsetParent !== null);
  }

  focusFirstElement(){
    const first = this.focusables()[0];
    first?.focus();
  }

  trapFocus(e){
    const items = this.focusables();
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
      return;
    }

    if (!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
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
    this._refs.next.onclick = null;


    if (!hasQuestions){
      this._refs.next.disabled = true;
      this._refs.next.textContent = "Unavailable";
      return;
    }


    if (this.step < 0){
      this._refs.next.textContent = "Begin";
      this._refs.meta.textContent = "Takes about 2 minutes • You can stop anytime";
      return;
    }


    const last = this.questions.length - 1;

    const q = this.questions[this.step];

    const answered = q && Number.isInteger(this.answers[q.id]);


    this._refs.next.textContent =
      (this.step >= last) ? "Finish" : "Next";

    this._refs.next.disabled = !answered;


    this._refs.meta.textContent =
      `Step ${this.step+1} of ${this.questions.length} — you’re doing well`;


    const bar = this.shadowRoot.getElementById("csProgress");

    if(bar){

      const pct =
        this.step < 0
          ? 0
          : ((this.step+1) / this.questions.length) * 100;

      bar.style.width = `${pct}%`;
    }
  }



  renderIntro(){

    this._refs.kicker.textContent = "Household snapshot";
    this._refs.title.textContent  = "A calm check-in";

    this._refs.panel.innerHTML = `
      <p>You’ll answer a few short questions.</p>

      <div class="resultRow">
        <span class="chip">Clear signal</span>
        <span class="chip">Focus lens</span>
        <span class="chip">Digital seeds</span>
        <span class="chip">Personal guidance</span>
      </div>

      <p style="margin-top:12px">
        Nothing is uploaded. Results stay on this device.
      </p>
    `;
  }

   renderQuestion() {

     const q = this.questions[this.step];
     if (!q) return;
   
     // Header
     this._refs.kicker.textContent = "Household check-in";
     this._refs.title.textContent =
       q.prompt || "A short household question";
   
     const name = `q-${q.id}`;
     const current = this.answers[q.id];
   
     const options = (q.options || []).map((o, i) => {
   
       const checked =
         Number.isInteger(current) && current === i;
   
       const label = o.label || `Option ${i + 1}`;
   
       return `
         <label class="choice ${checked ? "is-selected" : ""}">
           <input
             type="radio"
             name="${name}"
             value="${i}"
             ${checked ? "checked" : ""}
           />
           <div>${label}</div>
         </label>
       `;
     }).join("");
   
     const reassurance =
       q.reassurance ||
       "There is no right or wrong answer here. Choose what fits your home today.";
   
     this._refs.panel.innerHTML = `
       <div
         class="choices"
         role="radiogroup"
         aria-label="${q.prompt || "Household question"}"
       >
         ${options}
       </div>
   
       <p class="reassure">
         ${reassurance}
       </p>
     `;
   
     // Bind answers
     this._refs.panel
       .querySelectorAll(`input[name="${name}"]`)
       .forEach(radio => {
   
         radio.addEventListener("change", () => {
   
           this.answers[q.id] = Number(radio.value);
           this._refs.panel
             .querySelectorAll(".choice")
             .forEach(choice => choice.classList.remove("is-selected"));
           radio.closest(".choice")?.classList.add("is-selected");

           this.saveDraft();

           this.setNavState();
   
         });
   
       });

    if (this._refs.live){
      this._refs.live.textContent = `Step ${this.step + 1} of ${this.questions.length}`;
    }

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
    this.saveDraft();
  }


  onNext(){

    if (this.step < 0){

      this.step = 0;
      this._isComplete = false;

      this.renderQuestion();
      this.setNavState();
      this.saveDraft();

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
    this.saveDraft();
  }



  /* ---------------- Canon ---------------- */

  storageKeys(){
    return {
      latest: "cyberseeds_snapshot_latest_v3",
      history: "cyberseeds_snapshot_history_v3",
      baseline: "cyberseeds_snapshot_baseline_v3"
    };
  }

  lensLabels(){
    return {
      network:"Network",
      devices:"Devices",
      privacy:"Accounts & Privacy",
      scams:"Scams & Messages",
      wellbeing:"Children & Wellbeing"
    };
  }



  canonicalize(scored, seed, rationale){

    const now = Date.now();

    const history = this.loadHistory();

    const previous = history[0];


    const lenses = Object.fromEntries(
      Object.entries(scored.lensScores || {})
        .map(([k,v]) => [k,Math.round(v)])
    );

    const lensPercents = Object.fromEntries(
      Object.entries(scored.lensPercents || {})
        .map(([k,v]) => [k,Math.round(v)])
    );


    const canonical = {

      schema:"cs.snapshot.v3",

      id:`${scored.snapshotId}-${now}`,

      timestamp:now,

      total:Math.round(scored.hdss),

      lenses,

      lensPercents,

      answers:{...this.answers},

      focus:scored.focus,

      stage:scored.stage?.label || "",

      strongest:scored.strongest,

      weakest:scored.weakest,

      seed:seed||null,

      rationale:rationale||"",

      signal:scored.signal || null
    };


    this.saveSnapshotCanonical(canonical);


    const next = [canonical,...history].slice(0,24);

    this.saveHistory(next);
    this.persistPassport(next);


    return { canonical, history: next };
  }



  finish(){

    try{

      const scored = this.api.scoreAnswers(this.answers);

      const seed = scored.seed || null;
      const rationale = scored.rationale || "";

      const { canonical } =
        this.canonicalize(scored, seed, rationale);


      window.dispatchEvent(
        new CustomEvent("cs:snapshot-updated", {
          detail: canonical
        })
      );


      this.renderComplete(canonical);
      this._isComplete = true;
      this.clearDraft();

    }
    catch(e){

      this.showError(
        "We couldn’t finalise the snapshot. Please refresh and try again."
      );
    }
  }



  renderComplete(snapshot){

    this._refs.kicker.textContent = "Snapshot complete";
    this._refs.title.textContent  = "Thank you for checking in";

    let seedBlock = `<p style="margin-top:12px">No digital seed available yet.</p>`;
    const seeds = this.api?.seedsForLens
      ? this.api.seedsForLens(snapshot.focus)
      : [];

    if (Array.isArray(seeds) && seeds.length){
      const first = seeds[0] || {};
      seedBlock = `
        <div class="resultCard" style="margin-top:12px">
          <h3>${first.title || "Digital seed"}</h3>
          <p><strong>Today:</strong> ${first.today || ""}</p>
          <p><strong>This week:</strong> ${first.week || first.thisWeek || ""}</p>
          <p><strong>This month:</strong> ${first.month || first.thisMonth || ""}</p>
        </div>
      `;
    }


    this._refs.panel.innerHTML = `
      <div class="resultCard">

        <h3>Your household signal</h3>

        <p>${snapshot.signal?.summary || ""}</p>

        <div class="resultRow">

          <span class="chip">${snapshot.total}/100</span>

          <span class="chip">
            Focus: ${this.lensLabels()[snapshot.focus]}
          </span>

        </div>

        <p style="margin-top:12px">
          Your results are saved only on this device.
        </p>

      </div>

      ${seedBlock}
    `;


    this._refs.back.disabled = true;

    this._refs.next.textContent = "Close";

    this._refs.next.onclick = () => this.close();


  }



  /* ---------------- Storage ---------------- */

  safeParse(v,f=null){
    try{ return JSON.parse(v); }catch{ return f; }
  }

  draftKey(){
    return "cs_snapshot_draft_v3";
  }

  hasDraft(){
    try{
      return !!localStorage.getItem(this.draftKey());
    }catch{
      return false;
    }
  }

  saveDraft(){
    if (this.step < 0 || this._isComplete) return;
    try{
      localStorage.setItem(
        this.draftKey(),
        JSON.stringify({ answers: this.answers, step: this.step, ts: Date.now() })
      );
    }catch{}
  }

  restoreDraft(){
    if (this._isComplete) return;
    try{
      const parsed = this.safeParse(localStorage.getItem(this.draftKey()), null);
      if (!parsed || typeof parsed !== "object") return;

      if (parsed.answers && typeof parsed.answers === "object"){
        this.answers = { ...parsed.answers };
      }

      if (Number.isInteger(parsed.step) && parsed.step >= 0 && parsed.step < this.questions.length){
        this.step = parsed.step;
      }
    }catch{}
  }

  clearDraft(){
    try{ localStorage.removeItem(this.draftKey()); }catch{}
  }


  loadHistory(){
    const key = this.storageKeys().history;

    try{

      const raw = localStorage.getItem(key);

      const parsed = this.safeParse(raw, []);

      return Array.isArray(parsed) ? parsed : [];
    }
    catch{
      return [];
    }
  }


  saveHistory(h){
    const { history, baseline } = this.storageKeys();
    try{
      localStorage.setItem(
        history,
        JSON.stringify(h)
      );

      if (h.length){
        localStorage.setItem(
          baseline,
          JSON.stringify(h[h.length-1])
        );
      }
    }catch{}
  }


  saveSnapshotCanonical(s){
    const { latest } = this.storageKeys();
    try{
      localStorage.setItem(
        latest,
        JSON.stringify(s)
      );
    }catch{}
  }

  toCanonicalSnapshot(raw){
    if(!raw || typeof raw !== "object") return null;

    const lensPercents = raw.lensPercents || raw.lenses || {};
    const focus = raw.focus || raw.weakest || "privacy";
    const total = Number.isFinite(raw.total)
      ? raw.total
      : Number.isFinite(raw.hdss)
        ? raw.hdss
        : Number.isFinite(raw.overallScore)
          ? raw.overallScore
          : 0;

    return {
      schema: "cs.snapshot.v3",
      id: String(raw.id || raw.snapshotId || `migrated-${Date.now()}`),
      timestamp: Number.isFinite(raw.timestamp)
        ? raw.timestamp
        : Date.parse(raw.timestamp || "") || Date.now(),
      total: Math.round(total),
      lenses: raw.lenses && typeof raw.lenses === "object" ? raw.lenses : {},
      lensPercents: lensPercents && typeof lensPercents === "object" ? lensPercents : {},
      focus,
      stage: typeof raw.stage === "string" ? raw.stage : (raw.stage?.label || raw.certificationLevel || ""),
      answers: raw.answers && typeof raw.answers === "object" ? raw.answers : {},
      strongest: raw.strongest || null,
      weakest: raw.weakest || focus,
      seed: raw.seed || null,
      rationale: raw.rationale || raw.narrativeSummary || "",
      signal: raw.signal || null
    };
  }

  migrateLegacySnapshots(){
    const { latest, history, baseline } = this.storageKeys();
    const legacyKeys = [
      "cs_snapshot_latest",
      "cs_snapshot_history",
      "cyberseeds_snapshot_v1",
      "cyberseeds_snapshot_v3",
      "cyberseeds_snapshots_v1"
    ];

    const hasCanonical =
      localStorage.getItem(latest) || localStorage.getItem(history);

    if (hasCanonical){
      legacyKeys.forEach(k => localStorage.removeItem(k));
      return;
    }

    const migrated = [];
    legacyKeys.forEach(k => {
      const parsed = this.safeParse(localStorage.getItem(k), null);
      if (!parsed) return;
      if (Array.isArray(parsed)){
        parsed.forEach(item => {
          const canon = this.toCanonicalSnapshot(item);
          if (canon) migrated.push(canon);
        });
      } else {
        const canon = this.toCanonicalSnapshot(parsed);
        if (canon) migrated.push(canon);
      }
    });

    if (migrated.length){
      const unique = [];
      const seen = new Set();
      migrated
        .sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0))
        .forEach(s => {
          if (seen.has(s.id)) return;
          seen.add(s.id);
          unique.push(s);
        });

      localStorage.setItem(latest, JSON.stringify(unique[0]));
      localStorage.setItem(history, JSON.stringify(unique.slice(0,24)));
      localStorage.setItem(baseline, JSON.stringify(unique[unique.length-1]));
    }

    legacyKeys.forEach(k => localStorage.removeItem(k));
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
        focus:s.focus
      }))
    };
  }


  persistPassport(h){

    try{
      localStorage.setItem(
        "cyberseeds_passport_v1",
        JSON.stringify(this.buildPassport(h))
      );
    }catch{}
  }

}



/* ---------------- Register ---------------- */

customElements.define(
  "cyber-seeds-snapshot",
  CyberSeedsSnapshot
);
