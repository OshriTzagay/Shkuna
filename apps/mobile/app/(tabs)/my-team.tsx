import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { formatMatchDate } from "@shkuna/utils";
import type { Team, Match } from "@shkuna/db";
import { useTheme } from "@/hooks/useTheme";
import {
  Screen,
  HeroHeader,
  Card,
  Avatar,
  Badge,
  EmptyState,
  PressableScale,
  FadeInUp,
} from "@/components/ui";

interface TeamWithMatches extends Team {
  matches: Match[];
  member_count: number;
  my_role: string;
}

export default function MyTeamScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const [teams, setTeams] = useState<TeamWithMatches[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (!profile) return;
    const { data } = await supabase
      .from("team_members")
      .select("role, teams(*, team_members(count))")
      .eq("user_id", profile.id)
      .eq("is_active", true);

    if (!data) {
      setLoaded(true);
      return;
    }

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
    setLoaded(true);
  }

  useEffect(() => { load(); }, [profile]);

  function roleLabel(r: string) {
    return r === "manager" ? "מנהל" : r === "assistant" ? "עוזר מנהל" : "שחקן";
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <HeroHeader
          subtitle="ניהול קבוצות"
          title="הקבוצות שלי"
          emoji="🏟️"
        />

        <View style={{ paddingHorizontal: 16, marginTop: -18, gap: 14 }}>
          {/* ── Create team CTA ── */}
          <FadeInUp delay={50}>
            <PressableScale onPress={() => router.push("/team/create")}>
              <Card variant="tinted" padding={14}>
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    gap: 10,
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add-circle" size={22} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 15 }}>
                    צור קבוצה חדשה
                  </Text>
                </View>
              </Card>
            </PressableScale>
          </FadeInUp>

          {/* ── Empty state ── */}
          {loaded && teams.length === 0 && (
            <FadeInUp delay={120}>
              <EmptyState
                emoji="⚽"
                title="עדיין לא בקבוצה"
                subtitle="הצטרף לקבוצה דרך קישור הזמנה או צור אחת חדשה"
              />
            </FadeInUp>
          )}

          {/* ── Teams ── */}
          {teams.map((team, i) => (
            <FadeInUp key={team.id} delay={120 + i * 60}>
              <Card padding={14}>
                <PressableScale
                  onPress={() => router.push(`/team/${team.id}`)}
                  scaleTo={0.99}
                >
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: team.matches.length > 0 ? 12 : 0,
                    }}
                  >
                    <Avatar name={team.name} size={50} />
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.textPrimary,
                            fontSize: 16,
                            fontWeight: "800",
                          }}
                        >
                          {team.name}
                        </Text>
                        <Badge
                          label={roleLabel(team.my_role)}
                          tone={team.my_role === "manager" ? "primary" : team.my_role === "assistant" ? "info" : "neutral"}
                        />
                      </View>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 12,
                          textAlign: "right",
                          marginTop: 4,
                        }}
                      >
                        📍 {team.city}  ·  👥 {team.member_count} שחקנים
                      </Text>
                    </View>
                    <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                  </View>
                </PressableScale>

                {team.matches.length > 0 && (
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      paddingTop: 10,
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: 11,
                        textAlign: "right",
                        fontWeight: "700",
                      }}
                    >
                      משחקים קרובים
                    </Text>
                    {team.matches.map((match) => (
                      <PressableScale
                        key={match.id}
                        onPress={() => router.push(`/match/${match.id}`)}
                        scaleTo={0.985}
                      >
                        <View
                          style={{
                            flexDirection: "row-reverse",
                            alignItems: "center",
                            backgroundColor: colors.bgSurface,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: colors.primaryDim,
                              alignItems: "center",
                              justifyContent: "center",
                              marginLeft: 10,
                            }}
                          >
                            <Ionicons name="football" size={18} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                color: colors.textPrimary,
                                fontSize: 13,
                                fontWeight: "700",
                                textAlign: "right",
                              }}
                            >
                              {match.title}
                            </Text>
                            <Text
                              style={{
                                color: colors.textMuted,
                                fontSize: 11,
                                textAlign: "right",
                              }}
                            >
                              {formatMatchDate(match.scheduled_at)}
                            </Text>
                          </View>
                          <Ionicons name="chevron-back" size={14} color={colors.textMuted} />
                        </View>
                      </PressableScale>
                    ))}
                  </View>
                )}

                {(team.my_role === "manager" || team.my_role === "assistant") && (
                  <PressableScale
                    onPress={() => router.push(`/match/create?teamId=${team.id}`)}
                  >
                    <View
                      style={{
                        marginTop: 10,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: colors.primary,
                        paddingVertical: 9,
                        alignItems: "center",
                        flexDirection: "row-reverse",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                        צור משחק חדש
                      </Text>
                    </View>
                  </PressableScale>
                )}
              </Card>
            </FadeInUp>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
