const LENS_ORDER = ['network', 'devices', 'privacy', 'scams', 'wellbeing'];

const QUESTION_BANK = [
  { id: 'network_updates', lens: 'network', text: 'When was your home Wi-Fi last checked or updated?' },
  { id: 'network_guest', lens: 'network', text: 'How often do guests or smart devices use a separate Wi-Fi space?' },
  { id: 'device_updates', lens: 'devices', text: 'How do device updates usually happen in your home?' },
  { id: 'device_backup', lens: 'devices', text: 'How regularly do you back up important files or photos?' },
  { id: 'privacy_recovery', lens: 'privacy', text: 'When signing in to key accounts, how often is there an extra check?' },
  { id: 'privacy_passwords', lens: 'privacy', text: 'How often are important account passwords kept separate from each other?' },
  { id: 'scam_pause', lens: 'scams', text: 'When a message feels urgent, how often do you pause before responding?' },
  { id: 'scam_reporting', lens: 'scams', text: 'If something felt suspicious, how ready would your household feel to report it?' },
  { id: 'wellbeing_boundaries', lens: 'wellbeing', text: 'How often do you keep a small device-light moment in the day?' },
  { id: 'wellbeing_children', lens: 'wellbeing', text: 'How regularly do children get calm support with apps, chats, and gaming?' }
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
