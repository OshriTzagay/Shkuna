import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabase";
import { formatMatchDate } from "@shkuna/utils";
import type { Match, Team } from "@shkuna/db";

interface NextMatch extends Match {
  team: Team;
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [nextMatch, setNextMatch] = useState<NextMatch | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!profile) return;

    // fetch teams I'm in
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id, teams(*)")
      .eq("user_id", profile.id)
      .eq("is_active", true);

    const teams = (memberships ?? [])
      .map((m) => m.teams as any)
      .filter(Boolean);
    setMyTeams(teams);

    if (teams.length === 0) return;

    // find next match across all my teams
    const teamIds = teams.map((t) => t.id);
    const { data: matches } = await supabase
      .from("matches")
      .select("*, team:teams(*)")
      .in("team_id", teamIds)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1);

    setNextMatch((matches?.[0] as NextMatch) ?? null);
  }

  useEffect(() => { load(); }, [profile]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const displayName = profile?.nickname ?? profile?.full_name ?? "שחקן";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View className="bg-primary-600 pt-14 pb-8 px-6">
        <Text className="text-white text-base opacity-80">שלום,</Text>
        <Text className="text-white text-3xl font-bold">{displayName} ⚽</Text>
      </View>

      <View className="px-4 -mt-4">
        {/* Next match card */}
        {nextMatch ? (
          <TouchableOpacity
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100"
            onPress={() => router.push(`/match/${nextMatch.id}`)}
          >
            <Text className="text-gray-500 text-xs mb-1 text-right">המשחק הבא שלך</Text>
            <Text className="text-gray-900 text-xl font-bold text-right mb-1">
              {nextMatch.title}
            </Text>
            <Text className="text-primary-600 font-medium text-right">
              {formatMatchDate(nextMatch.scheduled_at)}
            </Text>
            <Text className="text-gray-500 text-sm text-right mt-1">
              📍 {nextMatch.pitch_name}
            </Text>
            <View className="bg-primary-50 rounded-xl px-4 py-2 mt-3 items-center">
              <Text className="text-primary-700 font-medium">לפרטי המשחק ←</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100 items-center">
            <Text className="text-4xl mb-2">😴</Text>
            <Text className="text-gray-500">אין משחקים קרובים</Text>
          </View>
        )}

        {/* My teams */}
        {myTeams.length > 0 ? (
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <Text className="text-gray-900 font-bold text-base mb-3 text-right">
              הקבוצות שלי
            </Text>
            {myTeams.map((team) => (
              <TouchableOpacity
                key={team.id}
                className="flex-row-reverse items-center py-3 border-b border-gray-50 last:border-0"
                onPress={() => router.push(`/team/${team.id}`)}
              >
                <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center ml-3">
                  <Text className="text-primary-600 font-bold">
                    {team.name.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium text-right">{team.name}</Text>
                  <Text className="text-gray-500 text-sm text-right">{team.city}</Text>
                </View>
                <Text className="text-gray-400 text-lg">←</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* No teams — onboarding */}
        {myTeams.length === 0 && (
          <View className="bg-white rounded-2xl p-6 mb-4 border border-gray-100 items-center">
            <Text className="text-5xl mb-3">🏟️</Text>
            <Text className="text-gray-900 font-bold text-lg mb-1">ברוך הבא לשכונה!</Text>
            <Text className="text-gray-500 text-center text-sm mb-4">
              צור קבוצה חדשה או הצטרף לקבוצה קיימת
            </Text>
            <TouchableOpacity
              className="bg-primary-600 rounded-xl px-6 py-3 mb-2 w-full items-center"
              onPress={() => router.push("/team/create")}
            >
              <Text className="text-white font-bold">צור קבוצה חדשה</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
