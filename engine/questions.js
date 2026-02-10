export async function loadQuestions(url = "/generated/questions.json") {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load questions (${res.status}) at ${url}`);
  const data = await res.json();

  // Accept either {questions:[...]} or [...]
  const questions = Array.isArray(data) ? data : (data.questions || []);
  return questions.map(normaliseQuestion);
}

function normaliseQuestion(q) {
  return {
    id: String(q.id),
    lens: String(q.lens || "unknown"),
    title: q.title || q.prompt || "Question",
    body: q.body || q.help || "",
    options: Array.isArray(q.options) ? q.options.map(o => ({
      id: String(o.id),
      label: o.label || o.text || String(o.id),
      weight: typeof o.weight === "number" ? o.weight : undefined
    })) : []
  };
}
