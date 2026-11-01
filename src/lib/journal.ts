export type Sentiment = "negative" | "neutral" | "positive";

export const MOODS = [
  { value: 1, label: "Sad", emoji: "😢", sentiment: "negative" as Sentiment },
  { value: 2, label: "Anxious", emoji: "😟", sentiment: "negative" as Sentiment },
  { value: 3, label: "Neutral", emoji: "😐", sentiment: "neutral" as Sentiment },
  { value: 4, label: "Happy", emoji: "🙂", sentiment: "positive" as Sentiment },
  { value: 5, label: "Grateful", emoji: "😄", sentiment: "positive" as Sentiment },
] as const;

export const SENTIMENT = {
  negative: { label: "Negative", color: "#F0A35C", face: "☹" },
  neutral: { label: "Neutral", color: "#B9B4AE", face: "😐" },
  positive: { label: "Positive", color: "#A9C46C", face: "☺" },
} as const;

export const PROMPTS = [
  "What brought me joy today?",
  "What's something small that made a big difference in my day?",
  "What held today, and what slipped?",
  "Which block felt easiest, and which one did I dread?",
  "One thing I'd do differently tomorrow.",
  "What did I notice about my energy today?",
  "Who or what helped me show up?",
  "What's one small win worth remembering?",
];

export function moodOf(value: number | null | undefined) {
  return MOODS.find((m) => m.value === value) ?? null;
}

export function sentimentOf(value: number | null | undefined): Sentiment | null {
  return moodOf(value)?.sentiment ?? null;
}

/** Deterministic prompt for a day so it stays put across reloads. */
export function promptFor(day: string) {
  const n = day.split("-").reduce((a, p) => a + Number(p), 0);
  return PROMPTS[n % PROMPTS.length];
}

export function wordCount(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Consecutive journaled days ending today (or yesterday, if today isn't written yet). */
export function journalStreak(days: string[], today: string, addDays: (d: string, n: number) => string) {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/** Splits body text into blocks; lines ending in "?" are prompt questions. */
export function bodyBlocks(body: string) {
  return body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const [first, ...rest] = b.split("\n");
      const isQuestion = /\?\s*$/.test(first) && first.length < 120;
      return isQuestion ? { question: first.trim(), answer: rest.join("\n").trim() } : { question: null, answer: b };
    });
}
