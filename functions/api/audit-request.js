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

  function buildLensLines(snapshot) {
    const lensCandidates =
      snapshot?.lenses ||
      snapshot?.results?.lenses ||
      snapshot?.lensScores ||
      snapshot?.lensPercents ||
      null;

    if (!lensCandidates || typeof lensCandidates !== "object") {
      return "Lens breakdown: not available";
    }

    const entries = Array.isArray(lensCandidates)
      ? lensCandidates.map((item) => {
          const name = item?.name || item?.label || "Lens";
          const score = item?.score ?? item?.value ?? "n/a";
          const band = item?.band || item?.status || "";
          return `${name}: ${score}${band ? ` (${band})` : ""}`;
        })
      : Object.entries(lensCandidates).map(([key, value]) => {
          if (value && typeof value === "object") {
            const score = value.score ?? value.value ?? "n/a";
            const band = value.band || value.status || "";
            return `${key}: ${score}${band ? ` (${band})` : ""}`;
          }
          return `${key}: ${value}`;
        });

    return entries.length
      ? `Lens breakdown:\n- ${entries.join("\n- ")}`
      : "Lens breakdown: not available";
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

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return acceptsJson
      ? json({ ok: false, message: "The request could not be read properly." }, 400)
      : html("<h1>Request could not be read</h1><p>Please go back and try again.</p>", 400);
  }

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
  const auditReplyTo = env.AUDIT_REQUEST_REPLY_TO || emailAddress;

  if (!resendApiKey || !auditRequestTo || !auditRequestFrom) {
    return acceptsJson
      ? json(
          {
            ok: false,
            message: "The direct audit request service is not configured yet."
          },
          503
        )
      : html(
          "<h1>Direct sending is not available yet</h1><p>Please go back and use the backup email option for now.</p>",
          503
        );
  }

  const overall = snapshot ? pickOverallScore(snapshot) : null;
  const band = snapshot ? pickBand(snapshot) : null;
  const date = snapshot ? pickDate(snapshot) : null;
  const focus = snapshot ? pickFocus(snapshot) : null;

  const textLines = [
    "New Cyber Seeds audit request",
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
    ""
  ];

  if (snapshotIncluded && snapshot) {
    textLines.push(
      "Included household signal",
      "-------------------------",
      `Overall signal: ${overall !== null ? overall : "Available"}`,
      `Signal band: ${band || "Available"}`,
      `Priority area: ${focus || "Available"}`,
      `Snapshot date: ${formatDate(date)}`,
      buildLensLines(snapshot),
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
    <div style="font-family:Arial,Helvetica,sans-serif;color:#17201e;line-height:1.6;">
      <h1 style="font-size:20px;margin:0 0 16px;">New Cyber Seeds audit request</h1>

      <h2 style="font-size:16px;margin:24px 0 8px;">Requester details</h2>
      <p style="margin:0;"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
      <p style="margin:0;"><strong>Email:</strong> ${escapeHtml(emailAddress)}</p>
      <p style="margin:0;"><strong>Household context:</strong> ${escapeHtml(householdType)}</p>
      <p style="margin:0;"><strong>Preferred contact method:</strong> ${escapeHtml(contactPreference)}</p>
      <p style="margin:0;"><strong>Timing:</strong> ${escapeHtml(timing)}</p>

      <h2 style="font-size:16px;margin:24px 0 8px;">Support request</h2>
      <p style="margin:0;white-space:pre-wrap;">${escapeHtml(supportFocus)}</p>

      <h2 style="font-size:16px;margin:24px 0 8px;">Included household signal</h2>
      ${
        snapshotIncluded && snapshot
          ? `
            <p style="margin:0;"><strong>Overall signal:</strong> ${escapeHtml(overall !== null ? String(overall) : "Available")}</p>
            <p style="margin:0;"><strong>Signal band:</strong> ${escapeHtml(band || "Available")}</p>
            <p style="margin:0;"><strong>Priority area:</strong> ${escapeHtml(focus || "Available")}</p>
            <p style="margin:0;"><strong>Snapshot date:</strong> ${escapeHtml(formatDate(date))}</p>
            <pre style="margin-top:10px;padding:12px;border:1px solid #d9e0de;border-radius:12px;background:#f8fbfa;white-space:pre-wrap;font-family:inherit;">${escapeHtml(buildLensLines(snapshot))}</pre>
          `
          : `<p style="margin:0;">No snapshot details included in this request.</p>`
      }
    </div>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: auditRequestFrom,
      to: [auditRequestTo],
      reply_to: auditReplyTo,
      subject: snapshotIncluded
        ? "Cyber Seeds Audit Request - With Household Signal"
        : "Cyber Seeds Audit Request",
      text: textBody,
      html: htmlBody
    })
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();

    return acceptsJson
      ? json(
          {
            ok: false,
            message: "The request could not be delivered right now.",
            detail: errorText
          },
          502
        )
      : html(
          "<h1>Delivery issue</h1><p>Please go back and try the backup email option instead.</p>",
          502
        );
  }

  return acceptsJson
    ? json({ ok: true, message: "Request sent successfully." })
    : html(
        `
        <!DOCTYPE html>
        <html lang="en-GB">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Audit request sent | Cyber Seeds</title>
          <style>
            body{font-family:Arial,Helvetica,sans-serif;background:#f4f6f5;color:#17201e;margin:0;padding:32px;}
            .shell{max-width:720px;margin:0 auto;background:#fff;border:1px solid #d9e0de;border-radius:20px;padding:24px;}
            a{color:#1d5c4e;}
          </style>
        </head>
        <body>
          <div class="shell">
            <h1>Your audit request has been sent</h1>
            <p>Thank you. Cyber Seeds has received your request and will respond using the details you provided.</p>
            <p><a href="/book/">Return to the audit page</a></p>
          </div>
        </body>
        </html>
        `,
        200
      );
}
