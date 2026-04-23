import { useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";
import type { TeamPalette } from "../types";

// ─── Palette definitions ───────────────────────────────────────
// Each key is the value stored in teams.jersey_colors (e.g. { "A": "red", "B": "blue" }).
// Two variants per color: one for dark mode, one for light mode.

export type JerseyColor =
  | "blue" | "orange" | "purple" | "yellow" | "green" | "red"
  | "pink" | "teal";

interface ColorDef { name: string; dark: Omit<TeamPalette, "letter">; light: Omit<TeamPalette, "letter"> }

export const JERSEY_PALETTES: Record<JerseyColor, ColorDef> = {
  blue:   { name: "כחולה",  dark:  { name: "כחולה",  bg: "#0E2641", border: "#3F7AC8", text: "#7AB8FF" },
                             light: { name: "כחולה",  bg: "#EFF6FF", border: "#93C5FD", text: "#1D4ED8" } },
  orange: { name: "כתומה",  dark:  { name: "כתומה",  bg: "#311D0F", border: "#D27E3D", text: "#FFB374" },
                             light: { name: "כתומה",  bg: "#FFF7ED", border: "#FDBA74", text: "#C2410C" } },
  purple: { name: "סגולה",  dark:  { name: "סגולה",  bg: "#241537", border: "#9C6BFF", text: "#C4A0FF" },
                             light: { name: "סגולה",  bg: "#F5F3FF", border: "#C4B5FD", text: "#6D28D9" } },
  yellow: { name: "צהובה",  dark:  { name: "צהובה",  bg: "#2C2410", border: "#E5B940", text: "#FFD66B" },
                             light: { name: "צהובה",  bg: "#FEFCE8", border: "#FCD34D", text: "#92400E" } },
  green:  { name: "ירוקה",  dark:  { name: "ירוקה",  bg: "#0D2A1B", border: "#3FCB7E", text: "#7CE5A8" },
                             light: { name: "ירוקה",  bg: "#F0FDF4", border: "#86EFAC", text: "#15803D" } },
  red:    { name: "אדומה",  dark:  { name: "אדומה",  bg: "#33141B", border: "#E5526E", text: "#FF8FA0" },
                             light: { name: "אדומה",  bg: "#FEF2F2", border: "#FCA5A5", text: "#B91C1C" } },
  pink:   { name: "ורודה",  dark:  { name: "ורודה",  bg: "#2D1120", border: "#E879A0", text: "#F9A8D4" },
                             light: { name: "ורודה",  bg: "#FDF2F8", border: "#F9A8D4", text: "#9D174D" } },
  teal:   { name: "טורקיז", dark:  { name: "טורקיז", bg: "#0D2626", border: "#2DD4BF", text: "#5EEAD4" },
                             light: { name: "טורקיז", bg: "#F0FDFA", border: "#5EEAD4", text: "#0F766E" } },
};

// Default color assigned to each letter when the manager hasn't configured anything
const DEFAULT_COLORS: JerseyColor[] = ["blue", "orange", "purple", "yellow", "green", "red"];

// ─── Hooks ────────────────────────────────────────────────────

/**
 * Returns a TeamPalette for every letter, merging manager-chosen
 * jersey colors with the default fallback order.
 *
 * @param jerseyColors  teams.jersey_colors from the DB  e.g. { A: "red", B: "blue" }
 */
export function useTeamPalette(jerseyColors: Record<string, string> = {}): TeamPalette[] {
  const { isDark } = useTheme();
  const letters = ["A", "B", "C", "D", "E", "F"];

  return letters.map((letter, i) => {
    const key = (jerseyColors[letter] ?? DEFAULT_COLORS[i] ?? "blue") as JerseyColor;
    const def = JERSEY_PALETTES[key] ?? JERSEY_PALETTES.blue;
    const variant = isDark ? def.dark : def.light;
    return { letter, ...variant };
  });
}

/**
 * Returns a memoised (letter) => TeamPalette lookup function.
 */
export function useCfgFor(jerseyColors: Record<string, string> = {}) {
  const palette = useTeamPalette(jerseyColors);
  return useCallback(
    (letter: string): TeamPalette =>
      palette.find((c) => c.letter === letter) ?? palette[0]!,
    [palette]
  );
}

// ─── Pure helpers ─────────────────────────────────────────────

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
