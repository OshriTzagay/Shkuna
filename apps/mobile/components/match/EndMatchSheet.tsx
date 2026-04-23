import { useState } from "react";
import { View, Text, ScrollView, Modal, Alert, Platform, KeyboardAvoidingView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getPointsDelta } from "@shkuna/utils";
import type { MatchRegistration } from "@shkuna/db";
import { useTheme } from "@/hooks/useTheme";
import { Card, Button, Avatar, PressableScale, TabSwitcher } from "@/components/ui";

interface RegWithUser extends MatchRegistration {
  user: { id: string; full_name: string; nickname: string | null };
}
interface TeamInfo {
  letter: string;
  name: string;
  bg: string;
  border: string;
  text: string;
}
interface Props {
  matchId: string;
  teamId: string;
  players: RegWithUser[];
  teams: TeamInfo[];
  points: Record<string, number>;
  onClose: () => void;
  onDone: () => void;
}

// Determine winner from points: returns letter, "draw", or null (no rounds played)
function calcWinner(points: Record<string, number>): string | "draw" | null {
  const entries = Object.entries(points);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, v]) => v));
  if (max === 0) return null;
  const winners = entries.filter(([, v]) => v === max);
  return winners.length === 1 ? winners[0]![0] : "draw";
}

export default function EndMatchSheet({ matchId, teamId, players, teams, points, onClose, onDone }: Props) {
  const { colors } = useTheme();
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [lowId, setLowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"mvp" | "ai">("mvp");

  const winner = calcWinner(points);
  const winnerTeam = winner && winner !== "draw" ? teams.find((t) => t.letter === winner) : null;
  const dn = (p: RegWithUser) => p.user.nickname ?? p.user.full_name;

  async function handleFinish() {
    setLoading(true);

    await supabase.from("match_results").upsert({
      match_id: matchId,
      mvp_user_id: mvpId,
      low_user_id: lowId,
      winning_team_letter: winner === "draw" ? null : winner,
      total_rounds: null,
    });

    await supabase.from("matches").update({ status: "finished" }).eq("id", matchId);

    if (winner && winner !== "draw") {
      const delta = getPointsDelta("win");
      const { data: team } = await supabase.from("teams").select("total_points").eq("id", teamId).single();
      if (team) await supabase.from("teams").update({ total_points: (team.total_points ?? 0) + delta }).eq("id", teamId);
    } else if (winner === "draw") {
      const delta = getPointsDelta("draw");
      const { data: team } = await supabase.from("teams").select("total_points").eq("id", teamId).single();
      if (team) await supabase.from("teams").update({ total_points: (team.total_points ?? 0) + delta }).eq("id", teamId);
    }

    setLoading(false);
    onDone();
  }

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

          {/* Header */}
          <View style={{ paddingTop: 18, paddingHorizontal: 22, paddingBottom: 14, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "800" }}>סיום משחק 🏁</Text>
            <PressableScale onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </PressableScale>
          </View>

          {/* Winner banner — auto-calculated */}
          {winner && (
            <View style={{
              marginHorizontal: 22,
              marginTop: 16,
              padding: 14,
              borderRadius: 16,
              backgroundColor: winnerTeam ? winnerTeam.bg : colors.bgSurface,
              borderWidth: 2,
              borderColor: winnerTeam ? winnerTeam.border : colors.border,
              alignItems: "center",
            }}>
              <Text style={{ color: winnerTeam ? winnerTeam.text : colors.textPrimary, fontWeight: "900", fontSize: 17 }}>
                {winnerTeam ? `🏆 קבוצה ${winnerTeam.name} ניצחה!` : "🤝 תיקו"}
              </Text>
              {/* Points summary */}
              <View style={{ flexDirection: "row-reverse", gap: 12, marginTop: 8 }}>
                {teams.map((t) => (
                  <View key={t.letter} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.border }} />
                    <Text style={{ color: t.text, fontSize: 12, fontWeight: "700" }}>
                      {t.name} {points[t.letter] ?? 0}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tabs */}
          <View style={{ paddingHorizontal: 22, paddingTop: 14 }}>
            <TabSwitcher
              value={tab}
              options={[
                { id: "mvp", label: "🏅 מצטיין" },
                { id: "ai",  label: "🤖 סיכום AI" },
              ]}
              onChange={(v) => setTab(v as any)}
            />
          </View>

          <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 16, gap: 10, paddingBottom: 60 }}>

            {/* ── MVP tab ── */}
            {tab === "mvp" && (
              <>
                <Text style={{ color: colors.textPrimary, fontWeight: "800", textAlign: "right", fontSize: 15 }}>
                  🏅 מצטיין המשחק
                </Text>
                {players.map((p) => {
                  const active = mvpId === p.user_id;
                  return (
                    <PressableScale key={`mvp-${p.user_id}`} onPress={() => setMvpId(active ? null : p.user_id)}>
                      <View style={{ flexDirection: "row-reverse", alignItems: "center", padding: 12, borderRadius: 14, backgroundColor: active ? colors.warningDim : colors.bgSurface, borderWidth: 1, borderColor: active ? colors.warning + "55" : colors.border, gap: 12 }}>
                        <Avatar name={p.user.full_name} size={36} tone="neutral" />
                        <Text style={{ color: active ? colors.warning : colors.textPrimary, fontWeight: active ? "800" : "600", flex: 1, textAlign: "right" }}>
                          {dn(p)}
                        </Text>
                        {active && <Text style={{ fontSize: 22 }}>🏅</Text>}
                      </View>
                    </PressableScale>
                  );
                })}

                <Text style={{ color: colors.textPrimary, fontWeight: "800", textAlign: "right", fontSize: 15, marginTop: 8 }}>
                  💩 שחקן שפל (רשות)
                </Text>
                {players.map((p) => {
                  const active = lowId === p.user_id;
                  return (
                    <PressableScale key={`low-${p.user_id}`} onPress={() => setLowId(active ? null : p.user_id)}>
                      <View style={{ flexDirection: "row-reverse", alignItems: "center", padding: 12, borderRadius: 14, backgroundColor: active ? colors.errorDim : colors.bgSurface, borderWidth: 1, borderColor: active ? colors.error + "55" : colors.border, gap: 12 }}>
                        <Avatar name={p.user.full_name} size={36} tone="neutral" />
                        <Text style={{ color: active ? colors.error : colors.textPrimary, fontWeight: active ? "800" : "600", flex: 1, textAlign: "right" }}>
                          {dn(p)}
                        </Text>
                        {active && <Text style={{ fontSize: 22 }}>💩</Text>}
                      </View>
                    </PressableScale>
                  );
                })}

                <Button
                  label={loading ? "שומר..." : "סיים משחק 🏁"}
                  variant="danger"
                  size="lg"
                  loading={loading}
                  onPress={() =>
                    Alert.alert("לסיים?", "לא ניתן לבטל לאחר הסיום", [
                      { text: "ביטול", style: "cancel" },
                      { text: "סיים", style: "destructive", onPress: handleFinish },
                    ])
                  }
                />
              </>
            )}

            {/* ── AI tab ── */}
            {tab === "ai" && (
              <View style={{ alignItems: "center", paddingVertical: 24, gap: 16 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 36 }}>🤖</Text>
                </View>
                <Text style={{ color: colors.textPrimary, fontWeight: "900", fontSize: 20 }}>
                  סיכום AI
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 22 }}>
                  כתבה קומית שתסכם את המשחק,{"\n"}תדרג שחקנים ותצחיק את כל השכונה.
                </Text>
                <Card variant="tinted" padding={16} style={{ width: "100%" }}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                    <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: "700", flex: 1, textAlign: "right" }}>
                      בקרוב — Phase 2
                    </Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "right", marginTop: 6 }}>
                    GPT-4o יכתוב כתבה עם דירוגי שחקנים, רגעי שיא וסטטיסטיקות
                  </Text>
                </Card>
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
