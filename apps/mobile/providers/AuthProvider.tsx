import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase/client";
import { getResidentRowByAuthId, type ResidentRow } from "@/lib/supabase/resident";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;

  resident: ResidentRow | null;
  residentId: number | null;
  residentLoading: boolean;
  mustChangePassword: boolean;
  refreshResident: () => Promise<ResidentRow | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isRefreshTokenProblem(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  return (
    msg.includes("Refresh Token Not Found") ||
    msg.includes("Invalid Refresh Token") ||
    msg.includes("invalid refresh token") ||
    msg.includes("refresh_token_not_found")
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [resident, setResident] = useState<ResidentRow | null>(null);
  const [residentLoading, setResidentLoading] = useState(false);

  const mountedRef = useRef(true);
  const didInitRef = useRef(false);

  const sessionRef = useRef<Session | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const refreshInFlightRef = useRef<Promise<ResidentRow | null> | null>(null);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      if (!mountedRef.current) return;
      setResident(null);
      setResidentLoading(false);
      setSession(null);
      setLoading(false);
    }
  }, []);

  const refreshResidentInternal = useCallback((nextSession?: Session | null) => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const p = (async () => {
      const s = nextSession ?? sessionRef.current;

      if (!s?.user?.id) {
        if (mountedRef.current) {
          setResident(null);
          setResidentLoading(false);
        }
        return null;
      }

      if (mountedRef.current) setResidentLoading(true);

      try {
        const r = await getResidentRowByAuthId(s.user.id);
        if (mountedRef.current) setResident(r);
        return r;
      } catch (e) {
        console.log("Refresh Resident error");
        if (mountedRef.current) setResident(null);
        return null;
      } finally {
        if (mountedRef.current) setResidentLoading(false);
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = p;
    return p;
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (didInitRef.current) return;
    didInitRef.current = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (error) {
          console.log("Get Session error");
          if (isRefreshTokenProblem(error)) {
            await signOut();
            return;
          }
        }

        const s = data.session ?? null;
        setSession(s);

        if (s?.user?.id) {
          setResidentLoading(true);
          setLoading(false);

          setTimeout(() => {
            void refreshResidentInternal(s);
          }, 0);
        } else {
          setResident(null);
          setResidentLoading(false);
          setLoading(false);
        }
      } catch (e) {
        if (!mountedRef.current) return;

        console.log("Get Session catch");

        if (isRefreshTokenProblem(e)) {
          await signOut();
          return;
        }

        setSession(null);
        setResident(null);
        setResidentLoading(false);
        setLoading(false);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mountedRef.current) return;

      setSession(newSession ?? null);
      setLoading(false);

      if (!newSession?.user?.id) {
        setResident(null);
        setResidentLoading(false);
        return;
      }

      setResidentLoading(true);

      setTimeout(() => {
        void refreshResidentInternal(newSession);
      }, 0);
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshResidentInternal, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,

      resident,
      residentId: resident?.id ?? null,
      residentLoading,
      mustChangePassword: resident?.must_change_password === true,
      refreshResident: () => refreshResidentInternal(),
      signOut,
    }),
    [session, loading, resident, residentLoading, refreshResidentInternal, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}