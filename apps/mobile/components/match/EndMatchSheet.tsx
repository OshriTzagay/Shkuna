import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getPointsDelta } from "@shkuna/utils";
import type { MatchRegistration } from "@shkuna/db";
import { useTheme } from "@/hooks/useTheme";
import {
  Card,
  Button,
  Avatar,
  PressableScale,
  TabSwitcher,
} from "@/components/ui";

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
  onClose: () => void;
  onDone: () => void;
}

export default function EndMatchSheet({
  matchId,
  teamId,
  players,
  teams,
  onClose,
  onDone,
}: Props) {
  const { colors } = useTheme();
  const [winner, setWinner] = useState<string | null>(null);
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [lowId, setLowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"result" | "mvp">("result");

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
      const { data: team } = await supabase
        .from("teams")
        .select("total_points")
        .eq("id", teamId)
        .single();
      if (team) {
        await supabase
          .from("teams")
          .update({ total_points: (team.total_points ?? 0) + delta })
          .eq("id", teamId);
      }
    } else if (winner === "draw") {
      const delta = getPointsDelta("draw");
      const { data: team } = await supabase
        .from("teams")
        .select("total_points")
        .eq("id", teamId)
        .single();
      if (team) {
        await supabase
          .from("teams")
          .update({ total_points: (team.total_points ?? 0) + delta })
          .eq("id", teamId);
      }
    }

    setLoading(false);
    Alert.alert("המשחק הסתיים! 🏁", "תוצאות נשמרו");
    onDone();
  }

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View
            style={{
              paddingTop: 18,
              paddingHorizontal: 22,
              paddingBottom: 14,
              flexDirection: "row-reverse",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "800" }}>
              סיום משחק 🏁
            </Text>
            <PressableScale onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </PressableScale>
          </View>

          <View style={{ paddingHorizontal: 22, paddingTop: 12 }}>
            <TabSwitcher
              value={step}
              options={[
                { id: "result", label: "תוצאה" },
                { id: "mvp", label: "מצטיין" },
              ]}
              onChange={(v) => setStep(v as any)}
            />
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 22, paddingTop: 18, gap: 12, paddingBottom: 60 }}
          >
            {step === "result" && (
              <>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: "800",
                    textAlign: "right",
                    fontSize: 15,
                    marginBottom: 4,
                  }}
                >
                  מי ניצח?
                </Text>

                {teams.map((team) => {
                  const active = winner === team.letter;
                  return (
                    <PressableScale key={team.letter} onPress={() => setWinner(team.letter)}>
                      <View
                        style={{
                          backgroundColor: active ? team.bg : colors.bgSurface,
                          borderColor: active ? team.border : colors.border,
                          borderWidth: 2,
                          borderRadius: 16,
                          paddingVertical: 16,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: active ? team.text : colors.textPrimary,
                            fontWeight: "800",
                            fontSize: 16,
                          }}
                        >
                          {active ? "✓ " : ""}קבוצה {team.name} ניצחה
                        </Text>
                      </View>
                    </PressableScale>
                  );
                })}

                <PressableScale onPress={() => setWinner("draw")}>
                  <View
                    style={{
                      backgroundColor: winner === "draw" ? colors.bgSubtle : colors.bgSurface,
                      borderColor: winner === "draw" ? colors.borderStrong : colors.border,
                      borderWidth: 2,
                      borderRadius: 16,
                      paddingVertical: 16,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: winner === "draw" ? colors.textPrimary : colors.textSecondary,
                        fontWeight: "800",
                        fontSize: 15,
                      }}
                    >
                      {winner === "draw" ? "✓ " : ""}🤝 תיקו
                    </Text>
                  </View>
                </PressableScale>

                <Button
                  label="הבא"
                  iconRight="arrow-back"
                  size="lg"
                  onPress={() => setStep("mvp")}
                />
              </>
            )}

            {step === "mvp" && (
              <>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: "800",
                    textAlign: "right",
                    fontSize: 15,
                    marginBottom: 4,
                  }}
                >
                  🏅 מצטיין המשחק
                </Text>
                {players.map((p) => {
                  const active = mvpId === p.user_id;
                  return (
                    <PressableScale
                      key={`mvp-${p.user_id}`}
                      onPress={() => setMvpId(active ? null : p.user_id)}
                    >
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          alignItems: "center",
                          padding: 12,
                          borderRadius: 14,
                          backgroundColor: active ? colors.warningDim : colors.bgSurface,
                          borderWidth: 1,
                          borderColor: active ? colors.warning + "55" : colors.border,
                          gap: 12,
                        }}
                      >
                        <Avatar name={p.user.full_name} size={36} tone="neutral" />
                        <Text
                          style={{
                            color: active ? colors.warning : colors.textPrimary,
                            fontWeight: active ? "800" : "600",
                            flex: 1,
                            textAlign: "right",
                          }}
                        >
                          {dn(p)}
                        </Text>
                        {active && <Text style={{ fontSize: 22 }}>🏅</Text>}
                      </View>
                    </PressableScale>
                  );
                })}

                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: "800",
                    textAlign: "right",
                    fontSize: 15,
                    marginTop: 12,
                    marginBottom: 4,
                  }}
                >
                  💩 שחקן שפל (רשות)
                </Text>
                {players.map((p) => {
                  const active = lowId === p.user_id;
                  return (
                    <PressableScale
                      key={`low-${p.user_id}`}
                      onPress={() => setLowId(active ? null : p.user_id)}
                    >
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          alignItems: "center",
                          padding: 12,
                          borderRadius: 14,
                          backgroundColor: active ? colors.errorDim : colors.bgSurface,
                          borderWidth: 1,
                          borderColor: active ? colors.error + "55" : colors.border,
                          gap: 12,
                        }}
                      >
                        <Avatar name={p.user.full_name} size={36} tone="neutral" />
                        <Text
                          style={{
                            color: active ? colors.error : colors.textPrimary,
                            fontWeight: active ? "800" : "600",
                            flex: 1,
                            textAlign: "right",
                          }}
                        >
                          {dn(p)}
                        </Text>
                        {active && <Text style={{ fontSize: 22 }}>💩</Text>}
                      </View>
                    </PressableScale>
                  );
                })}

                <Card variant="tinted" padding={16} style={{ alignItems: "center", marginTop: 8 }}>
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>🤖</Text>
                  <Text style={{ color: colors.primary, fontWeight: "800", marginBottom: 2 }}>
                    סיכום AI — בקרוב!
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
                    כתבה קומית שתצחיק את כל השכונה
                  </Text>
                </Card>

                <Button
                  label={loading ? "שומר..." : "סיים משחק 🏁"}
                  variant="danger"
                  size="lg"
                  loading={loading}
                  onPress={handleFinish}
                />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
