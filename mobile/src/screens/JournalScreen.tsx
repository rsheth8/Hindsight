import React from "react";
import { ScrollView, Text, View } from "react-native";
import { journalEntryKind, journalEntryKindLabel } from "../lib/game/journal-entry-kind";
import { useProfile } from "../lib/profile";
import { C } from "../theme";

export function JournalScreen() {
  const { profile: p } = useProfile();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: C.fg }}>Journal</Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: C.muted }}>Every call you&apos;ve logged — your thesis, your confidence, and what actually happened.</Text>

      {p.history.length === 0 ? (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 40, alignItems: "center", marginTop: 24 }}>
          <Text style={{ fontSize: 30 }}>📓</Text>
          <Text style={{ marginTop: 12, fontSize: 14, color: C.muted, textAlign: "center" }}>No calls yet. Play today&apos;s problem to start your track record.</Text>
        </View>
      ) : (
        <View style={{ gap: 12, marginTop: 16 }}>
          {p.history.map((h) => (
            <View key={h.problemId} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.fg }}>{h.company}</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: h.ratingDelta >= 0 ? C.accent : C.bad, fontVariant: ["tabular-nums"] }}>{h.ratingDelta >= 0 ? "+" : ""}{h.ratingDelta}</Text>
              </View>
              <Text style={{ marginTop: 4, fontSize: 12, color: C.muted }}>
                {h.date}
                {journalEntryKind(h.problemId) !== "daily" ? ` · ${journalEntryKindLabel(journalEntryKind(h.problemId))}` : ""}
                {" · "}{h.choiceLabel} · {Math.round(h.confidence * 100)}% sure · <Text style={{ color: h.correct ? C.up : C.down }}>{h.correct ? "correct" : "missed"} ({h.forwardReturnPct >= 0 ? "+" : ""}{h.forwardReturnPct}%)</Text>
              </Text>
              {!!h.reasoning && <Text style={{ marginTop: 8, fontSize: 13, fontStyle: "italic", color: C.fg }}>“{h.reasoning}”</Text>}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <Tag text={`reasoning ${Math.round(h.reasoningScore * 100)}`} />
                <Tag text={`brier ${h.brier.toFixed(2)}`} />
                {h.earned && <Tag text="earned ✓" accent />}
              </View>
            </View>
          ))}
        </View>
      )}
      <Text style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: C.muted2 }}>
        Educational only · never buy/sell advice · your data stays on this device for now.
      </Text>
    </ScrollView>
  );
}

function Tag({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <View style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: accent ? "rgba(94,242,176,0.12)" : C.card2 }}>
      <Text style={{ fontSize: 11, color: accent ? C.accent : C.muted2 }}>{text}</Text>
    </View>
  );
}
