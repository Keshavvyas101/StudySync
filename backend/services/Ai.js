const ALLOWED_INTENTS = [
  "CREATE_TASK",
  "CREATE_SUBTASKS",
  "MY_TASKS",
  "DUE_TODAY",
  "DUE_TOMORROW",
  "DUE_THIS_WEEK",
  "OVERDUE",
  "HIGH_PRIORITY",
  "ASSIGN_TASK",
  "CREATE_RECURRING_TASK",
  "PRODUCTIVITY_SUMMARY",
  "UNKNOWN",
];

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 12000;

let activeKeyIndex = 0;

const getGeminiKeys = () =>
  (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

const buildSchema = (properties, required = []) => ({
  type: "object",
  properties,
  required,
});

const intentSchema = buildSchema(
  {
    intent: {
      type: "string",
      enum: ALLOWED_INTENTS,
    },
  },
  ["intent"]
);

const createTaskSchema = buildSchema(
  {
    title: { type: "string" },
    description: { type: "string" },
    priority: { type: "string", enum: ["low", "medium", "high"] },
    deadline: { type: "string", nullable: true },
  },
  ["title", "description", "priority", "deadline"]
);

const createSubtasksSchema = buildSchema(
  {
    parentTaskName: { type: "string" },
    subtasks: {
      type: "array",
      items: { type: "string" },
    },
  },
  ["parentTaskName", "subtasks"]
);

const assignTaskSchema = buildSchema(
  {
    title: { type: "string" },
    assignee: { type: "string" },
  },
  ["title", "assignee"]
);

const recurringTaskSchema = buildSchema(
  {
    title: { type: "string" },
    recurrence: { type: "string" },
  },
  ["title", "recurrence"]
);

const parseJson = (text) => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const isQuotaError = (status, body) => {
  if (status === 429) return true;

  const errorStatus = body?.error?.status || body?.status;
  return errorStatus === "RESOURCE_EXHAUSTED";
};

const buildRequest = (prompt, schema) => ({
  contents: [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ],
  generationConfig: {
    temperature: 0,
    responseMimeType: "application/json",
    responseSchema: schema,
  },
});

const callGemini = async (prompt, schema) => {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    const error = new Error("Copilot unavailable");
    error.code = "COPILOT_UNAVAILABLE";
    throw error;
  }

  let attempts = 0;
  while (attempts < keys.length) {
    const keyIndex = activeKeyIndex;
    const key = keys[keyIndex];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequest(prompt, schema)),
          signal: controller.signal,
        }
      );

      const raw = await res.text();
      const body = parseJson(raw);

      if (!res.ok) {
        if (isQuotaError(res.status, body)) {
          attempts += 1;
          if (attempts >= keys.length) {
            const error = new Error("AI quota exhausted");
            error.code = "AI_QUOTA_EXHAUSTED";
            throw error;
          }

          const nextIndex = (keyIndex + 1) % keys.length;
          console.warn(
            `Copilot key ${keyIndex + 1} exhausted → switching to key ${nextIndex + 1}`
          );
          activeKeyIndex = nextIndex;
          continue;
        }

        const error = new Error(body?.error?.message || "Copilot unavailable");
        error.code = "COPILOT_UNAVAILABLE";
        throw error;
      }

      const text =
        body?.candidates?.[0]?.content?.parts?.[0]?.text ||
        body?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const parsed = parseJson(text);

      if (!parsed) {
        const error = new Error("Could not parse task");
        error.code = "AI_PARSE_FAILED";
        throw error;
      }

      return parsed;
    } catch (error) {
      if (error.name === "AbortError") {
        const timeoutError = new Error("Copilot unavailable");
        timeoutError.code = "COPILOT_UNAVAILABLE";
        throw timeoutError;
      }

      if (error.code === "AI_QUOTA_EXHAUSTED") throw error;
      if (error.code) throw error;

      const unavailable = new Error("Copilot unavailable");
      unavailable.code = "COPILOT_UNAVAILABLE";
      throw unavailable;
    } finally {
      clearTimeout(timeout);
    }
  }

  const error = new Error("AI quota exhausted");
  error.code = "AI_QUOTA_EXHAUSTED";
  throw error;
};

const buildContext = ({ currentDate, timezone }) =>
  `Current date/time: ${currentDate || new Date().toISOString()}\nTimezone: ${
    timezone || "UTC"
  }`;

export const classifyIntent = async (prompt) => {
  const result = await callGemini(
    [
      "Classify this StudySync Copilot prompt.",
      "StudySync Copilot handles student productivity: study planning, task creation, reminders, task querying, subtasks, assignment, recurring study habits, and analytics insights.",
      "Natural student task language such as 'buy milk tomorrow', 'add shopping reminder', or 'revise OS tomorrow' is CREATE_TASK.",
      "Casual chat, jokes, greetings, and general questions must be UNKNOWN.",
      'Examples of UNKNOWN: "hello bro", "how are you", "tell joke".',
      `Allowed intents: ${ALLOWED_INTENTS.join(", ")}.`,
      "Return only JSON.",
      `Prompt: ${prompt}`,
    ].join("\n"),
    intentSchema
  );

  return ALLOWED_INTENTS.includes(result.intent)
    ? { intent: result.intent }
    : { intent: "UNKNOWN" };
};

export const extractCreateTask = (prompt, context = {}) =>
  callGemini(
    [
      buildContext(context),
      "Extract one task from the user's prompt.",

      "IMPORTANT RULES:",
      "1. Preserve the user's original intent.",
      "2. DO NOT invent verbs like Revise, Study, Practice, Complete unless user explicitly said them.",
      "3. If user says 'shopping', title should be 'Shopping' NOT 'Revise shopping'.",
      "4. If user says 'buy milk', title should be 'Buy milk'.",
      "5. Remove scheduling words like today/tomorrow from the title when they are represented as the deadline.",
      "6. Use the user's natural wording, only clean grammar/capitalization.",
      "7. Keep title concise.",
      "8. Description can be empty.",
      "9. Use ISO 8601 for deadline when date/time exists.",
      "10. Use null when no deadline exists.",

      `Prompt: ${prompt}`,
    ].join("\n"),
    createTaskSchema
  );
export const extractCreateSubtasks = (prompt) =>
  callGemini(
    [
      "Extract the parent task name and subtask titles.",
      "Do not include numbering in subtask titles.",
      `Prompt: ${prompt}`,
    ].join("\n"),
    createSubtasksSchema
  );

export const extractAssignTask = (prompt) =>
  callGemini(
    [
      "Extract the task title and assignee name from this StudySync assignment prompt.",
      `Prompt: ${prompt}`,
    ].join("\n"),
    assignTaskSchema
  );

export const extractRecurringTask = (prompt) =>
  callGemini(
    [
      "Extract a recurring study habit task.",
      "Return a short task title and the recurrence phrase exactly enough to store as metadata.",
      `Prompt: ${prompt}`,
    ].join("\n"),
    recurringTaskSchema
  );
