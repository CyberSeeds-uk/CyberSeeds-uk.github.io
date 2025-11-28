/* ====================================================
   CYBER SEEDS – SCRIPT.JS
   Family Safety Check / Mobile Menu / UX Enhancements
==================================================== */

/* --------------------------
   MOBILE NAV MENU
--------------------------- */
const navToggle = document.getElementById("nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle) {
  navToggle.addEventListener("change", () => {
    navLinks.style.display = navToggle.checked ? "flex" : "none";
  });
}

/* --------------------------
   SAFETY CHECK QUIZ
--------------------------- */

const quizContainer = document.getElementById("quiz-container");
const resultContainer = document.getElementById("result-container");
const scoreMeter = document.getElementById("score-meter");
const scoreFeedback = document.getElementById("score-feedback");
const retryBtn = document.getElementById("retry-btn");

let currentQuestion = 0;
let totalRisk = 0;

/* QUESTIONS */
const questions = [
  {
    q: "How often do you change your Wi-Fi router password?",
    answers: [
      { text: "At least every year", risk: 0 },
      { text: "Only when it's installed", risk: 1 },
      { text: "Never / I don't know", risk: 2 }
    ]
  },
  {
    q: "Do all your devices update automatically?",
    answers: [
      { text: "Yes, everything auto-updates", risk: 0 },
      { text: "Some do, some don't", risk: 1 },
      { text: "No / I’m not sure", risk: 2 }
    ]
  },
  {
    q: "Do you use the same password across multiple accounts?",
    answers: [
      { text: "No, all passwords are unique", risk: 0 },
      { text: "A few are reused", risk: 1 },
      { text: "I use the same password for most things", risk: 2 }
    ]
  },
  {
    q: "Do you check your email for breaches/leaks?",
    answers: [
      { text: "Yes, I check regularly", risk: 0 },
      { text: "I’ve checked once or twice", risk: 1 },
      { text: "Never / Not sure how", risk: 2 }
    ]
  }
];

/* --------------------------
   RENDER QUESTION
--------------------------- */

function loadQuestion() {
  const question = questions[currentQuestion];

  quizContainer.innerHTML = `
    <h3>${question.q}</h3>
    <div class="quiz-buttons"></div>
  `;

  const btnWrapper = quizContainer.querySelector(".quiz-buttons");

  question.answers.forEach(answer => {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline";
    btn.textContent = answer.text;

    btn.addEventListener("click", () => handleAnswer(answer.risk));
    btnWrapper.appendChild(btn);
  });

  quizContainer.style.display = "block";
  resultContainer.style.display = "none";
}

function handleAnswer(riskValue) {
  totalRisk += riskValue;
  currentQuestion++;

  if (currentQuestion < questions.length) {
    quizFade(loadQuestion);
  } else {
    quizFade(showResult);
  }
}

/* --------------------------
   SHOW RESULT
--------------------------- */

function showResult() {
  quizContainer.style.display = "none";
  resultContainer.style.display = "block";

  let scoreText = "";
  let scoreSummary = "";

  if (totalRisk <= 2) {
    scoreText = "🟢 Low Risk";
    scoreSummary = "Your digital home is fairly well protected. Some small improvements can still make a big difference.";
  } else if (totalRisk <= 5) {
    scoreText = "🟡 Medium Risk";
    scoreSummary = "Your home has several areas that need attention. A full audit will quickly strengthen your online safety.";
  } else {
    scoreText = "🔴 High Risk";
    scoreSummary = "Your home is at high risk of cyber issues. Fixing a few key problems will dramatically improve your safety.";
  }

  scoreMeter.textContent = scoreText;
  scoreFeedback.textContent = scoreSummary;
}

/* --------------------------
   RETAKE QUIZ
--------------------------- */

if (retryBtn) {
  retryBtn.addEventListener("click", () => {
    currentQuestion = 0;
    totalRisk = 0;
    quizFade(loadQuestion);
  });
}

/* --------------------------
   SMOOTH FADE UTILITY
--------------------------- */

function quizFade(callback) {
  quizContainer.style.opacity = 0;

  setTimeout(() => {
    callback();
    quizContainer.style.opacity = 1;
  }, 300);
}

/* --------------------------
   INITIALISE
--------------------------- */
if (quizContainer) loadQuestion();
