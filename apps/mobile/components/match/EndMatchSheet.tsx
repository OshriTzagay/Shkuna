import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getPointsDelta } from "@shkuna/utils";
import type { MatchRegistration } from "@shkuna/db";

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

export default function EndMatchSheet({ matchId, teamId, players, teams, onClose, onDone }: Props) {
  const [winner, setWinner] = useState<string | null>(null); // team letter or "draw"
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
      const { data: team } = await supabase.from("teams").select("total_points").eq("id", teamId).single();
      if (team) {
        await supabase.from("teams").update({ total_points: (team.total_points ?? 0) + delta }).eq("id", teamId);
      }
    } else if (winner === "draw") {
      const delta = getPointsDelta("draw");
      const { data: team } = await supabase.from("teams").select("total_points").eq("id", teamId).single();
      if (team) {
        await supabase.from("teams").update({ total_points: (team.total_points ?? 0) + delta }).eq("id", teamId);
      }
    }

    setLoading(false);
    Alert.alert("המשחק הסתיים! 🏁", "תוצאות נשמרו");
    onDone();
  }

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row-reverse justify-between items-center px-6 pt-8 pb-4 border-b border-gray-100">
          <Text className="text-2xl font-bold">סיום משחק 🏁</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Step tabs */}
        <View className="flex-row border-b border-gray-100">
          {(["result", "mvp"] as const).map((s, i) => (
            <TouchableOpacity
              key={s}
              className={`flex-1 py-3 items-center border-b-2 ${step === s ? "border-primary-600" : "border-transparent"}`}
              onPress={() => setStep(s)}
            >
              <Text className={`text-sm font-medium ${step === s ? "text-primary-600" : "text-gray-400"}`}>
                {i === 0 ? "תוצאה" : "מצטיין"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView className="flex-1 px-6 pt-6">

          {/* Step 1: Winner — dynamic teams */}
          {step === "result" && (
            <View>
              <Text className="text-gray-700 font-semibold text-right mb-4">מי ניצח?</Text>

              {teams.map((team) => (
                <TouchableOpacity
                  key={team.letter}
                  style={{
                    backgroundColor: winner === team.letter ? team.bg : "#f9fafb",
                    borderColor: winner === team.letter ? team.border : "#e5e7eb",
                    borderWidth: 2,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                  onPress={() => setWinner(team.letter)}
                >
                  <Text style={{ color: winner === team.letter ? team.text : "#374151", fontWeight: "700", fontSize: 16 }}>
                    {winner === team.letter ? "✓ " : ""}קבוצה {team.name} ניצחה
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                className={`rounded-xl py-4 items-center mb-4 border-2 ${winner === "draw" ? "bg-gray-100 border-gray-400" : "bg-white border-gray-200"}`}
                onPress={() => setWinner("draw")}
              >
                <Text className={`font-bold text-base ${winner === "draw" ? "text-gray-800" : "text-gray-500"}`}>
                  {winner === "draw" ? "✓ " : ""}🤝 תיקו
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-2 bg-primary-600 rounded-xl py-3 items-center"
                onPress={() => setStep("mvp")}
              >
                <Text className="text-white font-bold">הבא →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: MVP + שחקן שפל */}
          {step === "mvp" && (
            <View>
              <Text className="text-gray-700 font-bold text-right mb-4">🏅 מצטיין המשחק</Text>
              {players.map((p) => (
                <TouchableOpacity
                  key={`mvp-${p.user_id}`}
                  className={`flex-row-reverse items-center p-3 rounded-xl mb-2 ${mvpId === p.user_id ? "bg-yellow-50 border border-yellow-400" : "bg-gray-50"}`}
                  onPress={() => setMvpId(mvpId === p.user_id ? null : p.user_id)}
                >
                  <Text className="text-2xl ml-3">{mvpId === p.user_id ? "🏅" : "👤"}</Text>
                  <Text className="text-gray-900 font-medium">{dn(p)}</Text>
                </TouchableOpacity>
              ))}

              <Text className="text-gray-700 font-bold text-right mt-6 mb-4">💩 שחקן שפל (רשות)</Text>
              {players.map((p) => (
                <TouchableOpacity
                  key={`low-${p.user_id}`}
                  className={`flex-row-reverse items-center p-3 rounded-xl mb-2 ${lowId === p.user_id ? "bg-red-50 border border-red-300" : "bg-gray-50"}`}
                  onPress={() => setLowId(lowId === p.user_id ? null : p.user_id)}
                >
                  <Text className="text-2xl ml-3">{lowId === p.user_id ? "💩" : "👤"}</Text>
                  <Text className="text-gray-900 font-medium">{dn(p)}</Text>
                </TouchableOpacity>
              ))}

              {/* AI placeholder */}
              <View className="bg-purple-50 border border-purple-200 rounded-2xl p-4 my-4 items-center">
                <Text className="text-2xl mb-1">🤖</Text>
                <Text className="text-purple-700 font-bold mb-1">סיכום AI — בקרוב!</Text>
                <Text className="text-purple-500 text-sm text-center">כתבה קומית שתצחיק את כל השכונה</Text>
              </View>

              <TouchableOpacity
                className="bg-red-500 rounded-xl py-4 items-center mb-8"
                onPress={handleFinish}
                disabled={loading}
              >
                <Text className="text-white font-bold text-lg">{loading ? "שומר..." : "סיים משחק 🏁"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
