// /components/cyber-seeds-snapshot.js
import "/engine/seedforge.js";
import { saveSnapshot } from "/engine/storage.js";

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
    this.render();
  }

  open(){
    this.shadowRoot.querySelector(".modal").classList.add("open");
    this.step = 0;
    this.answers = {};
    this.renderQuestion();
  }

  close(){
    this.shadowRoot.querySelector(".modal").classList.remove("open");
  }

  render(){
    this.shadowRoot.innerHTML = `
      <style>
        .modal{
          position:fixed; inset:0;
          display:none;
          align-items:center; justify-content:center;
          background:rgba(0,0,0,0.5);
        }
        .modal.open{ display:flex; }
        .card{
          background:white;
          padding:24px;
          width:min(500px,90vw);
          border-radius:16px;
        }
        button{ margin-top:16px; }
      </style>

      <div class="modal">
        <div class="card">
          <div id="stage"></div>
          <button id="next">Next</button>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById("next")
      .addEventListener("click",()=>this.next());
  }

  renderQuestion(){
    const q = this.questions[this.step];
    const container = this.shadowRoot.getElementById("stage");

    container.innerHTML = `
      <p><strong>${q.prompt}</strong></p>
      ${q.options.map((o,i)=>`
        <label>
          <input type="radio" name="q" value="${i}">
          ${o.label}
        </label>
      `).join("")}
    `;

    container.querySelectorAll("input").forEach(input=>{
      input.addEventListener("change",()=>{
        this.answers[q.id]=Number(input.value);
      });
    });
  }

  next(){
    if (!this.questions[this.step]) return;

    const q = this.questions[this.step];
    if (!Number.isInteger(this.answers[q.id])) return;

    if (this.step >= this.questions.length-1){
      this.finish();
      return;
    }

    this.step++;
    this.renderQuestion();
  }

  finish(){
    const scored = this.api.scoreAnswers(this.answers);

    const entry = {
      id:`${scored.snapshotId}-${Date.now()}`,
      ts:Date.now(),
      answers:this.answers,
      ...scored
    };

    saveSnapshot(entry);

    this.close();

    window.dispatchEvent(new Event("cs:snapshot-updated"));
  }
}

customElements.define("cyber-seeds-snapshot", CyberSeedsSnapshot);
