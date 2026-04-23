import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth";
import { View, ActivityIndicator, Text } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export default function Index() {
  const { session, loading } = useAuthStore();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 48 }}>⚽</Text>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>טוען...</Text>
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;
  return <Redirect href="/(tabs)/home" />;
}
