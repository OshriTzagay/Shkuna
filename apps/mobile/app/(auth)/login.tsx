import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

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
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 px-6 pt-20">
        {/* Logo / Title */}
        <View className="items-center mb-12">
          <Text className="text-6xl mb-2">🏟️</Text>
          <Text className="text-4xl font-bold text-primary-600">שכונה</Text>
          <Text className="text-gray-500 text-base mt-2 text-center">
            כדורגל שכונתי — מנוהל כמו שצריך
          </Text>
        </View>

        {/* Phone input */}
        <Text className="text-gray-700 text-base mb-2 font-medium text-right">
          מספר טלפון
        </Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-lg text-right mb-6"
          placeholder="050-000-0000"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          textAlign="right"
          maxLength={15}
        />

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-4 items-center"
          onPress={handleSendOtp}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? "שולח..." : "שלח קוד אימות"}
          </Text>
        </TouchableOpacity>

        <Text className="text-gray-400 text-sm text-center mt-6">
          נשלח אליך SMS עם קוד בן 6 ספרות
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+972${digits.slice(1)}`;
  return null;
}
