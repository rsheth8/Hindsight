/**
 * Daily reminder — local notification at the player's chosen time.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermission(): Promise<"granted" | "denied" | "undetermined"> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("daily", {
      name: "Daily reminder",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return "granted";
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<"granted" | "denied"> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const status = await ensureNotificationPermission();
  if (status !== "granted") return "denied";

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Hindsight · Daily",
      body: "Today's setup is ready — one call, graded on judgment not luck.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return "granted";
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
