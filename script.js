const form = document.getElementById("quizForm");
const result = document.getElementById("result");
const childrenBlock = document.getElementById("childrenBlock");

form.addEventListener("submit", e => {
  e.preventDefault();

  const data = new FormData(form);
  let score = 0;
  let factors = 0;

  for (let [key, value] of data.entries()) {
    if (key === "childrenSafety" && data.get("children") === "0") continue;
    score += parseInt(value);
    factors++;
  }

  const signal = Math.round((score / (factors * 2)) * 100);

  let narrative = "";

  if (signal < 35) {
    narrative = "Your household is at an early stage of digital resilience. Awareness itself is already a meaningful first step.";
  } else if (signal < 65) {
    narrative = "Your household shows developing digital stability. A small number of focused improvements could significantly strengthen resilience.";
  } else {
    narrative = "Your household demonstrates strong digital care and awareness. This is a healthy, well-tended digital environment.";
  }

  result.innerHTML = `
    <h3>Household Signal: ${signal}%</h3>
    <p>${narrative}</p>
    <p><em>This snapshot reflects current conditions, not capability or worth.</em></p>
  `;
  result.style.display = "block";
  result.focus();
});

document.querySelectorAll('input[name="children"]').forEach(input => {
  input.addEventListener("change", () => {
    childrenBlock.style.display = input.value === "0" ? "none" : "block";
  });
});
