import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

const CITIES = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "נתניה", "באר שבע", "בני ברק", "רמת גן",
  "אחר"
];

export default function CreateTeamScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const finalCity = city === "אחר" ? customCity.trim() : city;
    if (!name.trim()) { Alert.alert("שגיאה", "נא להכניס שם קבוצה"); return; }
    if (!finalCity) { Alert.alert("שגיאה", "נא לבחור עיר"); return; }

    setLoading(true);
    const slug = slugify(name);

    const { data: team, error } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        city: finalCity,
        slug,
        manager_id: profile!.id,
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      Alert.alert("שגיאה", error.code === "23505" ? "שם קבוצה כבר קיים, בחר שם אחר" : "שגיאה ביצירת הקבוצה");
      return;
    }

    // add creator as manager
    await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: profile!.id,
      role: "manager",
      skill_rating: 3,
    });

    setLoading(false);
    router.replace(`/team/${team.id}`);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView className="flex-1 px-6 pt-14" keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-primary-600">→ חזרה</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-gray-900 text-right mb-1">
          קבוצה חדשה
        </Text>
        <Text className="text-gray-500 text-right mb-8">
          בוא ניצור את הקבוצה שלך
        </Text>

        {/* Team name */}
        <Text className="text-gray-700 font-medium mb-2 text-right">שם הקבוצה *</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-6"
          placeholder="הפועל שכונה"
          value={name}
          onChangeText={setName}
          textAlign="right"
          maxLength={40}
        />

        {/* City */}
        <Text className="text-gray-700 font-medium mb-3 text-right">עיר *</Text>
        <View className="flex-row flex-wrap gap-2 mb-2 justify-end">
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              className={`px-4 py-2 rounded-full border ${
                city === c
                  ? "bg-primary-600 border-primary-600"
                  : "bg-white border-gray-300"
              }`}
              onPress={() => setCity(c)}
            >
              <Text className={city === c ? "text-white font-medium" : "text-gray-700"}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {city === "אחר" && (
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-6"
            placeholder="שם העיר"
            value={customCity}
            onChangeText={setCustomCity}
            textAlign="right"
          />
        )}

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-4 items-center mt-6 mb-8"
          onPress={handleCreate}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? "יוצר קבוצה..." : "צור קבוצה ⚽"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0590-\u05fe-]/g, "")
    + "-" + Math.random().toString(36).slice(2, 7);
}
