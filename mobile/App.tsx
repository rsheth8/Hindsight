import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { useFonts, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileProvider } from "./src/lib/profile";
import { TabBar, type TabKey } from "./src/components/TabBar";
import { DailyScreen } from "./src/screens/DailyScreen";
import { YouScreen } from "./src/screens/YouScreen";
import { JournalScreen } from "./src/screens/JournalScreen";
import { PracticeScreen } from "./src/screens/PracticeScreen";
import { BlindReplayScreen } from "./src/screens/BlindReplayScreen";
import { LearnScreen } from "./src/screens/LearnScreen";
import { RankScreen } from "./src/screens/RankScreen";
import { DuelScreen } from "./src/screens/DuelScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { C } from "./src/theme";

const ONBOARD_KEY = "hindsight.onboarded.v1";

function Shell() {
  const [tab, setTab] = useState<TabKey>("daily");
  const [blindReplay, setBlindReplay] = useState(false);
  const [learn, setLearn] = useState(false);
  const [duel, setDuel] = useState(false);
  const [duelJoinCode, setDuelJoinCode] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    function openDuelLink(url: string) {
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.duel;
      if (typeof code === "string" && code.trim()) {
        setTab("rank");
        setDuel(true);
        setDuelJoinCode(code.trim().toUpperCase());
      }
    }
    Linking.getInitialURL().then((url) => { if (url) openDuelLink(url); });
    const sub = Linking.addEventListener("url", ({ url }) => openDuelLink(url));
    return () => sub.remove();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View style={{ flex: 1 }}>
          {tab === "daily" && <DailyScreen onNavigate={(dest) => {
            if (dest === "learn") { setTab("practice"); setBlindReplay(false); setLearn(true); }
            else if (dest === "practice") { setTab("practice"); setBlindReplay(false); setLearn(false); }
            else if (dest === "duel") { setTab("rank"); setDuel(true); }
            else if (dest === "rank") { setTab("rank"); setDuel(false); }
            else if (dest === "journal") { setTab("journal"); }
          }} />}
          {tab === "practice" && !blindReplay && !learn && <PracticeScreen onBlindReplay={() => setBlindReplay(true)} onLearn={() => setLearn(true)} />}
          {tab === "practice" && blindReplay && <BlindReplayScreen onExit={() => setBlindReplay(false)} />}
          {tab === "practice" && learn && <LearnScreen onExit={() => setLearn(false)} />}
          {tab === "rank" && !duel && <RankScreen onDuel={() => setDuel(true)} />}
          {tab === "rank" && duel && <DuelScreen initialJoinCode={duelJoinCode} onExit={() => { setDuel(false); setDuelJoinCode(null); }} />}
          {tab === "journal" && <JournalScreen />}
          {tab === "you" && <YouScreen />}
        </View>
      </SafeAreaView>
      <TabBar active={tab} onChange={(t) => { setTab(t); if (t !== "practice") { setBlindReplay(false); setLearn(false); } if (t !== "rank") setDuel(false); }} bottomInset={insets.bottom} />
    </View>
  );
}

function Root() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    AsyncStorage.getItem(ONBOARD_KEY).then((v) => setOnboarded(v === "1"));
  }, []);

  async function finishOnboarding() {
    await AsyncStorage.setItem(ONBOARD_KEY, "1");
    setOnboarded(true);
  }

  if (onboarded === null || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!onboarded) return <OnboardingScreen onDone={finishOnboarding} />;
  return <Shell />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <StatusBar style="light" />
        <Root />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
