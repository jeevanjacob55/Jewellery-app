import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthTokens, GuestSession } from "../types/api";

const TOKENS_KEY = "jewellery_app_tokens";
const GUEST_KEY = "jewellery_app_guest_session";

export async function readStoredTokens(): Promise<AuthTokens | null> {
  const rawValue = await AsyncStorage.getItem(TOKENS_KEY);
  return rawValue ? (JSON.parse(rawValue) as AuthTokens) : null;
}

export async function writeStoredTokens(tokens: AuthTokens | null): Promise<void> {
  if (!tokens) {
    await AsyncStorage.removeItem(TOKENS_KEY);
    return;
  }

  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export async function readStoredGuestSession(): Promise<GuestSession | null> {
  const rawValue = await AsyncStorage.getItem(GUEST_KEY);
  return rawValue ? (JSON.parse(rawValue) as GuestSession) : null;
}

export async function writeStoredGuestSession(session: GuestSession | null): Promise<void> {
  if (!session) {
    await AsyncStorage.removeItem(GUEST_KEY);
    return;
  }

  await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(session));
}
