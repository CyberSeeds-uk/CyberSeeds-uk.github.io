import { createSnapshot, computeScore } from '/scoring.js';
import { saveSnapshot } from '/storage.js';

const OPTIONS = [
  { value: 'yes', label: 'This is part of our routine' },
  { value: 'partly', label: 'We are building this, but it is not consistent yet' },
  { value: 'unsure', label: 'I am not sure what our current pattern is' },
  { value: 'no', label: 'We have not started this yet' }
];

document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startSnapshot');
  const modal = document.getElementById('snapshotModal');
  if (!startButton || !modal) return;

  const questions = createSnapshot();
  let answers = {};
  let pointer = 0;

  const reset = () => {
    answers = {};
    pointer = 0;
  };

  const close = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = '';
    reset();
  };

  const renderTransition = () => {
    modal.innerHTML = `
      <div class="modal-shell signal-shell">
        <div class="signal-mark">
          <span class="signal-dot"></span>
        </div>

        <h2 class="signal-title">Your household signal is ready.</h2>

        <p class="signal-body">
          This snapshot reflects patterns across your digital home.
          It is not a judgement — only a starting point.
        </p>

        <p class="signal-sub">
          You can now view your full household signal, lens breakdown and next digital seeds.
        </p>

        <a class="btn-primary signal-btn" href="/resources/">
          View your household signal
        </a>
      </div>
    `;
  };

  const submit = () => {
    const result = computeScore(answers);
    saveSnapshot(result);
    renderTransition();
  };

  const LENS_META = {
    network: {
      label: 'Network lens',
      insight: 'Your Wi-Fi is the foundation of everything connected at home.'
    },
    devices: {
      label: 'Devices lens',
      insight: 'Devices carry conversations, memories and work.'
    },
    privacy: {
      label: 'Privacy lens',
      insight: 'Accounts are part of your household identity.'
    },
    scams: {
      label: 'Scams lens',
      insight: 'Scams rely on urgency and emotion.'
    },
    wellbeing: {
      label: 'Wellbeing lens',
      insight: 'Digital safety also includes emotional balance.'
    }
  };

  const renderQuestion = () => {
    const question = questions[pointer];
    const progressText = `${pointer + 1} of ${questions.length}`;
    const lensMeta = LENS_META[question.lens];

    const introBlock = pointer === 0 ? `
      <p class="snapshot-intro">
        This short check-in looks at five parts of your digital home.
        There are no right or wrong answers — only patterns.
      </p>
    ` : '';

    modal.innerHTML = `
      <div class="modal-shell">
        <div class="modal-head">
          <p class="kicker">Household snapshot</p>
          <button type="button" class="link-btn" id="closeSnapshot">Close</button>
        </div>

        ${introBlock}

        <div class="lens-meta">
          <p class="lens-label">${lensMeta.label}</p>
          <p class="lens-insight">${lensMeta.insight}</p>
        </div>

        <p class="progress">${progressText}</p>
        <h2 id="snapshotQuestion">${question.text}</h2>

        <fieldset class="choice-set" aria-describedby="snapshotQuestion">
          <legend class="sr-only">Select one answer</legend>
          ${OPTIONS.map((option) => `
            <label class="choice-row">
              <input type="radio" name="snapshotAnswer" value="${option.value}" ${answers[question.id] === option.value ? 'checked' : ''}>
              <span>${option.label}</span>
            </label>
          `).join('')}
        </fieldset>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="prevQuestion" ${pointer === 0 ? 'disabled' : ''}>Back</button>
          <button type="button" class="btn-primary" id="nextQuestion" disabled>
            ${pointer === questions.length - 1 ? 'Finish snapshot' : 'Continue'}
          </button>
        </div>
      </div>
    `;

    const selected = modal.querySelector('input[name="snapshotAnswer"]:checked');
    const nextButton = modal.querySelector('#nextQuestion');
    if (selected && nextButton) nextButton.disabled = false;

    const radioButtons = modal.querySelectorAll('input[name="snapshotAnswer"]');
    radioButtons.forEach((input) => {
      input.addEventListener('change', () => {
        answers[question.id] = input.value;
        nextButton.disabled = false;
      });
    });

    modal.querySelector('#closeSnapshot')?.addEventListener('click', close);
    modal.querySelector('#prevQuestion')?.addEventListener('click', () => {
      pointer -= 1;
      renderQuestion();
    });
    modal.querySelector('#nextQuestion')?.addEventListener('click', () => {
      if (pointer === questions.length - 1) {
        submit();
        return;
      }
      pointer += 1;
      renderQuestion();
    });
  };

  const open = () => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    renderQuestion();
  };

  startButton.addEventListener('click', open);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
});
