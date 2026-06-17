import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { C } from "../theme";

const SLIDES = [
  {
    emoji: "📈",
    title: "One call a day",
    body: "Every day you get a fresh anonymized market setup — a real chart, stripped of the ticker. Read it, make your call, come back tomorrow.",
  },
  {
    emoji: "🎯",
    title: "We grade your thinking, not luck",
    body: "Your score weighs calibration and reasoning far more than being right. Confident-and-wrong bleeds rating. Right-for-the-wrong-reasons barely moves it.",
  },
  {
    emoji: "📊",
    title: "A rating that compounds",
    body: "Like chess.com, your number only climbs through sustained good judgment. Track your streak, spot your leaks, and get measurably sharper over time.",
  },
] as const;

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;

  function next() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (last) onDone();
    else setStep((s) => s + 1);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingHorizontal: 28, paddingTop: 72, paddingBottom: 40 }}>
      <Pressable onPress={onDone} style={{ alignSelf: "flex-end" }}>
        <Text style={{ fontSize: 14, color: C.muted }}>Skip</Text>
      </Pressable>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 56 }}>{slide.emoji}</Text>
        <Text style={{ marginTop: 24, fontSize: 28, fontWeight: "800", color: C.fg, textAlign: "center" }}>{slide.title}</Text>
        <Text style={{ marginTop: 14, fontSize: 15, lineHeight: 23, color: C.muted, textAlign: "center", maxWidth: 320 }}>{slide.body}</Text>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 28 }}>
        {SLIDES.map((_, i) => (
          <View key={i} style={{ width: i === step ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? C.accent : C.card2 }} />
        ))}
      </View>

      <Pressable onPress={next} style={{ borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent }}>
        <Text style={{ fontWeight: "700", fontSize: 16, color: C.accentInk }}>{last ? "Play today's problem" : "Next"}</Text>
      </Pressable>

      <Text style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: C.muted2, lineHeight: 16 }}>
        Educational only — never buy/sell advice.
      </Text>
    </View>
  );
}
