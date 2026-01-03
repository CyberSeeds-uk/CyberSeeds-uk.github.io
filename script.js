document.getElementById("signalForm").addEventListener("submit", e => {
  e.preventDefault();

  const { household, clarity, stress } = e.target;

  let message = "";

  if (clarity.value === "high" && stress.value === "low") {
    message =
      "Your household feels settled and well-oriented. Most digital systems appear to support daily life quietly, with only minor opportunities for refinement.";
  } 
  else if (clarity.value === "low" || stress.value === "high") {
    message =
      "Your home is functioning, but some digital foundations may feel unclear or stressful when things go wrong. Gentle clarification would likely bring noticeable relief.";
  } 
  else {
    message =
      "Your household shows signs of stability, with a few areas that would benefit from calm attention and small adjustments over time.";
  }

  document.getElementById("signalOutput").innerText = message;
});
