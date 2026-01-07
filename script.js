/* =========================================================
   Cyber Seeds — Household Signal Script
   Calm • Local • Non-judgemental • No storage
========================================================= */

(() => {
  const questions = [
    {
      lens: "Network",
      text: "How confident do you feel about your home Wi-Fi and router settings?",
      options: [
        { label: "Confident", score: 2 },
        { label: "Mostly confident", score: 1 },
        { label: "Not sure", score: 0 },
        { label: "Not confident", score: -1 }
      ]
    },
    {
      lens: "Devices",
      text: "How regularly are household devices updated and reviewed?",
      options: [
        { label: "Regularly", score: 2 },
        { label: "Sometimes", score: 1 },
        { label: "Rarely", score: 0 },
        { label: "I’m not sure", score: -1 }
      ]
    },
    {
      lens: "Privacy",
      text: "How comfortable are you with your household privacy settings?",
      options: [
        { label: "Very comfortable", score: 2 },
        { label: "Somewhat comfortable", score: 1 },
        { label: "Uncertain", score: 0 },
        { label: "Concerned", score: -1 }
      ]
    },
    {
      lens: "Scams",
      text: "How confident do you feel spotting scams or suspicious messages?",
      options: [
        { label: "Very confident", score: 2 },
        { label: "Fairly confident", score: 1 },
        { label: "Not confident", score: 0 },
        { label: "I’m unsure", score: -1 }
      ]
    },
    {
      lens: "Children",
      text: "How clear and calm do your household digital boundaries feel?",
      options: [
        { label: "Clear and calm", score: 2 },
        { label: "Mostly clear", score: 1 },
        { label: "Unclear", score: 0 },
        { label: "Not in place yet", score: -1 }
      ]
    }
  ];

  let step = 0;
  const results = {};

  const qEl = document.querySelector(".simQuestion");
  const optWrap = document.querySelector(".simOptions");
  const stepEl = document.querySelector(".simStep");
  const nextBtn = document.querySelector(".nextBtn");
  const backBtn = document.querySelector(".backBtn");

  function renderQuestion() {
    const q = questions[step];
    stepEl.textContent = `Question ${step + 1} of ${questions.length}`;
    qEl.textContent = q.text;
    optWrap.innerHTML = "";

    q.options.forEach(opt => {
      const btn = document.createElement("div");
      btn.className = "simOpt";
      btn.textContent = opt.label;
      btn.onclick = () => {
        results[q.lens] = opt.score;
        document.querySelectorAll(".simOpt").forEach(o => o.classList.remove("selected"));
        btn.classList.add("selected");
      };
      optWrap.appendChild(btn);
    });
  }

  nextBtn.onclick = () => {
    if (step < questions.length - 1) {
      step++;
      renderQuestion();
    } else {
      showSummary();
    }
  };

  backBtn.onclick = () => {
    if (step > 0) {
      step--;
      renderQuestion();
    }
  };

  function showSummary() {
    qEl.textContent = "Your household signal is ready.";
    optWrap.innerHTML = `
      <p class="note">
        This snapshot is not a score or judgement — just a calm signal.
        Small steps create strong systems.
      </p>
    `;
    nextBtn.style.display = "none";
    backBtn.style.display = "none";
  }

  if (qEl && optWrap) renderQuestion();
})();
