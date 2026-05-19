export const ROUTES = {
  STUDYSYNC_INTENT: "STUDYSYNC_INTENT",
  GENERAL_REASONING: "GENERAL_REASONING",
  ACTION_REQUEST: "ACTION_REQUEST",
  UNKNOWN: "UNKNOWN",
};

const normalize = (query = "") =>
  query
    .toString()
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasAny = (normalized, patterns) =>
  patterns.find((pattern) =>
    typeof pattern === "string" ? normalized.includes(pattern) : pattern.test(normalized)
  );

const ACTION_PATTERNS = [
  /\b(create|add|make)\b.*\b(task|subtask|todo|deadline|reminder)\b/,
  /\b(delete|remove|drop|clear)\b.*\b(task|subtask|todo|deadline)\b/,
  /\b(update|edit|change|modify|rename|move|reschedule|postpone)\b.*\b(task|deadline|due|priority|status)\b/,
  /\b(assign|reassign)\b.*\b(to)\b/,
  /\b(move|reschedule|postpone)\b.*\b(to|for|by|deadline|due)\b/,
  /\b(break|split)\b.*\b(subtasks|subtask|steps)\b/,
  /\b(archive|hide)\b/,
  /\b(mark|set|complete|finish)\b.*\b(done|completed|complete|task|todo|priority|deadline)\b/,
  /\b(start|begin)\b.*\b(focus|timer|session)\b/,
  /\bnotify\b.*\b(member|teammate|team|user)\b/,
];

const STUDYSYNC_PATTERNS = [
  {
    mode: "next_task",
    patterns: [
      "what should i study next",
      "what should i study",
      "what should i work on",
      "what should i do now",
      "what to focus on",
      "next task",
      "what next",
      "where do i start",
    ],
  },
  {
    mode: "behind_schedule",
    patterns: [
      "am i behind",
      "behind schedule",
      "falling behind",
      "am i on track",
      "are we behind",
      "schedule status",
    ],
  },
  {
    mode: "room_attention",
    patterns: [
      "what needs attention",
      "what is urgent",
      "urgent tasks",
      "priority tasks",
      "high priority",
      "needs focus",
    ],
  },
  {
    mode: "team_summary",
    patterns: [
      "how is our team doing",
      "how is the team doing",
      "team progress",
      "team status",
      "room progress",
      "how are we doing",
    ],
  },
  {
    mode: "daily_plan",
    patterns: [
      "what should i finish today",
      "what should i complete today",
      "what should i do today",
      "today plan",
      "todays plan",
      "daily plan",
    ],
  },
  {
    mode: "due_tomorrow",
    patterns: [
      "due tomorrow",
      "what is due tomorrow",
      "what tasks are due tomorrow",
      "tomorrow deadline",
      "tomorrows deadline",
    ],
  },
  {
    mode: "daily_plan",
    patterns: ["due today", "what is due today", "today deadline"],
  },
  {
    mode: "productivity_advice",
    patterns: [
      "focus window",
      "productivity",
      "procrastination",
    ],
  },
];

const GENERAL_PATTERNS = [
  /\b(explain|teach|define|summarize)\b/,
  /\b(compare|difference between|versus|vs)\b/,
  /\b(how do i|how should i|best way|tips|advice|help me|plan)\b/,
  /\b(what is|what are|why does|why do)\b/,
  /\b(bfs|dfs|dijkstra|algorithm|concept|exam|interview|revision)\b/,
  /\b(i feel|feeling|distracted|overwhelmed|confused|stuck)\b/,
];

const buildResult = ({
  route,
  confidence,
  matchedPattern = null,
  originalQuery,
  normalizedQuery,
  reasoning,
  mode = null,
}) => ({
  route,
  confidence,
  matchedPattern,
  originalQuery,
  normalizedQuery,
  reasoning,
  mode,
});

export const routeQuery = (query = "") => {
  const originalQuery = query?.toString() || "";
  const normalizedQuery = normalize(originalQuery);

  if (!normalizedQuery) {
    return buildResult({
      route: ROUTES.UNKNOWN,
      confidence: 0,
      originalQuery,
      normalizedQuery,
      reasoning: "No query text was provided.",
    });
  }

  const actionPattern = hasAny(normalizedQuery, ACTION_PATTERNS);
  if (actionPattern) {
    return buildResult({
      route: ROUTES.ACTION_REQUEST,
      confidence: 0.95,
      matchedPattern: actionPattern.toString(),
      originalQuery,
      normalizedQuery,
      reasoning: "The query asks to mutate StudySync data, so it must stop at an approval boundary.",
    });
  }

  for (const intent of STUDYSYNC_PATTERNS) {
    const matchedPattern = hasAny(normalizedQuery, intent.patterns);
    if (matchedPattern) {
      return buildResult({
        route: ROUTES.STUDYSYNC_INTENT,
        confidence: typeof matchedPattern === "string" && normalizedQuery === matchedPattern ? 1 : 0.86,
        matchedPattern: matchedPattern.toString(),
        originalQuery,
        normalizedQuery,
        reasoning: "The query matches deterministic StudySync task, deadline, focus, or team intelligence.",
        mode: intent.mode,
      });
    }
  }

  const studyTokens = ["task", "tasks", "deadline", "deadlines", "team", "room", "overdue", "priority"];
  const questionTokens = ["what", "which", "when", "how", "due", "urgent", "behind", "progress"];
  const hasStudyToken = studyTokens.some((token) => normalizedQuery.split(" ").includes(token));
  const hasQuestionToken = questionTokens.some((token) => normalizedQuery.split(" ").includes(token));
  if (hasStudyToken && hasQuestionToken) {
    return buildResult({
      route: ROUTES.STUDYSYNC_INTENT,
      confidence: 0.68,
      matchedPattern: "studysync token heuristic",
      originalQuery,
      normalizedQuery,
      reasoning: "The query references StudySync-owned entities and asks for status or recommendation.",
      mode: normalizedQuery.includes("tomorrow") ? "due_tomorrow" : "room_attention",
    });
  }

  const generalPattern = hasAny(normalizedQuery, GENERAL_PATTERNS);
  if (generalPattern) {
    return buildResult({
      route: ROUTES.GENERAL_REASONING,
      confidence: 0.78,
      matchedPattern: generalPattern.toString(),
      originalQuery,
      normalizedQuery,
      reasoning: "The query is open-ended or asks for general explanation, planning, or advice.",
    });
  }

  return buildResult({
    route: ROUTES.UNKNOWN,
    confidence: 0.2,
    matchedPattern: null,
    originalQuery,
    normalizedQuery,
    reasoning: "No deterministic StudySync, action, or general reasoning pattern was strong enough.",
  });
};

export const inferResponseStyle = (query = "", route = ROUTES.UNKNOWN) => {
  const normalized = normalize(query);
  if (route === ROUTES.ACTION_REQUEST) return "boundary_refusal";
  if (route === ROUTES.UNKNOWN) return "clarify";
  if (/\bcompare|difference|vs|versus\b/.test(normalized)) return "compare";
  if (/\bplan|schedule|session|today|week\b/.test(normalized)) return "plan";
  if (/\bsummarize|summary|progress\b/.test(normalized)) return "summarize";
  if (/\bexplain|teach|what is|what are|define\b/.test(normalized)) return "explain";
  if (/\badvice|tips|best way|distracted|focus|overwhelmed\b/.test(normalized)) return "advise";
  return "direct_answer";
};
