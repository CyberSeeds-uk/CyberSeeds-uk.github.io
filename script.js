// script.js
//
// This client‑side script powers the provisional household digital snapshot. It
// derives a simple score from a handful of form inputs and translates that
// into a named state, strengths, blind spots and a calm next step. No
// information is sent anywhere — everything runs entirely in the browser.

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('snapshotForm');
  const result = document.getElementById('snapshotResult');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Extract values from form
    const adults = parseInt(form.elements['adults'].value, 10) || 0;
    const childrenValue = form.elements['children'].value;
    // Convert 3+ children to a numeric value for scoring
    const children = childrenValue === '3' ? 3 : parseInt(childrenValue, 10) || 0;
    const devices = form.elements['devices'].value;
    const confidence = form.elements['confidence'].value;

    // Initialise a baseline score. The score never surfaces directly to the
    // visitor but drives which narrative path is taken below. Scores are
    // constrained between 30 and 90 to avoid extreme outputs.
    let score = 50;

    // Adjust score based on confidence about digital safety
    switch (confidence) {
      case 'none':
        score -= 20;
        break;
      case 'some':
        score -= 10;
        break;
      case 'high':
        score += 10;
        break;
    }

    // Adjust score based on children's device usage
    switch (devices) {
      case 'mixed':
        score -= 5;
        break;
      case 'older':
        score -= 3;
        break;
      case 'younger':
        score -= 2;
        break;
      case 'none':
        score += 5;
        break;
    }

    // Adjust score based on number of children
    if (children >= 3) {
      score -= 3;
    } else if (children >= 1) {
      score -= 2;
    }

    // Bound the score to the range [30, 90]
    score = Math.max(30, Math.min(score, 90));

    // Determine narrative path based on score
    let state;
    let strengths;
    let blind;
    let nextStep;
    let borderColor;

    if (score >= 70) {
      state = 'Calm and Resilient';
      strengths = [
        'Connection appears secure and up to date',
        'Digital habits or settings likely protecting you already'
      ];
      blind = [
        'Default account and operating system settings may not be fully hardened',
        'Minor gaps could accumulate unnoticed over time'
      ];
      nextStep = 'Confirm one critical account has two‑factor authentication enabled.';
      borderColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--green').trim();
    } else if (score >= 50) {
      state = 'Generally Stable, Light Attention Needed';
      strengths = [
        'Some awareness of digital safety already exists',
        'No indicators of urgent or crisis‑level risk'
      ];
      blind = [
        'Children may have one‑size‑fits‑all settings that leave gaps',
        'Confidence may be based on habits rather than verified settings'
      ];
      nextStep =
        'Pick one child’s device and review privacy or location settings together — once.';
      borderColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--amber').trim();
    } else {
      state = 'Review Key Settings';
      strengths = [
        'You’re engaged and proactive enough to check this snapshot'
      ];
      blind = [
        'Reused passwords and older device settings may increase exposure',
        'Children may be oversharing information without realising it'
      ];
      nextStep =
        'Change any password reused across accounts and adjust at least one router or device setting.';
      borderColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--violet').trim();
    }

    // Build the result HTML
    const html = `
      <h3>${state}</h3>
      <p>Your answers suggest a home that is functioning, with potential for calm improvements.</p>
      <p><strong>Likely strengths</strong></p>
      <ul>${strengths.map((item) => `<li>${item}</li>`).join('')}</ul>
      <p><strong>Likely blind spots</strong></p>
      <ul>${blind.map((item) => `<li>${item}</li>`).join('')}</ul>
      <p><strong>One calm next step</strong></p>
      <p>${nextStep}</p>
    `;

    // Inject content and set border colour
    result.innerHTML = html;
    result.style.borderLeftColor = borderColor;
    result.classList.add('active');
  });
});
