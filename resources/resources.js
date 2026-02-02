/* =========================================================
   Cyber Seeds — Resources Hub Controller
   Reads latest snapshot + hydrates personalised UI
   ========================================================= */

(function () {
  "use strict";

  // ---- helpers ----
  const $ = (id) => document.getElementById(id);

  function safeParse(v) {
    try { return JSON.parse(v); } catch { return null; }
  }

  // ---- canonical snapshot key ----
  const SNAPSHOT_KEY = "cyberseeds_snapshot_v2";

  // ---- read snapshot ----
  function getSnapshot() {
    return safeParse(localStorage.getItem(SNAPSHOT_KEY));
  }

  // ---- main render ----
  function buildResources(snapshot) {
    if (!snapshot) return;

    // flip page into personalised mode
    document.body.classList.add("has-snapshot");

    // ----- core fields -----
    if ($("focusTitle")) $("focusTitle").textContent = snapshot.seed?.title || "Your focus";
    if ($("focusDesc")) {
      $("focusDesc").textContent =
        snapshot.seed?.today ||
        "Small changes here will reduce risk fastest.";
    }

    if ($("stageTitle")) $("stageTitle").textContent = snapshot.stage;
    if ($("stageDesc")) {
      $("stageDesc").textContent =
        snapshot.band
          ? `Households in this stage typically score ${snapshot.band.min}–${snapshot.band.max}.`
          : "A calm signal you can act on.";
    }

    // ----- lens values -----
    const scores = snapshot.lensScores || {};
    if ($("valNetwork"))   $("valNetwork").textContent   = scores.network ?? "—";
    if ($("valDevices"))   $("valDevices").textContent   = scores.devices ?? "—";
    if ($("valPrivacy"))   $("valPrivacy").textContent   = scores.privacy ?? "—";
    if ($("valScams"))     $("valScams").textContent     = scores.scams ?? "—";
    if ($("valWellbeing")) $("valWellbeing").textContent = scores.wellbeing ?? "—";

    // ----- seed takeaway -----
    if ($("seedText")) {
      $("seedText").textContent =
        snapshot.seed?.this_month ||
        snapshot.seed?.today ||
        "One calm improvement at a time.";
    }

    // ----- metadata -----
    if ($("fingerprintLine")) {
      $("fingerprintLine").innerHTML =
        `<strong>Household fingerprint:</strong> ${snapshot.strongest} strongest · ${snapshot.weakest} weakest`;
    }

    if ($("lastTakenLine") && snapshot.ts) {
      $("lastTakenLine").textContent =
        "Last snapshot on this device: " +
        new Date(snapshot.ts).toLocaleString();
    }
  }

  // ---- init on load ----
  document.addEventListener("DOMContentLoaded", () => {
    const snapshot = getSnapshot();

    if (!snapshot) {
      // empty state
      const empty = $("emptyStateCard");
      if (empty) empty.style.display = "block";
      return;
    }

    buildResources(snapshot);
  });

})();

const lensInfo = {
  network: {
    title: "Network — the boundary of your home",
    text: "Your Wi-Fi protects every device inside your household. Weak boundaries expose everything else."
  },
  devices: {
    title: "Devices — daily health",
    text: "Out-of-date or unmanaged devices quietly accumulate risk."
  },
  privacy: {
    title: "Accounts & Privacy — master keys",
    text: "Email and Apple/Google accounts can reset almost everything else."
  },
  scams: {
    title: "Scams & Messages — pressure points",
    text: "Most damage happens when people are rushed or unsure."
  },
  wellbeing: {
    title: "Children & Wellbeing — rhythm matters",
    text: "Fatigue and overload increase risk across the household."
  }
};

document.querySelectorAll(".legend-row").forEach(row => {
  row.addEventListener("click", () => {
    const key = row.id.replace("legend","");
    const panel = document.getElementById("lensInsight");

    panel.querySelector("h3").textContent = lensInfo[key].title;
    panel.querySelector("p").textContent = lensInfo[key].text;
    panel.classList.add("is-open");
  });
});
