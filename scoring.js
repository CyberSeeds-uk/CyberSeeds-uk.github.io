const LENS_ORDER = ['network', 'devices', 'privacy', 'scams', 'wellbeing'];

const QUESTION_BANK = [
  { id: 'network_updates', lens: 'network', text: 'Your Wi-Fi quietly supports everything at home. When did it last receive care or an update?' },
  { id: 'network_guest', lens: 'network', text: 'When guests or smart devices connect, does your home offer them a separate digital space?' },
  { id: 'device_updates', lens: 'devices', text: 'Across phones, tablets and laptops, how are updates usually handled in your home?' },
  { id: 'device_backup', lens: 'devices', text: 'If a device was lost tomorrow, how steady would you feel about recovering photos and files?' },
  { id: 'privacy_recovery', lens: 'privacy', text: 'For your most important accounts, how protected do sign-ins feel right now?' },
  { id: 'privacy_passwords', lens: 'privacy', text: 'Are key account passwords separated enough to protect your household identity?' },
  { id: 'scam_pause', lens: 'scams', text: 'When a message feels urgent or emotional, what tends to happen next in your home?' },
  { id: 'scam_reporting', lens: 'scams', text: 'If something felt suspicious, how confident would your household feel about reporting it?' },
  { id: 'wellbeing_boundaries', lens: 'wellbeing', text: 'Is there at least one moment each day when devices gently step back?' },
  { id: 'wellbeing_children', lens: 'wellbeing', text: 'Are children supported with clear and calm boundaries around apps, chats and gaming?' }
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
    stable: 'Your household is showing steady digital habits. With a few small rituals, this calm pattern can continue to grow.',
    holding: 'Your household is holding steady. A handful of gentle adjustments can strengthen long-term resilience.',
    strained: 'Your household is carrying digital pressure at the moment. Small, practical steps can gradually restore control.'
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
    privacy: 'Begin with your main family email account, then gently extend two-step protection to other services.',
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
