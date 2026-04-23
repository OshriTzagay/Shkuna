import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from "react-native";
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
  Button,
  Avatar,
  Badge,
  EmptyState,
  SectionTitle,
  PressableScale,
  FadeInUp,
} from "@/components/ui";

interface NextMatch extends Match {
  team: Team;
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const [nextMatch, setNextMatch] = useState<NextMatch | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (!profile) return;

    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id, teams(*)")
      .eq("user_id", profile.id)
      .eq("is_active", true);

    const teams = (memberships ?? [])
      .map((m) => m.teams as any)
      .filter(Boolean);
    setMyTeams(teams);

    if (teams.length === 0) {
      setNextMatch(null);
      setLoaded(true);
      return;
    }

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
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, [profile]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const displayName = profile?.nickname ?? profile?.full_name ?? "שחקן";

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <HeroHeader
          subtitle="שלום שחקן,"
          title={displayName + " ⚽"}
          rightSlot={
            <View style={{ flexDirection: "row-reverse" }}>
              <Avatar name={displayName} size={42} />
            </View>
          }
        />

        <View style={{ paddingHorizontal: 16, marginTop: -18, gap: 14 }}>
          {/* ── Next match ── */}
          <FadeInUp delay={50}>
            {nextMatch ? (
              <PressableScale onPress={() => router.push(`/match/${nextMatch.id}`)}>
                <Card variant="elevated" glow padding={18}>
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <Badge label="המשחק הבא שלך" tone="primary" />
                    <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
                  </View>

                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 22,
                      fontWeight: "800",
                      textAlign: "right",
                      marginBottom: 6,
                    }}
                  >
                    {nextMatch.title}
                  </Text>

                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                      {formatMatchDate(nextMatch.scheduled_at)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {nextMatch.pitch_name}
                    </Text>
                  </View>

                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: colors.primaryDim,
                      borderRadius: 14,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderWidth: 1,
                      borderColor: colors.primaryMuted,
                    }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>פרטי המשחק</Text>
                    <Ionicons name="arrow-back" size={16} color={colors.primary} />
                  </View>
                </Card>
              </PressableScale>
            ) : (
              loaded && myTeams.length > 0 && (
                <EmptyState
                  emoji="😴"
                  title="אין משחקים קרובים"
                  subtitle="ברגע שיתוזמן משחק תראה אותו כאן"
                />
              )
            )}
          </FadeInUp>

          {/* ── My teams ── */}
          {myTeams.length > 0 && (
            <FadeInUp delay={150}>
              <SectionTitle title={`הקבוצות שלי (${myTeams.length})`} />
              <Card padding={6}>
                {myTeams.map((team, idx) => (
                  <PressableScale
                    key={team.id}
                    onPress={() => router.push(`/team/${team.id}`)}
                    scaleTo={0.985}
                  >
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: colors.border,
                      }}
                    >
                      <Avatar name={team.name} size={42} />
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                          style={{
                            color: colors.textPrimary,
                            fontSize: 15,
                            fontWeight: "700",
                            textAlign: "right",
                          }}
                        >
                          {team.name}
                        </Text>
                        <Text
                          style={{
                            color: colors.textMuted,
                            fontSize: 12,
                            textAlign: "right",
                            marginTop: 2,
                          }}
                        >
                          📍 {team.city}
                        </Text>
                      </View>
                      <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                    </View>
                  </PressableScale>
                ))}
              </Card>
            </FadeInUp>
          )}

          {/* ── Onboarding (no teams) ── */}
          {loaded && myTeams.length === 0 && (
            <FadeInUp delay={200}>
              <EmptyState
                emoji="🏟️"
                title="ברוך הבא לשכונה!"
                subtitle="צור קבוצה חדשה או הצטרף לקבוצה קיימת דרך קישור הזמנה"
                action={
                  <Button
                    label="צור קבוצה חדשה"
                    icon="add-circle"
                    onPress={() => router.push("/team/create")}
                  />
                }
              />
            </FadeInUp>
          )}

          {/* ── Quick action shortcut ── */}
          {myTeams.length > 0 && (
            <FadeInUp delay={250}>
              <PressableScale onPress={() => router.push("/team/create")}>
                <Card variant="outline" padding={14}>
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 10,
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>צור קבוצה נוספת</Text>
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
