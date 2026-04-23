import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { computeElapsed } from "@shkuna/utils";
import type { FullMatch } from "../types";

export function useStopwatch(
  matchId: string,
  match: FullMatch | null,
  setMatch: React.Dispatch<React.SetStateAction<FullMatch | null>>,
  setElapsed: React.Dispatch<React.SetStateAction<number>>
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (match?.stopwatch_running) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [match?.stopwatch_running, setElapsed]);

  const handleStopwatch = useCallback(
    async (action: "start" | "stop" | "reset") => {
      if (!match) return;
      if (action === "start") {
        const now = new Date().toISOString();
        setMatch((p) => (p ? { ...p, stopwatch_running: true, stopwatch_started_at: now } : p));
        await supabase
          .from("matches")
          .update({ stopwatch_running: true, stopwatch_started_at: now })
          .eq("id", matchId);
      } else if (action === "stop") {
        const cur = computeElapsed(match.stopwatch_elapsed_sec, match.stopwatch_started_at, true);
        setElapsed(cur);
        setMatch((p) =>
          p ? { ...p, stopwatch_running: false, stopwatch_elapsed_sec: cur, stopwatch_started_at: null } : p
        );
        await supabase
          .from("matches")
          .update({ stopwatch_running: false, stopwatch_elapsed_sec: cur, stopwatch_started_at: null })
          .eq("id", matchId);
      } else {
        setElapsed(0);
        setMatch((p) =>
          p ? { ...p, stopwatch_running: false, stopwatch_elapsed_sec: 0, stopwatch_started_at: null } : p
        );
        await supabase
          .from("matches")
          .update({ stopwatch_running: false, stopwatch_elapsed_sec: 0, stopwatch_started_at: null })
          .eq("id", matchId);
      }
    },
    [match, matchId, setMatch, setElapsed]
  );

  return { handleStopwatch };
}
