import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import {
  Screen,
  HeroHeader,
  Card,
  Button,
  Input,
  Avatar,
  StatTile,
  PressableScale,
  FadeInUp,
  SectionTitle,
} from "@/components/ui";

interface Stats {
  matches_played: number;
  mvp_count: number;
  avg_rating: number | null;
}

export default function ProfileScreen() {
  const { profile, signOut, fetchProfile } = useAuthStore();
  const { colors, mode, setMode, isDark } = useTheme();

  const [stats, setStats] = useState<Stats>({ matches_played: 0, mvp_count: 0, avg_rating: null });
  const [editModal, setEditModal] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setNickname(profile.nickname ?? "");
    loadStats();
  }, [profile]);

  async function loadStats() {
    if (!profile) return;

    const { count: matchCount } = await supabase
      .from("match_registrations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("status", "confirmed");

    const { count: mvpCount } = await supabase
      .from("match_results")
      .select("*", { count: "exact", head: true })
      .eq("mvp_user_id", profile.id);

    const { data: ratingData } = await supabase
      .from("match_player_ratings")
      .select("rating")
      .eq("rated_user_id", profile.id);

    const avg =
      ratingData && ratingData.length > 0
        ? ratingData.reduce((s, r) => s + r.rating, 0) / ratingData.length
        : null;

    setStats({
      matches_played: matchCount ?? 0,
      mvp_count: mvpCount ?? 0,
      avg_rating: avg,
    });
  }

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert("שגיאה", "שם מלא הוא חובה");
      return;
    }
    setSaving(true);
    await supabase
      .from("users")
      .update({ full_name: fullName.trim(), nickname: nickname.trim() || null })
      .eq("id", profile!.id);
    await fetchProfile();
    setSaving(false);
    setEditModal(false);
  }

  if (!profile) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16 }}>
          <Text style={{ color: colors.textMuted }}>הפרופיל לא נטען</Text>
          <Button label="התנתק" variant="danger" onPress={signOut} />
        </View>
      </Screen>
    );
  }

  const displayName = profile.nickname ?? profile.full_name;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <HeroHeader
          subtitle={profile.phone}
          title={displayName}
          emoji="🎽"
          meta={
            profile.nickname ? (
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 12,
                  textAlign: "right",
                }}
              >
                {profile.full_name}
              </Text>
            ) : undefined
          }
        />

        <View style={{ paddingHorizontal: 16, marginTop: -18, gap: 14 }}>
          {/* ── Stats ── */}
          <FadeInUp delay={50}>
            <Card padding={14}>
              <SectionTitle title="סטטיסטיקות" />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatTile value={stats.matches_played} label="משחקים" emoji="⚽" />
                <StatTile value={stats.mvp_count} label="MVP" tone="warning" emoji="🏅" />
                <StatTile
                  value={stats.avg_rating ? stats.avg_rating.toFixed(1) : "—"}
                  label="דירוג ממוצע"
                  tone="info"
                  emoji="⭐"
                />
              </View>
            </Card>
          </FadeInUp>

          {/* ── Theme switcher ── */}
          <FadeInUp delay={120}>
            <Card padding={14}>
              <SectionTitle title="עיצוב האפליקציה" />
              <ThemePicker current={mode} onPress={setMode} />
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 11,
                  textAlign: "right",
                  marginTop: 8,
                }}
              >
                כרגע: {isDark ? "🌙 מצב לילה" : "☀️ מצב יום"}
              </Text>
            </Card>
          </FadeInUp>

          {/* ── Actions ── */}
          <FadeInUp delay={180}>
            <Card padding={6}>
              <ActionRow
                icon="person-outline"
                label="ערוך פרופיל"
                onPress={() => setEditModal(true)}
              />
              <Divider />
              <ActionRow
                icon="log-out-outline"
                label="התנתק"
                tone="danger"
                onPress={() =>
                  Alert.alert("יציאה", "האם אתה בטוח?", [
                    { text: "ביטול", style: "cancel" },
                    { text: "יציאה", style: "destructive", onPress: signOut },
                  ])
                }
              />
            </Card>
          </FadeInUp>

          <FadeInUp delay={240}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              שכונה · v1.0
            </Text>
          </FadeInUp>
        </View>
      </ScrollView>

      {/* ── Edit modal ── */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View
              style={{
                paddingTop: 18,
                paddingHorizontal: 22,
                paddingBottom: 14,
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "800" }}>
                ערוך פרופיל
              </Text>
              <PressableScale onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </PressableScale>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 22, gap: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ alignItems: "center", marginBottom: 8 }}>
                <Avatar name={fullName || "?"} size={70} />
              </View>
              <Input
                label="שם מלא *"
                value={fullName}
                onChangeText={setFullName}
              />
              <Input
                label="כינוי"
                placeholder='למשל: "המלך", "שניצל"'
                value={nickname}
                onChangeText={setNickname}
                maxLength={20}
              />
              <Button
                label={saving ? "שומר..." : "שמור שינויים"}
                loading={saving}
                onPress={handleSave}
                size="lg"
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "light",  label: "בהיר",  icon: "sunny"           },
  { id: "dark",   label: "כהה",   icon: "moon"            },
  { id: "system", label: "מערכת", icon: "phone-portrait"  },
];

function ThemePicker({ current, onPress }: { current: ThemeMode; onPress: (m: ThemeMode) => void }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        backgroundColor: colors.bgSurface,
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {THEME_OPTIONS.map((opt) => {
        const active = current === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onPress(opt.id)}
            style={{ flex: 1 }}
          >
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 11,
                gap: 5,
                borderRadius: 10,
                backgroundColor: active ? colors.primary : "transparent",
              }}
            >
              <Ionicons
                name={opt.icon}
                size={18}
                color={active ? colors.primaryOnText : colors.textSecondary}
              />
              <Text
                style={{
                  color: active ? colors.primaryOnText : colors.textSecondary,
                  fontWeight: active ? "800" : "600",
                  fontSize: 12,
                }}
              >
                {opt.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  tone = "neutral",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: "neutral" | "danger";
}) {
  const { colors } = useTheme();
  const fg = tone === "danger" ? colors.error : colors.textPrimary;
  const iconColor = tone === "danger" ? colors.error : colors.primary;
  return (
    <PressableScale onPress={onPress} scaleTo={0.99}>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          paddingVertical: 14,
          paddingHorizontal: 12,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: tone === "danger" ? colors.errorDim : colors.primaryDim,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text
          style={{
            flex: 1,
            color: fg,
            fontWeight: "600",
            fontSize: 15,
            textAlign: "right",
          }}
        >
          {label}
        </Text>
        <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
      </View>
    </PressableScale>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 12 }} />;
}
