import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { SetupMetric, SetupBand } from "../lib/game/types";
import { C, F } from "../theme";

/** Qualitative context chips (trend / sector / fundamentals). Tap any chip to
 *  reveal what it means — gives the player something to reason with. */
export function BandsStrip({ bands }: { bands?: SetupBand[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!bands || bands.length === 0) return null;
  const hint = open != null ? bands[open]?.hint : null;
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 11, letterSpacing: 1, color: C.muted2, textTransform: "uppercase", fontFamily: F.body, marginBottom: 8 }}>
        Where things stand
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {bands.map((b, i) => {
          const sel = open === i;
          return (
            <Pressable
              key={`${b.label}-${i}`}
              onPress={() => setOpen(sel ? null : i)}
              style={{ borderRadius: 12, borderWidth: 1, borderColor: sel ? C.accent : C.border, backgroundColor: sel ? "rgba(240,197,96,0.10)" : C.card, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 9, letterSpacing: 0.5, color: C.muted2, textTransform: "uppercase", fontFamily: F.body }}>{b.label}</Text>
              <Text style={{ fontSize: 13, color: C.fg, fontFamily: F.bodySemi, marginTop: 1 }}>{b.value}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 17, color: hint ? C.muted : C.muted2, fontFamily: F.body }}>
        {hint ?? "Tap any chip for what it means — anonymized, point-in-time context."}
      </Text>
    </View>
  );
}

/** The setup metrics grid with tap-to-reveal hints (the hints existed but were
 *  never surfaced). Shared by the Daily and Practice setups. */
export function MetricsGrid({ metrics }: { metrics: SetupMetric[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!metrics || metrics.length === 0) return null;
  const active = open != null ? metrics[open] : null;
  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: C.border }}>
        {metrics.map((m, i) => {
          const sel = open === i;
          return (
            <Pressable
              key={m.label}
              onPress={() => m.hint && setOpen(sel ? null : i)}
              style={{ width: "50%", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i > 1 ? 1 : 0, borderRightWidth: i % 2 === 0 ? 1 : 0, borderColor: C.border, backgroundColor: sel ? "rgba(240,197,96,0.06)" : "transparent" }}
            >
              <Text style={{ fontSize: 11, color: C.muted, fontFamily: F.body }}>{m.label}{m.hint ? "  ⓘ" : ""}</Text>
              <Text style={{ fontSize: 16, color: C.fg, fontFamily: F.mono, fontVariant: ["tabular-nums"] }}>{m.value}</Text>
            </Pressable>
          );
        })}
      </View>
      {active?.hint ? (
        <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ fontSize: 12, lineHeight: 17, color: C.muted, fontFamily: F.body }}>
            <Text style={{ color: C.fg, fontFamily: F.bodySemi }}>{active.label}: </Text>{active.hint}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
