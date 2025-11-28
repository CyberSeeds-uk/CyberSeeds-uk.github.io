/*
  Cyber Seeds – Risk Checker
  Simple client‑side quiz to gauge a family’s digital safety. Accumulates a risk
  score based on responses and displays a result. Extend or replace with real
  diagnostics as the platform evolves.
*/

// Define questions for the quiz. Each question has a text (q), an array of
// answers (a) and an array of risk values (r) corresponding to each answer.
const questions = [
  {
    q: "How often do you change your Wi‑Fi router password?",
    a: ["At least every year", "Only when it's installed", "Never / I don't know"],
    r: [0, 1, 2]
  },
  {
    q: "Are your devices set to install security updates automatically?",
    a: ["Yes", "Some are", "No / Not sure"],
    r: [0, 1, 2]
  },
  {
    q: "Do you use unique passwords for each account?",
    a: ["Always", "Sometimes", "No / I reuse passwords"],
    r: [0, 1, 2]
  },
  {
    q: "Have you ever checked if your email or phone appears in a data breach?",
    a: ["Yes", "No / I don't know"],
    r: [0, 2]
  },
  {
    q: "Do your children play on platforms like Roblox or Discord without supervision?",
    a: ["No, we monitor their activity", "Sometimes", "Yes, often"],
    r: [0, 1, 2]
  },
  {
    q: "Have you received scam texts or emails in the last 6 months?",
    a: ["No", "Yes, but I ignored them", "Yes and I clicked / replied"],
    r: [0, 1, 2]
  }
];

let current = 0;
let risk = 0;

// Initialize the quiz on page load
document.addEventListener('DOMContentLoaded', () => {
  renderQuestion();
});

// Render the current question
function renderQuestion() {
  const container = document.getElementById('quiz-container');
  const resultContainer = document.getElementById('result-container');
  resultContainer.style.display = 'none';
  if (current < questions.length) {
    const q = questions[current];
    let html = `<h4>${q.q}</h4><div class="quiz-options">`;
    q.a.forEach((ans, i) => {
      html += `<button onclick="answer(${q.r[i]})">${ans}</button>`;
    });
    html += `</div>`;
    container.innerHTML = html;
  }
}

// Handle answer selection
function answer(val) {
  risk += val;
  current++;
  if (current < questions.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

// Display the result based on accumulated risk
function showResult() {
  const quizContainer = document.getElementById('quiz-container');
  const resultContainer = document.getElementById('result-container');
  quizContainer.innerHTML = '';
  resultContainer.style.display = 'block';
  const meter = document.getElementById('score-meter');
  const feedback = document.getElementById('score-feedback');
  if (risk <= 3) {
    meter.innerText = '🟢 Low Risk';
    feedback.innerText = 'Great work! Your digital habits are strong. Keep them up and consider a full audit for peace of mind.';
  } else if (risk <= 7) {
    meter.innerText = '🟡 Medium Risk';
    feedback.innerText = 'Some gaps detected. A few simple changes could dramatically improve your safety. A full audit is recommended.';
  } else {
    meter.innerText = '🔴 High Risk';
    feedback.innerText = 'Your home is at significant risk. Book a full audit to identify vulnerabilities and protect your family.';
  }
}

// Retake functionality
const retryBtn = document.getElementById('retry-btn');
if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    current = 0;
    risk = 0;
    document.getElementById('result-container').style.display = 'none';
    renderQuestion();
  });
}