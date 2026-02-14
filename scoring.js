const LENS_ORDER = ['network', 'devices', 'privacy', 'scams', 'wellbeing'];

const QUESTION_BANK = [
  { id: 'network_updates', lens: 'network', text: 'Is your home router still receiving software updates?' },
  { id: 'network_guest', lens: 'network', text: 'Do visitors and smart devices use a separate guest Wi-Fi when possible?' },
  { id: 'device_updates', lens: 'devices', text: 'Are phones, tablets, and laptops set to update automatically?' },
  { id: 'device_backup', lens: 'devices', text: 'Does your household have a simple backup routine for important files and photos?' },
  { id: 'privacy_recovery', lens: 'privacy', text: 'Are your main accounts protected with strong recovery options and two-step verification?' },
  { id: 'privacy_passwords', lens: 'privacy', text: 'Are key account passwords unique rather than reused?' },
  { id: 'scam_pause', lens: 'scams', text: 'If a message feels urgent, does your household pause and verify before responding?' },
  { id: 'scam_reporting', lens: 'scams', text: 'Would everyone know how to report a suspicious text, email, or call?' },
  { id: 'wellbeing_boundaries', lens: 'wellbeing', text: 'Do you have at least one regular device-light moment in the day?' },
  { id: 'wellbeing_children', lens: 'wellbeing', text: 'Are children supported with clear app, chat, and gaming boundaries?' }
];

const OPTION_WEIGHTS = {
  yes: 100,
  partly: 60,
  no: 25,
  unsure: 40
};

export function createSnapshot() {
  return QUESTION_BANK.map((item) => ({ ...item }));
}

export function computeScore(answerMap) {
  const lensScores = LENS_ORDER.reduce((acc, lens) => {
    const lensQuestions = QUESTION_BANK.filter((q) => q.lens === lens);
    const total = lensQuestions.reduce((sum, q) => sum + (OPTION_WEIGHTS[answerMap[q.id]] ?? OPTION_WEIGHTS.unsure), 0);
    acc[lens] = Math.round(total / lensQuestions.length);
    return acc;
  }, {});

  const overallScore = Math.round(
    LENS_ORDER.reduce((sum, lens) => sum + lensScores[lens], 0) / LENS_ORDER.length
  );

  const tone = overallScore >= 75 ? 'stable' : overallScore >= 50 ? 'holding' : 'strained';
  const certificationLevel = overallScore >= 85 ? 'Oak' : overallScore >= 70 ? 'Sapling' : overallScore >= 55 ? 'Sprout' : 'Seed';
  const digitalSeeds = buildDigitalSeeds(lensScores);

  const summaryByTone = {
    stable: 'Your household is showing steady digital habits. A few ongoing rituals can help you keep this calm momentum.',
    holding: 'Your household is currently holding steady. A few small changes can strengthen long-term resilience.',
    strained: 'Your household is carrying digital pressure right now. Gentle, practical steps can restore control over time.'
  };

  const canonical = {
    version: 'v1',
    timestamp: new Date().toISOString(),
    overallScore,
    tone,
    certificationLevel,
    lenses: lensScores,
    digitalSeeds,
    narrativeSummary: summaryByTone[tone]
  };

  return deepFreeze(canonical);
}

function buildDigitalSeeds(lensScores) {
  const seedLibrary = {
    network: 'Choose a 20-minute window this week to check router updates and confirm your main Wi-Fi password is still private.',
    devices: 'Pick one day each month as a household update and backup day so maintenance feels routine, not urgent.',
    privacy: 'Protect your main family email account first, then extend two-step verification to other important services.',
    scams: 'Create a shared “pause before action” phrase for urgent messages so everyone knows to verify first.',
    wellbeing: 'Set one predictable tech-light time that works for adults and children, even if it is just 30 minutes.'
  };

  return Object.entries(lensScores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map(([lens]) => seedLibrary[lens]);
}

function deepFreeze(value) {
  Object.freeze(value);
  Object.getOwnPropertyNames(value).forEach((prop) => {
    const nested = value[prop];
    if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
      deepFreeze(nested);
    }
  });
  return value;
}
