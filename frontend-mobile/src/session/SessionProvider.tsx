import { PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from "react";

import { API_BASE_URL, configureApiClient, getJson, patchJson, postJson } from "../api/client";
import { readStoredGuestSession, readStoredTokens, writeStoredGuestSession, writeStoredTokens } from "../storage/sessionStorage";
import {
  AuthTokens,
  GuestAccessPayload,
  GuestSession,
  MemberUser,
  SessionInfo,
  SessionStatus,
  UpdateMemberUserPayload,
  UpdateNotificationPreferencesPayload,
} from "../types/api";

type SessionContextValue = {
  apiBaseUrl: string;
  status: SessionStatus;
  user: MemberUser | null;
  guestSession: GuestSession | null;
  sessionInfo: SessionInfo | null;
  error: string | null;
  signInMember: (credentials: { username: string; password: string }) => Promise<void>;
  continueAsGuest: (payload: GuestAccessPayload) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updateCurrentUser: (payload: UpdateMemberUserPayload) => Promise<void>;
  updateNotificationPreferences: (payload: UpdateNotificationPreferencesPayload) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionStatus>("booting");
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<MemberUser | null>(null);
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokensRef = useRef<AuthTokens | null>(null);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    configureApiClient({
      getTokens: () => tokensRef.current,
      onTokensUpdated: async (nextTokens) => {
        tokensRef.current = nextTokens;
        setTokens(nextTokens);
        await writeStoredTokens(nextTokens);
      },
      onUnauthorized: async () => {
        await clearSession();
      },
    });
  });

  async function clearSession() {
    tokensRef.current = null;
    setTokens(null);
    setUser(null);
    setGuestSession(null);
    setStatus("signedOut");
    await Promise.all([writeStoredTokens(null), writeStoredGuestSession(null)]);
  }

  async function fetchSessionInfo() {
    try {
      const info = await getJson<SessionInfo>("/auth/session/");
      setSessionInfo(info);
    } catch {
      setSessionInfo(null);
    }
  }

  async function refreshCurrentUser() {
    const nextUser = await getJson<MemberUser>("/me/", true);
    setUser(nextUser);
  }

  async function updateCurrentUser(payload: UpdateMemberUserPayload) {
    setError(null);
    await patchJson<MemberUser>("/me/", payload, true);
    await refreshCurrentUser();
  }

  async function updateNotificationPreferences(payload: UpdateNotificationPreferencesPayload) {
    setError(null);
    await patchJson("/me/preferences/", payload, true);
    await refreshCurrentUser();
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setStatus("booting");
      setError(null);
      await fetchSessionInfo();

      const [storedTokens, storedGuestSession] = await Promise.all([readStoredTokens(), readStoredGuestSession()]);

      if (!mounted) {
        return;
      }

      if (storedTokens) {
        try {
          tokensRef.current = storedTokens;
          setTokens(storedTokens);
          const nextUser = await getJson<MemberUser>("/me/", true);
          if (!mounted) {
            return;
          }
          setUser(nextUser);
          setGuestSession(null);
          setStatus("authenticated");
          await writeStoredGuestSession(null);
          return;
        } catch {
          await clearSession();
        }
      }

      if (storedGuestSession) {
        setGuestSession(storedGuestSession);
        setStatus("guest");
      } else {
        setStatus("signedOut");
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  async function signInMember(credentials: { username: string; password: string }) {
    setError(null);
    const nextTokens = await postJson<AuthTokens>("/auth/login/", credentials);
    tokensRef.current = nextTokens;
    setTokens(nextTokens);
    await writeStoredTokens(nextTokens);
    await writeStoredGuestSession(null);

    try {
      const nextUser = await getJson<MemberUser>("/me/", true);
      setUser(nextUser);
      setGuestSession(null);
      setStatus("authenticated");
    } catch (nextError) {
      await clearSession();
      throw nextError;
    }
  }

  async function continueAsGuest(payload: GuestAccessPayload) {
    setError(null);
    const nextGuestSession = await postJson<GuestSession>("/auth/guest/", payload);
    setGuestSession(nextGuestSession);
    setUser(null);
    setTokens(null);
    tokensRef.current = null;
    setStatus("guest");
    await Promise.all([writeStoredGuestSession(nextGuestSession), writeStoredTokens(null)]);
  }

  async function signOut() {
    setError(null);
    await clearSession();
  }

  return (
    <SessionContext.Provider
      value={{
        apiBaseUrl: API_BASE_URL,
        status,
        user,
        guestSession,
        sessionInfo,
        error,
        signInMember,
        continueAsGuest,
        refreshCurrentUser,
        updateCurrentUser,
        updateNotificationPreferences,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return context;
}
