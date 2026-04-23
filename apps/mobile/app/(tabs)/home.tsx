import { useCallback, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabase";
import { formatMatchDate } from "@shkuna/utils";
import type { Match, Team } from "@shkuna/db";
import { useTheme } from "@/hooks/useTheme";
import {
  Screen,
  HeroHeader,
  Card,
  Avatar,
  Badge,
  PressableScale,
  FadeInUp,
  SectionTitle,
} from "@/components/ui";
import { useFocusEffect } from "expo-router";

interface NextMatch extends Match { team: Team }

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const [nextMatch, setNextMatch] = useState<NextMatch | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id, teams(*)")
      .eq("user_id", profile.id)
      .eq("is_active", true);

    const teams = (memberships ?? []).map((m) => m.teams as any).filter(Boolean);
    setMyTeams(teams);

    if (teams.length > 0) {
      const { data: matches } = await supabase
        .from("matches")
        .select("*, team:teams(*)")
        .in("team_id", teams.map((t: Team) => t.id))
        .in("status", ["scheduled", "active"])
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1);
      setNextMatch((matches?.[0] as NextMatch) ?? null);
    }
    setLoaded(true);
  }, [profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const displayName = profile?.nickname ?? profile?.full_name ?? "שחקן";
  const firstTeam = myTeams[0];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <HeroHeader
          subtitle="שלום,"
          title={displayName + " ⚽"}
          rightSlot={
            <View style={{ alignItems: "flex-end" }}>
              <Avatar name={displayName} size={42} />
            </View>
          }
        />

        <View style={{ paddingHorizontal: 16, marginTop: -18, gap: 14 }}>

          {/* ── Next match ── */}
          <FadeInUp delay={40}>
            {nextMatch ? (
              <PressableScale onPress={() => router.push(`/match/${nextMatch.id}`)}>
                <Card variant="elevated" glow padding={18}>
                  <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <Badge label="המשחק הבא שלך" tone="primary" />
                    {nextMatch.status === "active" && <Badge label="🔴 פעיל עכשיו" tone="success" />}
                  </View>
                  <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "800", textAlign: "right", marginBottom: 10 }}>
                    {nextMatch.title}
                  </Text>
                  <View style={{ gap: 5 }}>
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7 }}>
                      <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                        {formatMatchDate(nextMatch.scheduled_at)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7 }}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                        {nextMatch.pitch_name}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7 }}>
                      <Ionicons name="shield-outline" size={14} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                        {nextMatch.team.name}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 14, backgroundColor: colors.primaryDim, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.primaryMuted }}>
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>לדף המשחק</Text>
                    <Ionicons name="arrow-back" size={16} color={colors.primary} />
                  </View>
                </Card>
              </PressableScale>
            ) : loaded && (
              <Card padding={16}>
                <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 32 }}>😴</Text>
                  <Text style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 15 }}>אין משחקים קרובים</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>
                    {myTeams.length === 0 ? "הצטרף לקבוצה כדי לראות משחקים" : "ברגע שיתוזמן משחק תראה אותו כאן"}
                  </Text>
                </View>
              </Card>
            )}
          </FadeInUp>

          {/* ── Quick actions ── */}
          {loaded && (
            <FadeInUp delay={90}>
              <SectionTitle title="פעולות מהירות" />
              <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}>
                {firstTeam && (
                  <QuickAction
                    icon="shield"
                    label="הקבוצה שלי"
                    color={colors.primary}
                    bg={colors.primaryDim}
                    onPress={() => router.push(`/team/${firstTeam.id}`)}
                  />
                )}
                <QuickAction
                  icon="add-circle"
                  label="צור קבוצה"
                  color={colors.success}
                  bg={colors.successDim ?? colors.primaryDim}
                  onPress={() => router.push("/team/create")}
                />
                <QuickAction
                  icon="trophy-outline"
                  label="טבלה ארצית"
                  color={colors.warning}
                  bg={colors.warningDim}
                  onPress={() => {}}
                  comingSoon
                />
                <QuickAction
                  icon="star-outline"
                  label="שחקנים מובילים"
                  color={colors.textSecondary}
                  bg={colors.bgSurface}
                  onPress={() => {}}
                  comingSoon
                />
              </View>
            </FadeInUp>
          )}

          {/* ── My teams ── */}
          {myTeams.length > 0 && (
            <FadeInUp delay={140}>
              <SectionTitle title={`הקבוצות שלי (${myTeams.length})`} />
              <Card padding={6}>
                {myTeams.map((team, idx) => (
                  <PressableScale key={team.id} onPress={() => router.push(`/team/${team.id}`)} scaleTo={0.985}>
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.border, gap: 12 }}>
                      <Avatar name={team.name} size={42} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: "700", textAlign: "right" }}>{team.name}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "right", marginTop: 2 }}>📍 {team.city}</Text>
                      </View>
                      <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                    </View>
                  </PressableScale>
                ))}
              </Card>
            </FadeInUp>
          )}

          {/* ── Onboarding ── */}
          {loaded && myTeams.length === 0 && (
            <FadeInUp delay={260}>
              <PressableScale onPress={() => router.push("/team/create")}>
                <Card variant="outline" padding={18}>
                  <View style={{ alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 40 }}>🏟️</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: "800", fontSize: 17 }}>ברוך הבא לשכונה!</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>
                      צור קבוצה חדשה או הצטרף דרך קישור הזמנה
                    </Text>
                    <View style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22, marginTop: 4 }}>
                      <Text style={{ color: colors.primaryOnText, fontWeight: "800" }}>צור קבוצה</Text>
                    </View>
                  </View>
                </Card>
              </PressableScale>
            </FadeInUp>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function QuickAction({
  icon, label, color, bg, onPress, comingSoon,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
  comingSoon?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={comingSoon ? undefined : onPress} scaleTo={comingSoon ? 1 : 0.94} style={{ width: "47%" }}>
      <View style={{ backgroundColor: bg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: color + "30", gap: 8, opacity: comingSoon ? 0.65 : 1 }}>
        <Ionicons name={icon} size={24} color={color} />
        <View>
          <Text style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 13, textAlign: "right" }}>{label}</Text>
          {comingSoon && (
            <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: "right", marginTop: 2 }}>בקרוב</Text>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

