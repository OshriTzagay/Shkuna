import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

interface Stats {
  matches_played: number;
  mvp_count: number;
  avg_rating: number | null;
}

export default function ProfileScreen() {
  const { profile, signOut, fetchProfile } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ matches_played: 0, mvp_count: 0, avg_rating: null });
  const [editModal, setEditModal] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setNickname(profile.nickname ?? "");
    loadStats();
  }, [profile]);

  async function loadStats() {
    if (!profile) return;

    const { count: matchCount } = await supabase
      .from("match_registrations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("status", "confirmed");

    const { count: mvpCount } = await supabase
      .from("match_results")
      .select("*", { count: "exact", head: true })
      .eq("mvp_user_id", profile.id);

    const { data: ratingData } = await supabase
      .from("match_player_ratings")
      .select("rating")
      .eq("rated_user_id", profile.id);

    const avg = ratingData && ratingData.length > 0
      ? ratingData.reduce((s, r) => s + r.rating, 0) / ratingData.length
      : null;

    setStats({
      matches_played: matchCount ?? 0,
      mvp_count: mvpCount ?? 0,
      avg_rating: avg,
    });
  }

  async function handleSave() {
    if (!fullName.trim()) { Alert.alert("שגיאה", "שם מלא הוא חובה"); return; }
    setSaving(true);
    await supabase.from("users").update({
      full_name: fullName.trim(),
      nickname: nickname.trim() || null,
    }).eq("id", profile!.id);
    await fetchProfile();
    setSaving(false);
    setEditModal(false);
  }

  if (!profile) return (
    <View className="flex-1 bg-gray-50 items-center justify-center px-6">
      <Text className="text-gray-400 mb-6">הפרופיל לא נטען</Text>
      <TouchableOpacity
        className="bg-red-500 rounded-xl px-8 py-3"
        onPress={signOut}
      >
        <Text className="text-white font-bold">התנתק</Text>
      </TouchableOpacity>
    </View>
  );

  const displayName = profile.nickname ?? profile.full_name;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-600 pt-14 pb-10 px-6 items-center">
        <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-3">
          <Text className="text-primary-600 font-bold text-3xl">
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-white text-2xl font-bold">{displayName}</Text>
        {profile.nickname && (
          <Text className="text-white opacity-80 text-sm">{profile.full_name}</Text>
        )}
        <Text className="text-white opacity-60 text-sm mt-1">{profile.phone}</Text>
      </View>

      <View className="px-4 -mt-4">
        {/* Stats */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <Text className="text-gray-900 font-bold text-right mb-3">סטטיסטיקות</Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-primary-600">{stats.matches_played}</Text>
              <Text className="text-gray-500 text-xs">משחקים</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-yellow-500">{stats.mvp_count}</Text>
              <Text className="text-gray-500 text-xs">MVP 🏅</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-500">
                {stats.avg_rating ? stats.avg_rating.toFixed(1) : "—"}
              </Text>
              <Text className="text-gray-500 text-xs">דירוג ממוצע</Text>
            </View>
          </View>
        </View>

        {/* Edit profile */}
        <TouchableOpacity
          className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 flex-row-reverse items-center"
          onPress={() => setEditModal(true)}
        >
          <Ionicons name="person-outline" size={20} color="#6b7280" style={{ marginLeft: 8 }} />
          <Text className="text-gray-900 flex-1 text-right">ערוך פרופיל</Text>
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          className="bg-white rounded-2xl p-4 mb-8 border border-gray-100 flex-row-reverse items-center"
          onPress={() => Alert.alert("יציאה", "האם אתה בטוח?", [
            { text: "ביטול", style: "cancel" },
            { text: "יציאה", style: "destructive", onPress: signOut },
          ])}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginLeft: 8 }} />
          <Text className="text-red-500 flex-1 text-right">התנתק</Text>
        </TouchableOpacity>
      </View>

      {/* Edit modal */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white px-6 pt-8">
          <View className="flex-row-reverse justify-between items-center mb-6">
            <Text className="text-2xl font-bold">ערוך פרופיל</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text className="text-gray-700 font-medium mb-2 text-right">שם מלא</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-4"
            value={fullName}
            onChangeText={setFullName}
            textAlign="right"
          />

          <Text className="text-gray-700 font-medium mb-2 text-right">כינוי</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-8"
            placeholder='למשל: "המלך", "שניצל"'
            value={nickname}
            onChangeText={setNickname}
            textAlign="right"
            maxLength={20}
          />

          <TouchableOpacity
            className="bg-primary-600 rounded-xl py-4 items-center"
            onPress={handleSave}
            disabled={saving}
          >
            <Text className="text-white font-bold text-base">
              {saving ? "שומר..." : "שמור שינויים"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}
