const FALLBACK_MESSAGE =
  "I'm still learning. Ask me about tasks, deadlines, focus, or team progress.";

const INTENTS = [
  {
    mode: "daily_plan",
    phrases: [
      "what should i finish today",
      "what today",
      "todays plan",
      "today plan",
      "what should i complete",
      "what should i do today",
      "what should i finish",
      "what do i need to finish today",
    ],
    synonymGroups: [
      ["today", "todays", "daily"],
      ["finish", "complete", "do", "plan"],
    ],
  },
  {
    mode: "due_tomorrow",
    phrases: [
      "what is due tomorrow",
      "what tasks are due tomorrow",
      "due tomorrow",
      "tomorrow deadline",
      "tomorrows deadlines",
    ],
    synonymGroups: [
      ["tomorrow", "tomorrows"],
      ["due", "deadline", "deadlines", "tasks"],
    ],
  },
  {
    mode: "next_task",
    phrases: [
      "what should i study",
      "what should i do",
      "what now",
      "where do i start",
      "next task",
      "what next",
      "what should i work on",
      "what to focus on",
      "what should i study next",
      "what should i do now",
    ],
    synonymGroups: [
      ["next", "now", "start", "focus"],
      ["task", "study", "work", "do"],
    ],
  },
  {
    mode: "behind_schedule",
    phrases: [
      "am i behind",
      "behind schedule",
      "am i falling behind",
      "schedule status",
      "am i on track",
      "are we behind",
      "falling behind",
    ],
    synonymGroups: [
      ["behind", "late", "track", "schedule"],
      ["am", "i", "we", "status", "falling"],
    ],
  },
  {
    mode: "room_attention",
    phrases: [
      "what is urgent",
      "what needs attention",
      "urgent tasks",
      "priority tasks",
      "what needs focus",
      "what is priority",
      "what is high priority",
    ],
    synonymGroups: [
      ["urgent", "priority", "attention", "focus"],
      ["task", "tasks", "needs", "what"],
    ],
  },
  {
    mode: "team_summary",
    phrases: [
      "how is our team",
      "team status",
      "team progress",
      "how are we doing",
      "room progress",
      "how is our team doing",
      "how is the team doing",
    ],
    synonymGroups: [
      ["team", "room", "we"],
      ["status", "progress", "doing"],
    ],
  },
];

export const normalizeCopilotQuery = (query = "") =>
  query
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");

const hasToken = (tokens, word) => tokens.has(word);

const scoreIntent = (normalized, intent) => {
  if (!normalized) return null;

  const exactPhrase = intent.phrases.find((phrase) => normalized === phrase);
  if (exactPhrase) {
    return {
      mode: intent.mode,
      confidence: 1,
      matchedPattern: exactPhrase,
    };
  }

  const partialPhrase = intent.phrases
    .filter(
      (phrase) => normalized.includes(phrase) || phrase.includes(normalized)
    )
    .sort((a, b) => b.length - a.length)[0];

  if (partialPhrase) {
    return {
      mode: intent.mode,
      confidence: 0.7,
      matchedPattern: partialPhrase,
    };
  }

  const tokens = new Set(normalized.split(" ").filter(Boolean));
  const matchedGroups = intent.synonymGroups
    .map((group) => group.find((word) => hasToken(tokens, word)))
    .filter(Boolean);

  if (matchedGroups.length === intent.synonymGroups.length) {
    return {
      mode: intent.mode,
      confidence: 0.4,
      matchedPattern: matchedGroups.join(" + "),
    };
  }

  return null;
};

export const resolveCopilotIntent = (query = "") => {
  const originalQuery = query?.toString() || "";
  const normalizedQuery = normalizeCopilotQuery(originalQuery);

  const best = INTENTS.map((intent) => scoreIntent(normalizedQuery, intent))
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)[0];

  return {
    mode: best?.mode || null,
    confidence: best?.confidence || 0,
    matchedPattern: best?.matchedPattern || null,
    originalQuery,
    normalizedQuery,
    fallbackMessage: best ? null : FALLBACK_MESSAGE,
  };
};

export { FALLBACK_MESSAGE as COPILOT_FALLBACK_MESSAGE };
