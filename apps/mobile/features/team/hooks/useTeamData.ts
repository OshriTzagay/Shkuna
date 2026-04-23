import { useState, useCallback, useEffect } from "react";
import { Alert, Linking } from "react-native";
import { supabase } from "@/lib/supabase";
import { buildWhatsAppInviteUrlForPhone, displayName, formatMatchDate } from "@shkuna/utils";
import type { Team, TeamMember, Match, UserRole } from "@shkuna/db";

export interface MemberWithUser extends TeamMember {
  user: { id: string; full_name: string; nickname: string | null };
}

export interface MatchWithResult extends Match {
  result: { mvp_user_id: string | null; total_rounds: number | null } | null;
}

export interface TeamWithData extends Team {
  jersey_holder_id: string | null;
  jersey_colors: Record<string, string>;
  members: MemberWithUser[];
}

export function useTeamData(teamId: string, profileId: string) {
  const [team, setTeam] = useState<TeamWithData | null>(null);
  const [myRole, setMyRole] = useState<UserRole | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [pastMatches, setPastMatches] = useState<MatchWithResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: rawTeam } = await supabase
      .from("teams")
      .select("*, members:team_members(*, user:users(id, full_name, nickname))")
      .eq("id", teamId)
      .single();
    if (!rawTeam) return;

    const data = rawTeam as unknown as Team & {
      members: MemberWithUser[];
      jersey_holder_id: string | null;
      jersey_colors: Record<string, string>;
      whatsapp_payment_link: string | null;
    };

    const [{ data: upcoming }, { data: past }] = await Promise.all([
      supabase
        .from("matches")
        .select("*")
        .eq("team_id", teamId)
        .in("status", ["scheduled", "active"])
        .order("scheduled_at", { ascending: true })
        .limit(5),
      supabase
        .from("matches")
        .select("*, result:match_results(mvp_user_id, total_rounds)")
        .eq("team_id", teamId)
        .eq("status", "finished")
        .order("scheduled_at", { ascending: false })
        .limit(20),
    ]);

    setTeam({
      ...data,
      members: data.members as MemberWithUser[],
      jersey_holder_id: data.jersey_holder_id ?? null,
      jersey_colors: (data.jersey_colors as Record<string, string>) ?? {},
    });
    setUpcomingMatches(upcoming ?? []);
    setPastMatches((past ?? []) as MatchWithResult[]);

    const me = (data.members as MemberWithUser[]).find((m) => m.user_id === profileId);
    setMyRole(me?.role ?? null);
  }, [teamId, profileId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  // ── Derived ────────────────────────────────────────────────────
  const activeMembers = team?.members.filter((m) => m.is_active) ?? [];
  const isAdmin = myRole === "manager" || myRole === "assistant";
  const isManager = myRole === "manager";

  // ── Actions ────────────────────────────────────────────────────
  const sendInvite = useCallback(
    async (invitePhone: string, onDone: () => void) => {
      if (!invitePhone.trim() || !team) return;
      const name = displayName({
        id: profileId,
        full_name: team.members.find((m) => m.user_id === profileId)?.user.full_name ?? "",
        nickname: team.members.find((m) => m.user_id === profileId)?.user.nickname ?? null,
        skill_rating: 3,
      });
      const url = buildWhatsAppInviteUrlForPhone(invitePhone, team.name, name, team.invite_token);
      await Linking.openURL(url);
      onDone();
    },
    [team, profileId]
  );

  const savePaymentLink = useCallback(
    async (link: string, onDone: () => void) => {
      await supabase.from("teams").update({ whatsapp_payment_link: link }).eq("id", teamId);
      setTeam((prev) => (prev ? { ...prev, whatsapp_payment_link: link } : prev));
      onDone();
      Alert.alert("נשמר", "קישור התשלום עודכן");
    },
    [teamId]
  );

  const updateSkillRating = useCallback(
    async (userId: string, rating: number) => {
      await supabase
        .from("team_members")
        .update({ skill_rating: rating })
        .eq("team_id", teamId)
        .eq("user_id", userId);
      setTeam((prev) =>
        prev
          ? { ...prev, members: prev.members.map((m) => m.user_id === userId ? { ...m, skill_rating: rating } : m) }
          : prev
      );
    },
    [teamId]
  );

  const updateRole = useCallback(
    async (userId: string, role: UserRole) => {
      await supabase
        .from("team_members")
        .update({ role })
        .eq("team_id", teamId)
        .eq("user_id", userId);
      load();
    },
    [teamId, load]
  );

  const setJerseyHolder = useCallback(
    async (userId: string | null, onDone: () => void) => {
      await supabase.from("teams").update({ jersey_holder_id: userId }).eq("id", teamId);
      setTeam((prev) => (prev ? { ...prev, jersey_holder_id: userId } : prev));
      onDone();
    },
    [teamId]
  );

  const updateJerseyColor = useCallback(
    async (letter: string, color: string) => {
      const next = { ...(team?.jersey_colors ?? {}), [letter]: color };
      await supabase.from("teams").update({ jersey_colors: next }).eq("id", teamId);
      setTeam((prev) => (prev ? { ...prev, jersey_colors: next } : prev));
    },
    [teamId, team?.jersey_colors]
  );

  const syncRatingsFromMatches = useCallback(async () => {
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
              .eq("team_id", teamId)
              .eq("status", "finished")
              .order("scheduled_at", { ascending: false })
              .limit(5);

            if (!lastMatches?.length) {
              Alert.alert("אין נתונים", "לא נמצאו משחקים עם דירוגים");
              return;
            }

            const { data: ratings } = await supabase
              .from("match_player_ratings")
              .select("rated_user_id, rating")
              .in("match_id", lastMatches.map((m) => m.id));

            if (!ratings?.length) {
              Alert.alert("אין דירוגים", "לא נמצאו דירוגים במשחקים האחרונים");
              return;
            }

            const sums: Record<string, number[]> = {};
            ratings.forEach((r) => {
              if (!sums[r.rated_user_id]) sums[r.rated_user_id] = [];
              sums[r.rated_user_id]!.push(r.rating);
            });

            let updatedCount = 0;
            for (const [userId, vals] of Object.entries(sums)) {
              const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
              await supabase
                .from("team_members")
                .update({ skill_rating: Math.min(5, Math.max(1, Math.round(avg))) })
                .eq("team_id", teamId)
                .eq("user_id", userId);
              updatedCount++;
            }

            await load();
            Alert.alert("עודכן ✅", `דירוגים של ${updatedCount} שחקנים עודכנו`);
          },
        },
      ]
    );
  }, [teamId, load]);

  // ── Helpers ────────────────────────────────────────────────────
  const getJerseyHolderName = useCallback((): string | null => {
    if (!team?.jersey_holder_id) return null;
    const m = activeMembers.find((m) => m.user_id === team.jersey_holder_id);
    return m ? (m.user.nickname ?? m.user.full_name) : null;
  }, [team, activeMembers]);

  const getMvpName = useCallback(
    (mvpId: string | null): string | null => {
      if (!mvpId) return null;
      const m = activeMembers.find((m) => m.user_id === mvpId);
      return m ? (m.user.nickname ?? m.user.full_name) : null;
    },
    [activeMembers]
  );

  return {
    team, myRole, upcomingMatches, pastMatches, refreshing,
    activeMembers, isAdmin, isManager,
    load, onRefresh,
    sendInvite, savePaymentLink, updateSkillRating, updateRole,
    setJerseyHolder, updateJerseyColor, syncRatingsFromMatches,
    getJerseyHolderName, getMvpName,
  };
}
