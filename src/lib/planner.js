import { callGemini } from "./gemini";
import { updateUserProfile } from "./firestore";

// Helper to parse deadlines
export function parseDeadlineDate(deadline) {
  if (!deadline) return null;
  const clean = deadline.trim().toLowerCase();
  if (clean.includes("today")) {
    return new Date();
  }
  if (clean.includes("tomorrow")) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  const normalized = clean.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

// Helper to parse duration/minutes from task titles
export function getEstimatedDuration(title) {
  const clean = title.toLowerCase();
  const hrMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:hr|hrs|hour|hours|h)\b/);
  if (hrMatch) return parseFloat(hrMatch[1]) * 60;
  const minMatch = clean.match(/(\d+)\s*(?:min|mins|minutes|m)\b/);
  if (minMatch) return parseInt(minMatch[1], 10);
  return 30; // default to 30 mins
}

// 1. Task ranking logic using multiple factors
export function rankTasks(tasks) {
  const incomplete = tasks.filter(t => !t.completed);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return incomplete
    .map(task => {
      let score = 0;
      const parsedDate = parseDeadlineDate(task.deadline);

      if (parsedDate) {
        parsedDate.setHours(0, 0, 0, 0);
        if (parsedDate < today) {
          score += 1000; // Overdue is highest priority
        } else if (parsedDate.getTime() === today.getTime()) {
          score += 800; // Due today
        } else {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (parsedDate.getTime() === tomorrow.getTime()) {
            score += 400; // Due tomorrow
          } else {
            score += 100; // Due in future
          }
        }
      }

      // User priority level
      const pLevel = (task.priority || "med").toLowerCase();
      const pScore = { high: 30, med: 20, low: 10 }[pLevel] || 20;
      score += pScore;

      // Estimated duration
      const duration = getEstimatedDuration(task.title);
      score += (duration * 0.1);

      return {
        task,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.task);
}

// 2. AI prompt construction
export function buildPlannerPrompt(rankedTasks, userContext, totalTasksCount) {
  const allTasksList = rankedTasks
    .map((t, idx) => `- "${t.title}" (Priority: ${t.priority || 'med'}, Deadline: ${t.deadline || 'none'})`)
    .join('\n');

  return `
You are Mosaic, an intelligent and calm productivity assistant for ${userContext?.role || "a student"}.

The user currently has ${totalTasksCount} pending tasks on their plate.
Here are the ranked pending tasks (highest priority first):
${allTasksList}

Your job is to generate a Daily Battle Plan.
Based on the task priority, deadlines, and user workload, please generate the plan as a clean JSON object. Do NOT wrap it in any markdown code blocks or additional text. Just return the JSON object matching the following schema:

{
  "mission": "Today's main focus statement",
  "priorities": [
    {
      "task": "Title of Priority Task 1",
      "duration": "Estimated duration (e.g. 2h or 45m)",
      "reason": "One short phrase why this is prioritized"
    }
  ],
  "focusBlock": "Time range and activity (e.g. 2:00 PM - 4:00 PM: Deep work on Resume)",
  "estimatedTime": "Total estimated hours for all priorities (e.g. 4.5 hours)",
  "motivation": "A short 1-2 sentence direct motivational tip based on their workload."
}

Constraints:
1. Limit "priorities" to maximum 3 tasks. If there are fewer than 3 pending tasks, list all available tasks.
2. Each priority "task" name should be concise.
3. The "focusBlock" must be a single short line.
4. The "motivation" must be maximum 2 short sentences. Never generate long paragraphs.
5. Do NOT include any markdown characters like **, *, #, -, or bullet formats in any string fields.
`;
}

// 3. Local fallback planner
export function generateLocalBattlePlan(rankedTasks, totalTasksCount) {
  const topTasks = rankedTasks.slice(0, 3);
  
  const priorities = topTasks.map(t => {
    const duration = getEstimatedDuration(t.title);
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    
    return {
      task: t.title,
      duration: durationStr,
      reason: t.priority === 'high' ? 'High priority' : (t.deadline ? 'Due soon' : 'Keeps momentum')
    };
  });
  
  let totalMinutes = topTasks.reduce((acc, t) => acc + getEstimatedDuration(t.title), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  
  let focusBlock = "No tasks to focus on";
  if (topTasks.length > 0) {
    focusBlock = `9:00 AM - 11:00 AM: Focus on ${topTasks[0].title}`;
  }
  
  let motivation = "Your board is clear. A perfect day to recharge.";
  if (totalTasksCount > 5) {
    motivation = `You have a busy day with ${totalTasksCount} tasks. Focus on one task at a time and take regular breaks.`;
  } else if (totalTasksCount > 0) {
    motivation = `A manageable list of ${totalTasksCount} tasks today. Knock out the first one early to build momentum.`;
  }
  
  const localPlan = {
    mission: totalTasksCount > 0 ? "Make steady progress on your priorities." : "Enjoy your free time!",
    priorities,
    focusBlock,
    estimatedTime: `${totalHours} hours`,
    motivation,
    isLocal: true
  };
  
  return JSON.stringify(localPlan);
}

// 4. Battle Plan Generation Orchestrator
export async function generateAiBattlePlan(tasks, user, userContext) {
  const ranked = rankTasks(tasks);
  const totalCount = ranked.length;
  
  let planText = "";
  
  try {
    const prompt = buildPlannerPrompt(ranked, userContext, totalCount);
    let rawText = await callGemini(prompt);
    
    // Clean rawText from potential markdown code fence blocks if Gemini outputs them anyway
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```json|```/g, "").trim();
    }
    
    // Verify it parses as JSON
    const parsed = JSON.parse(cleaned);
    
    // Validate structure slightly to ensure it doesn't break
    if (typeof parsed.mission === 'string' && Array.isArray(parsed.priorities)) {
      planText = JSON.stringify(parsed);
    } else {
      throw new Error("Invalid Battle Plan JSON structure");
    }
  } catch (err) {
    console.error("AI Battle Plan JSON generation failed, falling back to local:", err);
    planText = generateLocalBattlePlan(ranked, totalCount);
  }
  
  // Save to firebase if user is logged in
  if (user?.uid) {
    try {
      await updateUserProfile(user.uid, { battlePlan: planText });
    } catch (dbErr) {
      console.error("Failed to save battle plan to Firebase:", dbErr);
    }
  }
  
  return { planText };
}
