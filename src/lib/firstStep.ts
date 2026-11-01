/**
 * "Help me start": turn a task into one small, physical next action.
 * The rules are deliberately simple and readable. When ANTHROPIC_API_KEY is set,
 * the server action asks Claude first and falls back to these rules on any failure.
 */
const RULES: Array<[RegExp, (t: string) => string]> = [
  [/^(write|draft|compose|outline)\b/i, (t) => `Open a blank page and type one rough sentence for "${t}". It can be bad.`],
  [/^(read|study|review|revise|learn)\b/i, (t) => `Open it to the right page and read just the first section of "${t}".`],
  [/\b(email|reply|respond|message|text|call|ring|send)\b/i, (t) => `Open a new draft and write only the first line for "${t}".`],
  [/\b(clean|tidy|declutter|organi[sz]e|laundry|dishes|pack)\b/i, () => "Set a 5-minute timer and clear one surface. Stop when it rings."],
  [/\b(plan|prepare|prep|schedule|book)\b/i, (t) => `List the three things you'd need before you could begin "${t}".`],
  [/\b(exercise|workout|run|gym|stretch|yoga|walk)\b/i, () => "Put on your shoes or workout clothes. That is the whole step."],
  [/\b(code|build|fix|debug|implement|ship)\b/i, (t) => `Open the project and write down the single next change needed for "${t}".`],
];

export function ruleFirstStep(title: string): string {
  const t = title.trim().replace(/[.!?]+$/, "");
  for (const [re, make] of RULES) if (re.test(t)) return make(t);
  return `Gather what you need for "${t}", then write down the very next physical action. Five minutes is enough.`;
}
