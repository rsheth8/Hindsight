import React from "react";
import { ScrollView, Text, View } from "react-native";
import { C, F } from "../theme";

/** Roadmap stubs for Practice and Rank — honest "coming soon" rows. */
export function SoonScreen({ title, blurb, hero, modes }: { title: string; blurb: string; hero?: { emoji: string; text: string }; modes: string[] }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, color: C.fg, fontFamily: F.display, letterSpacing: -0.5 }}>{title}</Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: C.muted }}>{blurb}</Text>

      {hero && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 40, alignItems: "center", marginTop: 24 }}>
          <Text style={{ fontSize: 30 }}>{hero.emoji}</Text>
          <Text style={{ marginTop: 12, fontSize: 14, color: C.muted, textAlign: "center" }}>{hero.text}</Text>
        </View>
      )}

      <View style={{ gap: 12, marginTop: 16 }}>
        {modes.map((m) => (
          <View key={m} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", opacity: 0.85 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: C.fg, flex: 1, paddingRight: 12 }}>{m}</Text>
            <View style={{ borderRadius: 999, backgroundColor: C.card2, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 10, color: C.muted2 }}>soon</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function RankScreen() {
  return (
    <SoonScreen
      title="Rank"
      blurb="Leagues, leaderboard, and the skill tree — competition on judgment, never on returns."
      hero={{ emoji: "🏆", text: "Leagues open once enough players are climbing. Keep building your rating in the meantime." }}
      modes={["Weekly leagues with promotion/relegation", "Global calibration leaderboard", "Skill tree — unlock new concepts at your level", "Best-calibrated week — personal bests"]}
    />
  );
}
