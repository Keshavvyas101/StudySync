export const JARVIS_INTENTS = Object.freeze({
  STUDYSYNC_CONTEXT_QUERY: "STUDYSYNC_CONTEXT_QUERY",
  COACHING_QUERY: "COACHING_QUERY",
  GENERAL_LEARNING_QUERY: "GENERAL_LEARNING_QUERY",
  BOUNDED_EMOTIONAL_QUERY: "BOUNDED_EMOTIONAL_QUERY",
  ACTION_REQUEST: "ACTION_REQUEST",
});

export const JARVIS_BEHAVIOR_RULES = Object.freeze([
  "You are JARVIS, StudySync's grounded study copilot.",
  "Sound calm, intelligent, concise, practical, motivating, and natural.",
  "Use StudySync context as the source of truth: tasks, deadlines, priorities, study sessions, analytics, AI profile signals, proactive insights, and recent study-related conversation memory.",
  "Use the LLM only for reasoning and phrasing. Never invent workspace facts, deadlines, teammates, tasks, study history, or memory.",
  "For overload, distraction, confusion, or recovery after a wasted day, reduce pressure and recommend one realistic next study move.",
  "For planning and coaching, prioritize using deadline pressure, overdue work, task priority, weak topics, recent focus patterns, focus-window data, and workload pressure before giving general advice.",
  "When StudySync context includes a studyPlan, use its primary task, ranked tasks, workload pressure, and suggested focus blocks as the main grounding for recommendations.",
  "Prefer concrete study moves over motivational speeches: name the first task/topic, the reason it matters, and the smallest useful checkpoint.",
  "For emotional study queries, acknowledge briefly, stay bounded, and guide back to study or productivity context when useful.",
  "Do not behave like a therapist, fake human companion, autonomous agent, or emotional dependency.",
  "Never claim you changed data. Never mutate database state. Never bypass approval, validation, execution, or audit systems.",
  "Action requests may be recognized, but actual changes must go through the existing secure StudySync action pipeline.",
]);

export const JARVIS_OUTPUT_RULES = Object.freeze([
  "Return JSON only.",
  "Include an intent from the supported JARVIS intent set.",
  "Keep answer concise and grounded.",
  "Use bullets for concrete reasons or next steps.",
  "coachingSuggestions should contain practical study moves only.",
  "suggestedActionDraft may describe a possible user-approved action, but must not claim it was executed.",
]);

export const JARVIS_ROUTE_PATTERNS = Object.freeze({
  [JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY]: {
    route: "STUDYSYNC_INTENT",
    mode: "team_summary",
    confidence: 0.86,
    reasoning:
      "The query asks for grounded StudySync progress, workload, or workspace context.",
    patterns: [
      /\bhow am i doing\b/,
      /\bhow are we doing\b/,
      /\bhow is my progress\b/,
      /\bhow is our progress\b/,
      /\bhow is progress\b/,
      /\bwhere do i stand\b/,
      /\bstatus check\b/,
      /\bperformance\b/,
      /\bprogress report\b/,
      /\bwhat should i focus on first\b/,
      /\bwhat should i study today\b/,
      /\bwhat should i revise today\b/,
      /\bwhat should i revise\b/,
      /\bwhere should i start\b/,
    ],
  },
  [JARVIS_INTENTS.COACHING_QUERY]: {
    route: "STUDYSYNC_INTENT",
    mode: "productivity_advice",
    confidence: 0.88,
    reasoning:
      "The query asks for study coaching that should use StudySync workload and behavior signals.",
    patterns: [
      /\bi can t focus\b/,
      /\bi cant focus\b/,
      /\bi cannot focus\b/,
      /\bcan t focus\b/,
      /\bcant focus\b/,
      /\bcannot focus\b/,
      /\bi am distracted\b/,
      /\bi m distracted\b/,
      /\bfeeling distracted\b/,
      /\bi feel overwhelmed\b/,
      /\bi am overwhelmed\b/,
      /\bi m overwhelmed\b/,
      /\bi am falling behind\b/,
      /\bi m falling behind\b/,
      /\bi feel behind\b/,
      /\bfalling behind\b/,
      /\btoo much to study\b/,
      /\bhelp me recover this week\b/,
      /\brecover this week\b/,
      /\bhelp me plan revision\b/,
      /\bmake a revision plan\b/,
      /\bplan revision\b/,
      /\brevision plan\b/,
      /\b(i have|got|there is|there s)\b.*\b(exam|test|quiz)\b.*\b(today|tomorrow|tonight|in \d+ days?|next week|this week|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
      /\bno mood to study\b/,
      /\bnot in the mood to study\b/,
      /\bdon t feel like studying\b/,
      /\bdont feel like studying\b/,
      /\b(task|chapter|assignment|project)\b.*\btoo (big|large|long|much)\b/,
      /\bwasted (the )?(whole )?day\b/,
      /\bwasted my day\b/,
      /\bdid nothing today\b/,
      /\blost the day\b/,
    ],
  },
  [JARVIS_INTENTS.GENERAL_LEARNING_QUERY]: {
    route: "GENERAL_REASONING",
    mode: null,
    confidence: 0.82,
    reasoning: "The query asks for explanation, comparison, or concept-level learning help.",
    patterns: [
      /\bexplain\b/,
      /\bteach me\b/,
      /\bdefine\b/,
      /\bwhat (is|are)\b.*\b(bfs|dfs|dijkstra|dbms|normalization|algorithm|concept|database|operating system|os|network|sql)\b/,
      /\bhow does\b.*\b(work|happen|run)\b/,
      /\bwhy does\b/,
      /\bcompare\b/,
      /\bdifference between\b/,
      /\bversus\b/,
      /\bvs\b/,
      /\bbfs\b/,
      /\bdfs\b/,
      /\bdijkstra\b/,
      /\bdbms\b/,
      /\bnormalization\b/,
      /\balgorithm\b/,
    ],
  },
  [JARVIS_INTENTS.BOUNDED_EMOTIONAL_QUERY]: {
    route: "GENERAL_REASONING",
    mode: null,
    confidence: 0.78,
    reasoning:
      "The query expresses emotion and should receive bounded support without becoming therapy.",
    patterns: [
      /\bnobody understands me\b/,
      /\bi feel stressed\b/,
      /\bi am stressed\b/,
      /\bi m stressed\b/,
      /\bi feel lost\b/,
      /\bi am lost\b/,
      /\bi m lost\b/,
      /\bi feel stuck\b/,
      /\bi feel low\b/,
    ],
  },
});

const resolveRouteHintMode = (intent, normalizedQuery, defaultMode) => {
  if (
    intent === JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY &&
    /\bwhat should i (study|revise|finish|complete|do)\b.*\btoday\b/.test(normalizedQuery)
  ) {
    return "daily_plan";
  }

  if (
    intent === JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY &&
    /\b(focus on first|focus first|most important|urgent|priority)\b/.test(normalizedQuery)
  ) {
    return "room_attention";
  }

  if (
    intent === JARVIS_INTENTS.COACHING_QUERY &&
    /\b(revision plan|plan revision|make a revision plan|recover this week|exam|test|quiz)\b/.test(
      normalizedQuery
    )
  ) {
    return "daily_plan";
  }

  return defaultMode;
};

export const getJarvisRouteHint = (normalizedQuery = "") => {
  for (const [intent, config] of Object.entries(JARVIS_ROUTE_PATTERNS)) {
    const matchedPattern = config.patterns.find((pattern) => pattern.test(normalizedQuery));
    if (matchedPattern) {
      return {
        intent,
        route: config.route,
        mode: resolveRouteHintMode(intent, normalizedQuery, config.mode),
        confidence: config.confidence,
        matchedPattern: matchedPattern.toString(),
        reasoning: config.reasoning,
      };
    }
  }

  return null;
};

export const getJarvisResponseStyleHint = (normalizedQuery = "") => {
  const hint = getJarvisRouteHint(normalizedQuery);
  if (!hint) return null;
  if (hint.intent === JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY) return "summarize";
  if (hint.intent === JARVIS_INTENTS.COACHING_QUERY) return "advise";
  if (hint.intent === JARVIS_INTENTS.BOUNDED_EMOTIONAL_QUERY) return "advise";
  if (hint.intent === JARVIS_INTENTS.GENERAL_LEARNING_QUERY) {
    if (/\bcompare|difference between|versus|vs\b/.test(normalizedQuery)) return "compare";
    return "explain";
  }
  return null;
};

export const buildJarvisReasoningPrompt = ({ query, llmContext }) =>
  [
    ...JARVIS_BEHAVIOR_RULES,
    ...JARVIS_OUTPUT_RULES,
    `Supported intents: ${Object.values(JARVIS_INTENTS).join(", ")}`,
    `User query: ${query}`,
    `Sanitized context: ${JSON.stringify(llmContext)}`,
  ].join("\n");

export const buildJarvisIntentParserPrompt = ({ query, context }) =>
  [
    ...JARVIS_BEHAVIOR_RULES,
    "You are now classifying the user's query before any StudySync backend action or response is selected.",
    "Use meaning first, not exact wording. Natural paraphrases should classify correctly.",
    "Choose intent from: STUDYSYNC_CONTEXT_QUERY, COACHING_QUERY, GENERAL_LEARNING_QUERY, BOUNDED_EMOTIONAL_QUERY, ACTION_REQUEST, UNKNOWN.",
    "Choose subIntent when useful: next_task, behind_schedule, room_attention, team_summary, daily_plan, due_tomorrow, productivity_advice, concept_explanation, compare_concepts, action_create_task, action_assign_task, action_reschedule_task, action_archive_task, action_complete_task, action_start_focus, unknown.",
    "Treat natural student productivity requests as StudySync actions when they would create or change tasks, for example 'buy milk tomorrow', 'add shopping reminder', 'I need to revise OS tomorrow', 'Rahul can handle presentation', 'split project into subtasks', or 'move DB assignment to Friday'.",
    "A bare academic situation like 'I have OS exam in 4 days' is usually planning/coaching unless the user asks to add, create, schedule, or change a task.",
    "Treat planning, overload, revision, recovery, falling behind, no-motivation, and prioritization queries as StudySync coaching or context queries, not casual chat.",
    "Treat concept explanations, comparisons, and academic how/why questions as general learning help.",
    "candidateAction should describe only a possible action request. It must not say the action was performed.",
    "candidateTarget should include possible taskTitle, memberName, datePhrase, or topic when the user mentions one.",
    "responseStyle must be one of: direct_answer, explain, compare, plan, summarize, advise, clarify, boundary_refusal.",
    "response should be a short natural interpretation of what the user wants, not a final answer.",
    "If unsure, lower confidence instead of guessing.",
    "Return structured JSON only with: intent, subIntent, candidateAction, candidateTarget, confidence, responseStyle, response.",
    `User query: ${query}`,
    `Compact StudySync context: ${JSON.stringify(context)}`,
  ].join("\n");
