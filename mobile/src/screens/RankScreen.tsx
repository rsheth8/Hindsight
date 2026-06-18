import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useProfile } from "../lib/profile";
import { conceptMastery } from "../lib/game/concepts";
import { personalBests, tierFromRating } from "../lib/game/stats";
import { C } from "../theme";

export function RankScreen({ onDuel }: { onDuel?: () => void }) {
  const { profile: p } = useProfile();
  const bests = personalBests(p.history, p.longestStreak);
  const tier = tierFromRating(p.rating);
  const tree = conceptMastery(p.history);
  const progress = Math.min(100, Math.max(0, Math.round(((p.rating - 1000) / (tier.next - 1000)) * 100)));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: C.fg }}>Rank</Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: C.muted }}>Your tier, personal bests, and skill tree — judgment, never returns.</Text>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 24, alignItems: "center", marginTop: 20 }}>
        <Text style={{ fontSize: 40 }}>{tier.emoji}</Text>
        <Text style={{ marginTop: 8, fontSize: 20, fontWeight: "800", color: C.fg }}>{tier.name}</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: C.muted, fontVariant: ["tabular-nums"] }}>Rating {p.rating} · next tier at {tier.next}</Text>
        <View style={{ marginTop: 12, height: 8, width: "100%", borderRadius: 999, backgroundColor: C.card2, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${Math.max(4, progress)}%`, backgroundColor: C.accent, borderRadius: 999 }} />
        </View>
      </View>

      <Pressable
        onPress={() => { Haptics.selectionAsync(); onDuel?.(); }}
        style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: C.accent, backgroundColor: "rgba(94,242,176,0.06)", paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: C.fg }}>⚔️  Duel someone</Text>
          <Text style={{ marginTop: 3, fontSize: 12, color: C.muted }}>Head-to-head on the same setup. Sharper read wins.</Text>
        </View>
        <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
          <Text style={{ fontSize: 10, color: C.muted2, textTransform: "uppercase", letterSpacing: 0.5 }}>Duel</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: C.accent, fontVariant: ["tabular-nums"] }}>{p.duelRating ?? 1000}</Text>
          <Text style={{ fontSize: 10, color: C.muted2 }}>{p.duelWins ?? 0}W · {p.duelLosses ?? 0}L</Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        <Best label="This week cal." value={bests.thisWeekCalibration !== null ? String(bests.thisWeekCalibration) : "—"} sub={`${bests.thisWeekCalls} daily`} />
        <Best label="Best week cal." value={bests.bestWeekCalibration !== null ? String(bests.bestWeekCalibration) : "—"} />
        <Best label="Longest streak" value={String(bests.longestStreak)} />
        <Best label="Earned wins" value={String(bests.earnedWins)} />
        <Best label="Best day" value={`+${bests.bestRatingDelta}`} />
        <Best label="Streak freezes" value={String(p.streakFreezes ?? 1)} sub="per week" />
      </View>

      <Text style={{ marginTop: 24, fontSize: 14, fontWeight: "700", color: C.fg }}>Skill tree</Text>
      <Text style={{ marginTop: 4, fontSize: 12, color: C.muted }}>Concept mastery from your journal.</Text>
      <View style={{ gap: 10, marginTop: 12 }}>
        {tree.map((c) => (
          <View key={c.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 20 }}>{c.icon}</Text>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.fg }}>{c.label}</Text>
                  <Text style={{ fontSize: 11, color: C.muted2 }}>{c.calls} calls · {c.level}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: c.level === "sharp" ? C.accent : C.fg, fontVariant: ["tabular-nums"] }}>{c.calls > 0 ? c.score : "—"}</Text>
            </View>
            {c.calls > 0 && (
              <View style={{ marginTop: 8, height: 6, borderRadius: 999, backgroundColor: C.card2, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${c.score}%`, backgroundColor: C.accent, opacity: c.level === "learning" ? 0.5 : 1, borderRadius: 999 }} />
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 20, alignItems: "center", marginTop: 20 }}>
        <Text style={{ fontSize: 28 }}>🏆</Text>
        <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 19, color: C.muted, textAlign: "center" }}>
          Global leagues unlock once enough players are climbing. Your local tree is already tracking real skill.
        </Text>
      </View>
    </ScrollView>
  );
}

function Best({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ width: "48%", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 12, alignItems: "center" }}>
      <Text style={{ fontSize: 10, letterSpacing: 0.5, color: C.muted2, textTransform: "uppercase", textAlign: "center" }}>{label}</Text>
      <Text style={{ marginTop: 2, fontSize: 20, fontWeight: "700", color: C.fg, fontVariant: ["tabular-nums"] }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 10, color: C.muted2 }}>{sub}</Text> : null}
    </View>
  );
}
