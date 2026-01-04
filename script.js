// Gentle lens animation (non-intrusive, cognitive-safe)
const lenses = document.querySelectorAll(".signal-ring span");
let index = 0;

setInterval(() => {
  lenses.forEach(l => l.style.color = "#6b7280");
  lenses[index].style.color = "#2bb673";
  index = (index + 1) % lenses.length;
}, 1400);

// CTA affordance
document.getElementById("startJourney")?.addEventListener("click", () => {
  document.querySelector(".lenses").scrollIntoView({ behavior: "smooth" });
});
