import { type ReactNode } from "react";
import { View, StatusBar, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

interface ScreenProps {
  children: ReactNode;
  /** Override the background color. Defaults to `colors.bg`. */
  bg?: string;
  /** Disable safe area insets entirely (useful for full-bleed scrollers). */
  noSafeArea?: boolean;
  /** Which edges to apply safe-area padding to. Default: top + bottom. */
  edges?: Edge[];
  style?: ViewStyle | ViewStyle[];
}

/**
 * Top-level screen wrapper that handles safe area, status bar tint,
 * and a consistent themed background.
 */
export function Screen({
  children,
  bg,
  noSafeArea,
  edges = ["top", "bottom"],
  style,
}: ScreenProps) {
  const { colors, isDark } = useTheme();
  const Container = (noSafeArea ? View : SafeAreaView) as typeof View;

  return (
    <Container
      style={[{ flex: 1, backgroundColor: bg ?? colors.bg }, style]}
      {...(noSafeArea ? {} : { edges })}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      {children}
    </Container>
  );
}

/**
 * Faint decorative circles used in the background of auth & hero screens
 * to mimic the football pitch lines from the brand mock.
 */
export function PitchDecor() {
  const { colors } = useTheme();
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: 180,
          borderWidth: 1,
          borderColor: colors.primary + "22",
          top: -110,
          right: -110,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: 240,
          height: 240,
          borderRadius: 120,
          borderWidth: 1,
          borderColor: colors.primary + "14",
          bottom: 60,
          left: -80,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: 1,
          height: "100%",
          backgroundColor: colors.primary + "0A",
          left: "50%",
          top: 0,
        }}
      />
    </>
  );
}
