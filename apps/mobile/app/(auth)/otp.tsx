import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import { PENDING_INVITE_KEY } from "@/app/join/[token]";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/hooks/useTheme";
import { Screen, PitchDecor, Button, FadeInUp, BackButton } from "@/components/ui";

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { fetchProfile } = useAuthStore();
  const { colors } = useTheme();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const boxScales = useRef(
    Array.from({ length: OTP_LENGTH }, () => new Animated.Value(1))
  ).current;

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 350);
  }, []);

  function animateBox(idx: number) {
    Animated.sequence([
      Animated.spring(boxScales[idx]!, { toValue: 1.14, useNativeDriver: true, tension: 320 }),
      Animated.spring(boxScales[idx]!, { toValue: 1,    useNativeDriver: true, tension: 320 }),
    ]).start();
  }

  function shakeBoxes() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function handleDigit(idx: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    if (!char) {
      next[idx] = "";
      setDigits(next);
      if (idx > 0) inputRefs.current[idx - 1]?.focus();
      return;
    }
    next[idx] = char;
    setDigits(next);
    animateBox(idx);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
    else inputRefs.current[idx]?.blur();
  }

  function handleKeyPress(idx: number, key: string) {
    if (key === "Backspace" && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
      inputRefs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify() {
    const otp = digits.join("");
    if (otp.length !== OTP_LENGTH) {
      shakeBoxes();
      Alert.alert("שגיאה", "הכנס קוד בן 6 ספרות");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone!,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      shakeBoxes();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      Alert.alert("קוד שגוי", "נסה שוב");
      return;
    }
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("id", data.user!.id)
      .maybeSingle();
    const pendingToken = await SecureStore.getItemAsync(PENDING_INVITE_KEY);
    if (profile) {
      await fetchProfile();
      if (pendingToken) {
        await SecureStore.deleteItemAsync(PENDING_INVITE_KEY);
        router.replace(`/join/${pendingToken}`);
      } else {
        router.replace("/(tabs)/home");
      }
    } else {
      router.replace("/(auth)/profile");
    }
  }

  const isFilled = digits.every((d) => d !== "");

  return (
    <Screen>
      <PitchDecor />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12, alignItems: "center" }}>
          <BackButton style={{ alignSelf: "flex-end", marginBottom: 28 }} />

          <FadeInUp>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.primaryDim,
                borderWidth: 1,
                borderColor: colors.primaryMuted,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <Text style={{ fontSize: 36 }}>🔐</Text>
            </View>
          </FadeInUp>

          <FadeInUp delay={80}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 28,
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              אימות מספר
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                textAlign: "center",
                marginTop: 6,
              }}
            >
              הכנס את הקוד שנשלח אל
            </Text>
            <Text
              style={{
                color: colors.primary,
                fontWeight: "800",
                fontSize: 16,
                textAlign: "center",
                marginTop: 4,
                marginBottom: 30,
              }}
            >
              {phone}
            </Text>
          </FadeInUp>

          {/* ── OTP boxes ── */}
          <Animated.View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 28,
              transform: [{ translateX: shakeAnim }],
            }}
          >
            {Array.from({ length: OTP_LENGTH }).map((_, i) => {
              const isFocus = focusedIdx === i;
              const hasVal = !!digits[i];
              return (
                <Animated.View key={i} style={{ transform: [{ scale: boxScales[i]! }] }}>
                  <View
                    style={{
                      width: 48,
                      height: 58,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: hasVal ? colors.primaryDim : colors.bgSurface,
                      borderColor: isFocus
                        ? colors.primary
                        : hasVal
                        ? colors.primaryMuted
                        : colors.border,
                      borderWidth: isFocus || hasVal ? 2 : 1.5,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "800",
                        color: hasVal ? colors.primary : colors.textMuted,
                      }}
                    >
                      {digits[i] || (isFocus ? "|" : "")}
                    </Text>
                  </View>
                  <TextInput
                    ref={(r) => {
                      inputRefs.current[i] = r;
                    }}
                    style={{ position: "absolute", width: 48, height: 58, opacity: 0 }}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digits[i]}
                    onChangeText={(v) => handleDigit(i, v)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                    onFocus={() => setFocusedIdx(i)}
                    onBlur={() => setFocusedIdx(-1)}
                    caretHidden
                    selectTextOnFocus
                  />
                </Animated.View>
              );
            })}
          </Animated.View>

          <View style={{ width: "100%" }}>
            <Button
              label={loading ? "מאמת..." : "אמת קוד"}
              emoji="✓"
              loading={loading}
              size="lg"
              onPress={handleVerify}
              disabled={!isFilled}
              variant={isFilled ? "primary" : "secondary"}
            />
          </View>

          <TouchableOpacity
            onPress={async () => {
              await supabase.auth.signInWithOtp({ phone: phone! });
              Alert.alert("נשלח", "קוד חדש נשלח אליך");
            }}
            style={{ marginTop: 18 }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              לא קיבלת?{" "}
              <Text style={{ color: colors.primary, fontWeight: "800" }}>שלח שוב</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
