import { buildJarvisReasoningPrompt } from "./jarvisSystemPrompt.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 12000;

let activeKeyIndex = 0;

const getGeminiKeys = () =>
  (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

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

const responseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    answer: { type: "string" },
    bullets: {
      type: "array",
      items: { type: "string" },
    },
    caveat: { type: "string", nullable: true },
    intent: { type: "string", nullable: true },
    responseStyle: { type: "string", nullable: true },
    coachingSuggestions: {
      type: "array",
      items: { type: "string" },
    },
    suggestedActionDraft: {
      type: "object",
      nullable: true,
      properties: {
        actionType: { type: "string", nullable: true },
        description: { type: "string", nullable: true },
      },
    },
  },
  required: ["title", "answer", "bullets", "caveat"],
};

const buildRequest = ({ query, llmContext }) => ({
  contents: [
    {
      role: "user",
      parts: [
        {
          text: buildJarvisReasoningPrompt({ query, llmContext }),
        },
      ],
    },
  ],
  generationConfig: {
    temperature: 0.35,
    responseMimeType: "application/json",
    responseSchema,
  },
});

const buildFallbackReasoningReply = ({ query, llmContext, reason }) => {
  const studyPlan = llmContext?.studyPlan || {};
  const primaryTask = studyPlan.primaryTask;
  const workload = studyPlan.workload;
  const firstBlock = studyPlan.suggestedBlocks?.[0];
  const normalized = query?.toString().toLowerCase() || "";
  const recovery = /\b(wasted|lost|recover|behind|too much|overwhelmed|no mood)\b/.test(
    normalized
  );

  if (primaryTask) {
    return {
      title: recovery ? "Recovery plan" : "Study plan",
      answer: recovery
        ? `Do not try to repay everything at once. Start with ${primaryTask.title}, because it is the strongest current StudySync priority, and make one visible checkpoint before switching tasks.`
        : `Start with ${primaryTask.title}. It is the strongest current StudySync priority, so use the first block to create progress there before widening the plan.`,
      bullets: [
        workload?.level ? `Workload pressure is ${workload.level}.` : null,
        ...(primaryTask.reasons || []).slice(0, 3),
        firstBlock?.minutes
          ? `Use a ${firstBlock.minutes}-minute ${firstBlock.label?.toLowerCase() || "focus"} block.`
          : null,
      ].filter(Boolean),
      caveat: "StudySync data was not changed.",
      intent: llmContext?.jarvisIntent || null,
      responseStyle: llmContext?.responseStyle || null,
      coachingSuggestions: (studyPlan.suggestedBlocks || [])
        .slice(0, 3)
        .map((block) => block.action)
        .filter(Boolean),
      suggestedActionDraft: null,
      llmUsed: false,
    };
  }

  return {
    title: "General guidance",
    answer:
      "I can help with that, but the reasoning model is not available right now. Pick one clear study target, work for a short focused block, then review what changed.",
    bullets: [],
    caveat: reason,
    intent: llmContext?.jarvisIntent || null,
    responseStyle: llmContext?.responseStyle || null,
    coachingSuggestions: [],
    suggestedActionDraft: null,
    llmUsed: false,
  };
};

export const generateGeneralReasoningReply = async ({ query, llmContext }) => {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    return buildFallbackReasoningReply({
      query,
      llmContext,
      reason: "The reasoning model is not configured. StudySync data was not changed.",
    });
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
          body: JSON.stringify(buildRequest({ query, llmContext })),
          signal: controller.signal,
        }
      );
      const raw = await res.text();
      const body = parseJson(raw);

      if (!res.ok) {
        const status = body?.error?.status || body?.status;
        if (res.status === 429 || status === "RESOURCE_EXHAUSTED") {
          attempts += 1;
          activeKeyIndex = (keyIndex + 1) % keys.length;
          continue;
        }
        throw new Error(body?.error?.message || "Reasoning unavailable");
      }

      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = parseJson(text);
      if (!parsed?.answer) throw new Error("Reasoning response parse failed");

      return {
        title: parsed.title || "General guidance",
        answer: parsed.answer,
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 5) : [],
        caveat: parsed.caveat || null,
        intent: parsed.intent || null,
        responseStyle: parsed.responseStyle || null,
        coachingSuggestions: Array.isArray(parsed.coachingSuggestions)
          ? parsed.coachingSuggestions.slice(0, 4)
          : [],
        suggestedActionDraft: parsed.suggestedActionDraft || null,
        llmUsed: true,
      };
    } catch (error) {
      if (error.name === "AbortError") break;
      if (attempts >= keys.length - 1) break;
      attempts += 1;
    } finally {
      clearTimeout(timeout);
    }
  }

  return buildFallbackReasoningReply({
    query,
    llmContext,
    reason: "The reasoning model could not be reached. StudySync data was not changed.",
  });
};
