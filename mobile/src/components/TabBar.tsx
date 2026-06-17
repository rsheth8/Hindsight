import React from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { C } from "../theme";

export type TabKey = "daily" | "practice" | "rank" | "journal" | "you";

const TABS: { key: TabKey; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "practice", label: "Practice" },
  { key: "rank", label: "Rank" },
  { key: "journal", label: "Journal" },
  { key: "you", label: "You" },
];

export function TabBar({ active, onChange, bottomInset }: { active: TabKey; onChange: (k: TabKey) => void; bottomInset: number }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: C.bgElev, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, paddingBottom: Math.max(bottomInset, 8) }}>
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <Pressable key={t.key} onPress={() => { Haptics.selectionAsync(); onChange(t.key); }} style={{ flex: 1, alignItems: "center", gap: 3 }}>
            <Icon name={t.key} color={on ? C.accent : C.muted2} />
            <Text style={{ fontSize: 10, color: on ? C.accent : C.muted2, fontWeight: on ? "600" : "400" }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Icon({ name, color }: { name: TabKey; color: string }) {
  const sw = 1.8;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {name === "daily" && (<>
        <Rect x={3} y={4} width={18} height={18} rx={3} />
        <Line x1={3} y1={9} x2={21} y2={9} />
        <Line x1={8} y1={2} x2={8} y2={6} />
        <Line x1={16} y1={2} x2={16} y2={6} />
      </>)}
      {name === "practice" && (<Path d="M13 2 L4 14 L11 14 L11 22 L20 10 L13 10 Z" />)}
      {name === "rank" && (<>
        <Line x1={6} y1={20} x2={6} y2={12} />
        <Line x1={12} y1={20} x2={12} y2={5} />
        <Line x1={18} y1={20} x2={18} y2={9} />
      </>)}
      {name === "journal" && (<>
        <Path d="M5 4 a2 2 0 0 1 2-2 h11 v20 h-11 a2 2 0 0 1 -2-2 Z" />
        <Line x1={9} y1={7} x2={15} y2={7} />
        <Line x1={9} y1={11} x2={15} y2={11} />
      </>)}
      {name === "you" && (<>
        <Circle cx={12} cy={8} r={4} />
        <Path d="M5 21 a7 7 0 0 1 14 0" />
      </>)}
    </Svg>
  );
}
