import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Polyline, Text as SvgText } from "react-native-svg";
import { useProfile } from "../lib/profile";
import { summarize } from "../lib/game/calibration";
import { isProvisional, START_RATING } from "../lib/game/rating";
import { skillTrend, insights, type Insight } from "../lib/game/progress";
import { scheduleDailyReminder, cancelDailyReminder } from "../lib/notifications";
import { C } from "../theme";

const REMINDER_HOURS = [8, 12, 18, 21];

export function YouScreen() {
  const { profile: p, updateSettings } = useProfile();
  const { width } = useWindowDimensions();
  const calib = summarize(p.history.map((h) => ({ confidence: h.confidence, correct: h.correct })));
  const prov = isProvisional(p.gradedCount);
  const ready = calib.readiness;
  const ringPct = ready.score;
  const trend = skillTrend(p.history);
  const tips = insights(p.history);
  const trackW = Math.min(width, 440) - 40 - 40; // screen − page pad − card pad
  const [reminderBlocked, setReminderBlocked] = useState(false);

  useEffect(() => {
    if (p.reminderEnabled) {
      scheduleDailyReminder(p.reminderHour ?? 18, p.reminderMinute ?? 0)
        .then((s) => setReminderBlocked(s === "denied"))
        .catch(() => setReminderBlocked(true));
    } else {
      cancelDailyReminder()
        .catch(() => {})
        .finally(() => setReminderBlocked(false));
    }
  }, [p.reminderEnabled, p.reminderHour, p.reminderMinute]);

  async function toggleReminder(v: boolean) {
    if (v) {
      const status = await scheduleDailyReminder(p.reminderHour ?? 18, p.reminderMinute ?? 0);
      if (status === "denied") {
        setReminderBlocked(true);
        await updateSettings({ reminderEnabled: false });
        return;
      }
      setReminderBlocked(false);
    } else {
      await cancelDailyReminder();
      setReminderBlocked(false);
    }
    await updateSettings({ reminderEnabled: v });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: C.fg }}>You</Text>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 24, alignItems: "center", marginTop: 16 }}>
        <Text style={{ fontSize: 11, letterSpacing: 2, color: C.muted2, textTransform: "uppercase" }}>Investing rating</Text>
        <Text style={{ fontSize: 64, fontWeight: "800", color: C.accent, fontVariant: ["tabular-nums"], marginTop: 4 }}>
          {p.rating}{prov ? <Text style={{ fontSize: 30, color: C.muted2 }}>?</Text> : null}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 12, color: C.muted }}>
          {prov ? `Provisional — ${p.gradedCount}/10 graded calls` : `${p.rating - START_RATING >= 0 ? "+" : ""}${p.rating - START_RATING} since you started`}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        <Stat half label="🔥 Streak" value={String(p.streak)} />
        <Stat half label="🧊 Freezes" value={String(p.streakFreezes ?? 1)} />
        <Stat half label="Best streak" value={String(p.longestStreak)} />
        <Stat half label="Calls" value={String(p.gradedCount)} />
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, paddingVertical: 20, marginTop: 16 }}>
        <Ring pct={ringPct} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.fg }}>{ready.label}</Text>
          <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: C.muted }}>{ready.blurb}</Text>
        </View>
      </View>

      {calib.brier !== null && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          <Stat half label="Accuracy" value={`${Math.round((calib.accuracy ?? 0) * 100)}%`} />
          <Stat half label="Brier (lower better)" value={(calib.brier ?? 0).toFixed(3)} />
          <Stat half label={calib.overconfidence! >= 0 ? "Overconfidence" : "Underconfidence"} value={`${Math.abs(Math.round((calib.overconfidence ?? 0) * 100))}%`} tone={Math.abs(calib.overconfidence ?? 0) > 0.12 ? "warn" : undefined} />
          <Stat half label="Resolved" value={String(calib.resolved)} />
        </View>
      )}

      {/* are you actually getting better? */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 18, marginTop: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: C.fg }}>Your trajectory</Text>
        {trend.enough ? (
          <>
            <TrendLine series={trend.ratingSeries} width={trackW} />
            <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 19, color: C.muted }}>{trend.headline}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Delta label="Calibration" now={trend.calibNow} prev={trend.calibPrev} />
              <Delta label="Reasoning" now={trend.reasoningNow} prev={trend.reasoningPrev} />
            </View>
          </>
        ) : (
          <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 19, color: C.muted }}>{trend.headline}</Text>
        )}
      </View>

      {/* personalized edge & leak — the "it knows me" moment */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: C.fg, marginBottom: 8 }}>Your edge &amp; your leaks</Text>
        <View style={{ gap: 8 }}>
          {tips.map((t, i) => <InsightCard key={i} tip={t} />)}
        </View>
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.fg }}>🔔 Daily reminder</Text>
            <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: C.muted }}>A gentle nudge at your play time — streak freezes still protect you if you miss a day.</Text>
          </View>
          <Switch
            value={p.reminderEnabled ?? false}
            onValueChange={(v) => { toggleReminder(v).catch(() => {}); }}
            trackColor={{ false: C.card2, true: C.accent }}
          />
        </View>
        {reminderBlocked && (
          <Text style={{ marginTop: 10, fontSize: 12, color: C.warn }}>
            Notifications are off in iOS Settings — enable them to get daily reminders.
          </Text>
        )}
        {p.reminderEnabled && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {REMINDER_HOURS.map((h) => {
              const sel = (p.reminderHour ?? 18) === h;
              return (
                <Pressable key={h} onPress={() => updateSettings({ reminderHour: h, reminderMinute: 0 })}
                  style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(94,242,176,0.12)" : C.card2 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: sel ? C.accent : C.fg }}>{h === 12 ? "12 pm" : h < 12 ? `${h} am` : `${h - 12} pm`}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16, marginTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.fg }}>🎓 Real-money bridge</Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: ringPct >= 75 ? C.accent : C.muted2 }}>{ringPct >= 75 ? "Unlocked" : "Locked"}</Text>
        </View>
        <View style={{ marginTop: 8, height: 8, borderRadius: 999, backgroundColor: C.card2, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${Math.min(100, (ringPct / 75) * 100)}%`, backgroundColor: C.accent, borderRadius: 999 }} />
        </View>
        <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: C.muted }}>
          Reach a 75 calibration score to unlock read-only coaching on your real trades. We don&apos;t take your trades — we make you good enough to deserve them.
        </Text>
      </View>

      <Text style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: C.muted2 }}>Educational only · never buy/sell advice · your data stays on this device for now.</Text>
    </ScrollView>
  );
}

function Stat({ label, value, tone, half }: { label: string; value: string; tone?: "warn"; half?: boolean }) {
  return (
    <View style={{ flex: half ? undefined : 1, width: half ? "48%" : undefined, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, alignItems: "center" }}>
      <Text style={{ fontSize: 10, letterSpacing: 0.5, color: C.muted2, textTransform: "uppercase", textAlign: "center" }}>{label}</Text>
      <Text style={{ marginTop: 2, fontSize: 18, fontWeight: "700", color: tone === "warn" ? C.warn : C.fg, fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  );
}

function Ring({ pct }: { pct: number }) {
  const R = 30;
  const CIRC = 2 * Math.PI * R;
  const off = CIRC * (1 - pct / 100);
  const color = pct >= 75 ? C.accent : pct >= 25 ? C.warn : C.bad;
  return (
    <Svg width={78} height={78}>
      <Circle cx={39} cy={39} r={R} fill="none" stroke={C.card2} strokeWidth={8} />
      <Circle cx={39} cy={39} r={R} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={off} transform="rotate(-90 39 39)" />
      <SvgText x={39} y={45} textAnchor="middle" fontSize={20} fontWeight="800" fill={C.fg}>{pct}</SvgText>
    </Svg>
  );
}

function TrendLine({ series, width }: { series: number[]; width: number }) {
  const H = 56;
  const min = Math.min(...series), max = Math.max(...series);
  const span = max - min || 1;
  const x = (i: number) => (series.length === 1 ? width / 2 : (i / (series.length - 1)) * width);
  const y = (v: number) => 6 + (1 - (v - min) / span) * (H - 12);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const rising = series[series.length - 1] >= series[0];
  return (
    <View style={{ marginTop: 12 }}>
      <Svg width={width} height={H}>
        <Polyline points={pts} fill="none" stroke={rising ? C.accent : C.bad} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 10, color: C.muted2 }}>first call</Text>
        <Text style={{ fontSize: 10, color: C.muted2 }}>now</Text>
      </View>
    </View>
  );
}

function Delta({ label, now, prev }: { label: string; now: number; prev: number }) {
  const d = now - prev;
  const up = d >= 0;
  return (
    <View style={{ flex: 1, backgroundColor: C.card2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text style={{ fontSize: 10, letterSpacing: 0.5, color: C.muted2, textTransform: "uppercase" }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: C.fg, fontVariant: ["tabular-nums"] }}>{now}</Text>
        <Text style={{ fontSize: 12, fontWeight: "700", color: d === 0 ? C.muted2 : up ? C.accent : C.bad, fontVariant: ["tabular-nums"] }}>{up ? "▲" : "▼"} {Math.abs(d)}</Text>
      </View>
    </View>
  );
}

function InsightCard({ tip }: { tip: Insight }) {
  const accent = tip.kind === "edge" ? C.accent : tip.kind === "leak" ? C.warn : C.muted2;
  return (
    <View style={{ flexDirection: "row", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: accent, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
      <Text style={{ fontSize: 18 }}>{tip.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: C.fg }}>{tip.title}</Text>
        <Text style={{ fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 2 }}>{tip.text}</Text>
      </View>
    </View>
  );
}
