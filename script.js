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


// Ensure the children practices question is hidden initially
document.getElementById('children-practices-section').style.display = 'none';

// Listen for changes on the "kids_devices" question to show/hide the children practices section
document.querySelectorAll('input[name="kids_devices"]').forEach(function(radio) {
  radio.addEventListener('change', function() {
    const childrenSection = document.getElementById('children-practices-section');
    const childrenInputs = childrenSection.querySelectorAll('input[name="children_practices"]');
    if (this.value !== 'none') {
      // Show the children practices question
      childrenSection.style.display = 'block';
      // Make it required to answer now (set required on the first option of the group)
      childrenInputs[0].setAttribute('required', 'required');
    } else {
      // Hide the children practices question
      childrenSection.style.display = 'none';
      // Remove required attribute so form can submit without it
      childrenInputs[0].removeAttribute('required');
      // (We leave any previously selected answer intact in case the user toggles back)
    }
  });
});

// Handle form submission to calculate results
document.getElementById('quizForm').addEventListener('submit', function(e) {
  e.preventDefault(); // prevent page refresh

  // Gather values from each quiz question
  const adultsCount = document.querySelector('input[name="adults_count"]:checked').value;
  const childrenCount = document.querySelector('input[name="children_count"]:checked').value;
  const kidsDevices = document.querySelector('input[name="kids_devices"]:checked').value;
  const networkScore = parseInt(document.querySelector('input[name="network"]:checked').value);
  const devicesScore = parseInt(document.querySelector('input[name="devices"]:checked').value);
  const privacyScore = parseInt(document.querySelector('input[name="privacy"]:checked').value);
  const scamsScore = parseInt(document.querySelector('input[name="scams"]:checked').value);
  // Children practices score is only relevant if kidsDevices != 'none'
  let childrenScore = null;
  if (kidsDevices !== 'none') {
    const checkedChildOption = document.querySelector('input[name="children_practices"]:checked');
    // If for some reason it's not checked (should be if required), handle gracefully
    childrenScore = checkedChildOption ? parseInt(checkedChildOption.value) : null;
  }

  // Determine feedback text for each lens based on score tiers
  // Network & Wi-Fi feedback
  let networkFeedback;
  if (networkScore >= 2) {
    // High
    networkFeedback = "Your Wi-Fi network is in great shape – you've effectively locked the garden gate to keep intruders out. Excellent job keeping your network secure. Just continue to check your router now and then for updates, but overall you're doing great here.";
  } else if (networkScore === 1) {
    // Medium
    networkFeedback = "Your network has some protection, but it's a bit like a garden gate that's only partially latched. You're on the right track, but with a bit more attention – say, updating the router password or checking its security settings – you can make it much safer.";
  } else {
    // Low (score 0 or -1)
    networkFeedback = "It looks like your Wi-Fi might need more protection – think of it like a garden gate left open right now. If you've ever reset your router with a spoon, you're not alone; many of us find routers confusing. The good news is that a couple of simple steps (like changing the default router password) can greatly boost your network safety.";
  }

  // Devices & Apps feedback
  let devicesFeedback;
  if (devicesScore >= 2) {
    // High
    devicesFeedback = "Fantastic – your devices seem well cared for, like a tidy house where everything is in order. It sounds like you keep your software updated and use strong security practices. Keep up the great work and your devices will stay healthy and secure.";
  } else if (devicesScore === 1) {
    // Medium
    devicesFeedback = "You're doing okay with device upkeep – it's like a mostly tidy home with a few messy spots. You install updates sometimes, but perhaps not always right away. If you can do those updates a bit more regularly and double-check security settings (like device passcodes or backups), your devices will be even safer.";
  } else {
    // Low
    devicesFeedback = "It looks like your device hygiene could use some care. Many of us hit “Remind me tomorrow” on updates, so you're not alone. But those updates and basic security steps (like using strong passcodes) are like tidying up clutter – they prevent bigger problems later. Taking a couple of these small steps will make your devices much safer and more reliable.";
  }

  // Privacy & Identity feedback
  let privacyFeedback;
  if (privacyScore >= 2) {
    // High
    privacyFeedback = "You're doing a great job protecting your personal information. You keep your curtains closed when it comes to sharing data – using strong, unique passwords and two-factor logins, and being careful about privacy settings. This mindful approach to privacy and identity safety will serve you well.";
  } else if (privacyScore === 1) {
    // Medium
    privacyFeedback = "You have some good privacy habits, but there's room to tighten up. Think of it like a window that's only partly covered – you might be revealing a bit more than you realize. Perhaps you reuse a password or two, or haven't checked all your social media settings. Tidying up those areas (like using unique passwords everywhere and adjusting privacy settings) will better protect your personal data.";
  } else {
    // Low
    privacyFeedback = "Your online privacy might be a bit too open right now – like leaving your curtains wide open. If \"password123\" or a sticky note under your keyboard sounds familiar, you're not alone – lots of people do that. The great news is it's not hard to improve: start by using unique passwords (a password manager can help) and checking privacy settings on a couple of accounts. Even small changes will significantly boost your privacy and peace of mind.";
  }

  // Scams & Phishing feedback
  let scamsFeedback;
  if (scamsScore >= 2) {
    // High
    scamsFeedback = "Great job – you stay alert to scams and it shows. You can spot those disguised “too good to be true” offers like a detective seeing through a disguise. Staying healthily skeptical of unexpected messages is clearly working well for you, so keep it up!";
  } else if (scamsScore === 1) {
    // Medium
    scamsFeedback = "You're fairly careful about scams, which is good – but scammers are getting trickier all the time. They can be like a mimic octopus, pretending to be something harmless to fool you. It sounds like you catch most fake messages but might second-guess a few. Strengthening your scam radar with a little extra caution (like double-checking sender addresses or not clicking links you're unsure about) will help keep you safe.";
  } else {
    // Low
    scamsFeedback = "This is a tough area for everyone, so don't feel bad if you've been caught off guard. Scammers disguise themselves really well – like a mimic octopus that changes shape to fool its predators. If you've ever almost clicked on a “You’ve won a prize!” link, you're definitely not alone. The key is to slow down and stay skeptical: even a quick pause to verify a suspicious message (or asking someone you trust) can save you from most scams.";
  }

  // Children's Online Safety feedback (if applicable)
  let childrenFeedback = "";
  if (kidsDevices !== 'none' && childrenScore !== null) {
    if (childrenScore >= 2) {
      // High
      childrenFeedback = "You're doing a great job at guiding your children online. Just like teaching them to cross the street safely, you've set good boundaries and have open conversations about the digital world. Your kids are learning to navigate their digital playground safely thanks to your efforts.";
    } else if (childrenScore === 1) {
      // Medium
      childrenFeedback = "You're mindful of your children's online safety, but there's room to build on it. It's like supervising a playground – you're watching them, but maybe not all the hazards are fenced off yet. A bit more consistency with rules or safety tools (like parental controls) will go a long way in keeping your kids safe online.";
    } else {
      // Low
      childrenFeedback = "Right now, there might not be much structure around your children's device use. If you feel like the kids know more about tech than you do, you're definitely not alone – many parents feel that way. Think of the internet as a big playground: some areas need an adult around. Setting a few simple rules or using basic parental controls can act like a safety fence around their online playtime.";
    }

    // Tailor children feedback based on ages (older/younger/mixed)
    if (kidsDevices === 'older') {
      // Mostly older children
      if (childrenScore >= 2) {
        childrenFeedback += " Your teens benefit from the trust and guidance you're giving them as they gain independence online.";
      } else if (childrenScore === 1) {
        childrenFeedback += " As kids get older, involving them in setting the rules and keeping up those safety talks will help a lot.";
      } else {
        childrenFeedback += " Even for teenagers, some level of oversight and open conversation can make a big difference in keeping them safe.";
      }
    } else if (kidsDevices === 'younger') {
      // Mostly younger children
      if (childrenScore >= 2) {
        childrenFeedback += " Starting these safe habits early with young children is fantastic.";
      } else if (childrenScore === 1) {
        childrenFeedback += " For younger kids, adding a bit more supervision or protective settings now will help them stay safe as they grow.";
      } else {
        childrenFeedback += " Young children especially benefit from a few clear rules and watchful guidance at this stage.";
      }
    } else if (kidsDevices === 'mixed') {
      // Mixed ages
      if (childrenScore >= 2) {
        childrenFeedback += " Managing different ages at once is challenging, but you're doing a great job keeping everyone safe.";
      } else if (childrenScore === 1) {
        childrenFeedback += " With kids of different ages, consider tailoring some rules to each age group – a bit more structure can help cover everyone.";
      } else {
        childrenFeedback += " With a mix of ages, even a simple family tech plan can cover the bases and help keep all the kids safer online.";
      }
    }

    // Minor grammar adjustments if only one child (singular vs plural phrasing)
    if (childrenCount === "1") {
      // Replace plural words with singular where appropriate
      childrenFeedback = childrenFeedback
        .replace(/children\b/gi, 'child')
        .replace(/kids\b/gi, 'child')
        .replace(/Kids\b/g, 'Child') // capitalized if at sentence start
        .replace(/children's/gi, "child's")
        .replace(/kids'/gi, "child's")
        // Fix accompanying verb agreement for singular
        .replace(/child are\b/gi, 'child is')
        .replace(/child have\b/gi, 'child has')
        .replace(/child know\b/gi, 'child knows')
        .replace(/child do\b/gi, 'child does');
    }
  }

  // Build the results HTML with a section for each lens
  let resultHtml = "";
  resultHtml += "<h3>Network & Wi-Fi</h3><p>" + networkFeedback + "</p>";
  resultHtml += "<h3>Devices & Apps</h3><p>" + devicesFeedback + "</p>";
  resultHtml += "<h3>Privacy & Identity</h3><p>" + privacyFeedback + "</p>";
  resultHtml += "<h3>Scams & Phishing</h3><p>" + scamsFeedback + "</p>";
  if (childrenFeedback) {
    resultHtml += "<h3>Children's Online Safety</h3><p>" + childrenFeedback + "</p>";
  }

  // Insert the results into the page and move focus to the results for accessibility
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = resultHtml;
  // Set focus to the first result heading
  const firstHeading = resultsDiv.querySelector('h3');
  if (firstHeading) {
    firstHeading.focus();
  }
});


