import { useEffect, useRef, useState } from "react";
import { View, Text, Alert, ActivityIndicator, Animated, Easing } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import type { Team } from "@shkuna/db";
import { useTheme } from "@/hooks/useTheme";
import {
  Screen,
  PitchDecor,
  Button,
  Card,
  Avatar,
  FadeInUp,
} from "@/components/ui";

export const PENDING_INVITE_KEY = "pending_invite_token";

export default function JoinTeamScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { session, profile } = useAuthStore();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  const ringSpin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(ringSpin, {
        toValue: 1,
        duration: 18000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, []);

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

  const spin = ringSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ fontSize: 48 }}>⚽</Text>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!team) {
    return (
      <Screen>
        <PitchDecor />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 56 }}>❌</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "800" }}>
            קישור לא תקין
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
            הקישור הזה לא קיים או פג תוקפו
          </Text>
          <Button label="חזרה למסך הראשי" onPress={() => router.replace("/")} />
        </View>
      </Screen>
    );
  }

  if (alreadyMember) {
    return (
      <Screen>
        <PitchDecor />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "800" }}>
            כבר בקבוצה!
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
            אתה כבר חבר בקבוצת {team.name}
          </Text>
          <Button
            label="עבור לקבוצה"
            icon="arrow-back"
            onPress={() => router.replace(`/team/${team.id}`)}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <PitchDecor />

      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <FadeInUp>
          <View style={{ alignItems: "center", marginBottom: 28 }}>
            <Animated.View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 1.5,
                borderColor: colors.primary + "30",
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotate: spin }],
              }}
            />
            <Text style={{ position: "absolute", fontSize: 64, top: 28 }}>🏟️</Text>
          </View>
        </FadeInUp>

        <FadeInUp delay={120}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            הוזמנת להצטרף ל-
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 32,
              fontWeight: "900",
              textAlign: "center",
              letterSpacing: -0.5,
            }}
          >
            {team.name}
          </Text>
          <Text
            style={{
              color: colors.primary,
              fontSize: 14,
              textAlign: "center",
              marginTop: 4,
              fontWeight: "700",
            }}
          >
            📍 {team.city}
          </Text>
        </FadeInUp>

        <FadeInUp delay={220}>
          <Card variant="elevated" padding={20} style={{ marginTop: 28, gap: 12 }}>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 12,
                marginBottom: 4,
              }}
            >
              <Avatar name={team.name} size={50} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 15,
                    fontWeight: "800",
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
                  הצטרף עכשיו וקח חלק במשחקים
                </Text>
              </View>
            </View>

            <Button
              label={joining ? "מצטרף..." : "הצטרף לקבוצה"}
              emoji="⚽"
              loading={joining}
              size="lg"
              onPress={handleJoin}
            />

            <Button
              label="לא עכשיו"
              variant="ghost"
              onPress={() => router.replace("/")}
            />
          </Card>
        </FadeInUp>
      </View>
    </Screen>
  );
}
