import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { formatMatchDate } from "@shkuna/utils";
import type { Team, Match } from "@shkuna/db";

interface TeamWithMatches extends Team {
  matches: Match[];
  member_count: number;
  my_role: string;
}

export default function MyTeamScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [teams, setTeams] = useState<TeamWithMatches[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!profile) return;
    const { data } = await supabase
      .from("team_members")
      .select("role, teams(*, team_members(count))")
      .eq("user_id", profile.id)
      .eq("is_active", true);

    if (!data) return;

    const result: TeamWithMatches[] = await Promise.all(
      data.map(async (m) => {
        const team = m.teams as unknown as Team & { team_members: { count: number }[] };
        const { data: matches } = await supabase
          .from("matches")
          .select("*")
          .eq("team_id", team.id)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
          .limit(3);
        return {
          ...team,
          matches: matches ?? [],
          member_count: team.team_members?.[0]?.count ?? 0,
          my_role: m.role,
        };
      })
    );
    setTeams(result);
  }

  useEffect(() => { load(); }, [profile]);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <View className="bg-primary-600 pt-14 pb-8 px-6">
        <Text className="text-white text-3xl font-bold">הקבוצות שלי</Text>
      </View>

      <View className="px-4 -mt-4">
        {/* Create team button */}
        <TouchableOpacity
          className="bg-white rounded-2xl p-4 mb-4 border border-dashed border-primary-400 flex-row-reverse items-center"
          onPress={() => router.push("/team/create")}
        >
          <Ionicons name="add-circle" size={24} color="#16a34a" style={{ marginLeft: 8 }} />
          <Text className="text-primary-600 font-medium">צור קבוצה חדשה</Text>
        </TouchableOpacity>

        {teams.length === 0 && (
          <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
            <Text className="text-4xl mb-3">⚽</Text>
            <Text className="text-gray-500 text-center">
              עדיין לא בקבוצה{"\n"}הצטרף לקבוצה דרך קישור הזמנה
            </Text>
          </View>
        )}

        {teams.map((team) => (
          <View key={team.id} className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            {/* Team header */}
            <TouchableOpacity
              className="flex-row-reverse items-center mb-3"
              onPress={() => router.push(`/team/${team.id}`)}
            >
              <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center ml-3">
                <Text className="text-primary-700 font-bold text-lg">{team.name.charAt(0)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base text-right">{team.name}</Text>
                <Text className="text-gray-500 text-sm text-right">
                  {team.city} · {team.member_count} שחקנים ·{" "}
                  <Text className="text-primary-600">
                    {team.my_role === "manager" ? "מנהל" : team.my_role === "assistant" ? "עוזר מנהל" : "שחקן"}
                  </Text>
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>

            {/* Upcoming matches */}
            {team.matches.length > 0 ? (
              <>
                <Text className="text-gray-400 text-xs text-right mb-2">משחקים קרובים</Text>
                {team.matches.map((match) => (
                  <TouchableOpacity
                    key={match.id}
                    className="bg-gray-50 rounded-xl px-3 py-2 mb-2 flex-row-reverse items-center"
                    onPress={() => router.push(`/match/${match.id}`)}
                  >
                    <View className="flex-1">
                      <Text className="text-gray-900 text-sm font-medium text-right">{match.title}</Text>
                      <Text className="text-gray-500 text-xs text-right">{formatMatchDate(match.scheduled_at)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text className="text-gray-400 text-sm text-center py-2">אין משחקים קרובים</Text>
            )}

            {/* Create match (admin) */}
            {(team.my_role === "manager" || team.my_role === "assistant") && (
              <TouchableOpacity
                className="border border-primary-600 rounded-xl py-2 items-center mt-2"
                onPress={() => router.push(`/match/create?teamId=${team.id}`)}
              >
                <Text className="text-primary-600 font-medium text-sm">+ צור משחק</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
