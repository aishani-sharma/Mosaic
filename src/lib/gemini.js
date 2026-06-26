// lib/gemini.js
// Wrapper for all Gemini API calls in Clutch

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function callGemini(prompt, systemInstruction = "") {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    ...(systemInstruction && {
      systemInstruction: { parts: [{ text: systemInstruction }] },
    }),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Prioritize tasks based on user context ─────────────────────────────────
export async function prioritizeTasks(tasks, userContext) {
  const taskList = tasks
    .map((t, i) => `${i + 1}. "${t.title}" — due: ${t.deadline || "no deadline"}, category: ${t.category || "general"}`)
    .join("\n");

  const prompt = `
User context: ${JSON.stringify(userContext)}

Tasks to prioritize:
${taskList}

Return ONLY a JSON array (no markdown, no explanation) with the tasks reordered by priority.
Each item: { "id": <original index 0-based>, "priority": "high"|"med"|"low", "reason": "<one sentence>" }
`;

  const raw = await callGemini(prompt);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return tasks.map((_, i) => ({ id: i, priority: "med", reason: "Could not analyze." }));
  }
}

// ── Daily battle plan ──────────────────────────────────────────────────────
export async function generateDailyPlan(tasks, userContext) {
  const taskList = tasks
    .filter((t) => !t.completed)
    .map((t) => `- "${t.title}" due ${t.deadline || "soon"}`)
    .join("\n");

  const prompt = `
You are Clutch, a proactive productivity companion for ${userContext.role || "a student"}.

Today's pending tasks:
${taskList || "No tasks yet."}

Generate a motivating but realistic daily plan. Include:
1. Top 3 priorities for today with time estimates
2. One suggested focus block (e.g. "2–4pm: deep work on [task]")
3. A short motivating message (1 sentence, direct, not cheesy)

Keep it concise. Plain text, no markdown headers.
`;

  return callGemini(prompt);
}

// ── Quote of the day ───────────────────────────────────────────────────────
export async function getQuoteOfDay() {
  const prompt = `Give me one short productivity or motivation quote (under 20 words). 
Return ONLY: { "quote": "...", "author": "..." } as JSON, no markdown.`;
  const raw = await callGemini(prompt);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { quote: "Do it now. Sometimes 'later' becomes 'never'.", author: "Unknown" };
  }
}

// ── Chat message (sidebar companion) ──────────────────────────────────────
export async function chatWithClutch(messages, userContext) {
  const system = `You are Clutch, an AI productivity companion. 
You are helpful, direct, and occasionally witty — never preachy.
User context: ${JSON.stringify(userContext)}.
Keep responses under 3 sentences unless asked for more.`;

  const history = messages
    .map((m) => `${m.role === "user" ? "User" : "Clutch"}: ${m.text}`)
    .join("\n");

  const lastUser = messages[messages.length - 1]?.text ?? "";
  const prompt = `${history ? `Conversation so far:\n${history}\n\n` : ""}User: ${lastUser}`;

  return callGemini(prompt, system);
}

// ── Break task into subtasks ───────────────────────────────────────────────
export async function breakdownTask(taskTitle, deadline) {
  const prompt = `Break this task into 3–5 actionable subtasks:
Task: "${taskTitle}"
Deadline: ${deadline || "not specified"}

Return ONLY JSON array: [{ "subtask": "...", "estimatedMinutes": <number> }]
No markdown, no explanation.`;

  const raw = await callGemini(prompt);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return [{ subtask: taskTitle, estimatedMinutes: 30 }];
  }
}
