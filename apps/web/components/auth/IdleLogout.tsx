"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Props = {
  idleMs?: number;      
  warnMs?: number;      
};

export default function IdleLogout({ idleMs = 30 * 60 * 1000 }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const timerRef = useRef<number | null>(null);

  const resetTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(async () => {
      // If not logged in, do nothing.
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      // Logout after inactivity
      await supabase.auth.signOut();
      router.replace("/"); // landing page
    }, idleMs);
  };

  useEffect(() => {

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) resetTimer();
    })();

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const onActivity = () => resetTimer();
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}