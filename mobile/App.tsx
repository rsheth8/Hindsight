import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileProvider } from "./src/lib/profile";
import { TabBar, type TabKey } from "./src/components/TabBar";
import { DailyScreen } from "./src/screens/DailyScreen";
import { YouScreen } from "./src/screens/YouScreen";
import { JournalScreen } from "./src/screens/JournalScreen";
import { PracticeScreen } from "./src/screens/PracticeScreen";
import { RankScreen } from "./src/screens/RankScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { C } from "./src/theme";

const ONBOARD_KEY = "hindsight.onboarded.v1";

function Shell() {
  const [tab, setTab] = useState<TabKey>("daily");
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View style={{ flex: 1 }}>
          {tab === "daily" && <DailyScreen />}
          {tab === "practice" && <PracticeScreen />}
          {tab === "rank" && <RankScreen />}
          {tab === "journal" && <JournalScreen />}
          {tab === "you" && <YouScreen />}
        </View>
      </SafeAreaView>
      <TabBar active={tab} onChange={setTab} bottomInset={insets.bottom} />
    </View>
  );
}

function Root() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARD_KEY).then((v) => setOnboarded(v === "1"));
  }, []);

  async function finishOnboarding() {
    await AsyncStorage.setItem(ONBOARD_KEY, "1");
    setOnboarded(true);
  }

  if (onboarded === null) {
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
