import {
  getJarvisResponseStyleHint,
  getJarvisRouteHint,
  JARVIS_INTENTS,
} from "./jarvisSystemPrompt.js";

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
  /^(buy|get|submit|finish|complete|revise|study|read|prepare|practice|solve|review|call|email|message|meet|attend)\b.*\b(today|tomorrow|tonight|sunday|monday|tuesday|wednesday|thursday|friday|saturday|reminder)\b/,
  /\b(i need to|need to|i have to|have to|got to)\b.*\b(today|tomorrow|tonight|sunday|monday|tuesday|wednesday|thursday|friday|saturday|reminder)\b/,
  /\b(delete|remove|drop|clear)\b.*\b(task|subtask|todo|deadline)\b/,
  /\b(update|edit|change|modify|rename|move|reschedule|postpone)\b.*\b(task|deadline|due|priority|status)\b/,
  /\b(assign|reassign)\b.*\b(to)\b/,
  /\b(can|could|should)\b\s+[a-z0-9]+\s+\b(handle|do|take|own|work on)\b/,
  /^[a-z0-9]+\s+\b(can|could|should|will)\b\s+\b(handle|do|take|own|work on)\b/,
  /\b(move|reschedule|postpone)\b.*\b(to|for|by|deadline|due)\b/,
  /\b(break|split)\b.*\b(subtasks|subtask|steps)\b/,
  /\b(break|split)\b.*\b(down|up)\b/,
  /\btoo (big|large|long|much)\b.*\b(break|split)\b/,
  /\b(archive|hide)\b/,
  /\b(mark|set|complete|finish)\b.*\b(done|completed|complete|task|todo|priority|deadline)\b/,
  /\b(start|begin)\b.*\b(focus|timer|session)\b/,
  /\bnotify\b.*\b(member|teammate|team|user)\b/,
];

const STUDYSYNC_PATTERNS = [
  {
    mode: "next_task",
    jarvisIntent: JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY,
    patterns: [
      "what should i study next",
      "what should i study",
      "what should i work on",
      "what should i do now",
      "what to focus on",
      "what should i focus on first",
      "what should i revise today",
      "what should i revise",
      "next task",
      "what next",
      "where do i start",
      "i don t know what to study",
      "i dont know what to study",
      "i do not know what to study",
    ],
  },
  {
    mode: "behind_schedule",
    jarvisIntent: JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY,
    patterns: [
      "am i behind",
      "behind schedule",
      "falling behind",
      "am i on track",
      "are we behind",
      "schedule status",
      "i am falling behind",
      "i m falling behind",
      "i feel behind",
      "catch up",
    ],
  },
  {
    mode: "room_attention",
    jarvisIntent: JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY,
    patterns: [
      "what needs attention",
      "what is urgent",
      "urgent tasks",
      "priority tasks",
      "high priority",
      "needs focus",
      "focus first",
      "most important",
      "what is most important",
    ],
  },
  {
    mode: "team_summary",
    jarvisIntent: JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY,
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
    jarvisIntent: JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY,
    patterns: [
      "what should i finish today",
      "what should i complete today",
      "what should i do today",
      "today plan",
      "todays plan",
      "daily plan",
      "help me plan revision",
      "make a revision plan",
      "help me recover this week",
      "recover this week",
      "plan revision",
      "revision plan",
      /\b(i have|got|there is|there s)\b.*\b(exam|test|quiz)\b.*\b(today|tomorrow|tonight|in \d+ days?|next week|this week|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
    ],
  },
  {
    mode: "due_tomorrow",
    jarvisIntent: JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY,
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
    jarvisIntent: JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY,
    patterns: ["due today", "what is due today", "today deadline"],
  },
  {
    mode: "productivity_advice",
    jarvisIntent: JARVIS_INTENTS.COACHING_QUERY,
    patterns: [
      "focus window",
      "productivity",
      "procrastination",
      "no mood to study",
      "not in the mood to study",
      "don t feel like studying",
      "dont feel like studying",
      /\b(task|chapter|assignment|project)\b.*\btoo (big|large|long|much)\b/,
      "wasted whole day",
      "wasted the whole day",
      "wasted my day",
      "did nothing today",
      "lost the day",
    ],
  },
];

const GENERAL_PATTERNS = [
  /\b(explain|teach|define|summarize)\b/,
  /\b(compare|difference between|versus|vs)\b/,
  /\b(how do i|how should i|best way|tips|advice|help me|plan)\b/,
  /\b(what is|what are|why does|why do)\b/,
  /\b(bfs|dfs|dijkstra|algorithm|concept|interview|normalization|dbms|operating system|compiler|calculus)\b/,
  /\b(i feel|feeling|distracted|overwhelmed|confused|confusing|stuck|wasted|did nothing|lost the day)\b/,
];

const buildResult = ({
  route,
  confidence,
  matchedPattern = null,
  originalQuery,
  normalizedQuery,
  reasoning,
  mode = null,
  jarvisIntent = null,
}) => ({
  route,
  confidence,
  matchedPattern,
  originalQuery,
  normalizedQuery,
  reasoning,
  mode,
  jarvisIntent,
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
      jarvisIntent: "ACTION_REQUEST",
    });
  }

  const jarvisRouteHint = getJarvisRouteHint(normalizedQuery);
  if (jarvisRouteHint) {
    return buildResult({
      route: ROUTES[jarvisRouteHint.route],
      confidence: jarvisRouteHint.confidence,
      matchedPattern: jarvisRouteHint.matchedPattern,
      originalQuery,
      normalizedQuery,
      reasoning: jarvisRouteHint.reasoning,
      mode: jarvisRouteHint.mode,
      jarvisIntent: jarvisRouteHint.intent,
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
        jarvisIntent: intent.jarvisIntent || JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY,
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
  const jarvisStyle = getJarvisResponseStyleHint(normalized);
  if (jarvisStyle) return jarvisStyle;
  if (route === ROUTES.ACTION_REQUEST) return "boundary_refusal";
  if (route === ROUTES.UNKNOWN) return "clarify";
  if (/\bcompare|difference|vs|versus\b/.test(normalized)) return "compare";
  if (/\b(what should i study|what should i work on|what to focus on|where do i start|i don t know what to study|i dont know what to study)\b/.test(normalized)) return "advise";
  if (/\bplan|schedule|session|today|week\b/.test(normalized)) return "plan";
  if (/\bsummarize|summary|progress\b/.test(normalized)) return "summarize";
  if (/\bexplain|teach|what is|what are|define\b/.test(normalized)) return "explain";
  if (/\badvice|tips|best way|distracted|focus|overwhelmed|confused|confusing|stuck|wasted|did nothing\b/.test(normalized)) return "advise";
  return "direct_answer";
};
