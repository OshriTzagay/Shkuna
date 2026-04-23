import { useState } from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
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

const CITIES = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "נתניה", "באר שבע", "בני ברק", "רמת גן", "אחר",
];

export default function CreateTeamScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const finalCity = city === "אחר" ? customCity.trim() : city;
    if (!name.trim()) { Alert.alert("שגיאה", "נא להכניס שם קבוצה"); return; }
    if (!finalCity)   { Alert.alert("שגיאה", "נא לבחור עיר"); return; }

    setLoading(true);
    const slug = slugify(name);

    const { data: team, error } = await supabase
      .from("teams")
      .insert({ name: name.trim(), city: finalCity, slug, manager_id: profile!.id })
      .select()
      .single();

    if (error) {
      setLoading(false);
      Alert.alert(
        "שגיאה",
        error.code === "23505" ? "שם קבוצה כבר קיים, בחר שם אחר" : "שגיאה ביצירת הקבוצה"
      );
      return;
    }

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
              <Text style={{ fontSize: 32 }}>🏆</Text>
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 28,
                fontWeight: "800",
                textAlign: "right",
              }}
            >
              קבוצה חדשה
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                textAlign: "right",
                marginTop: 4,
                marginBottom: 22,
              }}
            >
              בוא ניצור את הקבוצה שלך
            </Text>
          </FadeInUp>

          <FadeInUp delay={120}>
            <Card variant="elevated" padding={20} style={{ gap: 16 }}>
              <Input
                label="שם הקבוצה *"
                placeholder="הפועל שכונה"
                value={name}
                onChangeText={setName}
                maxLength={40}
              />

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
                  עיר *
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  {CITIES.map((c) => {
                    const active = city === c;
                    return (
                      <PressableScale key={c} onPress={() => setCity(c)}>
                        <View
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 999,
                            borderWidth: 1.5,
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? colors.primary : colors.bgSurface,
                          }}
                        >
                          <Text
                            style={{
                              color: active ? colors.primaryOnText : colors.textPrimary,
                              fontWeight: active ? "800" : "600",
                              fontSize: 13,
                            }}
                          >
                            {c}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {city === "אחר" && (
                <Input
                  label="שם העיר"
                  placeholder="שם העיר"
                  value={customCity}
                  onChangeText={setCustomCity}
                />
              )}

              <Button
                label={loading ? "יוצר קבוצה..." : "צור קבוצה"}
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

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0590-\u05fe-]/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}
