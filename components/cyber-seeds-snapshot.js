import { loadSeedForge, computeCanonicalSnapshot } from "/engine/seedforge.js";
import { writeLatestSnapshot, appendSnapshotHistory, writeDigitalPassport } from "/engine/storage.js";

const TEMPLATE = document.createElement("template");
TEMPLATE.innerHTML = `
  <style>
    :host { all: initial; }
    .backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.55);
      display: none;
      z-index: 9999;
    }
    .backdrop[open] { display: grid; place-items: center; padding: 18px; }

    .modal {
      width: min(920px, 100%);
      max-height: min(86vh, 900px);
      overflow: auto;
      border-radius: 18px;
      background: #0b1f1c;
      color: #eaf4f2;
      box-shadow: 0 18px 70px rgba(0,0,0,.45);
      border: 1px solid rgba(255,255,255,.10);
    }

    .head {
      padding: 18px 18px 10px;
      position: sticky; top: 0;
      background: linear-gradient(#0b1f1c, rgba(11,31,28,.92));
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255,255,255,.08);
    }

    .title { margin: 0; font: 700 18px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial; }
    .sub { margin: 6px 0 0; opacity: .9; font: 400 13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Arial; }

    .body { padding: 16px 18px 18px; }
    .meta { display:flex; gap:10px; flex-wrap:wrap; margin: 10px 0 0; }
    .pill { font: 600 12px/1 system-ui; padding: 8px 10px; border-radius: 999px; background: rgba(255,255,255,.08); }

    .q {
      margin: 14px 0 0;
      padding: 14px;
      border-radius: 14px;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.08);
    }

    .q h3 { margin: 0 0 10px; font: 700 15px/1.3 system-ui; }
    .q p { margin: 0 0 12px; opacity:.92; font: 400 13px/1.5 system-ui; }

    .options { display:grid; gap:10px; }
    button.opt {
      text-align: left;
      padding: 12px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(0,0,0,.12);
      color: inherit;
      font: 600 13px/1.35 system-ui;
      cursor: pointer;
    }
    button.opt[aria-pressed="true"] {
      border-color: rgba(170,255,238,.45);
      background: rgba(22,180,144,.20);
    }

    .foot {
      padding: 14px 18px 18px;
      display:flex; gap:10px; justify-content: space-between; align-items:center;
      border-top: 1px solid rgba(255,255,255,.08);
    }
    .btnrow { display:flex; gap:10px; }
    .btn {
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.08);
      color: inherit;
      font: 700 13px/1 system-ui;
      cursor: pointer;
    }
    .btn.primary { background: rgba(22,180,144,.22); border-color: rgba(170,255,238,.40); }
    .btn.danger { background: rgba(255,80,80,.15); border-color: rgba(255,120,120,.35); }
    .muted { opacity:.85; font: 500 12px/1.35 system-ui; }

    .err {
      margin-top: 12px;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,120,120,.35);
      background: rgba(255,80,80,.10);
      font: 600 13px/1.4 system-ui;
    }
  </style>

  <div class="backdrop" part="backdrop" role="dialog" aria-modal="true" aria-label="Cyber Seeds Snapshot">
    <div class="modal" part="modal">
      <div class="head">
        <h2 class="title">Household Snapshot</h2>
        <p class="sub">Calm, local-first, and repeatable. This is a signal — not a judgement.</p>
        <div class="meta">
          <span class="pill" id="pill-step">Loading…</span>
          <span class="pill" id="pill-lens">—</span>
        </div>
      </div>

      <div class="body">
        <div id="stage"></div>
        <div id="error" class="err" style="display:none"></div>
      </div>

      <div class="foot">
        <div class="muted" id="hint">Your data stays on this device unless you export.</div>
        <div class="btnrow">
          <button class="btn" id="back">Back</button>
          <button class="btn" id="close">Close</button>
          <button class="btn primary" id="next">Next</button>
        </div>
      </div>
    </div>
  </div>
`;

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

export class CyberSeedsSnapshot extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._root.appendChild(TEMPLATE.content.cloneNode(true));

    this._backdrop = this._root.querySelector(".backdrop");
    this._stage = this._root.querySelector("#stage");
    this._err = this._root.querySelector("#error");
    this._pillStep = this._root.querySelector("#pill-step");
    this._pillLens = this._root.querySelector("#pill-lens");

    this._btnBack = this._root.querySelector("#back");
    this._btnNext = this._root.querySelector("#next");
    this._btnClose = this._root.querySelector("#close");

    this._engine = null;
    this._questions = [];
    this._index = 0;
    this._answers = {}; // { [questionId]: optionId }
  }

  connectedCallback() {
    this._btnClose.addEventListener("click", () => this.close());
    this._btnBack.addEventListener("click", () => this.prev());
    this._btnNext.addEventListener("click", () => this.next());

    // Escape to close
    this._onKey = (e) => {
      if (!this.isOpen()) return;
      if (e.key === "Escape") this.close();
    };
    window.addEventListener("keydown", this._onKey);

    // Click backdrop to close
    this._backdrop.addEventListener("click", (e) => {
      if (e.target === this._backdrop) this.close();
    });

    // Lazy-load engine on first connect
    this._prime();
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKey);
  }

  isOpen(){ return this._backdrop.hasAttribute("open"); }

  async _prime() {
    try {
      this._engine = await loadSeedForge();
      this._questions = this._engine.questions || [];
      if (!Array.isArray(this._questions) || this._questions.length === 0) {
        throw new Error("No questions loaded. Check /generated/questions.json");
      }
      this._render();
    } catch (e) {
      this._showError(e);
    }
  }

  open() {
    this._backdrop.setAttribute("open", "");
    // Reset ephemeral state each open (canonical behaviour)
    this._index = 0;
    this._answers = {};
    this._render();
  }

  close() {
    this._backdrop.removeAttribute("open");
  }

  prev() {
    this._index = clamp(this._index - 1, 0, this._questions.length - 1);
    this._render();
  }

  next() {
    if (!this._questions.length) return;

    // If on last question: submit
    if (this._index >= this._questions.length - 1) {
      this._submit();
      return;
    }

    this._index = clamp(this._index + 1, 0, this._questions.length - 1);
    this._render();
  }

  _setAnswer(qid, oid) {
    this._answers[qid] = oid;
    this._render();
  }

  _render() {
    if (!this._questions.length) {
      this._pillStep.textContent = "Loading…";
      this._pillLens.textContent = "—";
      this._stage.innerHTML = "";
      this._btnBack.disabled = true;
      this._btnNext.disabled = true;
      return;
    }

    this._hideError();

    const q = this._questions[this._index];
    const total = this._questions.length;
    const stepLabel = `Question ${this._index + 1} of ${total}`;
    const lensLabel = (q.lens || "—").toString();

    this._pillStep.textContent = stepLabel;
    this._pillLens.textContent = lensLabel;

    const picked = this._answers[q.id];

    this._stage.innerHTML = `
      <div class="q">
        <h3>${escapeHtml(q.title || "Question")}</h3>
        ${q.body ? `<p>${escapeHtml(q.body)}</p>` : ""}
        <div class="options">
          ${(q.options || []).map(opt => {
            const active = picked === opt.id;
            return `
              <button class="opt" type="button" aria-pressed="${active ? "true" : "false"}" data-opt="${escapeAttr(opt.id)}">
                ${escapeHtml(opt.label || opt.id)}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;

    this._stage.querySelectorAll("button.opt").forEach((b) => {
      b.addEventListener("click", () => this._setAnswer(q.id, b.getAttribute("data-opt")));
    });

    this._btnBack.disabled = this._index === 0;
    // Next is enabled even if unanswered (calm UX); scoring can treat missing as neutral/unknown.
    this._btnNext.textContent = (this._index === total - 1) ? "Finish" : "Next";
  }

  async _submit() {
    try {
      if (!this._engine) throw new Error("Engine not loaded.");

      const canonical = computeCanonicalSnapshot({
        engine: this._engine,
        answers: this._answers
      });

      writeLatestSnapshot(canonical);
      appendSnapshotHistory(canonical);
      writeDigitalPassport(canonical);

      // Tell the rest of the site “new canonical snapshot exists”
      window.dispatchEvent(new Event("cyberseeds:snapshot-updated"));

      // Close modal after save
      this.close();

      // Optional: gentle redirect if you're on /snapshot/
      // window.location.href = "/resources/";
    } catch (e) {
      this._showError(e);
    }
  }

  _showError(e) {
    this._err.style.display = "block";
    this._err.textContent = `Snapshot error: ${e && e.message ? e.message : String(e)}`;
  }
  _hideError() {
    this._err.style.display = "none";
    this._err.textContent = "";
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s).replaceAll("`","&#096;"); }

customElements.define("cyber-seeds-snapshot", CyberSeedsSnapshot);
