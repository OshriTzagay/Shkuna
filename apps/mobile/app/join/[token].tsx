import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import type { Team } from "@shkuna/db";

export const PENDING_INVITE_KEY = "pending_invite_token";

export default function JoinTeamScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { session, profile } = useAuthStore();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    async function lookup() {
      const { data } = await supabase
        .from("teams")
        .select("*")
        .eq("invite_token", token!)
        .single();
      setTeam(data);

      if (data && profile) {
        const { data: membership } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", data.id)
          .eq("user_id", profile.id)
          .single();
        setAlreadyMember(!!membership);
      }
      setLoading(false);
    }
    lookup();
  }, [token, profile]);

  async function handleJoin() {
    if (!session) {
      await SecureStore.setItemAsync(PENDING_INVITE_KEY, token!);
      router.push("/(auth)/login");
      return;
    }

    if (!team || !profile) return;
    setJoining(true);

    const { error } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: profile.id,
      role: "player",
      skill_rating: 3,
    });

    setJoining(false);
    if (error && error.code !== "23505") {
      Alert.alert("שגיאה", "לא הצלחנו להצטרף לקבוצה");
      return;
    }
    router.replace(`/team/${team.id}`);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!team) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-4xl mb-4">❌</Text>
        <Text className="text-xl font-bold text-gray-900 mb-2">קישור לא תקין</Text>
        <Text className="text-gray-500 text-center">
          הקישור הזה לא קיים או פג תוקפו
        </Text>
      </View>
    );
  }

  if (alreadyMember) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-4xl mb-4">✅</Text>
        <Text className="text-xl font-bold text-gray-900 mb-2">
          כבר בקבוצה!
        </Text>
        <Text className="text-gray-500 text-center mb-6">
          אתה כבר חבר בקבוצת {team.name}
        </Text>
        <TouchableOpacity
          className="bg-primary-600 rounded-xl px-8 py-3"
          onPress={() => router.replace(`/team/${team.id}`)}
        >
          <Text className="text-white font-bold">עבור לקבוצה</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-6xl mb-4">🏟️</Text>
      <Text className="text-gray-500 mb-1">הוזמנת להצטרף ל-</Text>
      <Text className="text-3xl font-bold text-gray-900 mb-1 text-center">
        {team.name}
      </Text>
      <Text className="text-gray-500 mb-8">📍 {team.city}</Text>

      <TouchableOpacity
        className="bg-primary-600 rounded-xl px-10 py-4 w-full items-center mb-3"
        onPress={handleJoin}
        disabled={joining}
      >
        <Text className="text-white font-bold text-lg">
          {joining ? "מצטרף..." : "הצטרף לקבוצה ⚽"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(tabs)/home")}>
        <Text className="text-gray-400 text-sm">לא עכשיו</Text>
      </TouchableOpacity>
    </View>
  );
}
