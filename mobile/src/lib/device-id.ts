import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "hindsight.deviceId.v1";

export async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      await AsyncStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}
