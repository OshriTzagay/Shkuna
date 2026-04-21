import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Linking, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { buildWhatsAppInviteUrlForPhone, displayName, formatMatchDate } from "@shkuna/utils";
import type { Team, TeamMember, Match, UserRole } from "@shkuna/db";

interface MemberWithUser extends TeamMember {
  user: { id: string; full_name: string; nickname: string | null };
}
interface MatchWithResult extends Match {
  result: { mvp_user_id: string | null; total_rounds: number | null } | null;
}
interface TeamWithData extends Team {
  jersey_holder_id: string | null;
  members: MemberWithUser[];
}

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [team, setTeam] = useState<TeamWithData | null>(null);
  const [myRole, setMyRole] = useState<UserRole | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [pastMatches, setPastMatches] = useState<MatchWithResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showJerseyModal, setShowJerseyModal] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [paymentLink, setPaymentLink] = useState("");

  async function load() {
    const { data: rawTeam } = await supabase
      .from("teams")
      .select("*, members:team_members(*, user:users(id, full_name, nickname))")
      .eq("id", id!)
      .single();
    if (!rawTeam) return;
    const data = rawTeam as unknown as Team & { members: MemberWithUser[]; jersey_holder_id: string | null; whatsapp_payment_link: string | null };

    const { data: upcoming } = await supabase
      .from("matches")
      .select("*")
      .eq("team_id", id!)
      .in("status", ["scheduled", "active"])
      .order("scheduled_at", { ascending: true })
      .limit(5);

    const { data: past } = await supabase
      .from("matches")
      .select("*, result:match_results(mvp_user_id, total_rounds)")
      .eq("team_id", id!)
      .eq("status", "finished")
      .order("scheduled_at", { ascending: false })
      .limit(20);

    setTeam({ ...data, members: data.members as MemberWithUser[], jersey_holder_id: data.jersey_holder_id ?? null });
    setUpcomingMatches(upcoming ?? []);
    setPastMatches((past ?? []) as MatchWithResult[]);
    setPaymentLink(data.whatsapp_payment_link ?? "");

    const me = (data.members as MemberWithUser[]).find((m) => m.user_id === profile?.id);
    setMyRole(me?.role ?? null);
  }

  useEffect(() => { load(); }, [id]);

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const isAdmin = myRole === "manager" || myRole === "assistant";
  const isManager = myRole === "manager";
  const activeMembers = team?.members.filter((m) => m.is_active) ?? [];

  async function handleSendInvite() {
    if (!invitePhone.trim() || !team) return;
    const inviterName = displayName({ id: profile!.id, full_name: profile!.full_name, nickname: profile!.nickname, skill_rating: 3 });
    const url = buildWhatsAppInviteUrlForPhone(invitePhone, team.name, inviterName, team.invite_token);
    await Linking.openURL(url);
    setInvitePhone("");
  }

  async function handleSavePaymentLink() {
    await supabase.from("teams").update({ whatsapp_payment_link: paymentLink }).eq("id", id!);
    setShowPaymentModal(false);
    Alert.alert("נשמר", "קישור התשלום עודכן");
  }

  async function updateSkillRating(userId: string, rating: number) {
    await supabase.from("team_members").update({ skill_rating: rating }).eq("team_id", id!).eq("user_id", userId);
    setTeam((prev) => prev ? {
      ...prev,
      members: prev.members.map((m) => m.user_id === userId ? { ...m, skill_rating: rating } : m),
    } : prev);
  }

  async function updateRole(userId: string, role: UserRole) {
    await supabase.from("team_members").update({ role }).eq("team_id", id!).eq("user_id", userId);
    load();
  }

  async function syncRatingsFromMatches() {
    Alert.alert(
      "עדכן דירוגים",
      "יחשב ממוצע דירוגים מ-5 המשחקים האחרונים ויעדכן את הכישורים. להמשיך?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "עדכן",
          onPress: async () => {
            const { data: lastMatches } = await supabase
              .from("matches")
              .select("id")
              .eq("team_id", id!)
              .eq("status", "finished")
              .order("scheduled_at", { ascending: false })
              .limit(5);

            if (!lastMatches || lastMatches.length === 0) {
              Alert.alert("אין נתונים", "לא נמצאו משחקים עם דירוגים");
              return;
            }

            const matchIds = lastMatches.map((m) => m.id);
            const { data: ratings } = await supabase
              .from("match_player_ratings")
              .select("rated_user_id, rating")
              .in("match_id", matchIds);

            if (!ratings || ratings.length === 0) {
              Alert.alert("אין דירוגים", "לא נמצאו דירוגים במשחקים האחרונים");
              return;
            }

            // compute avg per player, round to 1-5
            const sums: Record<string, number[]> = {};
            ratings.forEach((r) => {
              if (!sums[r.rated_user_id]) sums[r.rated_user_id] = [];
              sums[r.rated_user_id]!.push(r.rating);
            });

            let updatedCount = 0;
            for (const [userId, vals] of Object.entries(sums)) {
              const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
              const newRating = Math.min(5, Math.max(1, Math.round(avg)));
              await supabase.from("team_members")
                .update({ skill_rating: newRating })
                .eq("team_id", id!)
                .eq("user_id", userId);
              updatedCount++;
            }

            await load();
            Alert.alert("עודכן ✅", `דירוגים של ${updatedCount} שחקנים עודכנו`);
          },
        },
      ]
    );
  }

  async function setJerseyHolder(userId: string | null) {
    await supabase.from("teams").update({ jersey_holder_id: userId }).eq("id", id!);
    setTeam((prev) => prev ? { ...prev, jersey_holder_id: userId } : prev);
    setShowJerseyModal(false);
  }

  function getJerseyHolderName() {
    if (!team?.jersey_holder_id) return null;
    const m = activeMembers.find((m) => m.user_id === team.jersey_holder_id);
    return m ? (m.user.nickname ?? m.user.full_name) : null;
  }

  function getMvpName(mvpId: string | null) {
    if (!mvpId) return null;
    const m = activeMembers.find((m) => m.user_id === mvpId);
    return m ? (m.user.nickname ?? m.user.full_name) : null;
  }

  if (!team) return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-gray-500">טוען...</Text>
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View className="bg-primary-600 pt-4 pb-8 px-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-white opacity-80">→ חזרה</Text>
        </TouchableOpacity>
        <Text className="text-white text-3xl font-bold text-right">{team.name}</Text>
        <Text className="text-white opacity-80 text-right">📍 {team.city}</Text>
        <Text className="text-white opacity-60 text-sm text-right mt-1">{activeMembers.length} שחקנים</Text>
      </View>

      <View className="px-4 -mt-4">

        {/* Admin actions */}
        {isAdmin && (
          <View className="flex-row gap-2 mb-4">
            <TouchableOpacity
              className="flex-1 bg-primary-600 rounded-xl py-3 items-center"
              onPress={() => router.push(`/match/create?teamId=${id}`)}
            >
              <Text className="text-white font-bold">+ צור משחק</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white rounded-xl py-3 items-center border border-gray-200"
              onPress={() => setShowInviteModal(true)}
            >
              <Text className="text-gray-700 font-medium">הזמן שחקן</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Jersey holder */}
        <TouchableOpacity
          className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 flex-row-reverse items-center"
          onPress={() => isAdmin && setShowJerseyModal(true)}
          activeOpacity={isAdmin ? 0.7 : 1}
        >
          <Text className="text-2xl ml-3">👕</Text>
          <View className="flex-1">
            <Text className="text-gray-900 font-medium text-right">מחזיק גופיות</Text>
            <Text className="text-gray-500 text-sm text-right">
              {getJerseyHolderName() ?? "לא הוגדר"}
            </Text>
          </View>
          {isAdmin && <Ionicons name="chevron-back" size={16} color="#9ca3af" />}
        </TouchableOpacity>

        {/* Payment link (manager) */}
        {isManager && (
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 flex-row-reverse items-center"
            onPress={() => setShowPaymentModal(true)}
          >
            <Ionicons name="card-outline" size={20} color="#16a34a" style={{ marginLeft: 8 }} />
            <View className="flex-1">
              <Text className="text-gray-900 font-medium text-right">קישור תשלום</Text>
              <Text className="text-gray-500 text-sm text-right" numberOfLines={1}>
                {team.whatsapp_payment_link ? team.whatsapp_payment_link : "לא הוגדר"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Upcoming matches */}
        {upcomingMatches.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <Text className="text-gray-900 font-bold text-right mb-3">משחקים קרובים</Text>
            {upcomingMatches.map((match) => (
              <TouchableOpacity
                key={match.id}
                className="flex-row-reverse items-center py-3 border-b border-gray-50"
                onPress={() => router.push(`/match/${match.id}`)}
              >
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium text-right">{match.title}</Text>
                  <Text className="text-gray-500 text-sm text-right">📍 {match.pitch_name}</Text>
                  <Text className="text-gray-400 text-xs text-right">{formatMatchDate(match.scheduled_at)}</Text>
                </View>
                {match.status === "active" && (
                  <View className="bg-green-100 rounded-full px-2 py-0.5 ml-2">
                    <Text className="text-green-700 text-xs font-bold">פעיל</Text>
                  </View>
                )}
                <Ionicons name="chevron-back" size={16} color="#9ca3af" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Members list */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <View className="flex-row-reverse justify-between items-center mb-3">
            <Text className="text-gray-900 font-bold">שחקנים ({activeMembers.length})</Text>
            {isAdmin && (
              <TouchableOpacity
                className="flex-row items-center gap-1 bg-primary-50 px-3 py-1.5 rounded-xl"
                onPress={syncRatingsFromMatches}
              >
                <Ionicons name="sync-outline" size={14} color="#16a34a" />
                <Text className="text-primary-700 text-xs font-medium">עדכן דירוגים</Text>
              </TouchableOpacity>
            )}
          </View>
          {activeMembers.map((member) => (
            <View key={member.user_id} className="flex-row-reverse items-center py-3 border-b border-gray-50">
              <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center ml-3">
                <Text className="text-primary-700 font-bold text-sm">
                  {member.user.full_name.charAt(0)}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row-reverse items-center gap-1">
                  <Text className="text-gray-900 font-medium text-right">
                    {member.user.nickname ?? member.user.full_name}
                  </Text>
                  {team.jersey_holder_id === member.user_id && (
                    <Text className="text-base">👕</Text>
                  )}
                </View>
                <Text className="text-gray-400 text-xs text-right">
                  {member.role === "manager" ? "מנהל" : member.role === "assistant" ? "עוזר מנהל" : "שחקן"}
                  {member.user.nickname ? `  •  ${member.user.full_name}` : ""}
                </Text>
              </View>

              <View className="items-end gap-1">
                {/* Star rating */}
                <View className="flex-row gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => isAdmin && updateSkillRating(member.user_id, star)}
                      disabled={!isAdmin}
                    >
                      <Ionicons
                        name={star <= member.skill_rating ? "star" : "star-outline"}
                        size={14}
                        color="#16a34a"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Role change (manager only) */}
                {isManager && member.user_id !== profile?.id && (
                  <TouchableOpacity
                    onPress={() => Alert.alert(
                      "שנה תפקיד",
                      member.user.nickname ?? member.user.full_name,
                      [
                        { text: "שחקן", onPress: () => updateRole(member.user_id, "player") },
                        { text: "עוזר מנהל", onPress: () => updateRole(member.user_id, "assistant") },
                        { text: "ביטול", style: "cancel" },
                      ]
                    )}
                  >
                    <Text className="text-gray-400 text-xs">שנה תפקיד</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Match history */}
        {pastMatches.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">
            <Text className="text-gray-900 font-bold text-right mb-3">
              היסטוריית משחקים ({pastMatches.length})
            </Text>
            {pastMatches.map((match) => {
              const mvpName = getMvpName(match.result?.mvp_user_id ?? null);
              return (
                <TouchableOpacity
                  key={match.id}
                  className="py-3 border-b border-gray-50"
                  onPress={() => router.push(`/match/${match.id}`)}
                >
                  <View className="flex-row-reverse items-center justify-between">
                    <Text className="text-gray-900 font-medium text-right">{match.title}</Text>
                    <Ionicons name="chevron-back" size={14} color="#d1d5db" />
                  </View>
                  <Text className="text-gray-400 text-xs text-right mt-0.5">
                    {formatMatchDate(match.scheduled_at)}  •  📍 {match.pitch_name}
                  </Text>
                  <View className="flex-row-reverse gap-3 mt-1">
                    {match.result?.total_rounds ? (
                      <Text className="text-gray-500 text-xs">{match.result.total_rounds} מחזורים</Text>
                    ) : null}
                    {mvpName && (
                      <Text className="text-yellow-600 text-xs">🏆 MVP: {mvpName}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Invite modal */}
      <Modal visible={showInviteModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView className="flex-1 bg-white px-6 pt-8" behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View className="flex-row-reverse justify-between items-center mb-6">
            <Text className="text-2xl font-bold">הזמן שחקן</Text>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text className="text-gray-500 text-right mb-4">הכנס מספר טלפון ונשלח הזמנה בוואטסאפ</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-4"
            placeholder="050-000-0000" value={invitePhone} onChangeText={setInvitePhone}
            keyboardType="phone-pad" textAlign="right" autoFocus
          />
          <TouchableOpacity className="bg-green-500 rounded-xl py-4 items-center flex-row justify-center" onPress={handleSendInvite}>
            <Ionicons name="logo-whatsapp" size={20} color="white" style={{ marginLeft: 8 }} />
            <Text className="text-white font-bold text-base">שלח הזמנה בוואטסאפ</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment link modal */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView className="flex-1 bg-white px-6 pt-8" behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View className="flex-row-reverse justify-between items-center mb-6">
            <Text className="text-2xl font-bold">קישור תשלום</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text className="text-gray-500 text-right mb-4">קישור ביט / PayBox שישלח לשחקנים</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base text-left mb-4"
            placeholder="https://bit.ly/..." value={paymentLink} onChangeText={setPaymentLink}
            keyboardType="url" autoCapitalize="none" autoFocus
          />
          <TouchableOpacity className="bg-primary-600 rounded-xl py-4 items-center" onPress={handleSavePaymentLink}>
            <Text className="text-white font-bold text-base">שמור</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Jersey holder modal */}
      <Modal visible={showJerseyModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white px-6 pt-8">
          <View className="flex-row-reverse justify-between items-center mb-6">
            <Text className="text-2xl font-bold">מחזיק גופיות 👕</Text>
            <TouchableOpacity onPress={() => setShowJerseyModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text className="text-gray-500 text-right mb-4">בחר מי מחזיק את הגופיות של הקבוצה</Text>
          <ScrollView>
            {team.jersey_holder_id && (
              <TouchableOpacity
                className="py-3 border-b border-gray-100 flex-row-reverse items-center"
                onPress={() => setJerseyHolder(null)}
              >
                <Text className="text-red-500 text-right flex-1">הסר מחזיק גופיות</Text>
              </TouchableOpacity>
            )}
            {activeMembers.map((m) => (
              <TouchableOpacity
                key={m.user_id}
                className="py-3 border-b border-gray-100 flex-row-reverse items-center"
                onPress={() => setJerseyHolder(m.user_id)}
              >
                <Text className={`text-right flex-1 ${team.jersey_holder_id === m.user_id ? "text-primary-600 font-bold" : "text-gray-900"}`}>
                  {m.user.nickname ?? m.user.full_name}
                </Text>
                {team.jersey_holder_id === m.user_id && (
                  <Ionicons name="checkmark" size={18} color="#16a34a" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
