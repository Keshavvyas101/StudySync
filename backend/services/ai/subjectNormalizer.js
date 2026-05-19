const TOPIC_ALIASES = new Map([
  ["dsa", "DSA"],
  ["data structures", "DSA"],
  ["algorithms", "DSA"],
  ["graph", "Graphs"],
  ["graphs", "Graphs"],
  ["dp", "DP"],
  ["dynamic programming", "DP"],
  ["dbms", "DBMS"],
  ["database", "DBMS"],
  ["databases", "DBMS"],
  ["os", "OS"],
  ["operating system", "OS"],
  ["operating systems", "OS"],
  ["network", "Networks"],
  ["networks", "Networks"],
  ["computer networks", "Networks"],
  ["cn", "Networks"],
  ["oops", "OOP"],
  ["oop", "OOP"],
  ["object oriented", "OOP"],
  ["sql", "SQL"],
  ["math", "Math"],
  ["maths", "Math"],
  ["mathematics", "Math"],
  ["aptitude", "Aptitude"],
  ["compiler", "Compilers"],
  ["compilers", "Compilers"],
  ["web", "Web Development"],
  ["react", "React"],
  ["node", "Node.js"],
  ["javascript", "JavaScript"],
  ["java", "Java"],
  ["python", "Python"],
  ["c++", "C++"],
]);

const BLOCKED_TERMS = new Set([
  "1",
  "2",
  "3",
  "4",
  "5",
  "and",
  "assignment",
  "complete",
  "demo",
  "finish",
  "for",
  "general",
  "homework",
  "keshav",
  "learn",
  "misc",
  "note",
  "notes",
  "practice",
  "random",
  "read",
  "revision",
  "shopping",
  "study",
  "task",
  "tasks",
  "test",
  "the",
  "todo",
  "with",
  "work",
]);

const normalizeInput = (value = "") =>
  value
    .toString()
    .trim()
    .replace(/\s+/g, " ");

const normalizeKey = (value = "") =>
  normalizeInput(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeAcademicTopic = (value) => {
  const original = normalizeInput(value);
  const key = normalizeKey(original);

  if (!key || BLOCKED_TERMS.has(key) || /^\d+$/.test(key)) return null;
  if (TOPIC_ALIASES.has(key)) return TOPIC_ALIASES.get(key);

  const tokens = key.split(" ").filter(Boolean);
  if (tokens.length === 1) {
    const [token] = tokens;
    if (BLOCKED_TERMS.has(token) || /^\d+$/.test(token) || token.length < 2) {
      return null;
    }
    if (TOPIC_ALIASES.has(token)) return TOPIC_ALIASES.get(token);
  }

  const matchedAlias = [...TOPIC_ALIASES.entries()].find(([alias]) =>
    key.includes(alias)
  );

  if (matchedAlias) return matchedAlias[1];
  return null;
};

export const getTaskAcademicTopics = (task) => {
  const explicitTags = Array.isArray(task?.tags)
    ? task.tags.map(normalizeAcademicTopic).filter(Boolean)
    : [];

  if (explicitTags.length > 0) {
    return [...new Set(explicitTags)];
  }

  const title = task?.title || "";
  const titleTopics = [
    normalizeAcademicTopic(title),
    ...title
      .split(/[\s,/|:;()[\]{}-]+/)
      .map(normalizeAcademicTopic)
      .filter(Boolean),
  ].filter(Boolean);

  return [...new Set(titleTopics)];
};

export const normalizeTopicList = (topics = []) => [
  ...new Set(topics.map(normalizeAcademicTopic).filter(Boolean)),
];
