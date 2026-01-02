document.getElementById("snapshotForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const household = e.target.household.value;
  const clarity = e.target.clarity.value;

  let signal;

  if (clarity === "high" && household === "simple") {
    signal = "Your household appears calm, oriented, and quietly resilient.";
  } else if (clarity === "low") {
    signal =
      "Your home likely functions day-to-day, but some digital foundations may be assumed rather than understood.";
  } else {
    signal =
      "Your household shows signs of stability, with a few areas that would benefit from gentle clarification.";
  }

  document.getElementById("snapshotOutput").innerText = signal;
});
