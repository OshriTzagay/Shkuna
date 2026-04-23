import type { Match, MatchRegistration, Payment, Team, UserRole } from "@shkuna/db";

export interface RegWithUser extends MatchRegistration {
  user: { id: string; full_name: string; nickname: string | null };
}

export interface PaymentWithUser extends Payment {
  user: { id: string; full_name: string; nickname: string | null; phone: string };
}

export interface TeamPalette {
  letter: string;
  name: string;
  bg: string;
  border: string;
  text: string;
}

export interface TeamInMatch {
  letter: string;
  playerIds: string[];
  cfg: TeamPalette;
}

export interface RoundRecord {
  id: string;
  round_number: number;
  team1_letter: string;
  team2_letter: string;
  winner: string | null;
  duration_sec: number | null;
}

export interface GameState {
  playing: [string, string];
  waiting: string[];
  points: Record<string, number>;
}

export interface MatchResult {
  mvp_user_id: string | null;
  low_user_id: string | null;
  winning_team_letter: string | null;
}

export interface FullMatch extends Match {
  team: Team & { jersey_colors: Record<string, string> };
}

export type MatchTabId = "register" | "teams" | "rounds";
export type UserRoleOrNull = UserRole | null;
