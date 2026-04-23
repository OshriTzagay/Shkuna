import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/useTheme";
import { Screen, PitchDecor, Card, Button, Input, FadeInUp, BackButton } from "@/components/ui";

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const ringSpin = useRef(new Animated.Value(0)).current;
  const ballScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(ballScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.timing(ringSpin, {
        toValue: 1,
        duration: 18000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, []);

  const spin = ringSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  async function handleSendOtp() {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      Alert.alert("שגיאה", "מספר טלפון לא תקין");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    setLoading(false);
    if (error) {
      Alert.alert("שגיאה", error.message);
      return;
    }
    router.push({ pathname: "/(auth)/otp", params: { phone: normalized } });
  }

  return (
    <Screen>
      <PitchDecor />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <BackButton style={{ position: "absolute", top: 12, right: 20 }} />

          {/* ── Brand mark ── */}
          <View style={{ alignItems: "center", marginBottom: 28 }}>
            <Animated.View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                borderWidth: 1.5,
                borderColor: colors.primary + "30",
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotate: spin }],
              }}
            />
            <Animated.Text
              style={{
                position: "absolute",
                fontSize: 56,
                top: 22,
                transform: [{ scale: ballScale }],
              }}
            >
              ⚽
            </Animated.Text>
          </View>

          <FadeInUp>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 38,
                fontWeight: "900",
                textAlign: "center",
                letterSpacing: -1,
              }}
            >
              שכונה
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                textAlign: "center",
                marginTop: 4,
                marginBottom: 26,
              }}
            >
              ברוך השב, אלוף!
            </Text>
          </FadeInUp>

          {/* ── Card ── */}
          <FadeInUp delay={150}>
            <Card variant="elevated" padding={22}>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 20,
                  fontWeight: "800",
                  textAlign: "right",
                  marginBottom: 4,
                }}
              >
                כניסה לחשבון
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  textAlign: "right",
                  marginBottom: 18,
                }}
              >
                הכנס מספר טלפון כדי להתחיל
              </Text>

              <Input
                label="מספר טלפון"
                emoji="📱"
                placeholder="+972501234567"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={15}
                containerStyle={{ marginBottom: 16 }}
              />

              <Button
                label={loading ? "שולח..." : "קבל קוד OTP"}
                emoji="🚀"
                loading={loading}
                onPress={handleSendOtp}
                size="lg"
              />

              <TouchableOpacity
                onPress={() => router.push("/(auth)/profile")}
                style={{ marginTop: 14, alignItems: "center" }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  חדש במשחק?{" "}
                  <Text style={{ color: colors.primary, fontWeight: "800" }}>הרשמה כאן</Text>
                </Text>
              </TouchableOpacity>
            </Card>
          </FadeInUp>

          <FadeInUp delay={300}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 28,
              }}
            >
              🏆 הצטרף לקבוצה המנצחת
            </Text>
          </FadeInUp>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+972${digits.slice(1)}`;
  return null;
}
