import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { computeElapsed, shuffleTeams, suggestSplits } from "@shkuna/utils";
import type { UserRole } from "@shkuna/db";
import type {
  FullMatch,
  RegWithUser,
  PaymentWithUser,
  TeamInMatch,
  RoundRecord,
  MatchResult,
} from "../types";
import { useCfgFor } from "./useTeamPalette";

export function useMatchData(matchId: string, profileId: string) {
  const cfgFor = useCfgFor();

  const [match, setMatch] = useState<FullMatch | null>(null);
  const [myRole, setMyRole] = useState<UserRole | null>(null);
  const [registrations, setRegistrations] = useState<RegWithUser[]>([]);
  const [payments, setPayments] = useState<PaymentWithUser[]>([]);
  const [currentTeams, setCurrentTeams] = useState<TeamInMatch[]>([]);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [numTeams, setNumTeams] = useState(2);
  const [playerRatings, setPlayerRatings] = useState<Record<string, number>>({});
  const [myMatchRatings, setMyMatchRatings] = useState<Record<string, number>>({});
  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({});
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const { data: matchData } = await supabase
      .from("matches")
      .select("*, team:teams(*)")
      .eq("id", matchId)
      .single();
    if (!matchData) return;

    setMatch(matchData as FullMatch);
    setElapsed(
      computeElapsed(
        matchData.stopwatch_elapsed_sec,
        matchData.stopwatch_started_at,
        matchData.stopwatch_running
      )
    );

    // Parallel fetches — no sequential waterfall
    const [
      { data: regs },
      { data: pays },
      { data: splits },
      { data: roundData },
      { data: allMembers },
    ] = await Promise.all([
      supabase
        .from("match_registrations")
        .select("*, user:users(id, full_name, nickname)")
        .eq("match_id", matchId),
      supabase
        .from("payments")
        .select("*, user:users(id, full_name, nickname, phone)")
        .eq("match_id", matchId),
      supabase  
        .from("match_teams")
        .select("*")
        .eq("match_id", matchId)
        .order("generated_at", { ascending: false }),
      supabase
        .from("match_rounds")
        .select("id, round_number, team1_letter, team2_letter, winner, duration_sec")
        .eq("match_id", matchId)
        .order("round_number"),
      supabase
        .from("team_members")
        .select("user_id, role, skill_rating")
        .eq("team_id", matchData.team_id),
    ]);

    setRegistrations((regs ?? []) as RegWithUser[]);
    setPayments((pays ?? []) as PaymentWithUser[]);
    setRounds((roundData ?? []) as RoundRecord[]);

    if (splits && splits.length > 0) {
      const latestTs = splits[0]!.generated_at;
      const latest = splits.filter((s) => s.generated_at === latestTs);
      setCurrentTeams(
        latest.map((s) => ({
          letter: s.team_letter,
          playerIds: s.player_ids,
          cfg: cfgFor(s.team_letter),
        }))
      );
      setNumTeams(latest.length);
    }

    type MemberRow = { user_id: string; role: string; skill_rating: number };
    const members = (allMembers ?? []) as MemberRow[];
    const me = members.find((m) => m.user_id === profileId);
    setMyRole((me?.role ?? null) as UserRole | null);
    const ratings: Record<string, number> = {};
    members.forEach((m) => { ratings[m.user_id] = m.skill_rating; });
    setPlayerRatings(ratings);

    const [{ data: myRatings }, { data: allRatings }, { data: result }] = await Promise.all([
      supabase
        .from("match_player_ratings")
        .select("rated_user_id, rating")
        .eq("match_id", matchId)
        .eq("rated_by", profileId),
      supabase
        .from("match_player_ratings")
        .select("rated_user_id, rating")
        .eq("match_id", matchId),
      supabase
        .from("match_results")
        .select("mvp_user_id, low_user_id, winning_team_letter")
        .eq("match_id", matchId)
        .maybeSingle(),
    ]);

    const ratingMap: Record<string, number> = {};
    (myRatings ?? []).forEach((r: any) => { ratingMap[r.rated_user_id] = r.rating; });
    setMyMatchRatings(ratingMap);

    const sums: Record<string, number[]> = {};
    (allRatings ?? []).forEach((r: any) => {
      if (!sums[r.rated_user_id]) sums[r.rated_user_id] = [];
      sums[r.rated_user_id]!.push(r.rating);
    });
    const avgs: Record<string, number> = {};
    Object.entries(sums).forEach(([uid, vals]) => {
      avgs[uid] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    });
    setAvgRatings(avgs);
    setMatchResult(result ?? null);
  }, [matchId, profileId, cfgFor]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  // ── Realtime ───────────────────────────────────────────────────
  useEffect(() => {
    const regSub = supabase
      .channel(`regs-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_registrations", filter: `match_id=eq.${matchId}` }, () => load())
      .subscribe();
    const matchSub = supabase
      .channel(`match-${matchId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, (p) => {
        const m = p.new as FullMatch;
        setMatch((prev) => (prev ? { ...prev, ...m } : prev));
        setElapsed(computeElapsed(m.stopwatch_elapsed_sec, m.stopwatch_started_at, m.stopwatch_running));
      })
      .subscribe();
    const paysSub = supabase
      .channel(`pays-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `match_id=eq.${matchId}` }, () => load())
      .subscribe();
    return () => {
      regSub.unsubscribe();
      matchSub.unsubscribe();
      paysSub.unsubscribe();
    };
  }, [matchId, load]);

  // ── Derived ────────────────────────────────────────────────────
  const confirmed = registrations.filter((r) => r.status === "confirmed");
  const waiting = registrations.filter((r) => r.status === "waiting");
  const myReg = registrations.find((r) => r.user_id === profileId);
  const isFull = confirmed.length >= (match?.max_players ?? 12);
  const isAdmin = myRole === "manager" || myRole === "assistant";
  const isManager = myRole === "manager";
  const isActive = match?.status === "active";
  const isFinished = match?.status === "finished";
  const myPayment = payments.find((p) => p.user_id === profileId);
  const splitOptions = suggestSplits(confirmed.length);

  // ── Actions ────────────────────────────────────────────────────
  const handleRegister = useCallback(async () => {
    const isIn = myReg && myReg.status !== "cancelled";
    if (isIn) {
      const { error } = await supabase
        .from("match_registrations")
        .update({ status: "cancelled" })
        .eq("match_id", matchId)
        .eq("user_id", profileId);
      if (error) { Alert.alert("שגיאה", error.message); return; }
    } else {
      const { error } = await supabase.from("match_registrations").upsert({
        match_id: matchId,
        user_id: profileId,
        status: isFull ? "waiting" : "confirmed",
      });
      if (error) { Alert.alert("שגיאה", error.message); return; }
    }
    load();
  }, [myReg, matchId, profileId, isFull, load]);

  const handleShuffle = useCallback(async () => {
    const players = confirmed.map((r) => ({
      id: r.user_id,
      full_name: r.user.full_name,
      nickname: r.user.nickname,
      skill_rating: playerRatings[r.user_id] ?? 3,
    }));
    const { teams } = shuffleTeams(players, numTeams);
    const now = new Date().toISOString();
    await supabase.from("match_teams").delete().eq("match_id", matchId);
    await supabase.from("match_teams").insert(
      teams.map((t) => ({
        match_id: matchId,
        team_letter: t.letter,
        player_ids: t.players.map((p) => p.id),
        generated_by: profileId,
        generated_at: now,
      }))
    );
    setCurrentTeams(
      teams.map((t) => ({
        letter: t.letter,
        playerIds: t.players.map((p) => p.id),
        cfg: cfgFor(t.letter),
      }))
    );
    setNumTeams(teams.length);
  }, [confirmed, numTeams, matchId, profileId, cfgFor, playerRatings]);

  const handleStartMatch = useCallback(async () => {
    await supabase.from("matches").update({ status: "active" }).eq("id", matchId);
    setMatch((prev) => (prev ? { ...prev, status: "active" } : prev));
  }, [matchId]);

  const handleConfirmPayment = useCallback(async () => {
    await supabase
      .from("payments")
      .update({ status: "paid", confirmed_at: new Date().toISOString(), confirmed_by: profileId })
      .eq("match_id", matchId)
      .eq("user_id", profileId);
    load();
  }, [matchId, profileId, load]);

  const handleRatePlayer = useCallback(async (ratedUserId: string, rating: number) => {
    setMyMatchRatings((prev) => ({ ...prev, [ratedUserId]: rating }));
    await supabase.from("match_player_ratings").upsert(
      { match_id: matchId, rated_user_id: ratedUserId, rated_by: profileId, rating },
      { onConflict: "match_id,rated_user_id,rated_by" }
    );
  }, [matchId, profileId]);

  const updatePlayerRating = useCallback(async (userId: string, rating: number) => {
    setPlayerRatings((prev) => ({ ...prev, [userId]: rating }));
    await supabase
      .from("team_members")
      .update({ skill_rating: rating })
      .eq("team_id", match!.team_id)
      .eq("user_id", userId);
  }, [match]);

  return {
    // State
    match, myRole, registrations, payments, currentTeams, rounds, numTeams,
    playerRatings, myMatchRatings, avgRatings, matchResult, elapsed, refreshing,
    // Setters (needed by useStopwatch)
    setMatch, setElapsed, setRounds,
    // Derived
    confirmed, waiting, myReg, isFull, isAdmin, isManager, isActive, isFinished,
    myPayment, splitOptions,
    // Actions
    load, onRefresh,
    handleRegister, handleShuffle, handleStartMatch,
    handleConfirmPayment, handleRatePlayer, updatePlayerRating,
    setNumTeams,
  };
}
