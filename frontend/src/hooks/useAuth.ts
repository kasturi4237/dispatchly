import { useCallback, useEffect, useState } from "react";
import { authApi, storeSessionToken, clearSessionToken } from "../lib/api";
import { SessionUser } from "../types";

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);

  const bootstrap = useCallback(async () => {
    setChecking(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const inboundToken = params.get("session");
      if (inboundToken) {
        storeSessionToken(inboundToken);
        params.delete("session");
        const rest = params.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);
      }

      const { user: sessionUser } = await authApi.session();
      setUser(sessionUser);
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSessionToken();
      setUser(null);
    }
  }, []);

  return { user, checking, logout };
}
