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
  }

  connectedCallback(){
    this.render();
    this.cacheRefs();
    this.bind();
    this.initialise().catch(() => {
      this.showError("The assessment engine didn’t load. Please refresh and try again.");
    });
  }

  async initialise(){
    // Ensure SeedForge is available
    if (!window.CSSeedForge){
      await import("/engine/seedforge.js");
    }
    this.api = await window.CSSeedForge.load();

    const qRaw = this.api.questions;
    const list = Array.isArray(qRaw?.questions) ? qRaw.questions : Array.isArray(qRaw) ? qRaw : [];
    this.questions = list.slice().sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

    // Start on intro screen
    this.step = -1;
    this.answers = {};
    this.renderIntro();
    this.setNavState();
  }

  render(){
    const css = `
      :host{
        --ink: var(--ink, #14201e);
        --muted: var(--muted, #51615f);
        --brand: var(--brand, #0f2f2a);
        --brand2: var(--brand2, #1a6a5d);
        --mint: var(--mint, #e8f6f5);
        --mint2: var(--mint2, #eef7f6);
        --line: var(--line, #dfecea);
        --card: var(--card, #ffffff);
        --radius: var(--radius, 16px);
        --radius2: var(--radius2, 22px);
        --shadow-sm: var(--shadow-sm, 0 6px 16px rgba(20,32,30,.06));
        --shadow-md: var(--shadow-md, 0 12px 28px rgba(20,32,30,.10));
        display:block;
      }
      .backdrop{
        position:fixed;
        inset:0;
        background:rgba(10,18,17,.75);
        backdrop-filter: blur(4px);
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
        max-height:min(82vh, 720px);
        background:#ffffff;
        border:1px solid rgba(0,0,0,.06);
        border-radius:var(--radius2);
        box-shadow:
          0 40px 80px rgba(0,0,0,.25),
          0 10px 30px rgba(0,0,0,.15);
        opacity:0;
        pointer-events:none;
        transition:opacity .18s ease, transform .18s ease;
        z-index:9999;
        display:flex;
        flex-direction:column;
        overflow:hidden;
      }
      
      .is-open .backdrop{
        opacity:1;
        pointer-events:auto;
      }
      
      .is-open .modal{
        opacity:1;
        pointer-events:auto;
        transform:translate(-50%,-50%) scale(1);
      }
      .top{
        padding:18px 20px;
        background:linear-gradient(180deg, var(--mint2), #fff);
        border-bottom:1px solid var(--line);
        display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
      }
      .kicker{ color:var(--muted); font-size:.92rem; margin:0; }
      .title{ color:var(--ink); font-size:1.18rem; margin:6px 0 0 0; line-height:1.25; }
      .close{
        border:1px solid var(--line);
        background:#fff;
        color:var(--ink);
        border-radius:12px;
        padding:10px 12px;
        cursor:pointer;
      }
      .close:focus{ outline:3px solid rgba(26,106,93,.25); outline-offset:2px; }

      .body{
        padding:18px 20px;
        overflow:auto;
      }

      .hint{
        background:var(--mint);
        border:1px solid var(--line);
        border-radius:var(--radius);
        padding:12px 12px;
        color:var(--muted);
        font-size:.96rem;
        margin-bottom:14px;
      }

      .q{
        color:var(--ink);
        font-size:1.1rem;
        margin:0 0 12px 0;
        line-height:1.35;
      }

      .choices{ display:grid; gap:10px; }
      .choice{
        border:1px solid var(--line);
        border-radius:16px;
        padding:14px 14px;
        background:linear-gradient(180deg,#fff,#fafdfc);
        display:flex;
        gap:12px;
        cursor:pointer;
        transition:.18s ease;
      }
      
      .choice:hover{
        border-color:var(--brand2);
        background:var(--mint2);
      }
      
      .choice input{
        accent-color:var(--brand2);
        transform:scale(1.1);
      }
      
      .choice:has(input:checked){
        border-color:var(--brand);
        background:linear-gradient(180deg,#eef7f6,#fff);
        box-shadow:0 6px 18px rgba(15,47,42,.12);
      }
      .choice:hover{ border-color:rgba(26,106,93,.45); }
      .choice input{ margin-top:3px; }
      .choice .label{ color:var(--ink); font-weight:600; }
      .choice .sub{ color:var(--muted); font-size:.92rem; margin-top:2px; }

      .reassure{ color:var(--muted); margin:12px 0 0 0; }

      .footer{
        padding:14px 20px;
        border-top:1px solid var(--line);
        display:flex; justify-content:space-between; align-items:center; gap:10px;
        background:#fff;
      }
      .btn{
        border-radius:999px;
        padding:10px 14px;
        border:1px solid var(--line);
        cursor:pointer;
        background:#fff;
        color:var(--ink);
        font-weight:600;
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
        background:linear-gradient(180deg, var(--mint2), #fff);
        padding:14px 14px;
      }
      .resultRow{ display:flex; gap:12px; flex-wrap:wrap; margin-top:10px; }
      .chip{
        border:1px solid var(--line);
        border-radius:999px;
        padding:8px 10px;
        background:#fff;
        color:var(--ink);
        font-size:.92rem;
      }
      .h3{ margin:0; color:var(--ink); font-size:1.05rem; }
      .p{ margin:8px 0 0 0; color:var(--muted); line-height:1.45; }

      .ctaRow{ display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; }
      a.linkBtn{
        text-decoration:none;
        display:inline-flex;
        align-items:center;
        justify-content:center;
      }
      .reassure{
        color:#5c6f6c;
        font-size:.92rem;
        margin-top:14px;
        border-left:3px solid var(--mint);
        padding-left:10px;
      }

      .error{
        border:1px solid rgba(200,80,80,.35);
        background:rgba(200,80,80,.08);
        color:var(--ink);
        border-radius:var(--radius);
        padding:12px 12px;
      }

      .modal{
        font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      }
      
      .title{
        letter-spacing:-.01em;
      }
      
      .body{
        line-height:1.6;
      }
      
      .hint{
        background:linear-gradient(180deg,#f2faf9,#fff);
      }

    `;


    this.shadowRoot.innerHTML = `
      <style>$css</style>
      <div class="wrap" aria-hidden="true">
        <div class="backdrop" part="backdrop"></div>
        <section class="modal" role="dialog" aria-modal="true" aria-label="Cyber Seeds snapshot" part="modal">
          <header class="top">
           <div class="progress-wrap">
             <div class="progress-bar" id="csProgress"></div>
           </div>
            <div>
              <p class="kicker" id="csKicker">Household snapshot</p>
              <h2 class="title" id="csTitle">A calm check-in</h2>
            </div>
            <button class="close" type="button" id="csClose" aria-label="Close">Close</button>
          </header>

          <div class="body" id="csBody">
            <div class="hint" id="csHint">
              This is a calm check-in — not a test. You’ll get one clear focus and simple next steps.
            </div>

            <div id="csPanel"></div>
          </div>

          <footer class="footer">
            <div class="meta" id="csMeta">Ready when you are.</div>
            <div style="display:flex; gap:10px;">
              <button class="btn" type="button" id="csBack">Back</button>
              <button class="btn primary" type="button" id="csNext">Begin</button>
            </div>
          </footer>
        </section>
      </div>
    `;
  }

  cacheRefs(){
    const $ = sel => this.shadowRoot.querySelector(sel);
    this._refs.wrap  = $(".wrap");
    this._refs.backdrop = $(".backdrop");
    this._refs.modal = $(".modal");
    this._refs.close = $("#csClose");
    this._refs.panel = $("#csPanel");
    this._refs.kicker = $("#csKicker");
    this._refs.title = $("#csTitle");
    this._refs.hint = $("#csHint");
    this._refs.meta = $("#csMeta");
    this._refs.back = $("#csBack");
    this._refs.next = $("#csNext");
  }

  bind(){
    this._refs.close.addEventListener("click", () => this.close());
    this._refs.backdrop.addEventListener("click", () => this.close());

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._isOpen) this.renderComplete(canonical);
    });

     renderComplete(snapshot){
        this._refs.kicker.textContent = "Snapshot complete";
        this._refs.title.textContent = "Thank you for checking in";
      
        this._refs.panel.innerHTML = `
          <div class="resultCard">
            <h3 class="h3">Your household signal</h3>
            <p class="p">${snapshot.signal.summary}</p>
      
            <div class="resultRow">
              <span class="chip">${snapshot.total}/100</span>
              <span class="chip">Focus: ${this.lensLabels()[snapshot.focus]}</span>
              <span class="chip">Risk: ${snapshot.signal.riskPressure}</span>
            </div>
      
            <p class="p" style="margin-top:12px;">
              Your results are saved only on this device.
            </p>
          </div>
        `;
      
        this._refs.back.disabled = true;
        this._refs.next.textContent = "Close";
        this._refs.next.onclick = () => this.close();
      
        localStorage.removeItem("cs_snapshot_draft");
      }

    this._refs.back.addEventListener("click", () => this.onBack());
    this._refs.next.addEventListener("click", () => this.onNext());
  }

  open(){
    // Guard against null refs (your earlier error)
    if (!this._refs.wrap) return;
    this._isOpen = true;
    this._refs.wrap.classList.add("is-open");
    this._refs.wrap.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    this._refs.modal?.focus?.();
  }

  close(){
   if(this.step >= 0){
     const ok = confirm("Leave the snapshot? Your answers so far won’t be saved.");
     if(!ok) return;
   }

  showError(msg){
    this._refs.panel.innerHTML = `<div class="error"><strong>Unable to continue.</strong><div style="margin-top:6px;">${msg}</div></div>`;
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
      return;
    }

    const lastIndex = this.questions.length - 1;
    const q = this.questions[this.step];
    const answered = q && Number.isInteger(this.answers[q.id]);

    this._refs.next.textContent = (this.step >= lastIndex) ? "Finish" : "Next";
    this._refs.next.disabled = !answered;

    this._refs.meta.textContent =
  `Step ${this.step + 1} of ${this.questions.length} — you’re doing well`;
  }

   const bar = this.shadowRoot.getElementById("csProgress");

   if(bar){
     const pct = this.step < 0
       ? 0
       : ((this.step + 1) / this.questions.length) * 100;
   
     bar.style.width = `${pct}%`;
   }
  renderIntro(){
    this._refs.kicker.textContent = "Household snapshot";
    this._refs.title.textContent = "A calm check-in";
    this._refs.panel.innerHTML = `
      <p class="p">You’ll answer a few short questions. You’ll then receive:</p>
      <div class="resultRow">
        <span class="chip">A clear household signal</span>
        <span class="chip">One best focus lens</span>
        <span class="chip">Digital Seeds (today / week / month)</span>
        <span class="chip">A link to personalised guidance</span>
      </div>
      <p class="p" style="margin-top:12px;">Nothing is uploaded. Results stay on your device.</p>
    `;
  }

  renderQuestion(){
    const q = this.questions[this.step];
    if (!q) return;

    this._refs.kicker.textContent = "Snapshot question";
    this._refs.title.textContent = q.prompt || "Question";

    const name = `q-${q.id}`;
    const current = this.answers[q.id];

    const options = (q.options || []).map((o, i) => {
      const checked = Number.isInteger(current) && current === i;
      const label = o.label || `Option ${i + 1}`;
      return `
        <label class="choice">
          <input type="radio" name="${name}" value="${i}" ${checked ? "checked" : ""} />
          <div>
            <div class="label">${label}</div>
          </div>
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

    this._refs.panel.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
      radio.addEventListener("change", () => {
        this.answers[q.id] = Number(radio.value);
        this.setNavState();
      });
    });
  }

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

    const lastIndex = this.questions.length - 1;
    if (this.step >= lastIndex){
      this.finish();
      return;
    }

    this.step++;
    this.renderQuestion();
    this.setNavState();
  }

  // ---- Canon snapshot persistence + events ----

  lensLabels(){
    return {
      network: "Network",
      devices: "Devices",
      privacy: "Accounts & Privacy",
      scams: "Scams & Messages",
      wellbeing: "Children & Wellbeing"
    };
  }

  buildTrajectory(currentScore, previousScore){
    if (previousScore == null) return { label: "Stable", diff: 0, change: "No earlier snapshot yet." };
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
    const lowest = Math.min(...order.map(l => lensPercents[l] ?? 0));
    const riskPressure = lowest < 45 || total < 45 ? "High" : (lowest < 65 || total < 60 ? "Medium" : "Low");
    const resilienceIndex = total >= 75 ? "Growing" : (total >= 55 ? "Flat" : "Weak");

    const summary = {
      STRONG: "Strong foundations are visible. Keep routines steady and build gently.",
      STABLE: "A steady base with clear opportunities to strengthen.",
      FRAGILE: "Some protections are in place, but a few gaps may feel heavy.",
      STRAINED: "The household is carrying a lot right now. Small, calm steps will help."
    }[overall];

    return { overall, score: total, trajectory: trajectoryLabel, riskPressure, resilienceIndex, summary };
  }

  safeParse(value, fallback=null){
    try { return JSON.parse(value); } catch { return fallback; }
  }

  loadHistory(){
    const key = "cyberseeds_snapshots_v1";
    try {
      const raw = localStorage.getItem(key);
      const parsed = this.safeParse(raw, []);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveHistory(history){
    const key = "cyberseeds_snapshots_v1";
    try { localStorage.setItem(key, JSON.stringify(history)); } catch {}
  }

  saveSnapshotCanonical(snapshot){
    try { localStorage.setItem("cyberseeds_snapshot_v3", JSON.stringify(snapshot)); } catch {}
    try { localStorage.setItem("cyberseeds_snapshot_last", snapshot.id); } catch {}
  }

  buildPassport(history){
    return {
      schema: "cs.passport.v1",
      createdAt: new Date().toISOString(),
      snapshots: history.map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        total: s.total,
        lenses: s.lenses,
        focus: s.focus,
        strongest: s.strongest,
        weakest: s.weakest
      }))
    };
  }

  persistPassport(history){
    try { localStorage.setItem("cyberseeds_passport_v1", JSON.stringify(this.buildPassport(history))); } catch {}
  }

  canonicalize(scored, seed, rationale){
    const now = Date.now();
    const history = this.loadHistory();
    const previous = history[0];

    const lenses = Object.fromEntries(
      Object.entries(scored.lensPercents || {}).map(([k, v]) => [k, Math.round(v)])
    );

    const trajectory = this.buildTrajectory(
      scored.hdss,
      previous?.total ?? previous?.hdss ?? previous?.totalScore
    );

    const signal = this.buildSignal(scored.hdss, trajectory.label, lenses);

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
      focus: scored.focus,
      strongest: scored.strongest,
      weakest: scored.weakest,
      stage: scored.stage,
      seed: seed || null,
      rationale: rationale || "",
      signal,
      trajectory
    };

    // Write current snapshot + history
    this.saveSnapshotCanonical(canonical);

    const nextHistory = [canonical, ...history].slice(0, 24);
    this.saveHistory(nextHistory);
    this.persistPassport(nextHistory);

    return { canonical, history: nextHistory };
  }

   finish(){
     try{
       // 1) Score answers (engine output)
       const scored = this.api.scoreAnswers(this.answers);
   
       // 2) Canonicalize (writes current snapshot + history + passport)
       // SeedForge typically returns seed + rationale; we pass them through safely.
       const seed = scored.seed || null;
       const rationale = scored.rationale || "";
   
       const { canonical } = this.canonicalize(scored, seed, rationale);
   
       // 3) Dispatch the canonical event (homepage + resources can consume this)
       window.dispatchEvent(new CustomEvent("cs:snapshot-updated", {
         detail: canonical
       }));
   
       // 4) Close modal
       this.close();
   
     } catch (e){
       this.showError("We couldn’t finalise the snapshot. Please refresh and try again.");
     }
   }

}   
customElements.define("cyber-seeds-snapshot", CyberSeedsSnapshot);
