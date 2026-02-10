/*
 * Cyber Seeds Web Component — Assessment Engine
 *
 * This custom element provides a self‑contained version of the Cyber Seeds snapshot.
 * It loads the question bank and scoring logic from the existing CSSeedForge API,
 * presents a brief questionnaire, computes the household digital safety metrics
 * and exposes a complete JSON audit of the session. No data leaves the user’s
 * browser. The component can be embedded into any HTML page with a single
 * script tag and custom element declaration.
 */

class CyberSeedsEngine extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.api = null;
    this.questions = [];
    this.answers = {};
    this.currentIndex = -1;
    this.container = null;
  }

  connectedCallback() {
    this.renderSkeleton();
    this.initialise();
  }

  async initialise() {
    // Ensure the core snapshot engine is loaded
    if (!window.CSSeedForge) {
      await import('/script.js');
    }
    this.api = await window.CSSeedForge.load();
    // Normalise question structure (v3 stores under .questions)
    const qsrc = Array.isArray(this.api.questions)
      ? this.api.questions
      : (this.api.questions?.questions || []);
    // Ensure order is deterministic across sessions
    this.questions = [...qsrc];
    // Reset state and render start screen
    this.currentIndex = -1;
    this.answers = {};
    this.render();
  }

  renderSkeleton() {
    // Insert basic styling for the component
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; font-family: inherit; margin: 1rem 0; }
      .cs-engine-card {
        border: 1px solid #e0e0e0;
        padding: 1rem;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        max-width: 480px;
      }
      .cs-engine-card p { margin-top: 0.5rem; margin-bottom: 0.5rem; }
      .cs-engine-btn {
        display: inline-block;
        margin-top: 1rem;
        background: #0f2f2a;
        color: #ffffff;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        border: none;
        font-size: 1rem;
      }
      .cs-engine-btn:disabled { opacity: 0.5; cursor: default; }
      .cs-engine-options { margin-top: 0.5rem; }
      .cs-engine-options label { display: block; margin-bottom: 0.5rem; cursor: pointer; }
      .cs-engine-options input { margin-right: 0.5rem; }
      .cs-engine-table {
        border-collapse: collapse;
        width: 100%;
        margin-top: 1rem;
        font-size: 0.9rem;
      }
      .cs-engine-table th, .cs-engine-table td {
        border: 1px solid #ddd;
        padding: 0.4rem;
        text-align: left;
      }
      .cs-engine-table th {
        background: #f5f5f5;
      }
      pre {
        background: #f7f7f7;
        padding: 0.5rem;
        overflow: auto;
        font-size: 0.85rem;
      }
    `;
    this.shadowRoot.append(style);
    this.container = document.createElement('div');
    this.shadowRoot.append(this.container);
  }

  render() {
    // Clear existing content
    this.container.innerHTML = '';
    // Start screen
    if (this.currentIndex === -1) {
      const card = document.createElement('div');
      card.className = 'cs-engine-card';
      card.innerHTML = `
        <p><strong>Cyber Seeds Assessment Engine</strong></p>
        <p>This embedded engine guides you through five brief questions. All data stays in your browser. When finished, you'll receive a calm signal and a complete audit.</p>
        <button class="cs-engine-btn" id="startBtn">Begin assessment</button>
      `;
      card.querySelector('#startBtn').addEventListener('click', () => {
        this.currentIndex = 0;
        this.render();
      });
      this.container.append(card);
      return;
    }
    // Question screens
    if (this.currentIndex < this.questions.length) {
      const q = this.questions[this.currentIndex];
      const card = document.createElement('div');
      card.className = 'cs-engine-card';
      const num = this.currentIndex + 1;
      card.innerHTML = `
        <p><strong>Question ${num} of ${this.questions.length}</strong></p>
        <p>${q.prompt}</p>
        <form class="cs-engine-options" id="optionsForm"></form>
        <button class="cs-engine-btn" id="nextBtn">Next</button>
      `;
      const form = card.querySelector('#optionsForm');
      q.options.forEach((opt, idx) => {
        const labelEl = document.createElement('label');
        labelEl.innerHTML = `<input type="radio" name="${q.id}" value="${idx}" /> ${opt.label}`;
        form.append(labelEl);
      });
      card.querySelector('#nextBtn').addEventListener('click', (e) => {
        e.preventDefault();
        const selected = form.querySelector('input[type="radio"]:checked');
        if (!selected) {
          alert('Please select an option before continuing.');
          return;
        }
        this.answers[q.id] = parseInt(selected.value, 10);
        this.currentIndex += 1;
        this.render();
      });
      this.container.append(card);
      return;
    }
    // Results screen
    const results = this.api.scoreAnswers(this.answers);
    const card = document.createElement('div');
    card.className = 'cs-engine-card';
    card.innerHTML = `
      <p><strong>Assessment complete</strong></p>
      <p>Your Household Digital Safety Score (HDSS): <strong>${results.hdss}</strong></p>
      <p>Strongest lens: <strong>${this.titleCase(results.strongest)}</strong></p>
      <p>Lens to support next: <strong>${this.titleCase(results.weakest)}</strong></p>
      <p>Focus lens: <strong>${this.titleCase(results.focus)}</strong></p>
      <p>Stage: <strong>${results.stage.label}</strong> – ${results.stage.message}</p>
      <div id="lensTable"></div>
      <pre id="auditJson"></pre>
      <button class="cs-engine-btn" id="resetBtn">Retake assessment</button>
    `;
    // Build lens table
    const lensTable = card.querySelector('#lensTable');
    const table = document.createElement('table');
    table.className = 'cs-engine-table';
    table.innerHTML = '<tr><th>Lens</th><th>Score (%)</th></tr>';
    const lensPercents = results.lensPercents || {};
    Object.keys(lensPercents).forEach((lens) => {
      const row = document.createElement('tr');
      const perc = lensPercents[lens];
      row.innerHTML = `<td>${this.titleCase(lens)}</td><td>${Math.round(Number(perc) || 0)}%</td>`;
      table.appendChild(row);
    });
    lensTable.appendChild(table);
    // Build audit JSON
    const audit = { answers: this.answers, ...results };
    const auditPre = card.querySelector('#auditJson');
    auditPre.textContent = JSON.stringify(audit, null, 2);
    // Reset handler
    card.querySelector('#resetBtn').addEventListener('click', () => {
      this.answers = {};
      this.currentIndex = 0;
      this.render();
    });
    this.container.append(card);
  }

  titleCase(str) {
    return String(str || '')
      .split(/[_\-\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}

// Define the custom element once
if (!customElements.get('cyber-seeds-engine')) {
  customElements.define('cyber-seeds-engine', CyberSeedsEngine);
}