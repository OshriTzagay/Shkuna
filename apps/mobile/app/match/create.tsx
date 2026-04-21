import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

export default function CreateMatchScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { profile } = useAuthStore();

  const [title, setTitle] = useState("משחק כדורגל");
  const [pitchName, setPitchName] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState("12");
  const [totalCost, setTotalCost] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!pitchName.trim()) { Alert.alert("שגיאה", "נא להכניס שם מגרש"); return; }
    if (date < new Date()) { Alert.alert("שגיאה", "תאריך המשחק חייב להיות בעתיד"); return; }

    setLoading(true);
    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        team_id: teamId!,
        title: title.trim(),
        pitch_name: pitchName.trim(),
        scheduled_at: date.toISOString(),
        max_players: parseInt(maxPlayers) || 12,
        total_cost: totalCost ? parseFloat(totalCost) : null,
        created_by: profile!.id,
      })
      .select()
      .single();

    setLoading(false);
    if (error || !match) { Alert.alert("שגיאה", "לא הצלחנו ליצור את המשחק"); return; }
    router.replace(`/match/${match.id}`);
  }

  const formattedDate = date.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
  const formattedTime = date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView className="flex-1 px-6 pt-14" keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-primary-600">→ חזרה</Text>
        </TouchableOpacity>
        <Text className="text-3xl font-bold text-gray-900 text-right mb-8">משחק חדש</Text>

        <Text className="text-gray-700 font-medium mb-2 text-right">כותרת</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-4"
          value={title} onChangeText={setTitle} textAlign="right"
        />

        <Text className="text-gray-700 font-medium mb-2 text-right">שם המגרש *</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-4"
          placeholder="מגרש הכדורגל השכונתי"
          value={pitchName} onChangeText={setPitchName} textAlign="right"
        />

        <Text className="text-gray-700 font-medium mb-2 text-right">תאריך *</Text>
        <TouchableOpacity className="border border-gray-300 rounded-xl px-4 py-3 mb-2" onPress={() => setShowDatePicker(true)}>
          <Text className="text-gray-900 text-base text-right">{formattedDate}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="border border-gray-300 rounded-xl px-4 py-3 mb-4" onPress={() => setShowTimePicker(true)}>
          <Text className="text-gray-900 text-base text-right">{formattedTime}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker value={date} mode="date" minimumDate={new Date()}
            onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(new Date(d.setHours(date.getHours(), date.getMinutes()))); }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker value={date} mode="time"
            onChange={(_, d) => { setShowTimePicker(false); if (d) { const nd = new Date(date); nd.setHours(d.getHours(), d.getMinutes()); setDate(nd); } }}
          />
        )}

        <Text className="text-gray-700 font-medium mb-2 text-right">מקסימום שחקנים</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-4"
          value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" textAlign="right"
        />

        <Text className="text-gray-700 font-medium mb-2 text-right">עלות כוללת (₪) — רשות</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-right mb-8"
          placeholder="120" value={totalCost} onChangeText={setTotalCost} keyboardType="numeric" textAlign="right"
        />

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-4 items-center mb-8"
          onPress={handleCreate} disabled={loading}
        >
          <Text className="text-white font-bold text-lg">{loading ? "יוצר..." : "צור משחק ⚽"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
