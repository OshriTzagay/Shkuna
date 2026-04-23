import { TouchableOpacity, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";

interface BackButtonProps {
  /** Override the default `router.back()` behavior. */
  onPress?: () => void;
  /** Show "חזרה" label next to the chevron (default: true). */
  showLabel?: boolean;
  /** Custom label text (default: "חזרה"). */
  label?: string;
  /** Use a circular pill style (for hero headers). */
  pill?: boolean;
  style?: ViewStyle;
}

/**
 * Hebrew-aware back button.
 *
 * In Hebrew (RTL) the "back" arrow visually points to the **right**
 * because the user reads from right to left – going back means
 * moving in the same direction as the start of the line.
 * We therefore always use `chevron-forward` (`>`) instead of
 * `chevron-back` (`<`), regardless of platform RTL state.
 */
export function BackButton({
  onPress,
  showLabel = true,
  label = "חזרה",
  pill,
  style,
}: BackButtonProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const handlePress = onPress ?? (() => router.back());

  if (pill) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        hitSlop={12}
        style={[
          {
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.bgSurface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        ]}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={12}
      style={[
        {
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 4,
          alignSelf: "flex-end",
        },
        style,
      ]}
    >
      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      {showLabel && (
        <Text style={{ color: colors.primary, fontWeight: "700" }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// Re-export a tiny helper that other modules use for "drill-into" rows.
// In Hebrew, drilling INTO a card means going LEFT visually (the next
// screen pushes from the left), so the indicator points LEFT, which is
// `chevron-back`. We expose a name that's not direction-coded to make
// intent obvious in screen code.
export function DrillIcon({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Ionicons name="chevron-back" size={size} color={color ?? colors.textMuted} />
    </View>
  );
}
