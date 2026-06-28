// lib/gemini.js
// Wrapper for all Gemini API calls in Mosaic

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
async function fetchWithRetry(url, options, maxRetries = 3, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  return fetch(url, options);
}

let lastCallTime = 0;
const MIN_INTERVAL = 2000;
let apiQueue = Promise.resolve();

async function callGemini(prompt, systemInstruction = "") {
  const currentQueue = apiQueue;
  let resolveQueue;
  apiQueue = new Promise((resolve) => {
    resolveQueue = resolve;
  });

  try {
    await currentQueue;
    const now = Date.now();
    const wait = MIN_INTERVAL - (now - lastCallTime);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastCallTime = Date.now();

    const contents = typeof prompt === "string"
      ? [{ role: "user", parts: [{ text: prompt }] }]
      : prompt;

    const body = {
      contents,
      ...(systemInstruction && {
        systemInstruction: { parts: [{ text: systemInstruction }] },
      }),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const res = await fetchWithRetry(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `Gemini API error: ${res.status}`);
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } finally {
    resolveQueue();
  }
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

Label each task with a priority level. Return ONLY a JSON array, no markdown, no explanation.
Each item must have exactly: { "id": <0-based index from the list above>, "priority": "high"|"med"|"low", "reason": "<one short sentence why>" }
All ${tasks.length} tasks must appear in the response.
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
You are Mosaic, a proactive productivity companion for ${userContext.role || "a student"}.

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
  const randomSeed = Math.random().toString(36).substring(7);
  const prompt = `Give me one short unique productivity or motivation quote (under 20 words). Seed: ${randomSeed}. 
Return ONLY: { "quote": "...", "author": "..." } as JSON, no markdown. Make sure it is completely random and different.`;
  const raw = await callGemini(prompt);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { quote: "Do it now. Sometimes 'later' becomes 'never'.", author: "Unknown" };
  }
}

// ── Chat message (sidebar companion) ──────────────────────────────────────
export async function chatWithMosaic(messages, userContext) {
  const systemText = `You are Mosaic, an AI productivity companion. 
You are helpful, direct, and occasionally witty — never preachy.
User context: ${JSON.stringify(userContext)}.
Keep responses under 3 sentences unless asked for more.`;

  const contents = messages.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }]
  }));

  const body = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
  };

  const res = await fetchWithRetry(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
  const data = await res.json();
  const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response";

  // Check if response ends mid-sentence
  const trimmed = replyText.trim();
  const lastChar = trimmed.slice(-1);
  if (replyText !== "No response" && !['.', '?', '!', '"'].includes(lastChar)) {
    console.warn("Warning: Gemini response ends mid-sentence and might be cut off.");
  }

  return replyText;
}

// ── Break task into subtasks ───────────────────────────────────────────────
export async function breakdownTask(taskTitle, deadline) {
  const prompt = `You are a productivity assistant. Break down this specific task into 4 to 6 concrete, actionable steps that are different from each other.

Task: "${taskTitle}"
Deadline: ${deadline || "not specified"}

Return ONLY a JSON array with no markdown, no explanation, no code blocks. Example format:
[{"subtask": "Research options online", "estimatedMinutes": 20}, {"subtask": "Make a list of requirements", "estimatedMinutes": 15}]

Each subtask must be a distinct action step. Do not repeat the task title as a subtask.`;

  const raw = await callGemini(prompt);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return [{ subtask: taskTitle, estimatedMinutes: 30 }];
  }
}
