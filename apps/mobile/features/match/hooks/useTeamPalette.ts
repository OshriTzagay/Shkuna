import { useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";
import type { TeamPalette } from "../types";

export function useTeamPalette(): TeamPalette[] {
  const { isDark } = useTheme();
  if (isDark) {
    return [
      { letter: "A", name: "כחולה",  bg: "#0E2641", border: "#3F7AC8", text: "#7AB8FF" },
      { letter: "B", name: "כתומה",  bg: "#311D0F", border: "#D27E3D", text: "#FFB374" },
      { letter: "C", name: "סגולה",  bg: "#241537", border: "#9C6BFF", text: "#C4A0FF" },
      { letter: "D", name: "צהובה",  bg: "#2C2410", border: "#E5B940", text: "#FFD66B" },
      { letter: "E", name: "ירוקה",  bg: "#0D2A1B", border: "#3FCB7E", text: "#7CE5A8" },
      { letter: "F", name: "אדומה",  bg: "#33141B", border: "#E5526E", text: "#FF8FA0" },
    ];
  }
  return [
    { letter: "A", name: "כחולה",  bg: "#EFF6FF", border: "#93C5FD", text: "#1D4ED8" },
    { letter: "B", name: "כתומה",  bg: "#FFF7ED", border: "#FDBA74", text: "#C2410C" },
    { letter: "C", name: "סגולה",  bg: "#F5F3FF", border: "#C4B5FD", text: "#6D28D9" },
    { letter: "D", name: "צהובה",  bg: "#FEFCE8", border: "#FCD34D", text: "#92400E" },
    { letter: "E", name: "ירוקה",  bg: "#F0FDF4", border: "#86EFAC", text: "#15803D" },
    { letter: "F", name: "אדומה",  bg: "#FEF2F2", border: "#FCA5A5", text: "#B91C1C" },
  ];
}

export function useCfgFor() {
  const palette = useTeamPalette();
  return useCallback(
    (letter: string): TeamPalette => palette.find((c) => c.letter === letter) ?? palette[0]!,
    [palette]
  );
}

export function computeGameState(
  allLetters: string[],
  rounds: { team1_letter: string; team2_letter: string; winner: string | null }[]
) {
  const points: Record<string, number> = {};
  allLetters.forEach((l) => (points[l] = 0));

  let playing: [string, string] = [allLetters[0] ?? "A", allLetters[1] ?? "B"];
  let waiting: string[] = allLetters.slice(2);

  for (const r of rounds) {
    if (r.winner) {
      points[r.winner] = (points[r.winner] ?? 0) + 3;
    } else {
      points[r.team1_letter] = (points[r.team1_letter] ?? 0) + 1;
      points[r.team2_letter] = (points[r.team2_letter] ?? 0) + 1;
    }
    if (r.winner && waiting.length > 0) {
      const loser = r.winner === r.team1_letter ? r.team2_letter : r.team1_letter;
      const next = waiting[0]!;
      waiting = [...waiting.slice(1), loser];
      playing = [r.winner, next];
    }
  }

  return { playing, waiting, points };
}
