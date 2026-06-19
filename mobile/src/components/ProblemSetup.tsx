import React from "react";
import { Text, View } from "react-native";
import { SparkChart } from "./SparkChart";
import { BandsStrip, MetricsGrid } from "./SetupContext";
import type { DailyProblem } from "../lib/game/types";
import { C, F } from "../theme";

export function ProblemSetup({ problem, chartW }: { problem: DailyProblem; chartW: number }) {
  if (problem.type === "spot-the-flaw" && problem.flawSetup) {
    const f = problem.flawSetup;
    return (
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: "hidden", marginTop: 16 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{ fontSize: 11, color: C.muted2, fontFamily: F.body }}>Someone&apos;s thesis</Text>
          <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 22, fontStyle: "italic", color: C.fg, fontFamily: F.body }}>&ldquo;{f.thesis}&rdquo;</Text>
          <Text style={{ marginTop: 8, fontSize: 12, color: C.muted, fontFamily: F.body }}>{f.chartCaption}</Text>
        </View>
        <View style={{ paddingHorizontal: 4, paddingTop: 8, paddingBottom: 8, alignItems: "center" }}>
          <SparkChart series={problem.series} width={chartW} />
        </View>
      </View>
    );
  }

  if (problem.type === "options-greeks" && problem.optionsSetup) {
    const o = problem.optionsSetup;
    return (
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: "hidden", marginTop: 16 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{ fontSize: 11, color: C.muted2, fontFamily: F.body }}>Position</Text>
          <Text style={{ fontSize: 20, color: C.fg, fontFamily: F.display, letterSpacing: -0.4 }}>{o.positionLabel}</Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: C.muted, fontFamily: F.body }}>
            ${o.underlying} underlying · ${o.strike} strike · {o.dte} DTE · IV {o.iv}%
          </Text>
        </View>
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border }}>
          {(
            [
              ["Δ", o.greeks.delta.toFixed(2)],
              ["Γ", o.greeks.gamma.toFixed(2)],
              ["Θ", o.greeks.theta.toFixed(2)],
              ["ν", o.greeks.vega.toFixed(2)],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={{ flex: 1, paddingVertical: 12, alignItems: "center", borderRightWidth: label !== "ν" ? 1 : 0, borderRightColor: C.border }}>
              <Text style={{ fontSize: 11, color: C.muted, fontFamily: F.body }}>{label}</Text>
              <Text style={{ fontSize: 16, color: C.fg, fontFamily: F.mono, fontVariant: ["tabular-nums"] }}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (problem.type === "futures-basics" && problem.futuresSetup) {
    const f = problem.futuresSetup;
    return (
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: "hidden", marginTop: 16 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{ fontSize: 11, color: C.muted2, fontFamily: F.body }}>Instrument</Text>
          <Text style={{ fontSize: 18, color: C.fg, fontFamily: F.display, letterSpacing: -0.4 }}>{f.instrument}</Text>
          <Text style={{ marginTop: 8, fontSize: 15, color: C.fg, fontFamily: F.bodySemi }}>{f.positionLabel}</Text>
          <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 19, color: C.muted, fontFamily: F.body }}>{f.context}</Text>
        </View>
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: C.border }}>
          <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRightWidth: 1, borderRightColor: C.border }}>
            <Text style={{ fontSize: 11, color: C.muted, fontFamily: F.body }}>Notional</Text>
            <Text style={{ fontSize: 14, color: C.fg, fontFamily: F.mono, fontVariant: ["tabular-nums"] }}>{f.notional}</Text>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ fontSize: 11, color: C.muted, fontFamily: F.body }}>Mode</Text>
            <Text style={{ fontSize: 14, color: C.fg, fontFamily: F.bodySemi }}>Futures drill</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: "hidden", marginTop: 16 }}>
        <View style={{ paddingHorizontal: 4, paddingTop: 12, alignItems: "center" }}>
          <SparkChart series={problem.series} width={chartW} />
        </View>
        <MetricsGrid metrics={problem.metrics} />
        {problem.type === "calibration-bet" && problem.baseRateHint && (
          <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ fontSize: 13, color: C.muted, fontFamily: F.body }}>
              <Text style={{ color: C.fg, fontFamily: F.bodySemi }}>Base rate: </Text>
              {problem.baseRateHint}
            </Text>
          </View>
        )}
      </View>
      <BandsStrip bands={problem.bands} />
    </>
  );
}
