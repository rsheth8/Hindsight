import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { HMark } from "../components/HMark";
import { setPreferredDepth } from "../lib/prefs";
import type { Depth } from "../lib/grade-types";
import { C, F } from "../theme";

type Panel = "welcome" | "experience" | "goal" | "walkthrough";
const ORDER: Panel[] = ["welcome", "experience", "goal", "walkthrough"];

const EXPERIENCE: { label: string; sub: string; depth: Depth }[] = [
  { label: "New to this", sub: "Explain it like I'm starting out", depth: "learn" },
  { label: "I follow a bit", sub: "I know the basics", depth: "analyst" },
  { label: "I know my stuff", sub: "Give me the analyst/quant read", depth: "quant" },
];

const GOALS: { label: string; sub: string }[] = [
  { label: "Learn the ropes", sub: "Build real intuition from scratch" },
  { label: "Sharpen my judgment", sub: "Get measurably better at calls" },
  { label: "Compete & climb", sub: "Streaks, rating, and duels" },
];

const STEPS = [
  { emoji: "📈", title: "One call a day", body: "A fresh, anonymized market setup — a real chart with the ticker stripped. Read it and commit a call with a confidence level." },
  { emoji: "🎯", title: "Graded on your thinking", body: "Your score weighs calibration and reasoning far more than being right. Confident-and-wrong bleeds rating; right-by-luck barely moves it." },
  { emoji: "📊", title: "A rating that compounds", body: "Like chess, your number only climbs through sustained good judgment. Track your streak, spot your leaks, get sharper." },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [depth, setDepth] = useState<Depth>("learn");
  const [goal, setGoal] = useState<string | null>(null);
  const panel = ORDER[idx]!;

  function go(n: number) {
    Haptics.selectionAsync();
    setIdx((i) => Math.max(0, Math.min(ORDER.length - 1, i + n)));
  }
  function finish() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPreferredDepth(depth);
    onDone();
  }
  function pickExperience(d: Depth) {
    Haptics.selectionAsync();
    setDepth(d);
    setIdx((i) => i + 1);
  }
  function pickGoal(g: string) {
    Haptics.selectionAsync();
    setGoal(g);
    setIdx((i) => i + 1);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* top bar: back + progress + skip */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 64 }}>
        <View style={{ width: 52 }}>
          {idx > 0 && (
            <Pressable onPress={() => go(-1)} hitSlop={10}>
              <Text style={{ fontSize: 22, color: C.muted }}>‹</Text>
            </Pressable>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {ORDER.map((_, i) => (
            <View key={i} style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === idx ? C.accent : C.card2 }} />
          ))}
        </View>
        <View style={{ width: 52, alignItems: "flex-end" }}>
          {panel !== "walkthrough" && (
            <Pressable onPress={() => { setPreferredDepth(depth); onDone(); }} hitSlop={10}>
              <Text style={{ fontSize: 14, color: C.muted2, fontFamily: F.body }}>Skip</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40, justifyContent: "center" }}>
        {panel === "welcome" && (
          <View style={{ alignItems: "center" }}>
            <HMark size={88} />
            <Text style={{ marginTop: 18, fontSize: 34, fontFamily: F.display, letterSpacing: -0.8 }}>
              <Text style={{ color: C.fg }}>hind</Text><Text style={{ color: C.accent }}>sight</Text>
            </Text>
            <Text style={{ marginTop: 14, fontSize: 18, color: C.fg, textAlign: "center", fontFamily: F.bodySemi, lineHeight: 25 }}>
              Daily reps for investing judgment.
            </Text>
            <Text style={{ marginTop: 10, fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 21, maxWidth: 320, fontFamily: F.body }}>
              Read a real market setup, make your call, and find out if you were right — graded on how you think, not luck.
            </Text>
          </View>
        )}

        {panel === "experience" && (
          <Question
            kicker="Quick setup · 1 of 2"
            title="How well do you know markets?"
            sub="This sets how we explain each reveal — change it anytime."
            options={EXPERIENCE.map((e) => ({ label: e.label, sub: e.sub, selected: depth === e.depth, onPress: () => pickExperience(e.depth) }))}
          />
        )}

        {panel === "goal" && (
          <Question
            kicker="Quick setup · 2 of 2"
            title="What brings you here?"
            sub="No wrong answer — it just helps us cheer you on."
            options={GOALS.map((g) => ({ label: g.label, sub: g.sub, selected: goal === g.label, onPress: () => pickGoal(g.label) }))}
          />
        )}

        {panel === "walkthrough" && (
          <View>
            <Text style={{ fontSize: 13, letterSpacing: 1, color: C.accent, textTransform: "uppercase", fontFamily: F.bodySemi }}>How it works</Text>
            <Text style={{ marginTop: 6, fontSize: 26, color: C.fg, fontFamily: F.display, letterSpacing: -0.6 }}>The daily loop</Text>
            <View style={{ marginTop: 20, gap: 12 }}>
              {STEPS.map((s, i) => (
                <View key={s.title} style={{ flexDirection: "row", gap: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}>
                  <Text style={{ fontSize: 26 }}>{s.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: C.fg, fontFamily: F.bodySemi }}>{i + 1}. {s.title}</Text>
                    <Text style={{ marginTop: 3, fontSize: 13, lineHeight: 19, color: C.muted, fontFamily: F.body }}>{s.body}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: C.accent, backgroundColor: "rgba(240,197,96,0.07)", paddingHorizontal: 16, paddingVertical: 14 }}>
              <Text style={{ fontSize: 13, lineHeight: 20, color: C.fg, fontFamily: F.body }}>
                Reveals will be explained at the <Text style={{ color: C.accent, fontFamily: F.bodySemi }}>{depth}</Text> level
                {goal ? <Text> · here to <Text style={{ color: C.fg, fontFamily: F.bodySemi }}>{goal.toLowerCase()}</Text></Text> : null}.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* bottom CTA */}
      <View style={{ paddingHorizontal: 28, paddingBottom: 40 }}>
        {panel === "welcome" && (
          <Pressable onPress={() => go(1)} style={{ borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent }}>
            <Text style={{ fontSize: 16, color: C.accentInk, fontFamily: F.bodySemi }}>Get started</Text>
          </Pressable>
        )}
        {panel === "walkthrough" && (
          <Pressable onPress={finish} style={{ borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: C.accent }}>
            <Text style={{ fontSize: 16, color: C.accentInk, fontFamily: F.bodySemi }}>Play today&apos;s problem</Text>
          </Pressable>
        )}
        <Text style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: C.muted2, lineHeight: 16, fontFamily: F.body }}>
          Educational only — never buy/sell advice.
        </Text>
      </View>
    </View>
  );
}

function Question({ kicker, title, sub, options }: {
  kicker: string; title: string; sub: string;
  options: { label: string; sub: string; selected: boolean; onPress: () => void }[];
}) {
  return (
    <View>
      <Text style={{ fontSize: 12, letterSpacing: 1, color: C.muted2, textTransform: "uppercase", fontFamily: F.body }}>{kicker}</Text>
      <Text style={{ marginTop: 8, fontSize: 26, color: C.fg, fontFamily: F.display, letterSpacing: -0.6, lineHeight: 31 }}>{title}</Text>
      <Text style={{ marginTop: 8, fontSize: 14, color: C.muted, lineHeight: 20, fontFamily: F.body }}>{sub}</Text>
      <View style={{ marginTop: 20, gap: 10 }}>
        {options.map((o) => (
          <Pressable key={o.label} onPress={o.onPress}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 16, borderColor: o.selected ? C.accent : C.border, backgroundColor: o.selected ? "rgba(240,197,96,0.10)" : C.card }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: C.fg, fontFamily: F.bodySemi }}>{o.label}</Text>
              <Text style={{ marginTop: 2, fontSize: 13, color: C.muted, fontFamily: F.body }}>{o.sub}</Text>
            </View>
            <Text style={{ fontSize: 18, color: o.selected ? C.accent : C.muted2 }}>{o.selected ? "●" : "›"}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
