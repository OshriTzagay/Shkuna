import { useState } from "react";
import * as SecureStore from "expo-secure-store";
import { PENDING_INVITE_KEY } from "@/app/join/[token]";
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/hooks/useTheme";
import { Screen, PitchDecor, Card, Button, Input, FadeInUp, BackButton } from "@/components/ui";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { session, fetchProfile } = useAuthStore();
  const { colors } = useTheme();
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!fullName.trim()) {
      Alert.alert("שגיאה", "נא להכניס שם מלא");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("users").upsert({
      id: session!.user.id,
      phone: session!.user.phone!,
      full_name: fullName.trim(),
      nickname: nickname.trim() || null,
    });
    setLoading(false);
    if (error) {
      Alert.alert("שגיאה", `${error.message}`);
      return;
    }
    await fetchProfile();
    const pendingToken = await SecureStore.getItemAsync(PENDING_INVITE_KEY);
    if (pendingToken) {
      await SecureStore.deleteItemAsync(PENDING_INVITE_KEY);
      router.replace(`/join/${pendingToken}`);
    } else {
      router.replace("/(tabs)/home");
    }
  }

  return (
    <Screen>
      <PitchDecor />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton style={{ marginBottom: 24 }} />

          <FadeInUp>
            <View
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: colors.primaryDim,
                borderWidth: 1,
                borderColor: colors.primaryMuted,
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "flex-end",
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 32 }}>🎽</Text>
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 28,
                fontWeight: "800",
                textAlign: "right",
              }}
            >
              יצירת פרופיל
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                textAlign: "right",
                marginTop: 4,
                marginBottom: 24,
              }}
            >
              איך נקרא לך במגרש?
            </Text>
          </FadeInUp>

          <FadeInUp delay={120}>
            <Card variant="elevated" padding={20} style={{ gap: 14 }}>
              <Input
                label="שם מלא *"
                placeholder="ישראל ישראלי"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />

              <View>
                <Input
                  label="כינוי (רשות)"
                  placeholder='למשל: "המלך", "שניצל", "רונאלדו"'
                  value={nickname}
                  onChangeText={setNickname}
                  maxLength={20}
                  hint='זה מה שיופיע בחלוקת הקבוצות 😄'
                />
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 11,
                    textAlign: "right",
                    marginTop: 4,
                  }}
                >
                  {nickname.length}/20
                </Text>
              </View>

              <Button
                label={loading ? "יוצר פרופיל..." : "בוא נתחיל!"}
                emoji="⚽"
                loading={loading}
                size="lg"
                onPress={handleCreate}
              />
            </Card>
          </FadeInUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
