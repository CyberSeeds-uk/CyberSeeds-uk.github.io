import "/engine/seedforge.js";

class CyberSeedsSnapshot extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({ mode:"open" });
    this.answers = {};
    this.step = -1;
  }

  async connectedCallback(){
    this.api = await window.CSSeedForge.load();
    this.questions = this.api.questions.sort(
      (a,b)=>(a.order??999)-(b.order??999)
    );
    this.renderShell();
  }

  open(){
    this.shadowRoot.querySelector(".cs-modal").classList.add("is-open");
    document.body.classList.add("modal-open");
    this.step = 0;
    this.answers = {};
    this.renderQuestion();
  }

  close(){
    this.shadowRoot.querySelector(".cs-modal").classList.remove("is-open");
    document.body.classList.remove("modal-open");
  }

  renderShell(){
    this.shadowRoot.innerHTML = `
      <style>
        :host { all: initial; }

        .cs-modal{
          position:fixed;
          inset:0;
          display:none;
          align-items:center;
          justify-content:center;
          background:rgba(15,47,42,.55);
          z-index:9999;
          font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
        }

        .cs-modal.is-open{ display:flex; }

        .cs-card{
          background:#ffffff;
          width:min(620px,94vw);
          max-height:90vh;
          overflow:auto;
          border-radius:22px;
          box-shadow:0 18px 60px rgba(15,47,42,.18);
          padding:32px;
        }

        h2{
          margin:0 0 12px;
          color:#0f2f2a;
          font-size:1.4rem;
        }

        .muted{
          color:#51615f;
          font-size:.95rem;
        }

        .choices{
          margin-top:18px;
          display:grid;
          gap:10px;
        }

        label{
          display:block;
          border:1px solid #dfecea;
          border-radius:16px;
          padding:14px;
          cursor:pointer;
          transition:all .2s ease;
        }

        label:hover{
          border-color:#1a6a5d;
        }

        input{
          margin-right:8px;
        }

        .actions{
          margin-top:24px;
          display:flex;
          justify-content:space-between;
        }

        button{
          border:none;
          border-radius:16px;
          padding:12px 20px;
          font-weight:600;
          cursor:pointer;
        }

        .primary{
          background:#0f2f2a;
          color:#fff;
        }

        .ghost{
          background:#eef7f6;
          color:#0f2f2a;
        }
      </style>

      <div class="cs-modal">
        <div class="cs-card">
          <div id="stage"></div>
          <div class="actions">
            <button id="back" class="ghost">Back</button>
            <button id="next" class="primary">Next</button>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById("next")
      .addEventListener("click",()=>this.next());

    this.shadowRoot.getElementById("back")
      .addEventListener("click",()=>this.back());
  }

  renderQuestion(){
    const q = this.questions[this.step];
    const container = this.shadowRoot.getElementById("stage");

    container.innerHTML = `
      <h2>${q.prompt}</h2>
      <p class="muted">${q.reassurance ?? ""}</p>
      <div class="choices">
        ${q.options.map((o,i)=>`
          <label>
            <input type="radio" name="q" value="${i}">
            ${o.label}
          </label>
        `).join("")}
      </div>
    `;

    container.querySelectorAll("input").forEach(input=>{
      input.addEventListener("change",()=>{
        this.answers[q.id]=Number(input.value);
      });
    });
  }

  next(){
    const q = this.questions[this.step];
    if (!Number.isInteger(this.answers[q.id])) return;

    if (this.step >= this.questions.length-1){
      this.finish();
      return;
    }

    this.step++;
    this.renderQuestion();
  }

  back(){
    if (this.step<=0) return;
    this.step--;
    this.renderQuestion();
  }

  finish(){
    const scored = this.api.scoreAnswers(this.answers);

    const snapshot = {
      id:`${scored.snapshotId}-${Date.now()}`,
      ts:Date.now(),
      answers:this.answers,
      ...scored
    };

    localStorage.setItem("cs_snapshot_latest", JSON.stringify(snapshot));
    this.close();

    window.dispatchEvent(
      new CustomEvent("cs:snapshot-updated", { detail:snapshot })
    );
  }
}

customElements.define("cyber-seeds-snapshot", CyberSeedsSnapshot);
