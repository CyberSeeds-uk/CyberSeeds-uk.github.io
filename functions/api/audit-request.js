export async function onRequestPost(context) {
  const { request, env } = context;

  const acceptsJson = (request.headers.get("accept") || "").includes("application/json");

  function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "cache-control": "no-store"
      }
    });
  }

  function html(body, status = 200) {
    return new Response(body, {
      status,
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store"
      }
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeValue(value, fallback = "Not provided") {
    const clean = String(value || "").trim();
    return clean || fallback;
  }

  function parseSnapshot(snapshotPayload) {
    if (!snapshotPayload) return null;
    try {
      const parsed = JSON.parse(snapshotPayload);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function formatDate(value) {
    if (!value) return "Not provided";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not provided";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function formatDateTimeForReference(date = new Date()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}${mm}${dd}-${hh}${min}`;
  }

  function generateReference() {
    const stamp = formatDateTimeForReference(new Date());
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `CS-${stamp}-${suffix}`;
  }

  function pickOverallScore(snapshot) {
    return (
      snapshot?.hdss ??
      snapshot?.overallScore ??
      snapshot?.score ??
      snapshot?.results?.hdss ??
      snapshot?.results?.overallScore ??
      null
    );
  }

  function pickBand(snapshot) {
    return (
      snapshot?.band ??
      snapshot?.overallBand ??
      snapshot?.stage?.label ??
      snapshot?.results?.band ??
      snapshot?.results?.overallBand ??
      null
    );
  }

  function pickDate(snapshot) {
    return (
      snapshot?.completedAt ??
      snapshot?.savedAt ??
      snapshot?.timestamp ??
      snapshot?.date ??
      snapshot?.results?.completedAt ??
      null
    );
  }

  function pickFocus(snapshot) {
    return (
      snapshot?.focus ??
      snapshot?.priorityLens ??
      snapshot?.results?.focus ??
      null
    );
  }

  function normaliseLensMap(snapshot) {
    const lensCandidates =
      snapshot?.lenses ||
      snapshot?.results?.lenses ||
      snapshot?.lensScores ||
      snapshot?.lensPercents ||
      null;

    if (!lensCandidates || typeof lensCandidates !== "object") return {};

    if (Array.isArray(lensCandidates)) {
      const out = {};
      for (const item of lensCandidates) {
        const rawName = item?.name || item?.label || "lens";
        const key = String(rawName).trim().toLowerCase();
        const score = Number(item?.score ?? item?.value ?? NaN);
        const band = item?.band || item?.status || "";
        if (!Number.isNaN(score)) {
          out[key] = { score, band };
        }
      }
      return out;
    }

    const out = {};
    for (const [key, value] of Object.entries(lensCandidates)) {
      if (value && typeof value === "object") {
        const score = Number(value.score ?? value.value ?? NaN);
        const band = value.band || value.status || "";
        if (!Number.isNaN(score)) {
          out[String(key).trim().toLowerCase()] = { score, band };
        }
      } else {
        const score = Number(value);
        if (!Number.isNaN(score)) {
          out[String(key).trim().toLowerCase()] = { score, band: "" };
        }
      }
    }
    return out;
  }

  function buildLensLines(snapshot) {
    const lensMap = normaliseLensMap(snapshot);
    const entries = Object.entries(lensMap).map(([name, value]) => {
      const band = value.band ? ` (${value.band})` : "";
      return `${name}: ${value.score}${band}`;
    });

    return entries.length
      ? `Lens breakdown:\n- ${entries.join("\n- ")}`
      : "Lens breakdown: not available";
  }

  function scoreToTriage(overall) {
    if (overall === null || overall === undefined || Number.isNaN(Number(overall))) {
      return "Manual review";
    }
    const score = Number(overall);
    if (score < 40) return "Priority support";
    if (score < 60) return "Supported improvement";
    if (score < 80) return "Guided strengthening";
    return "Stable with targeted guidance";
  }

  function getLensScore(lensMap, names) {
    for (const name of names) {
      const found = lensMap[name];
      if (found && typeof found.score === "number") return found.score;
    }
    return null;
  }

  function sentenceCase(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function analyseRequest({
    snapshot,
    householdType,
    supportFocus,
    timing,
    contactPreference
  }) {
    const overall = snapshot ? Number(pickOverallScore(snapshot)) : null;
    const band = snapshot ? pickBand(snapshot) : null;
    const focus = snapshot ? pickFocus(snapshot) : null;
    const lensMap = snapshot ? normaliseLensMap(snapshot) : {};

    const networkScore = getLensScore(lensMap, ["network", "wifi", "home network"]);
    const devicesScore = getLensScore(lensMap, ["devices", "device"]);
    const privacyScore = getLensScore(lensMap, ["privacy", "accounts", "privacy/accounts", "accounts privacy"]);
    const scamsScore = getLensScore(lensMap, ["scams", "scam"]);
    const wellbeingScore = getLensScore(lensMap, ["wellbeing", "well-being", "digital wellbeing"]);

    const triage = scoreToTriage(overall);

    const riskFlags = [];
    const recommendedSeeds = [];
    const practitionerPrompts = [];

    function flag(condition, text) {
      if (condition) riskFlags.push(text);
    }

    function seed(condition, text) {
      if (condition) recommendedSeeds.push(text);
    }

    function prompt(condition, text) {
      if (condition) practitionerPrompts.push(text);
    }

    flag(networkScore !== null && networkScore < 70, "Home network safeguards may need strengthening.");
    flag(devicesScore !== null && devicesScore < 70, "Device protections may be inconsistent across the household.");
    flag(privacyScore !== null && privacyScore < 70, "Account and privacy controls may not yet be fully established.");
    flag(scamsScore !== null && scamsScore < 70, "Scam resilience may be under-developed or currently strained.");
    flag(wellbeingScore !== null && wellbeingScore < 70, "Digital wellbeing patterns may need supportive boundaries.");
    flag(
      /urgent|as soon as possible|immediately/i.test(String(timing || "")),
      "The requester has indicated urgency or immediate need for support."
    );
    flag(
      /scam|phish|fraud|money|bank|romance|imperson/i.test(String(supportFocus || "")),
      "The support request mentions scam, fraud, or deception-related concerns."
    );
    flag(
      /child|children|teen|young/i.test(String(householdType || "")) ||
      /child|children|teen|young/i.test(String(supportFocus || "")),
      "The request appears to involve children or young people in the household context."
    );

    seed(networkScore !== null && networkScore < 85, "Review router settings, Wi-Fi password strength, and firmware update status.");
    seed(devicesScore !== null && devicesScore < 85, "Check device updates, screen lock settings, and parental or household protection controls.");
    seed(privacyScore !== null && privacyScore < 85, "Review recovery methods, privacy settings, and shared account access across the household.");
    seed(scamsScore !== null && scamsScore < 85, "Introduce a household scam-check routine for messages, calls, links, and payment requests.");
    seed(wellbeingScore !== null && wellbeingScore < 85, "Create calm family digital boundaries around time, contact, and emotionally loaded online situations.");
    seed(
      /email/i.test(String(contactPreference || "")),
      "Prepare a clear written follow-up with practical next steps and links to household actions."
    );
    seed(
      /phone|call/i.test(String(contactPreference || "")),
      "Offer a guided call if the household would benefit from conversation-based support."
    );

    prompt(scamsScore !== null && scamsScore < 70, "Ask whether there has been any recent suspicious message, account compromise, payment pressure, or impersonation.");
    prompt(privacyScore !== null && privacyScore < 70, "Ask who currently has access to key household accounts and recovery methods.");
    prompt(devicesScore !== null && devicesScore < 70, "Ask which devices are used by adults and children and whether updates and passcodes are in place.");
    prompt(networkScore !== null && networkScore < 70, "Ask whether the router has been changed from default settings and whether guest access is separated.");
    prompt(wellbeingScore !== null && wellbeingScore < 70, "Ask whether there are family tensions, online conflict, or emotionally difficult patterns linked to devices.");
    prompt(
      true,
      "Confirm what outcome the household most wants from support: reassurance, hardening, recovery, boundaries, or safeguarding advice."
    );

    if (!riskFlags.length) {
      riskFlags.push("No acute flags were derived from the current household signal, but the request still merits review.");
    }

    if (!recommendedSeeds.length) {
      recommendedSeeds.push("Review the latest household signal together and identify one immediate strengthening action.");
    }

    if (!practitionerPrompts.length) {
      practitionerPrompts.push("Clarify the household’s goals, current worries, and desired support pathway.");
    }

    const summaryParts = [];

    if (overall !== null && !Number.isNaN(overall)) {
      summaryParts.push(`The current household signal suggests a ${triage.toLowerCase()} position overall`);
    } else {
      summaryParts.push("No overall household signal score was available, so this request should be reviewed using the submitted context");
    }

    if (focus) {
      summaryParts.push(`with ${String(focus).toLowerCase()} appearing as the current priority area`);
    }

    if (supportFocus && supportFocus !== "Not provided") {
      summaryParts.push(`and the requester highlighting: ${supportFocus}`);
    }

    const practitionerSummary =
      summaryParts.join(" ") +
      ".";

    return {
      overall,
      band,
      focus,
      triage,
      lensMap,
      riskFlags,
      recommendedSeeds,
      practitionerPrompts,
      practitionerSummary
    };
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    if (
      !contentType.includes("multipart/form-data") &&
      !contentType.includes("application/x-www-form-urlencoded")
    ) {
      return json(
        {
          ok: false,
          message: "Expected form submission.",
          debug: { contentType }
        },
        400
      );
    }

    const formData = await request.formData();

    const fullName = safeValue(formData.get("fullName"), "");
    const emailAddress = safeValue(formData.get("emailAddress"), "");
    const householdType = safeValue(formData.get("householdType"));
    const contactPreference = safeValue(formData.get("contactPreference"));
    const timing = safeValue(formData.get("timing"));
    const supportFocus = safeValue(formData.get("supportFocus"));
    const consentCheck = safeValue(formData.get("consentCheck"), "");
    const snapshotIncluded = safeValue(formData.get("snapshotIncluded"), "false") === "true";
    const snapshotPayloadRaw = safeValue(formData.get("snapshotPayload"), "");
    const snapshot = parseSnapshot(snapshotPayloadRaw);

    if (!fullName || !emailAddress) {
      return acceptsJson
        ? json({ ok: false, message: "Name and email are required." }, 400)
        : html("<h1>Missing details</h1><p>Please go back and add your name and email.</p>", 400);
    }

    if (consentCheck !== "yes") {
      return acceptsJson
        ? json({ ok: false, message: "Consent confirmation is required." }, 400)
        : html("<h1>Consent needed</h1><p>Please go back and confirm consent before sending the request.</p>", 400);
    }

    const resendApiKey = env.RESEND_API_KEY;
    const auditRequestTo = env.AUDIT_REQUEST_TO;
    const auditRequestFrom = env.AUDIT_REQUEST_FROM;
    const parentConfirmationFrom = env.PARENT_CONFIRMATION_FROM || auditRequestFrom;
    const sendParentConfirmation = String(env.SEND_PARENT_CONFIRMATION || "true").toLowerCase() === "true";

    const submittedEmail = String(emailAddress || "").trim();
    const auditReplyTo = submittedEmail || env.AUDIT_REQUEST_REPLY_TO || undefined;

    if (!resendApiKey || !auditRequestTo || !auditRequestFrom) {
      return json(
        {
          ok: false,
          message: "Missing configuration",
          debug: {
            hasResendApiKey: !!resendApiKey,
            hasAuditRequestTo: !!auditRequestTo,
            hasAuditRequestFrom: !!auditRequestFrom
          }
        },
        503
      );
    }

    const reference = generateReference();
    const snapshotDate = snapshot ? pickDate(snapshot) : null;

    const analysis = analyseRequest({
      snapshot,
      householdType,
      supportFocus,
      timing,
      contactPreference
    });

    const lensBreakdownText = snapshot ? buildLensLines(snapshot) : "Lens breakdown: not available";

    const textLines = [
      `Cyber Seeds practitioner intake report`,
      `Reference: ${reference}`,
      "",
      "Requester details",
      "-----------------",
      `Name: ${fullName}`,
      `Email: ${emailAddress}`,
      `Household context: ${householdType}`,
      `Preferred contact method: ${contactPreference}`,
      `Timing: ${timing}`,
      "",
      "Support request",
      "---------------",
      supportFocus,
      "",
      "Practitioner summary",
      "--------------------",
      analysis.practitionerSummary,
      "",
      "Triage",
      "------",
      `Recommended review level: ${analysis.triage}`,
      "",
      "Risk flags",
      "----------",
      ...analysis.riskFlags.map((item) => `- ${item}`),
      "",
      "Recommended seeds",
      "-----------------",
      ...analysis.recommendedSeeds.map((item) => `- ${item}`),
      "",
      "Practitioner prompts",
      "--------------------",
      ...analysis.practitionerPrompts.map((item) => `- ${item}`),
      ""
    ];

    if (snapshotIncluded && snapshot) {
      textLines.push(
        "Included household signal",
        "-------------------------",
        `Overall signal: ${analysis.overall !== null ? analysis.overall : "Available"}`,
        `Signal band: ${analysis.band || "Available"}`,
        `Priority area: ${analysis.focus || "Available"}`,
        `Snapshot date: ${formatDate(snapshotDate)}`,
        lensBreakdownText,
        ""
      );
    } else {
      textLines.push(
        "Included household signal",
        "-------------------------",
        "No snapshot details included in this request.",
        ""
      );
    }

    const textBody = textLines.join("\n");

    const htmlBody = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#17201e;line-height:1.6;background:#f6f8f7;padding:24px;">
        <div style="max-width:820px;margin:0 auto;background:#ffffff;border:1px solid #d9e0de;border-radius:20px;overflow:hidden;">
          <div style="padding:24px 24px 12px;background:#eff6f3;border-bottom:1px solid #d9e0de;">
            <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#40665b;">Cyber Seeds practitioner intake</div>
            <h1 style="margin:8px 0 8px;font-size:28px;line-height:1.2;">New audit request</h1>
            <p style="margin:0;color:#35564d;"><strong>Reference:</strong> ${escapeHtml(reference)}</p>
          </div>

          <div style="padding:24px;">
            <div style="margin:0 0 22px;padding:16px;border:1px solid #d9e0de;border-radius:16px;background:#f8fbfa;">
              <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#40665b;">Practitioner summary</div>
              <p style="margin:8px 0 0;font-size:16px;color:#17201e;">${escapeHtml(analysis.practitionerSummary)}</p>
            </div>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:12px;border:1px solid #d9e0de;border-radius:14px;background:#fcfdfc;">
                  <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#40665b;">Review level</div>
                  <div style="font-size:20px;font-weight:700;margin-top:6px;">${escapeHtml(analysis.triage)}</div>
                </td>
              </tr>
            </table>

            <h2 style="font-size:18px;margin:0 0 10px;">Requester details</h2>
            <p style="margin:0;"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
            <p style="margin:0;"><strong>Email:</strong> ${escapeHtml(emailAddress)}</p>
            <p style="margin:0;"><strong>Household context:</strong> ${escapeHtml(householdType)}</p>
            <p style="margin:0;"><strong>Preferred contact method:</strong> ${escapeHtml(contactPreference)}</p>
            <p style="margin:0 0 20px;"><strong>Timing:</strong> ${escapeHtml(timing)}</p>

            <h2 style="font-size:18px;margin:0 0 10px;">Support request</h2>
            <p style="margin:0 0 20px;white-space:pre-wrap;">${escapeHtml(supportFocus)}</p>

            <h2 style="font-size:18px;margin:0 0 10px;">Risk flags</h2>
            <ul style="margin:0 0 20px 20px;padding:0;">
              ${analysis.riskFlags.map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join("")}
            </ul>

            <h2 style="font-size:18px;margin:0 0 10px;">Recommended seeds</h2>
            <ul style="margin:0 0 20px 20px;padding:0;">
              ${analysis.recommendedSeeds.map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join("")}
            </ul>

            <h2 style="font-size:18px;margin:0 0 10px;">Practitioner prompts</h2>
            <ul style="margin:0 0 20px 20px;padding:0;">
              ${analysis.practitionerPrompts.map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join("")}
            </ul>

            <h2 style="font-size:18px;margin:0 0 10px;">Included household signal</h2>
            ${
              snapshotIncluded && snapshot
                ? `
                  <p style="margin:0;"><strong>Overall signal:</strong> ${escapeHtml(analysis.overall !== null ? String(analysis.overall) : "Available")}</p>
                  <p style="margin:0;"><strong>Signal band:</strong> ${escapeHtml(analysis.band || "Available")}</p>
                  <p style="margin:0;"><strong>Priority area:</strong> ${escapeHtml(analysis.focus || "Available")}</p>
                  <p style="margin:0;"><strong>Snapshot date:</strong> ${escapeHtml(formatDate(snapshotDate))}</p>
                  <pre style="margin-top:10px;padding:14px;border:1px solid #d9e0de;border-radius:14px;background:#f8fbfa;white-space:pre-wrap;font-family:inherit;">${escapeHtml(lensBreakdownText)}</pre>
                `
                : `<p style="margin:0;">No snapshot details included in this request.</p>`
            }
          </div>
        </div>
      </div>
    `;

    const internalPayload = {
      from: auditRequestFrom,
      to: [auditRequestTo],
      subject: snapshotIncluded
        ? `Cyber Seeds Audit Request - ${fullName} - Household Signal Included`
        : `Cyber Seeds Audit Request - ${fullName}`,
      text: textBody,
      html: htmlBody
    };

    if (auditReplyTo) {
      internalPayload.reply_to = auditReplyTo;
    }

    const internalResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(internalPayload)
    });

    const internalResponseText = await internalResponse.text();

    if (!internalResponse.ok) {
      return json(
        {
          ok: false,
          message: "The internal case email could not be delivered.",
          resendStatus: internalResponse.status,
          resendBody: internalResponseText
        },
        502
      );
    }

    let parentConfirmationResult = null;

    if (sendParentConfirmation && submittedEmail) {
      const parentText = [
        `Cyber Seeds has received your request`,
        `Reference: ${reference}`,
        "",
        `Hello ${fullName},`,
        "",
        `Thank you for sending a request to Cyber Seeds.`,
        `Your details have been received securely and will be reviewed.`,
        "",
        `What was included`,
        `------------------`,
        `Household context: ${householdType}`,
        `Preferred contact method: ${contactPreference}`,
        `Timing: ${timing}`,
        `Household signal included: ${snapshotIncluded && snapshot ? "Yes" : "No"}`,
        "",
        `What happens next`,
        `-----------------`,
        `- Your request will be reviewed`,
        `- Your chosen contact details will be used for follow-up`,
        `- If a household signal was included, it will help guide the review`,
        "",
        `Reference: ${reference}`,
        "",
        `Cyber Seeds`
      ].join("\n");

      const parentHtml = `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#17201e;line-height:1.6;background:#f6f8f7;padding:24px;">
          <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #d9e0de;border-radius:20px;overflow:hidden;">
            <div style="padding:24px;background:#eff6f3;border-bottom:1px solid #d9e0de;">
              <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#40665b;">Cyber Seeds</div>
              <h1 style="margin:8px 0 8px;font-size:26px;">Your request has been received</h1>
              <p style="margin:0;color:#35564d;"><strong>Reference:</strong> ${escapeHtml(reference)}</p>
            </div>
            <div style="padding:24px;">
              <p style="margin-top:0;">Hello ${escapeHtml(fullName)},</p>
              <p>Thank you for sending a request to Cyber Seeds. Your details have been received securely and will be reviewed.</p>

              <h2 style="font-size:18px;margin:24px 0 10px;">What was included</h2>
              <p style="margin:0;"><strong>Household context:</strong> ${escapeHtml(householdType)}</p>
              <p style="margin:0;"><strong>Preferred contact method:</strong> ${escapeHtml(contactPreference)}</p>
              <p style="margin:0;"><strong>Timing:</strong> ${escapeHtml(timing)}</p>
              <p style="margin:0;"><strong>Household signal included:</strong> ${snapshotIncluded && snapshot ? "Yes" : "No"}</p>

              <h2 style="font-size:18px;margin:24px 0 10px;">What happens next</h2>
              <ul style="margin:0 0 0 20px;padding:0;">
                <li style="margin:0 0 8px;">Your request will be reviewed</li>
                <li style="margin:0 0 8px;">Your chosen contact details will be used for follow-up</li>
                <li style="margin:0 0 8px;">If a household signal was included, it will help guide the review</li>
              </ul>

              <p style="margin-top:24px;">Reference: <strong>${escapeHtml(reference)}</strong></p>
            </div>
          </div>
        </div>
      `;

      const parentPayload = {
        from: parentConfirmationFrom,
        to: [submittedEmail],
        subject: `Cyber Seeds - Request received - ${reference}`,
        text: parentText,
        html: parentHtml
      };

      const parentResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parentPayload)
      });

      const parentResponseText = await parentResponse.text();

      parentConfirmationResult = {
        ok: parentResponse.ok,
        status: parentResponse.status,
        body: parentResponseText
      };
    }

    return acceptsJson
      ? json(
          {
            ok: true,
            reference,
            triage: analysis.triage,
            snapshotIncluded: snapshotIncluded && !!snapshot,
            parentConfirmation: parentConfirmationResult || null
          },
          200
        )
      : html(
          `
          <!DOCTYPE html>
          <html lang="en-GB">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Request received | Cyber Seeds</title>
            <style>
              body{font-family:Arial,Helvetica,sans-serif;background:#f4f6f5;color:#17201e;margin:0;padding:32px;}
              .shell{max-width:760px;margin:0 auto;background:#fff;border:1px solid #d9e0de;border-radius:20px;padding:24px;}
              .box{margin:16px 0;padding:16px;border:1px solid #d9e0de;border-radius:16px;background:#f8fbfa;}
              a{color:#1d5c4e;}
            </style>
          </head>
          <body>
            <div class="shell">
              <h1>Your request has been received</h1>
              <p>Thank you. Cyber Seeds has received your request and will respond using the details you provided.</p>
              <div class="box">
                <p><strong>Reference:</strong> ${escapeHtml(reference)}</p>
                <p><strong>Review level:</strong> ${escapeHtml(analysis.triage)}</p>
                <p><strong>Household signal included:</strong> ${snapshotIncluded && snapshot ? "Yes" : "No"}</p>
              </div>
              <p><a href="/book/">Return to the audit page</a></p>
            </div>
          </body>
          </html>
          `,
          200
        );
  } catch (error) {
    return json(
      {
        ok: false,
        message: "Function crashed",
        error: error.message,
        stack: error.stack
      },
      500
    );
  }
}
