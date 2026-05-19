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
  },
  required: ["title", "answer", "bullets", "caveat"],
};

const buildRequest = ({ query, llmContext }) => ({
  contents: [
    {
      role: "user",
      parts: [
        {
          text: [
            "You are StudySync Copilot's general reasoning layer.",
            "Answer naturally and concisely. Use StudySync context only when it is relevant.",
            "Do not invent tasks, deadlines, study sessions, teammates, or workspace state.",
            "Never claim you changed data. Never ask for raw private data.",
            "Return JSON only.",
            `User query: ${query}`,
            `Sanitized context: ${JSON.stringify(llmContext)}`,
          ].join("\n"),
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

export const generateGeneralReasoningReply = async ({ query, llmContext }) => {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    return {
      title: "General guidance",
      answer:
        "I can help with that, but the reasoning model is not configured right now. For now, keep it simple: pick one clear target, work for a short focused block, then review what changed.",
      bullets: [],
      caveat: "StudySync task data was not changed.",
      llmUsed: false,
    };
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

  return {
    title: "General guidance",
    answer:
      "I could not reach the reasoning model just now. A safe next move is to narrow the question into one topic, decide the outcome you want, and study it in a 25-minute block.",
    bullets: [],
    caveat: "StudySync data was not used as a source of truth for this answer.",
    llmUsed: false,
  };
};
