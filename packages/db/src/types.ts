export type UserRole = "player" | "assistant" | "manager";
export type MatchStatus = "scheduled" | "active" | "finished" | "cancelled";
export type RegistrationStatus = "confirmed" | "waiting" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "exempted";

export interface User {
  id: string;
  phone: string;
  full_name: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  city: string;
  slug: string;
  manager_id: string;
  whatsapp_payment_link: string | null;
  invite_token: string;
  elo_rating: number;
  total_points: number;
  is_public: boolean;
  jersey_holder_id: string | null;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: UserRole;
  skill_rating: number;
  joined_at: string;
  is_active: boolean;
  user?: { id: string; full_name: string; nickname: string | null; phone?: string };
}

export interface Match {
  id: string;
  team_id: string;
  title: string;
  pitch_name: string;
  scheduled_at: string;
  status: MatchStatus;
  total_cost: number | null;
  cost_per_player: number | null;
  max_players: number;
  created_by: string;
  created_at: string;
  // stopwatch (realtime)
  stopwatch_started_at: string | null;
  stopwatch_elapsed_sec: number;
  stopwatch_running: boolean;
}

export interface MatchRegistration {
  match_id: string;
  user_id: string;
  status: RegistrationStatus;
  registered_at: string;
  user?: { id: string; full_name: string; nickname: string | null; phone?: string; avatar_url?: string | null; created_at?: string };
}

export interface MatchTeamSplit {
  id: string;
  match_id: string;
  team_letter: string; // A-F
  player_ids: string[];
  generated_at: string;
  generated_by: string;
}

export interface MatchRound {
  id: string;
  match_id: string;
  round_number: number;
  team1_letter: string;
  team2_letter: string;
  team_a_ids: string[];
  team_b_ids: string[];
  winner: string | null; // team letter, or null for draw
  duration_sec: number | null;
  created_at: string;
}

export interface MatchResult {
  match_id: string;
  total_rounds: number | null;
  mvp_user_id: string | null;
  low_user_id: string | null;
  winning_team_letter: string | null;
  ai_summary: string | null;
  ai_image_url: string | null;
  created_at: string;
}

export interface Payment {
  match_id: string;
  user_id: string;
  amount: number | null;
  status: PaymentStatus;
  confirmed_at: string | null;
  confirmed_by: string | null;
  user?: { id: string; full_name: string; nickname: string | null; phone?: string; avatar_url?: string | null; created_at?: string };
}

export interface MatchPlayerRating {
  match_id: string;
  rated_user_id: string;
  rated_by: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface TeamPointsHistory {
  id: string;
  team_id: string;
  match_id: string | null;
  points_change: number;
  new_total: number;
  recorded_at: string;
}

// ─── Supabase DB schema type ────────────────────────────────────────────────
// Matches the structure Supabase JS v2 expects (Row/Insert/Update/Relationships + Views/Functions/Enums/CompositeTypes)

// Row types are fully typed for reads. Insert/Update use Record<string, unknown>
// to satisfy Supabase's GenericTable constraint (required by postgrest-js v2.104+).
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      teams: {
        Row: Team;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      team_members: {
        Row: TeamMember;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      match_registrations: {
        Row: MatchRegistration;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      match_teams: {
        Row: MatchTeamSplit;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      match_rounds: {
        Row: MatchRound;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      match_results: {
        Row: MatchResult;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      match_player_ratings: {
        Row: MatchPlayerRating;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      team_points_history: {
        Row: TeamPointsHistory;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
