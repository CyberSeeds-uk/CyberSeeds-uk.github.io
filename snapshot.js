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
      <div class="modal-shell transition-shell">
        <h2>Your household signal is ready.</h2>
        <p>Your snapshot has been saved on this device.</p>
        <a class="btn-primary" href="/resources/">View your household signal</a>
      </div>
    `;
  };

  const submit = () => {
    const result = computeScore(answers);
    saveSnapshot(result);
    renderTransition();
  };

  const renderQuestion = () => {
    const question = questions[pointer];
    const progressText = `${pointer + 1} of ${questions.length}`;

    modal.innerHTML = `
      <div class="modal-shell">
        <div class="modal-head">
          <p class="kicker">Snapshot</p>
          <button type="button" class="link-btn" id="closeSnapshot">Close</button>
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
          <button type="button" class="btn-primary" id="nextQuestion" disabled>${pointer === questions.length - 1 ? 'Finish snapshot' : 'Continue'}</button>
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
