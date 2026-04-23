import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/hooks/useTheme";
import {
  Screen,
  Card,
  Button,
  Input,
  PressableScale,
  FadeInUp,
  BackButton,
} from "@/components/ui";

export default function CreateMatchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { profile } = useAuthStore();

  const [title, setTitle] = useState("משחק כדורגל");
  const [pitchName, setPitchName] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState("12");
  const [totalCost, setTotalCost] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!pitchName.trim()) { Alert.alert("שגיאה", "נא להכניס שם מגרש"); return; }
    if (date < new Date())  { Alert.alert("שגיאה", "תאריך המשחק חייב להיות בעתיד"); return; }

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
    if (error || !match) {
      Alert.alert("שגיאה", "לא הצלחנו ליצור את המשחק");
      return;
    }
    router.replace(`/match/${match.id}`);
  }

  const formattedDate = date.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formattedTime = date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton style={{ marginBottom: 22 }} />

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
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 32 }}>📅</Text>
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 28,
                fontWeight: "800",
                textAlign: "right",
                marginBottom: 22,
              }}
            >
              משחק חדש
            </Text>
          </FadeInUp>

          <FadeInUp delay={100}>
            <Card variant="elevated" padding={20} style={{ gap: 14 }}>
              <Input label="כותרת" value={title} onChangeText={setTitle} />
              <Input
                label="שם המגרש *"
                placeholder="מגרש הכדורגל השכונתי"
                value={pitchName}
                onChangeText={setPitchName}
              />

              {/* Date */}
              <View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    fontWeight: "600",
                    textAlign: "right",
                    marginBottom: 8,
                  }}
                >
                  תאריך *
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <PressableScale
                    onPress={() => setShowDatePicker(true)}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        backgroundColor: colors.bgSurface,
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        borderRadius: 14,
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontSize: 14,
                          flex: 1,
                          textAlign: "right",
                        }}
                      >
                        {formattedDate}
                      </Text>
                    </View>
                  </PressableScale>
                  <PressableScale
                    onPress={() => setShowTimePicker(true)}
                    style={{ width: 130 }}
                  >
                    <View
                      style={{
                        backgroundColor: colors.bgSurface,
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        borderRadius: 14,
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons name="time-outline" size={18} color={colors.primary} />
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontSize: 14,
                          flex: 1,
                          textAlign: "right",
                        }}
                      >
                        {formattedTime}
                      </Text>
                    </View>
                  </PressableScale>
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_, d) => {
                    setShowDatePicker(false);
                    if (d) setDate(new Date(d.setHours(date.getHours(), date.getMinutes())));
                  }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  onChange={(_, d) => {
                    setShowTimePicker(false);
                    if (d) {
                      const nd = new Date(date);
                      nd.setHours(d.getHours(), d.getMinutes());
                      setDate(nd);
                    }
                  }}
                />
              )}

              <Input
                label="מקסימום שחקנים"
                value={maxPlayers}
                onChangeText={setMaxPlayers}
                keyboardType="number-pad"
              />

              <Input
                label="עלות כוללת (₪) — רשות"
                placeholder="120"
                value={totalCost}
                onChangeText={setTotalCost}
                keyboardType="numeric"
              />

              <Button
                label={loading ? "יוצר..." : "צור משחק"}
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
