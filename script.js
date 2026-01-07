document.getElementById('snapshotForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const feeling = document.querySelector('input[name="feeling"]:checked').value;
  const response = document.querySelector('input[name="response"]:checked').value;

  let message = '';

  if (feeling === 'calm') {
    message = `
      Your household already shows signs of healthy digital grounding.
      That calm doesn’t happen by accident — it grows from habits,
      boundaries, and care that are already taking root.
    `;
  } else if (feeling === 'mixed') {
    message = `
      Your digital environment feels partly supportive, partly uncertain.
      That’s incredibly common — and it means there are clear places
      where small changes can bring noticeable relief.
    `;
  } else {
    message = `
      Your experience suggests digital pressure has been carrying more
      weight than it should. This isn’t a failure — it’s a sign that
      the system was never designed with families in mind.
    `;
  }

  if (response === 'avoid') {
    message += `
      Cyber Seeds exists for moments like this — not to alarm,
      but to gently illuminate what’s happening and restore confidence.
    `;
  }

  document.getElementById('resultText').innerText = message.trim();
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
});
