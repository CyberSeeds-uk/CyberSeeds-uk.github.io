// Script for handling the Household Signal Quiz interaction
document.addEventListener('DOMContentLoaded', function() {
  const quizForm = document.getElementById('quizForm');
  const quizResult = document.getElementById('quizResult');

  quizForm.addEventListener('submit', function(event) {
    event.preventDefault();  // prevent page reload
    quizResult.textContent = '';  // clear previous result

    // Gather answers
    const formData = new FormData(quizForm);
    let score = 0;
    for (let value of formData.values()) {
      score += parseInt(value || '0');
    }

    // Determine result category based on score
    let resultText = '';
    if (score <= 2) {
      resultText = "Your signal is at a Seed stage – just starting out. With care and support, those seeds will grow into strong habits! 🌱";
    } else if (score <= 5) {
      resultText = "You're at the Sprout stage – some good habits have taken root. Keep nurturing your digital garden and watch it flourish. 🌿";
    } else if (score <= 7) {
      resultText = "You're a Sapling – growing strong and tall in cyber safety. Stay vigilant and keep up the great work as you grow towards an Oak! 🌳";
    } else {
      resultText = "Congratulations, you're an Oak! 🏆 Your family's digital safety practices are robust and deeply rooted. Keep it up and consider helping others grow too!";
    }

    // Display the result
    quizResult.textContent = resultText;
    // Optionally, scroll result into view for the user
    quizResult.scrollIntoView({ behavior: 'smooth' });
  });
});
