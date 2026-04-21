import { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import {
  shuffleTeams, suggestSplits,
  formatMatchDate, formatStopwatch, computeElapsed, buildPaymentReminderUrl,
} from "@shkuna/utils";
import type { Match, MatchRegistration, Payment, Team, UserRole } from "@shkuna/db";
import EndMatchSheet from "@/components/match/EndMatchSheet";

// ── Types ─────────────────────────────────────────────────────

interface RegWithUser extends MatchRegistration {
  user: { id: string; full_name: string; nickname: string | null };
}
interface PaymentWithUser extends Payment {
  user: { id: string; full_name: string; nickname: string | null; phone: string };
}
interface TeamInMatch {
  letter: string;
  playerIds: string[];
  cfg: typeof TEAM_CONFIGS[number];
}
interface RoundRecord {
  id: string;
  round_number: number;
  team1_letter: string;
  team2_letter: string;
  winner: string | null;
  duration_sec: number | null;
}
interface GameState {
  playing: [string, string];
  waiting: string[];
  points: Record<string, number>;
}

// ── Constants ─────────────────────────────────────────────────

const TEAM_CONFIGS = [
  { letter: "A", name: "כחולה",   bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
  { letter: "B", name: "כתומה",   bg: "#fff7ed", border: "#fdba74", text: "#c2410c" },
  { letter: "C", name: "סגולה",   bg: "#f5f3ff", border: "#c4b5fd", text: "#6d28d9" },
  { letter: "D", name: "צהובה",   bg: "#fefce8", border: "#fcd34d", text: "#92400e" },
  { letter: "E", name: "ירוקה",   bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
  { letter: "F", name: "אדומה",   bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" },
];

function cfgFor(letter: string) {
  return TEAM_CONFIGS.find((c) => c.letter === letter) ?? TEAM_CONFIGS[0]!;
}

// ── Game state derivation ──────────────────────────────────────

function computeGameState(allLetters: string[], rounds: RoundRecord[]): GameState {
  const points: Record<string, number> = {};
  allLetters.forEach((l) => (points[l] = 0));

  let playing: [string, string] = [allLetters[0] ?? "A", allLetters[1] ?? "B"];
  let waiting: string[] = allLetters.slice(2);

  for (const r of rounds) {
    if (r.winner) {
      points[r.winner] = (points[r.winner] ?? 0) + 3;
    } else {
      // draw: 1 pt each
      points[r.team1_letter] = (points[r.team1_letter] ?? 0) + 1;
      points[r.team2_letter] = (points[r.team2_letter] ?? 0) + 1;
    }

    if (r.winner && waiting.length > 0) {
      const loser = r.winner === r.team1_letter ? r.team2_letter : r.team1_letter;
      const next = waiting[0]!;
      waiting = [...waiting.slice(1), loser];
      playing = [r.winner, next];
    }
    // draw or no waiting → same teams keep playing
  }

  return { playing, waiting, points };
}

// ── Component ─────────────────────────────────────────────────

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();

  const [match, setMatch] = useState<Match & { team: Team } | null>(null);
  const [myRole, setMyRole] = useState<UserRole | null>(null);
  const [registrations, setRegistrations] = useState<RegWithUser[]>([]);
  const [payments, setPayments] = useState<PaymentWithUser[]>([]);
  const [currentTeams, setCurrentTeams] = useState<TeamInMatch[]>([]);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [numTeams, setNumTeams] = useState(2);
  const [playerRatings, setPlayerRatings] = useState<Record<string, number>>({});
  const [myMatchRatings, setMyMatchRatings] = useState<Record<string, number>>({});
  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({});
  const [matchResult, setMatchResult] = useState<{ mvp_user_id: string | null; low_user_id: string | null; winning_team_letter: string | null } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showEndSheet, setShowEndSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<"register" | "teams" | "rounds">("register");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load ──────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const { data: matchData } = await supabase
      .from("matches")
      .select("*, team:teams(*)")
      .eq("id", id!)
      .single();
    if (!matchData) return;
    setMatch(matchData as Match & { team: Team });
    setElapsed(computeElapsed(matchData.stopwatch_elapsed_sec, matchData.stopwatch_started_at, matchData.stopwatch_running));

    const { data: regs } = await supabase
      .from("match_registrations")
      .select("*, user:users(id, full_name, nickname)")
      .eq("match_id", id!);
    setRegistrations((regs ?? []) as RegWithUser[]);

    const { data: pays } = await supabase
      .from("payments")
      .select("*, user:users(id, full_name, nickname, phone)")
      .eq("match_id", id!);
    setPayments((pays ?? []) as PaymentWithUser[]);

    const { data: splits } = await supabase
      .from("match_teams")
      .select("*")
      .eq("match_id", id!)
      .order("generated_at", { ascending: false });
    if (splits && splits.length > 0) {
      const latestTs = splits[0]!.generated_at;
      const latest = splits.filter((s) => s.generated_at === latestTs);
      setCurrentTeams(latest.map((s) => ({ letter: s.team_letter, playerIds: s.player_ids, cfg: cfgFor(s.team_letter) })));
      setNumTeams(latest.length);
    }

    const { data: roundData } = await supabase
      .from("match_rounds")
      .select("id, round_number, team1_letter, team2_letter, winner, duration_sec")
      .eq("match_id", id!)
      .order("round_number");
    setRounds((roundData ?? []) as RoundRecord[]);

    const { data: allMembers } = await supabase
      .from("team_members")
      .select("user_id, role, skill_rating")
      .eq("team_id", matchData.team_id);
    type MemberRow = { user_id: string; role: string; skill_rating: number };
    const members = (allMembers ?? []) as MemberRow[];
    const me = members.find((m) => m.user_id === profile!.id);
    setMyRole((me?.role ?? null) as UserRole | null);
    const ratings: Record<string, number> = {};
    members.forEach((m) => { ratings[m.user_id] = m.skill_rating; });
    setPlayerRatings(ratings);

    const { data: myRatings } = await supabase
      .from("match_player_ratings")
      .select("rated_user_id, rating")
      .eq("match_id", id!)
      .eq("rated_by", profile!.id);
    const ratingMap: Record<string, number> = {};
    (myRatings ?? []).forEach((r: any) => { ratingMap[r.rated_user_id] = r.rating; });
    setMyMatchRatings(ratingMap);

    const { data: allRatings } = await supabase
      .from("match_player_ratings")
      .select("rated_user_id, rating")
      .eq("match_id", id!);
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

    const { data: result } = await supabase
      .from("match_results")
      .select("mvp_user_id, low_user_id, winning_team_letter")
      .eq("match_id", id!)
      .maybeSingle();
    setMatchResult(result ?? null);
  }, [id, profile]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (match?.status === "finished") setActiveTab("rounds");
  }, [match?.status]);

  // ── Realtime ──────────────────────────────────────────────────

  useEffect(() => {
    const regSub = supabase
      .channel(`regs-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_registrations", filter: `match_id=eq.${id}` }, () => load())
      .subscribe();
    const matchSub = supabase
      .channel(`match-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${id}` }, (p) => {
        const m = p.new as Match;
        setMatch((prev) => prev ? { ...prev, ...m } : prev);
        setElapsed(computeElapsed(m.stopwatch_elapsed_sec, m.stopwatch_started_at, m.stopwatch_running));
      })
      .subscribe();
    const paysSub = supabase
      .channel(`pays-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `match_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { regSub.unsubscribe(); matchSub.unsubscribe(); paysSub.unsubscribe(); };
  }, [id, load]);

  // ── Stopwatch tick ────────────────────────────────────────────

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (match?.stopwatch_running) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [match?.stopwatch_running]);

  // ── Helpers ───────────────────────────────────────────────────

  function getName(uid: string) {
    const r = registrations.find((r) => r.user_id === uid);
    return r ? (r.user.nickname ?? r.user.full_name) : uid;
  }

  const confirmed = registrations.filter((r) => r.status === "confirmed");
  const waiting = registrations.filter((r) => r.status === "waiting");
  const myReg = registrations.find((r) => r.user_id === profile?.id);
  const isFull = confirmed.length >= (match?.max_players ?? 12);
  const isAdmin = myRole === "manager" || myRole === "assistant";
  const isManager = myRole === "manager";
  const isActive = match?.status === "active";
  const isFinished = match?.status === "finished";
  const teamLetters = currentTeams.map((t) => t.letter);
  const gameState: GameState | null = currentTeams.length >= 2
    ? computeGameState(teamLetters, rounds)
    : null;

  // ── Actions ───────────────────────────────────────────────────

  async function handleRegister() {
    const isIn = myReg && myReg.status !== "cancelled";
    if (isIn) {
      const { error } = await supabase.from("match_registrations")
        .update({ status: "cancelled" }).eq("match_id", id!).eq("user_id", profile!.id);
      if (error) { Alert.alert("שגיאה", error.message); return; }
    } else {
      const { error } = await supabase.from("match_registrations").upsert({
        match_id: id!, user_id: profile!.id, status: isFull ? "waiting" : "confirmed",
      });
      if (error) { Alert.alert("שגיאה", error.message); return; }
    }
    load();
  }

  async function handleShuffle() {
    const players = confirmed.map((r) => ({
      id: r.user_id, full_name: r.user.full_name, nickname: r.user.nickname, skill_rating: 3,
    }));
    const { data: members } = await supabase
      .from("team_members").select("user_id, skill_rating")
      .eq("team_id", match!.team_id).in("user_id", players.map((p) => p.id));
    const ratingMap = Object.fromEntries((members ?? []).map((m) => [m.user_id, m.skill_rating]));
    const rated = players.map((p) => ({ ...p, skill_rating: ratingMap[p.id] ?? 3 }));

    const { teams } = shuffleTeams(rated, numTeams);
    const now = new Date().toISOString();
    await supabase.from("match_teams").delete().eq("match_id", id!);
    await supabase.from("match_teams").insert(
      teams.map((t) => ({ match_id: id!, team_letter: t.letter, player_ids: t.players.map((p) => p.id), generated_by: profile!.id, generated_at: now }))
    );
    setCurrentTeams(teams.map((t) => ({ letter: t.letter, playerIds: t.players.map((p) => p.id), cfg: cfgFor(t.letter) })));
    setNumTeams(teams.length);
  }

  async function handleStartMatch() {
    await supabase.from("matches").update({ status: "active" }).eq("id", id!);
    setMatch((prev) => prev ? { ...prev, status: "active" } : prev);
    setActiveTab("rounds");
  }

  async function handleStopwatch(action: "start" | "stop" | "reset") {
    if (!match) return;
    if (action === "start") {
      const now = new Date().toISOString();
      setMatch((p) => p ? { ...p, stopwatch_running: true, stopwatch_started_at: now } : p);
      await supabase.from("matches").update({ stopwatch_running: true, stopwatch_started_at: now }).eq("id", id!);
    } else if (action === "stop") {
      const cur = computeElapsed(match.stopwatch_elapsed_sec, match.stopwatch_started_at, true);
      setElapsed(cur);
      setMatch((p) => p ? { ...p, stopwatch_running: false, stopwatch_elapsed_sec: cur, stopwatch_started_at: null } : p);
      await supabase.from("matches").update({ stopwatch_running: false, stopwatch_elapsed_sec: cur, stopwatch_started_at: null }).eq("id", id!);
    } else {
      setElapsed(0);
      setMatch((p) => p ? { ...p, stopwatch_running: false, stopwatch_elapsed_sec: 0, stopwatch_started_at: null } : p);
      await supabase.from("matches").update({ stopwatch_running: false, stopwatch_elapsed_sec: 0, stopwatch_started_at: null }).eq("id", id!);
    }
  }

  async function handleRoundResult(winner: string | null) {
    if (!gameState) return;
    const [t1, t2] = gameState.playing;
    const nextNum = rounds.length + 1;
    const newRound: RoundRecord = {
      id: "", round_number: nextNum, team1_letter: t1, team2_letter: t2,
      winner, duration_sec: elapsed,
    };
    // optimistic update
    setRounds((prev) => [...prev, newRound]);
    await handleStopwatch("reset");

    const t1data = currentTeams.find((t) => t.letter === t1);
    const t2data = currentTeams.find((t) => t.letter === t2);
    await supabase.from("match_rounds").insert({
      match_id: id!, round_number: nextNum,
      team1_letter: t1, team2_letter: t2,
      team_a_ids: t1data?.playerIds ?? [], team_b_ids: t2data?.playerIds ?? [],
      winner, duration_sec: elapsed,
    });
  }

  function promptRoundResult(teamLetter: string) {
    const cfg = cfgFor(teamLetter);
    Alert.alert(
      `קבוצה ${cfg.name} ניצחה?`,
      "+3 נקודות לקבוצה המנצחת, הקבוצה המפסידה יורדת",
      [
        { text: "ביטול", style: "cancel" },
        { text: "כן, ניצחה! 🏆", onPress: () => handleRoundResult(teamLetter) },
      ]
    );
  }

  async function handleRatePlayer(ratedUserId: string, rating: number) {
    setMyMatchRatings((prev) => ({ ...prev, [ratedUserId]: rating }));
    await supabase.from("match_player_ratings").upsert({
      match_id: id!,
      rated_user_id: ratedUserId,
      rated_by: profile!.id,
      rating,
    }, { onConflict: "match_id,rated_user_id,rated_by" });
  }

  async function handleConfirmPayment() {
    await supabase.from("payments").update({
      status: "paid", confirmed_at: new Date().toISOString(), confirmed_by: profile!.id,
    }).eq("match_id", id!).eq("user_id", profile!.id);
  }

  // ── Render ────────────────────────────────────────────────────

  if (!match) return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-gray-500">טוען...</Text>
    </View>
  );

  const myPayment = payments.find((p) => p.user_id === profile?.id);
  const splitOptions = suggestSplits(confirmed.length);

  return (
    <>
      <ScrollView
        className="flex-1 bg-gray-50"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {/* ── Header ── */}
        <View className="bg-primary-600 pt-4 pb-10 px-6">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-white opacity-80">→ חזרה</Text>
          </TouchableOpacity>
          <View className="flex-row-reverse items-center gap-2 mb-1">
            <Text className="text-white text-2xl font-bold text-right flex-1">{match.title}</Text>
            {isActive && <View className="bg-green-400 rounded-full px-3 py-1"><Text className="text-white text-xs font-bold">🔴 פעיל</Text></View>}
          </View>
          <Text className="text-white opacity-80 text-right text-sm">{formatMatchDate(match.scheduled_at)}</Text>
          <Text className="text-white opacity-70 text-sm text-right">📍 {match.pitch_name}</Text>
        </View>

        {/* ── Tab Bar ── */}
        <View className="flex-row-reverse bg-white border-b border-gray-200 -mt-2 z-10">
          {(["register", "teams", "rounds"] as const).map((tab) => {
            const labels = { register: "הרשמה", teams: "קבוצות", rounds: "משחקונים" };
            const disabled = tab === "rounds" && !isActive && !isFinished;
            return (
              <TouchableOpacity
                key={tab}
                className={`flex-1 py-3 items-center border-b-2 ${activeTab === tab ? "border-primary-600" : "border-transparent"} ${disabled ? "opacity-30" : ""}`}
                onPress={() => !disabled && setActiveTab(tab)}
                disabled={disabled}
              >
                <Text className={`font-medium text-sm ${activeTab === tab ? "text-primary-600" : "text-gray-500"}`}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="px-4 pt-4">

          {/* ═══════════════ TAB: הרשמה ═══════════════ */}
          {activeTab === "register" && (
            <View>
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
                <View className="flex-row-reverse justify-between items-center mb-3">
                  <Text className="text-gray-900 font-bold">מי בא? ({confirmed.length}/{match.max_players})</Text>
                  {isFull && <Text className="text-orange-500 text-xs font-medium">המשחק מלא</Text>}
                </View>

                {confirmed.length === 0 ? (
                  <Text className="text-gray-400 text-sm text-center py-3">עדיין אין נרשמים</Text>
                ) : (
                  confirmed.map((r) => (
                    <View key={r.user_id} className="flex-row-reverse items-center py-1.5">
                      <Text className="text-primary-600 ml-2">✓</Text>
                      <Text className="text-gray-800">{r.user.nickname ?? r.user.full_name}</Text>
                    </View>
                  ))
                )}

                {waiting.length > 0 && (
                  <View className="mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-gray-400 text-xs text-right mb-1">רשימת המתנה ({waiting.length})</Text>
                    {waiting.map((r) => (
                      <View key={r.user_id} className="flex-row-reverse items-center py-1.5">
                        <Text className="text-yellow-500 ml-2">⏳</Text>
                        <Text className="text-gray-500">{r.user.nickname ?? r.user.full_name}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {!isFinished && (
                  <TouchableOpacity
                    className={`mt-4 rounded-xl py-3 items-center ${myReg && myReg.status !== "cancelled" ? "bg-red-50 border border-red-200" : "bg-primary-600"}`}
                    onPress={handleRegister}
                  >
                    <Text className={myReg && myReg.status !== "cancelled" ? "text-red-500 font-medium" : "text-white font-bold"}>
                      {myReg?.status === "confirmed" ? "❌ לא אגיע" :
                       myReg?.status === "waiting" ? "❌ הסר מרשימת המתנה" :
                       isFull ? "⏳ רשימת המתנה" : "✅ אני בא!"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Payments */}
              {(isActive || isFinished) && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
                  <Text className="text-gray-900 font-bold text-right mb-3">תשלומים</Text>
                  {myPayment?.status === "pending" && (
                    <View className="mb-3">
                      <TouchableOpacity className="bg-primary-600 rounded-xl py-3 items-center mb-2" onPress={handleConfirmPayment}>
                        <Text className="text-white font-bold">✅ שילמתי!</Text>
                      </TouchableOpacity>
                      {match.team?.whatsapp_payment_link && (
                        <TouchableOpacity className="border border-primary-600 rounded-xl py-2 items-center" onPress={() => Linking.openURL(match.team.whatsapp_payment_link!)}>
                          <Text className="text-primary-600 font-medium text-sm">פתח קישור תשלום</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  {isAdmin && payments.map((p) => (
                    <View key={p.user_id} className="flex-row-reverse items-center py-2">
                      <Text className={`ml-2 text-base ${p.status === "paid" ? "text-primary-600" : "text-red-400"}`}>{p.status === "paid" ? "✅" : "❌"}</Text>
                      <Text className="text-gray-900 flex-1 text-right">{p.user.nickname ?? p.user.full_name}</Text>
                      {p.status !== "paid" && isManager && match.team?.whatsapp_payment_link && (
                        <TouchableOpacity onPress={() => Linking.openURL(buildPaymentReminderUrl(p.user.phone, match.team.whatsapp_payment_link!, match.title))}>
                          <Text className="text-green-500 text-xs">שלח תזכורת</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* ── Post-match player ratings ── */}
              {isFinished && confirmed.length > 0 && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
                  <Text className="text-gray-900 font-bold text-right mb-1">דרג את השחקנים</Text>
                  <Text className="text-gray-400 text-xs text-right mb-3">
                    הדירוג משפיע על ממוצע הפרופיל של כל שחקן
                  </Text>
                  {confirmed
                    .filter((r) => r.user_id !== profile?.id)
                    .map((r) => {
                      const given = myMatchRatings[r.user_id] ?? 0;
                      return (
                        <View key={r.user_id} className="flex-row-reverse items-center justify-between py-2 border-b border-gray-50">
                          <Text className="text-gray-800 text-sm flex-1 text-right">
                            {r.user.nickname ?? r.user.full_name}
                          </Text>
                          <View className="flex-row gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <TouchableOpacity key={star} onPress={() => handleRatePlayer(r.user_id, star)}>
                                <Ionicons
                                  name={star <= given ? "star" : "star-outline"}
                                  size={22}
                                  color={given > 0 ? "#f59e0b" : "#d1d5db"}
                                />
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}
            </View>
          )}

          {/* ═══════════════ TAB: קבוצות ═══════════════ */}
          {activeTab === "teams" && (
            <View>
              {/* Shuffle controls (admin, only before match starts) */}
              {isAdmin && !isActive && !isFinished && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
                  <Text className="text-gray-900 font-bold text-right mb-1">חלוקה לפי דירוג</Text>
                  <Text className="text-gray-400 text-xs text-right mb-3">
                    מחלק את השחקנים שנרשמו ({confirmed.length}) לקבוצות מאוזנות
                  </Text>

                  {/* Editable ratings per confirmed player */}
                  {confirmed.length > 0 && (
                    <View className="mb-4 border-t border-gray-100 pt-3">
                      <Text className="text-gray-500 text-xs text-right mb-2">דירוג שחקנים (לפני השרבוט)</Text>
                      {confirmed.map((r) => (
                        <View key={r.user_id} className="flex-row-reverse items-center justify-between py-1.5">
                          <Text className="text-gray-800 text-sm flex-1 text-right">
                            {r.user.nickname ?? r.user.full_name}
                          </Text>
                          <View className="flex-row gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <TouchableOpacity
                                key={star}
                                onPress={async () => {
                                  setPlayerRatings((prev) => ({ ...prev, [r.user_id]: star }));
                                  await supabase.from("team_members")
                                    .update({ skill_rating: star })
                                    .eq("team_id", match!.team_id)
                                    .eq("user_id", r.user_id);
                                }}
                              >
                                <Ionicons
                                  name={star <= (playerRatings[r.user_id] ?? 3) ? "star" : "star-outline"}
                                  size={18}
                                  color="#16a34a"
                                />
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {splitOptions.length > 1 && (
                    <View className="flex-row-reverse flex-wrap gap-2 mb-3">
                      {splitOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt.numTeams}
                          className={`rounded-xl px-4 py-2 border ${numTeams === opt.numTeams ? "bg-primary-600 border-primary-600" : "bg-white border-gray-200"}`}
                          onPress={() => setNumTeams(opt.numTeams)}
                        >
                          <Text className={`text-sm font-medium ${numTeams === opt.numTeams ? "text-white" : "text-gray-700"}`}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    className={`rounded-xl py-3 flex-row-reverse items-center justify-center ${confirmed.length < 2 ? "bg-gray-200" : "bg-primary-600"}`}
                    onPress={handleShuffle}
                    disabled={confirmed.length < 2}
                  >
                    <Ionicons name="shuffle" size={18} color={confirmed.length < 2 ? "#9ca3af" : "white"} style={{ marginLeft: 6 }} />
                    <Text className={`font-bold ${confirmed.length < 2 ? "text-gray-400" : "text-white"}`}>
                      {confirmed.length < 2 ? "צריך לפחות 2 נרשמים" : "ערבב קבוצות אוטומטית"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Teams display */}
              {currentTeams.length > 0 ? (
                <View className="mb-4">
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {currentTeams.map((team) => (
                      <View
                        key={team.letter}
                        style={{ backgroundColor: team.cfg.bg, borderColor: team.cfg.border, borderWidth: 1.5, flex: 1, minWidth: "47%", borderRadius: 16, padding: 14 }}
                      >
                        <Text style={{ color: team.cfg.text, fontWeight: "700", fontSize: 16, textAlign: "center", marginBottom: 8 }}>
                          קבוצה {team.cfg.name}
                        </Text>
                        {team.playerIds.map((uid) => (
                          <Text key={uid} className="text-gray-700 text-center text-sm py-0.5">
                            {getName(uid)}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>

                  {/* Start match button */}
                  {isAdmin && !isActive && !isFinished && (
                    <TouchableOpacity
                      className="bg-primary-600 rounded-2xl py-4 items-center"
                      onPress={() => Alert.alert("התחל משחק", "לצאת לשחק?", [
                        { text: "ביטול", style: "cancel" },
                        { text: "התחל! ⚽", onPress: handleStartMatch },
                      ])}
                    >
                      <Text className="text-white font-bold text-lg">התחל משחק ⚽</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View className="items-center py-10">
                  <Text className="text-gray-400">עדיין לא חולקו קבוצות</Text>
                  {isAdmin && <Text className="text-gray-400 text-sm mt-1">בקש שחקנים להירשם ולחץ ערבב</Text>}
                </View>
              )}
            </View>
          )}

          {/* ═══════════════ TAB: משחקונים ═══════════════ */}
          {activeTab === "rounds" && (isActive || isFinished) && gameState && (
            <View>

              {/* ── FINISHED: Match Summary ── */}
              {isFinished && (
                <View className="mb-4">
                  {/* Winning team */}
                  {matchResult?.winning_team_letter ? (() => {
                    const winTeam = currentTeams.find((t) => t.letter === matchResult.winning_team_letter);
                    if (!winTeam) return null;
                    return (
                      <View style={{ backgroundColor: winTeam.cfg.bg, borderColor: winTeam.cfg.border, borderWidth: 2, borderRadius: 20, padding: 16, marginBottom: 12 }}>
                        <Text style={{ color: winTeam.cfg.text, fontWeight: "800", fontSize: 18, textAlign: "center", marginBottom: 4 }}>
                          🏆 קבוצה {winTeam.cfg.name} ניצחה!
                        </Text>
                        <View className="flex-row justify-center flex-wrap gap-2 mt-2">
                          {winTeam.playerIds.map((uid) => (
                            <View key={uid} style={{ backgroundColor: winTeam.cfg.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                              <Text style={{ color: winTeam.cfg.text, fontWeight: "600", fontSize: 13 }}>{getName(uid)}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })() : (
                    <View className="bg-gray-100 rounded-2xl p-4 mb-3 items-center">
                      <Text className="text-gray-600 font-bold text-lg">🤝 תיקו</Text>
                    </View>
                  )}

                  {/* MVP + Low */}
                  <View className="flex-row gap-2 mb-3">
                    {matchResult?.mvp_user_id && (
                      <View className="flex-1 bg-yellow-50 border border-yellow-300 rounded-xl p-3 items-center">
                        <Text className="text-2xl mb-1">🏅</Text>
                        <Text className="text-yellow-700 font-bold text-sm text-center">{getName(matchResult.mvp_user_id)}</Text>
                        <Text className="text-yellow-500 text-xs">מצטיין</Text>
                      </View>
                    )}
                    {matchResult?.low_user_id && (
                      <View className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 items-center">
                        <Text className="text-2xl mb-1">💩</Text>
                        <Text className="text-red-500 font-bold text-sm text-center">{getName(matchResult.low_user_id)}</Text>
                        <Text className="text-red-400 text-xs">שחקן שפל</Text>
                      </View>
                    )}
                  </View>

                  {/* Average ratings */}
                  {Object.keys(avgRatings).length > 0 && (
                    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
                      <Text className="text-gray-900 font-bold text-right mb-3">דירוגי שחקנים</Text>
                      {confirmed.map((r) => {
                        const avg = avgRatings[r.user_id];
                        if (!avg) return null;
                        return (
                          <View key={r.user_id} className="flex-row-reverse items-center justify-between py-1.5 border-b border-gray-50">
                            <Text className="text-gray-800 text-sm flex-1 text-right">{r.user.nickname ?? r.user.full_name}</Text>
                            <View className="flex-row items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Ionicons key={s} name={s <= Math.round(avg) ? "star" : "star-outline"} size={14} color="#f59e0b" />
                              ))}
                              <Text className="text-gray-500 text-xs ml-1">{avg}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Stopwatch */}
              {isActive && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 items-center">
                  <Text className="text-6xl font-mono font-bold text-gray-900 mb-4 tracking-widest">
                    {formatStopwatch(elapsed)}
                  </Text>
                  <View className="flex-row gap-3">
                    {!match.stopwatch_running ? (
                      <TouchableOpacity className="bg-primary-600 rounded-xl px-10 py-2.5" onPress={() => handleStopwatch("start")}>
                        <Text className="text-white font-bold text-base">▶ התחל</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity className="bg-yellow-500 rounded-xl px-10 py-2.5" onPress={() => handleStopwatch("stop")}>
                        <Text className="text-white font-bold text-base">⏸ עצור</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity className="bg-gray-200 rounded-xl px-5 py-2.5" onPress={() => handleStopwatch("reset")}>
                      <Text className="text-gray-700 font-bold text-lg">↺</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Points scoreboard */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
                <Text className="text-gray-900 font-bold text-right mb-3">לוח ניקוד</Text>
                <View className="flex-row-reverse flex-wrap gap-2">
                  {teamLetters.map((letter) => {
                    const cfg = cfgFor(letter);
                    const pts = gameState.points[letter] ?? 0;
                    const isPlaying = gameState.playing.includes(letter);
                    return (
                      <View
                        key={letter}
                        style={{ backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: isPlaying ? 2 : 1, borderRadius: 12, padding: 10, flex: 1, minWidth: "28%", alignItems: "center" }}
                      >
                        <Text style={{ color: cfg.text, fontWeight: "700", fontSize: 13 }}>קבוצה {cfg.name}</Text>
                        <Text style={{ color: cfg.text, fontWeight: "800", fontSize: 22 }}>{pts}</Text>
                        <Text className="text-gray-400 text-xs">{isPlaying ? "🎮 משחקת" : "⏳ ממתינה"}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Current game court */}
              {isActive && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
                  <Text className="text-gray-500 text-xs text-center mb-3">מחזור {rounds.length + 1} — לחץ על הקבוצה שניצחה</Text>
                  <View className="flex-row gap-3 mb-3">
                    {gameState.playing.map((letter) => {
                      const cfg = cfgFor(letter);
                      const team = currentTeams.find((t) => t.letter === letter);
                      return (
                        <TouchableOpacity
                          key={letter}
                          style={{ backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 2, borderRadius: 16, flex: 1, padding: 14 }}
                          onPress={() => promptRoundResult(letter)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: cfg.text, fontWeight: "800", fontSize: 15, textAlign: "center", marginBottom: 6 }}>
                            קבוצה {cfg.name}
                          </Text>
                          {team?.playerIds.map((uid) => (
                            <Text key={uid} className="text-gray-700 text-center text-xs py-0.5">
                              {getName(uid)}
                            </Text>
                          ))}
                          <View style={{ marginTop: 10, backgroundColor: cfg.border, borderRadius: 8, paddingVertical: 6 }}>
                            <Text style={{ color: cfg.text, textAlign: "center", fontWeight: "700", fontSize: 13 }}>🏆 ניצחה!</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    className="bg-gray-100 rounded-xl py-3 items-center"
                    onPress={() => Alert.alert("תיקו", "1 נקודה לכל קבוצה", [
                      { text: "ביטול", style: "cancel" },
                      { text: "אישור תיקו", onPress: () => handleRoundResult(null) },
                    ])}
                  >
                    <Text className="text-gray-600 font-medium">🤝 תיקו (+1 לכל קבוצה)</Text>
                  </TouchableOpacity>

                  {gameState.waiting.length > 0 && (
                    <View className="mt-3 pt-3 border-t border-gray-100">
                      <Text className="text-gray-400 text-xs text-center mb-2">ממתינה לשחק</Text>
                      <View className="flex-row justify-center gap-2">
                        {gameState.waiting.map((letter) => {
                          const cfg = cfgFor(letter);
                          return (
                            <View key={letter} style={{ backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                              <Text style={{ color: cfg.text, fontWeight: "600", fontSize: 13 }}>קבוצה {cfg.name}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Round history */}
              {rounds.length > 0 && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
                  <Text className="text-gray-900 font-bold text-right mb-3">היסטוריית מחזורים</Text>
                  {[...rounds].reverse().map((r) => {
                    const winCfg = r.winner ? cfgFor(r.winner) : null;
                    const t1cfg = cfgFor(r.team1_letter);
                    const t2cfg = cfgFor(r.team2_letter);
                    return (
                      <View key={r.id || r.round_number} className="flex-row-reverse items-center py-2 border-b border-gray-50">
                        <Text className="text-gray-400 text-xs w-12 text-right">מחזור {r.round_number}</Text>
                        <View className="flex-1 flex-row-reverse items-center justify-center gap-1">
                          <Text style={{ color: t1cfg.text, fontWeight: "600", fontSize: 12 }}>{t1cfg.name}</Text>
                          <Text className="text-gray-400 text-xs">vs</Text>
                          <Text style={{ color: t2cfg.text, fontWeight: "600", fontSize: 12 }}>{t2cfg.name}</Text>
                        </View>
                        <Text style={{ color: winCfg?.text ?? "#6b7280", fontWeight: "700", fontSize: 12, minWidth: 60, textAlign: "left" }}>
                          {r.winner ? `🏆 ${winCfg?.name}` : "🤝 תיקו"}
                        </Text>
                        {r.duration_sec ? <Text className="text-gray-400 text-xs w-12 text-left">{formatStopwatch(r.duration_sec)}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* End match */}
              {isAdmin && isActive && (
                <TouchableOpacity
                  className="bg-red-500 rounded-2xl py-4 items-center mb-8"
                  onPress={() => setShowEndSheet(true)}
                >
                  <Text className="text-white font-bold text-lg">🏁 סיים משחק</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        </View>
      </ScrollView>

      {showEndSheet && (
        <EndMatchSheet
          matchId={id!}
          teamId={match.team_id}
          players={confirmed}
          teams={currentTeams.map((t) => ({ letter: t.letter, name: t.cfg.name, bg: t.cfg.bg, border: t.cfg.border, text: t.cfg.text }))}
          onClose={() => setShowEndSheet(false)}
          onDone={() => { setShowEndSheet(false); load(); }}
        />
      )}
    </>
  );
}
