import { describe, expect, it } from "vitest";
import { journalEntryKind, journalEntryKindLabel } from "./journal-entry-kind";

describe("journal-entry-kind", () => {
  it("classifies blind and practice prefixes", () => {
    expect(journalEntryKind("blind-seed-1")).toBe("blind");
    expect(journalEntryKind("practice-seed-0")).toBe("practice");
    expect(journalEntryKind("bank-2026-06-17-TEST")).toBe("daily");
  });

  it("labels blind replay distinctly", () => {
    expect(journalEntryKindLabel("blind")).toBe("blind replay");
    expect(journalEntryKindLabel("practice")).toBe("practice");
    expect(journalEntryKindLabel("futures")).toBe("futures & leverage");
  });

  it("classifies special drill prefixes", () => {
    expect(journalEntryKind("flaw-abc")).toBe("flaw");
    expect(journalEntryKind("options-abc")).toBe("options");
    expect(journalEntryKind("futures-abc")).toBe("futures");
    expect(journalEntryKind("calbet-abc")).toBe("calbet");
  });
});
