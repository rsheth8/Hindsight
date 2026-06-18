/** Label daily vs practice vs blind-replay entries in the journal. */
export type JournalEntryKind = "daily" | "practice" | "blind" | "flaw" | "options" | "futures" | "calbet";

export function journalEntryKind(problemId: string): JournalEntryKind {
  if (problemId.startsWith("blind-")) return "blind";
  if (problemId.startsWith("flaw-")) return "flaw";
  if (problemId.startsWith("options-")) return "options";
  if (problemId.startsWith("futures-")) return "futures";
  if (problemId.startsWith("calbet-")) return "calbet";
  if (problemId.startsWith("practice")) return "practice";
  return "daily";
}

export function journalEntryKindLabel(kind: JournalEntryKind): string {
  if (kind === "blind") return "blind replay";
  if (kind === "flaw") return "spot the flaw";
  if (kind === "options") return "options & greeks";
  if (kind === "futures") return "futures & leverage";
  if (kind === "calbet") return "calibration bet";
  return kind;
}
