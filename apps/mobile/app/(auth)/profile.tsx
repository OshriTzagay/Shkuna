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
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { session, fetchProfile } = useAuthStore();
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
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1 px-6 pt-12"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-gray-900 text-right mb-2">
          יצירת פרופיל
        </Text>
        <Text className="text-gray-500 text-right mb-8">
          איך נקרא לך במגרש?
        </Text>

        {/* Full name */}
        <Text className="text-gray-700 font-medium mb-2 text-right">שם מלא *</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-4"
          placeholder="ישראל ישראלי"
          value={fullName}
          onChangeText={setFullName}
          textAlign="right"
          autoCapitalize="words"
        />

        {/* Nickname */}
        <Text className="text-gray-700 font-medium mb-1 text-right">כינוי (רשות)</Text>
        <Text className="text-gray-400 text-sm mb-2 text-right">
          זה מה שיופיע בחלוקת הקבוצות 😄
        </Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-2"
          placeholder='למשל: "המלך", "שניצל", "רונאלדו"'
          value={nickname}
          onChangeText={setNickname}
          textAlign="right"
          maxLength={20}
        />
        <Text className="text-gray-400 text-xs text-right mb-8">
          {nickname.length}/20
        </Text>

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-4 items-center mb-6"
          onPress={handleCreate}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? "יוצר פרופיל..." : "בוא נתחיל! ⚽"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
