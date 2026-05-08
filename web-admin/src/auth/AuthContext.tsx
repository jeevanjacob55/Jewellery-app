import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { ApiClientConfig, configureApiClient, fetchSessionInfo, loginWithPassword, refreshAccessToken, SessionInfo, Tokens } from "../lib/api";

type SessionStorageMode = "local" | "session";
type AuthStatus = "booting" | "signedOut" | "signedIn";

type AuthContextValue = {
  status: AuthStatus;
  session: SessionInfo | null;
  login: (input: { username: string; password: string; rememberMe: boolean }) => Promise<void>;
  logout: () => void;
};

const STORAGE_KEY = "ja-web-admin-auth";

type StoredSession = {
  tokens: Tokens;
  mode: SessionStorageMode;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function canAccessConsole(session: SessionInfo) {
  if (session.user.is_admin) {
    return true;
  }
  return session.user.role === "COMPANY_ADMIN" && session.company !== null;
}

function readStoredSession(): StoredSession | null {
  const localValue = window.localStorage.getItem(STORAGE_KEY);
  if (localValue) {
    try {
      const parsed = JSON.parse(localValue) as StoredSession;
      return { ...parsed, mode: "local" };
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  const sessionValue = window.sessionStorage.getItem(STORAGE_KEY);
  if (sessionValue) {
    try {
      const parsed = JSON.parse(sessionValue) as StoredSession;
      return { ...parsed, mode: "session" };
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  return null;
}

function persistTokens(tokens: Tokens, mode: SessionStorageMode) {
  const payload = JSON.stringify({ tokens, mode });
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  if (mode === "local") {
    window.localStorage.setItem(STORAGE_KEY, payload);
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, payload);
}

function clearStoredTokens() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("booting");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [storageMode, setStorageMode] = useState<SessionStorageMode>("session");

  const logout = useCallback(() => {
    clearStoredTokens();
    setTokens(null);
    setSession(null);
    setStatus("signedOut");
  }, []);

  const handleTokensUpdated = useCallback((nextTokens: Tokens | null) => {
    setTokens(nextTokens);
    if (nextTokens) {
      persistTokens(nextTokens, storageMode);
      return;
    }
    clearStoredTokens();
  }, [storageMode]);

  useEffect(() => {
    const config: ApiClientConfig = {
      getTokens: () => tokens,
      onTokensUpdated: handleTokensUpdated,
      onUnauthorized: logout,
    };
    configureApiClient(config);
  }, [handleTokensUpdated, logout, tokens]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const stored = readStoredSession();
      if (!stored) {
        if (active) {
          setStatus("signedOut");
        }
        return;
      }

      setStorageMode(stored.mode);

      try {
        let nextTokens = stored.tokens;
        setTokens(nextTokens);

        try {
          const nextSession = await fetchSessionInfo(nextTokens);
          if (!canAccessConsole(nextSession)) {
            throw new Error("This account does not have admin console access.");
          }
          if (active) {
            setSession(nextSession);
            setStatus("signedIn");
          }
          return;
        } catch {
          nextTokens = await refreshAccessToken(stored.tokens.refresh);
          setTokens(nextTokens);
          persistTokens(nextTokens, stored.mode);
          const nextSession = await fetchSessionInfo(nextTokens);
          if (!canAccessConsole(nextSession)) {
            throw new Error("This account does not have admin console access.");
          }
          if (active) {
            setSession(nextSession);
            setStatus("signedIn");
          }
          return;
        }
      } catch {
        if (active) {
          logout();
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [logout]);

  const login = useCallback(
    async ({ username, password, rememberMe }: { username: string; password: string; rememberMe: boolean }) => {
      const nextMode: SessionStorageMode = rememberMe ? "local" : "session";
      setStorageMode(nextMode);
      const nextTokens = await loginWithPassword({ username, password });
      persistTokens(nextTokens, nextMode);
      setTokens(nextTokens);

      try {
        const nextSession = await fetchSessionInfo(nextTokens);
        if (!canAccessConsole(nextSession)) {
          throw new Error("This account does not have admin console access.");
        }
        setSession(nextSession);
        setStatus("signedIn");
      } catch (error) {
        logout();
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Unable to start an admin session.");
      }
    },
    [logout],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      login,
      logout,
    }),
    [login, logout, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
