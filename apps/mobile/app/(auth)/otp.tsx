import { useState } from "react";
import * as SecureStore from "expo-secure-store";
import { PENDING_INVITE_KEY } from "@/app/join/[token]";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const { fetchProfile } = useAuthStore();

  async function handleVerify() {
    if (otp.length !== 6) {
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
      Alert.alert("שגיאה", "הקוד שגוי, נסה שוב");
      return;
    }

    // check if profile exists — use maybeSingle to avoid error on missing row
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id")
      .eq("id", data.user!.id)
      .maybeSingle();

    // check for pending invite
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

  async function handleResend() {
    await supabase.auth.signInWithOtp({ phone: phone! });
    Alert.alert("נשלח", "קוד חדש נשלח אליך");
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 px-6 pt-20">
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-primary-600 text-base">→ חזרה</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-gray-900 text-right mb-2">
          אימות מספר
        </Text>
        <Text className="text-gray-500 text-right mb-8">
          הכנס את הקוד שנשלח ל-{phone}
        </Text>

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-4 text-2xl text-center tracking-widest mb-8"
          placeholder="000000"
          keyboardType="number-pad"
          value={otp}
          onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          textAlign="center"
          autoFocus
        />

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-4 items-center mb-4"
          onPress={handleVerify}
          disabled={loading || otp.length !== 6}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? "מאמת..." : "אמת קוד"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} className="items-center py-2">
          <Text className="text-gray-400 text-sm">לא קיבלת קוד? שלח שוב</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
