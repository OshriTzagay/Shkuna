import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { Screen, PitchDecor, Button, FadeInUp } from "@/components/ui";

const HIGHLIGHTS = [
  { emoji: "⚽", title: "ארגן משחקים בקלות",     desc: "תאריך, מגרש, רישום שחקנים בלחיצה." },
  { emoji: "🎲", title: "חלוקת קבוצות אוטומטית", desc: "מאזן לפי דירוג, ב-3 שניות." },
  { emoji: "🏆", title: "מעקב, MVP ודירוגים",    desc: "שמור היסטוריה והפוך כל משחק לזכרון." },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const ringSpin = useRef(new Animated.Value(0)).current;
  const ballScale = useRef(new Animated.Value(0)).current;
  const ballBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(ballScale, { toValue: 1, useNativeDriver: true, tension: 40, friction: 7 }).start();
    Animated.loop(
      Animated.timing(ringSpin, {
        toValue: 1,
        duration: 16000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ballBounce, { toValue: -8, duration: 1100, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(ballBounce, { toValue: 0,  duration: 1100, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ])
    ).start();
  }, []);

  const spin = ringSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Screen>
      <PitchDecor />

      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 36 }}>
        {/* ── Brand mark ── */}
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <Animated.View
            style={{
              width: 130,
              height: 130,
              borderRadius: 65,
              borderWidth: 1.5,
              borderColor: colors.primary + "40",
              borderStyle: "dashed",
              alignItems: "center",
              justifyContent: "center",
              transform: [{ rotate: spin }],
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 90,
                height: 90,
                borderRadius: 45,
                borderWidth: 1,
                borderColor: colors.primary + "30",
              }}
            />
          </Animated.View>
          <Animated.Text
            style={{
              position: "absolute",
              fontSize: 70,
              top: 30,
              transform: [{ scale: ballScale }, { translateY: ballBounce }],
            }}
          >
            ⚽
          </Animated.Text>
        </View>

        {/* ── Title block ── */}
        <FadeInUp delay={150}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 44,
              fontWeight: "900",
              textAlign: "center",
              marginTop: 32,
              letterSpacing: -1.2,
            }}
          >
            שכונה
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 16,
              textAlign: "center",
              marginTop: 6,
              lineHeight: 22,
            }}
          >
            כדורגל שכונתי. {"\n"}מנוהל כמו שצריך.
          </Text>
        </FadeInUp>

        {/* ── Highlight bullets ── */}
        <View style={{ marginTop: 36, gap: 12 }}>
          {HIGHLIGHTS.map((h, i) => (
            <FadeInUp key={h.title} delay={250 + i * 100}>
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  backgroundColor: colors.bgCard,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: colors.primaryDim,
                    borderWidth: 1,
                    borderColor: colors.primaryMuted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{h.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontWeight: "800",
                      fontSize: 14,
                      textAlign: "right",
                    }}
                  >
                    {h.title}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      textAlign: "right",
                      marginTop: 2,
                    }}
                  >
                    {h.desc}
                  </Text>
                </View>
              </View>
            </FadeInUp>
          ))}
        </View>

        {/* ── CTA ── */}
        <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: 20, gap: 10 }}>
          <FadeInUp delay={650}>
            <Button
              label="בוא נתחיל"
              emoji="🚀"
              size="lg"
              onPress={() => router.push("/(auth)/login")}
            />
          </FadeInUp>
          <FadeInUp delay={750}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 6,
              }}
            >
              {isDark ? "🌙 מצב לילה פעיל" : "☀️ מצב יום פעיל"} · ניתן לשינוי בפרופיל
            </Text>
          </FadeInUp>
        </View>
      </View>
    </Screen>
  );
}
