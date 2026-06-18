/** Label daily vs practice vs blind-replay entries in the journal. */
export type JournalEntryKind = "daily" | "practice" | "blind";

export function journalEntryKind(problemId: string): JournalEntryKind {
  if (problemId.startsWith("blind-")) return "blind";
  if (problemId.startsWith("practice")) return "practice";
  return "daily";
}

export function journalEntryKindLabel(kind: JournalEntryKind): string {
  return kind === "blind" ? "blind replay" : kind;
}
