document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('snapshotForm');
  const result = document.getElementById('snapshotResult');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const adults = parseInt(form.elements['adults'].value, 10) || 0;
    const childrenValue = form.elements['children'].value;
    const children = childrenValue === '3' ? 3 : parseInt(childrenValue, 10) || 0;
    const devices = form.elements['devices'].value;
    const confidence = form.elements['confidence'].value;

    /**
     * ----------------------------
     * 1. FOUNDATIONS (clarity > score)
     * ----------------------------
     */
    const foundations = {
      networkAwareness: confidence !== 'none',
      childBoundaries: children === 0 || devices !== 'mixed',
      householdOrientation: confidence === 'high'
    };

    /**
     * ----------------------------
     * 2. SIGNAL BUILDING
     * ----------------------------
     * Signals are not shown numerically.
     * They drive narrative states only.
     */
    let signal = 0;

    // Orientation signal
    if (confidence === 'high') signal += 2;
    if (confidence === 'some') signal += 1;

    // Household complexity signal
    if (children >= 1) signal -= 1;
    if (children >= 3) signal -= 1;
    if (devices === 'mixed') signal -= 1;

    // Bound signal gently
    signal = Math.max(-2, Math.min(signal, 3));

    /**
     * ----------------------------
     * 3. INTERPRETIVE STATES
     * ----------------------------
     */
    let state, strengths, uncertainties, nextStep, borderColor;

    if (signal >= 2 && foundations.networkAwareness) {
      state = 'Calm and Oriented';
      strengths = [
        'You appear to have a working understanding of your digital home',
        'Nothing in your answers suggests immediate or escalating risk'
      ];
      uncertainties = [
        'Some foundations may be assumed rather than confirmed',
        'Small gaps often remain invisible until checked once'
      ];
      nextStep =
        'Choose one core account or setting and confirm it is configured the way you believe it is.';
      borderColor = getCSS('--green');

    } else if (signal >= 0) {
      state = 'Generally Stable, With Some Unknowns';
      strengths = [
        'Your household is functioning without obvious distress',
        'You are engaged enough to reflect on digital safety'
      ];
      uncertainties = [
        'Confidence may be based on habits rather than verified settings',
        'Children or shared devices can introduce unseen complexity'
      ];
      nextStep =
        'Pick one area you feel “probably fine” about and quietly verify it once.';
      borderColor = getCSS('--amber');

    } else {
      state = 'Orientation Needed in a Few Key Areas';
      strengths = [
        'You are taking a thoughtful step by checking',
        'Awareness tends to improve outcomes more than tools do'
      ];
      uncertainties = [
        'Some foundations may not yet be clearly understood',
        'Complex households often accumulate risk unintentionally'
      ];
      nextStep =
        'Start with one foundation: accounts, Wi-Fi, or a child’s device — not all at once.';
      borderColor = getCSS('--violet');
    }

    /**
     * ----------------------------
     * 4. RENDER OUTPUT
     * ----------------------------
     */
    result.innerHTML = `
      <h3>${state}</h3>
      <p>This snapshot reflects orientation and clarity — not performance.</p>

      <p><strong>What seems steady</strong></p>
      <ul>${strengths.map(s => `<li>${s}</li>`).join('')}</ul>

      <p><strong>What may be unclear</strong></p>
      <ul>${uncertainties.map(u => `<li>${u}</li>`).join('')}</ul>

      <p><strong>One calm next step</strong></p>
      <p>${nextStep}</p>
    `;

    result.style.borderLeftColor = borderColor;
    result.classList.add('active');
  });

  function getCSS(variable) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();
  }
});
