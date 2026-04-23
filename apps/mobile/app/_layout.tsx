import "../global.css";
import "react-native-reanimated";
import { useEffect } from "react";
import { I18nManager } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";

SplashScreen.preventAutoHideAsync();

// ─── RTL strategy ──────────────────────────────────────────────────
// The app is Hebrew-only and built with **manual** RTL: every row
// uses `flexDirection: "row-reverse"` and text uses `textAlign: "right"`.
// We therefore explicitly DISABLE platform-level RTL forcing so that
// devices set to a Hebrew locale (which would otherwise turn on RTL
// at the OS level and double-flip our layouts back to LTR) render
// the app exactly as designed.
if (I18nManager.isRTL) {
  try {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  } catch {
    // No-op; will take effect on next launch.
  }
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootContent() {
  const { setSession, setLoading, fetchProfile } = useAuthStore();
  const { colors } = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);
  }, [colors.bg]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) await fetchProfile();
      setLoading(false);
      SplashScreen.hideAsync();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "fade",
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="team/[id]" />
      <Stack.Screen name="match/[id]" />
      <Stack.Screen name="join/[token]" />
    </Stack>
  );
}
