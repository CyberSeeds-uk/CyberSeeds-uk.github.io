const form = document.getElementById("quizForm");
const results = document.getElementById("results");
const childrenBlock = document.getElementById("childrenBlock");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const data = new FormData(form);
  let score = 0;
  let count = 0;

  for (let [key, value] of data.entries()) {
    if (key === "children_practices" && data.get("children_count") === "0") {
      continue;
    }
    score += parseInt(value);
    count++;
  }

  const signal = Math.round((score / (count * 2)) * 100);

  let message = "";

  if (signal < 35) {
    message = "Your household is early in its digital journey. That’s okay — awareness is already a strong seed.";
  } else if (signal < 65) {
    message = "Your household shows developing digital resilience. A few small changes could make a big difference.";
  } else {
    message = "Your household demonstrates strong digital care and awareness. This is a healthy ecosystem.";
  }

  results.innerHTML = `
    <h3>Your Household Signal: ${signal}%</h3>
    <p>${message}</p>
    <p><em>This is a snapshot, not a score.</em></p>
  `;
  results.style.display = "block";
  results.focus();
});

// Hide children section dynamically
document.querySelectorAll('input[name="children_count"]').forEach(input => {
  input.addEventListener("change", () => {
    childrenBlock.style.display =
      input.value === "0" ? "none" : "block";
  });
});
